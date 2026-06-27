import {
  All,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ThreeDsService } from './three-ds.service';
import { PrismaService } from '../prisma/prisma.service';
import { PspRegistryService } from '../psp/psp-registry.service';
import { RedisPublisherService } from '../events/redis-publisher.service';
import type { IveriConfig } from '../psp/iveri/iveri.types';
import { InitCardDto } from './dto/init-card.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// DTO for direct subscription 3DS init (not via payment link)
class InitSubscription3dsDto extends InitCardDto {
  @ApiPropertyOptional() @IsOptional() @IsString() subscriptionId?: string;
}

@ApiTags('3DS')
@Controller('3ds')
export class ThreeDsController {
  private readonly logger = new Logger(ThreeDsController.name);

  constructor(
    private readonly threeDs: ThreeDsService,
    private readonly prisma: PrismaService,
    private readonly pspRegistry: PspRegistryService,
    private readonly publisher: RedisPublisherService,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /3ds/return  —  iVeri posts here after browser 3DS challenge
  // ---------------------------------------------------------------------------

  @Post('return')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'iVeri 3DS return endpoint — do not call directly' })
  async handleReturn(@Body() body: Record<string, string>, @Res() res: Response) {
    try {
      const { redirectUrl } = await this.threeDs.handleReturn(body);
      return res.redirect(302, redirectUrl);
    } catch (err) {
      this.logger.error('Unhandled error in 3DS return handler', err);
      const failBase = process.env['CHECKOUT_FAIL_URL'] || 'https://transact.golink.co.ls/pay/failed';
      return res.redirect(302, `${failBase}?reason=${encodeURIComponent('Internal error')}`);
    }
  }

  // ---------------------------------------------------------------------------
  // POST /3ds/init-subscription  —  Start 3DS for an existing PENDING subscription
  // ---------------------------------------------------------------------------

  @Post('init-subscription')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Initiate 3DS card onboarding for a PENDING subscription' })
  async initSubscription(@Body() dto: InitSubscription3dsDto, @Res() res: Response) {
    if (!dto.subscriptionId) {
      throw new UnprocessableEntityException('subscriptionId is required');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
    });
    if (!subscription) throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    if (subscription.status !== 'PENDING') {
      throw new UnprocessableEntityException(`Subscription is ${subscription.status}, expected PENDING`);
    }

    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId: subscription.merchantId, rail: 'CARD' } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      throw new UnprocessableEntityException('No active CARD PSP config for this merchant');
    }

    const amountMinor = Math.round(Number(subscription.amount) * 100);
    const apiClient = await this.prisma.apiClient.findFirst({ where: { merchantId: subscription.merchantId } });

    const instruction = await this.prisma.paymentInstruction.create({
      data: {
        merchantId: subscription.merchantId,
        apiClientId: apiClient?.id ?? '',
        direction: 'DEBIT',
        rail: 'CARD',
        sourceSystem: 'OTHER',
        idempotencyKey: `sub-onboard:${dto.subscriptionId}:${Date.now()}`,
        payer: { name: dto.payerName ?? 'Customer' },
        payee: {},
        amount: amountMinor / 100,
        currency: subscription.currency,
        description: 'Subscription onboarding',
        subscriptionId: dto.subscriptionId,
        status: 'PENDING',
      },
    });

    const execution = await this.prisma.paymentExecution.create({
      data: {
        paymentInstructionId: instruction.id,
        attempt: 1,
        pspRail: 'CARD',
        pspMerchantConfigId: pspConfig.id,
        requestPayload: {},
        status: 'PENDING',
      },
    });

    const { html, proxyClientId } = await this.threeDs.initiateSession({
      merchantId: subscription.merchantId,
      merchantPspConfigId: pspConfig.id,
      pspConfig: pspConfig.config as unknown as IveriConfig,
      paymentInstructionId: instruction.id,
      paymentExecutionId: execution.id,
      pan: dto.pan,
      expiryMMYY: dto.expiryMMYY,
      cvv: dto.cvv,
      amountMinor,
      currency: subscription.currency,
      kind: 'SUBSCRIPTION',
      subscriptionId: dto.subscriptionId,
    });

    res.cookie('gk3dsproxy', proxyClientId, {
      httpOnly: true, sameSite: 'lax', secure: true,
      path: '/api/3ds/portal', maxAge: 30 * 60 * 1000,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  // ---------------------------------------------------------------------------
  // GET /3ds/status/:merchantReference  —  Poll payment status after redirect
  // ---------------------------------------------------------------------------

  @Get('status/:merchantReference')
  @ApiOperation({ summary: 'Get payment status by merchant reference after 3DS completion' })
  async getStatus(@Param('merchantReference') merchantReference: string) {
    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id: merchantReference },
      include: { executions: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
    if (!instruction) throw new NotFoundException(`Payment ${merchantReference} not found`);

    return {
      paymentId: instruction.id,
      status: instruction.status,
      rail: instruction.rail,
      amountMinor: Math.round(Number(instruction.amount) * 100),
      currency: instruction.currency,
      pspReference: instruction.executions[0]?.pspReference ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // ALL /3ds/portal/*  —  Proxy iVeri portal assets (CSS, JS, challenge frames)
  // ---------------------------------------------------------------------------

  @All('portal/*path')
  @ApiOperation({ summary: 'Reverse proxy to iVeri portal — do not call directly' })
  async proxyPortal(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    // path-to-regexp v8 (NestJS 11/Express 5): named splat param may be string or array
    const raw = (req.params as any)['path'];
    const path = Array.isArray(raw) ? raw.join('/') : (raw ?? '');
    const method = req.method;
    const headers = req.headers as Record<string, string | string[] | undefined>;
    // rawBody is set by NestJS for json/urlencoded; express.raw() in main.ts covers multipart
    // (which sets req.body as a Buffer). Fall back to req.body when rawBody is absent.
    const bodyAny = (req as any).body;
    const body: Buffer | undefined =
      req.rawBody ?? (Buffer.isBuffer(bodyAny) ? bodyAny : undefined);

    // Retrieve the proxy client ID from the browser cookie so we can look up iVeri's session cookies
    const cookieHeader = req.headers['cookie'] ?? '';
    const proxyClientId = this.parseCookie(cookieHeader)['gk3dsproxy'] ?? '';

    try {
      const { data, contentType, statusCode, location, setCookieHeaders } =
        await this.threeDs.proxyPortalRequest(path, method, headers, proxyClientId, body);

      res.status(statusCode).setHeader('Content-Type', contentType);

      // Forward and rewrite Location for redirects so they stay in the proxy path
      if (location) {
        res.setHeader('Location', this.threeDs.rewritePortalLocation(location));
      }

      // Forward Set-Cookie from iVeri, rewritten to be valid under our proxy path
      for (const raw of setCookieHeaders) {
        const rewritten = this.threeDs.rewriteSetCookieForProxy(raw);
        if (rewritten) res.append('Set-Cookie', rewritten);
      }

      return res.send(data);
    } catch (err: unknown) {
      this.logger.error(`3DS portal proxy failed path=${path}`, err);
      return res.status(502).json({ message: 'Proxy error' });
    }
  }

  private parseCookie(cookieHeader: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of cookieHeader.split(';')) {
      const eq = part.indexOf('=');
      if (eq <= 0) continue;
      out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
    return out;
  }
}
