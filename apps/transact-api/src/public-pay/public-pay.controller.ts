import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { Response } from 'express';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ThreeDsService } from '../three-ds/three-ds.service';
import type { IveriConfig } from '../psp/iveri/iveri.types';

class SubmitPaymentDto {
  @IsEnum(['CARD', 'MPESA', 'ECOCASH', 'EFT']) rail!: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT';
  @IsObject() payer!: Record<string, unknown>;
  @IsOptional() @IsObject() payee?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) amountMinor?: number;
  @IsOptional() @IsString() payerName?: string;
  @IsOptional() @IsString() payerEmail?: string;
}

class InitCardDto {
  @IsString() @Matches(/^\d{12,19}$/, { message: 'pan must be 12–19 digits' }) pan!: string;
  @IsString() @Length(4, 4) @Matches(/^\d{4}$/) expiryMMYY!: string;
  @IsOptional() @IsString() @Length(3, 4) @Matches(/^\d{3,4}$/) cvv?: string;
  @IsOptional() @IsString() payerName?: string;
  @IsOptional() @IsString() payerEmail?: string;
  @IsOptional() @IsString() payerPhone?: string;
  @IsOptional() @IsInt() @Min(1) amountMinor?: number;
}

@ApiTags('Public Pay')
@Controller('pay')
export class PublicPayController {
  constructor(
    private readonly paymentLinks: PaymentLinksService,
    private readonly payments: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly threeDs: ThreeDsService,
  ) {}

  private async validateLink(shortCode: string) {
    const link = await this.paymentLinks.findByShortCode(shortCode);
    if (link.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(`This payment link is ${link.status.toLowerCase()}`);
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await this.prisma.paymentLink.update({ where: { id: link.id }, data: { status: 'EXPIRED' } });
      throw new UnprocessableEntityException('This payment link has expired');
    }
    return link;
  }

  @Get(':shortCode')
  @ApiOperation({ summary: 'Get payment link details for the payer page' })
  async getLink(@Param('shortCode') shortCode: string) {
    const link = await this.validateLink(shortCode);
    return {
      id: link.id,
      shortCode: link.shortCode,
      title: link.title,
      description: link.description,
      amountMinor: link.amountMinor,
      currency: link.currency,
      allowedRails: link.allowedRails,
      recipientName: link.recipientName,
      expiresAt: link.expiresAt,
      status: link.status,
    };
  }

  // ---------------------------------------------------------------------------
  // POST /pay/:shortCode/init-card  —  CARD payments go through 3DS, return HTML
  // ---------------------------------------------------------------------------

  @Post(':shortCode/init-card')
  @ApiOperation({ summary: 'Initiate a card payment via 3DS for a payment link' })
  async initCard(
    @Param('shortCode') shortCode: string,
    @Body() dto: InitCardDto,
    @Res() res: Response,
  ) {
    const link = await this.validateLink(shortCode);

    if (link.allowedRails.length > 0 && !link.allowedRails.includes('CARD' as any)) {
      throw new UnprocessableEntityException('Card payments are not allowed for this link');
    }

    const amountMinor = link.amountMinor ?? dto.amountMinor;
    if (!amountMinor) {
      throw new UnprocessableEntityException('Amount is required for open payment links');
    }

    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId: link.merchantId, rail: 'CARD' } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      throw new UnprocessableEntityException('Card payments are not configured for this merchant');
    }

    const apiClient = await this.prisma.apiClient.findFirst({ where: { merchantId: link.merchantId } });

    const instruction = await this.prisma.paymentInstruction.create({
      data: {
        merchantId: link.merchantId,
        apiClientId: apiClient?.id ?? '',
        direction: 'DEBIT',
        rail: 'CARD',
        sourceSystem: 'OTHER',
        idempotencyKey: `paylink:${link.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        payer: {
          name: dto.payerName ?? 'Customer',
          ...(dto.payerEmail ? { email: dto.payerEmail } : {}),
          ...(dto.payerPhone ? { phone: dto.payerPhone } : {}),
        },
        payee: { name: link.recipientName ?? 'Merchant' },
        amount: amountMinor / 100,
        currency: link.currency,
        description: link.title,
        metadata: { paymentLinkId: link.id },
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

    await this.paymentLinks.incrementUseCount(link.id);

    const { html, proxyClientId } = await this.threeDs.initiateSession({
      merchantId: link.merchantId,
      merchantPspConfigId: pspConfig.id,
      pspConfig: pspConfig.config as unknown as IveriConfig,
      paymentInstructionId: instruction.id,
      paymentExecutionId: execution.id,
      pan: dto.pan,
      expiryMMYY: dto.expiryMMYY,
      cvv: dto.cvv,
      amountMinor,
      currency: link.currency,
      kind: 'ADHOC',
    });

    // Set proxy client ID so subsequent portal proxy requests can find the iVeri session cookie
    res.cookie('gk3dsproxy', proxyClientId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/api/3ds/portal',
      maxAge: 30 * 60 * 1000,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  // ---------------------------------------------------------------------------
  // POST /pay/:shortCode/submit  —  Non-card rails (MPESA, ECOCASH, EFT)
  // ---------------------------------------------------------------------------

  @Post(':shortCode/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a non-card payment against a payment link' })
  async submit(
    @Param('shortCode') shortCode: string,
    @Body() dto: SubmitPaymentDto,
  ) {
    if (dto.rail === 'CARD') {
      throw new UnprocessableEntityException(
        'Use POST /pay/:shortCode/init-card for card payments — 3DS required',
      );
    }

    const link = await this.validateLink(shortCode);

    if (link.allowedRails.length > 0 && !link.allowedRails.includes(dto.rail as any)) {
      throw new UnprocessableEntityException(`Payment rail ${dto.rail} is not allowed for this link`);
    }

    const amountMinor = link.amountMinor ?? dto.amountMinor;
    if (!amountMinor) {
      throw new UnprocessableEntityException('Amount is required for open payment links');
    }

    const result = await this.payments.adminCreate({
      merchantId: link.merchantId,
      direction: 'DEBIT',
      rail: dto.rail,
      amountMinor,
      currency: link.currency,
      payer: dto.payer,
      payee: dto.payee ?? { name: link.recipientName ?? 'Merchant' },
      description: link.title,
      paymentLinkId: link.id,
    });

    await this.paymentLinks.incrementUseCount(link.id);

    return {
      paymentId: result.id,
      status: result.status,
      rail: dto.rail,
      amountMinor,
      currency: link.currency,
    };
  }
}
