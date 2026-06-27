import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { PspRegistryService } from '../psp/psp-registry.service';
import { RedisPublisherService } from '../events/redis-publisher.service';
import { PaymentsService } from '../payments/payments.service';
import type { IveriConfig } from '../psp/iveri/iveri.types';

const ALGO = 'aes-256-gcm' as const;
const SESSION_TTL_MINUTES = 30;

export interface ThreeDsInitParams {
  merchantId: string;
  merchantPspConfigId: string;
  pspConfig: IveriConfig;
  paymentInstructionId: string;
  paymentExecutionId: string;
  pan: string;
  expiryMMYY: string;
  cvv?: string;
  amountMinor: number;
  currency: string;
  kind: 'ADHOC' | 'SUBSCRIPTION';
  subscriptionId?: string;
  customerId?: string;
  billId?: string;
}

@Injectable()
export class ThreeDsService {
  private readonly logger = new Logger(ThreeDsService.name);

  private readonly enrollmentUrl: string;
  private readonly returnUrl: string;
  private readonly successUrl: string;
  private readonly failUrl: string;
  private readonly encKey: Buffer;
  private readonly portalOrigin: string;

  // Cookie jar: proxyClientId → Map<cookieName, cookieValue>
  // Stores iVeri session cookies from enrollment so they can be resent on subsequent proxy requests.
  private readonly portalCookieJar = new Map<string, Map<string, string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pspRegistry: PspRegistryService,
    private readonly publisher: RedisPublisherService,
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {
    this.enrollmentUrl = this.config.get<string>(
      'IVERI_3DS_URL',
      'https://portal.nedsecure.co.za/threedsecure/EnrollmentInitial',
    );
    this.returnUrl = this.config.get<string>('CHECKOUT_RETURN_URL', '');
    this.successUrl = this.config.get<string>('CHECKOUT_SUCCESS_URL', '');
    this.failUrl = this.config.get<string>('CHECKOUT_FAIL_URL', '');

    const keyHex = this.config.get<string>('CARD_SESSION_ENCRYPTION_KEY', '');
    if (!keyHex || keyHex.length < 64) {
      throw new Error('CARD_SESSION_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    }
    this.encKey = Buffer.from(keyHex, 'hex');

    const parsed = new URL(this.enrollmentUrl);
    this.portalOrigin = `${parsed.protocol}//${parsed.host}`;
  }

  // ---------------------------------------------------------------------------
  // Encryption helpers
  // ---------------------------------------------------------------------------

  private encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, this.encKey, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}.${enc.toString('hex')}.${tag.toString('hex')}`;
  }

  private decrypt(ciphertext: string): string {
    const [ivHex, encHex, tagHex] = ciphertext.split('.');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = createDecipheriv(ALGO, this.encKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  // ---------------------------------------------------------------------------
  // HTML proxy patching — rewrites iVeri's absolute/relative URLs so the
  // browser stays on the same origin and all assets route through /api/3ds/portal/
  // ---------------------------------------------------------------------------

  getProxyBasePath(): string {
    return '/api/3ds/portal/';
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  patchIveriHtml(html: string): string {
    const proxyBase = this.getProxyBasePath();       // '/api/3ds/portal/'
    const portalOriginEsc = this.escapeRegExp(`${this.portalOrigin}/`);
    const protoRelEsc = `//${this.escapeRegExp(new URL(this.portalOrigin).host)}/`;
    let out = html;

    // Strip SRI integrity + crossorigin — hashes don't survive proxying.
    out = out.replace(/\s+integrity=['"][^'"]*['"]/gi, '');
    out = out.replace(/\s+crossorigin=['"][^'"]*['"]/gi, '');
    out = out.replace(/\s+crossorigin(?=[\s>])/gi, '');

    // Inject/replace <base href> — iVeri static assets (css/, Images/, lib/) live
    // at the root of portal.nedsecure.co.za so the proxy base resolves relative URLs.
    if (/<base\s/i.test(out)) {
      out = out.replace(/<base\s+[^>]*href=['"][^'"]*['"][^>]*>/i, `<base href="${proxyBase}">`);
    } else if (/<head>/i.test(out)) {
      out = out.replace(/<head>/i, `<head><base href="${proxyBase}">`);
    }

    // Rewrite absolute portal URLs only in URL-bearing attributes (href/src/action/poster/data).
    // Deliberately excludes value="" to preserve TermUrl, PaReq, and other form field content.
    const absAttrRegex = new RegExp(
      `\\b(href|src|action|poster|data)=(['"])(?:${portalOriginEsc}|${protoRelEsc})([^'"]*)(\\2)`,
      'gi',
    );
    out = out.replace(absAttrRegex, (_m, attr: string, q: string, path: string, qc: string) =>
      `${attr}=${q}${proxyBase}${path}${qc}`,
    );

    // Root-relative href/src/action/poster  e.g. src="/css/foo.css"
    out = out.replace(
      /\b(href|src|action|poster)=['"]\/(?!\/)([^'"]*)['"]/gi,
      (_m, attr: string, path: string) => `${attr}="${proxyBase}${path}"`,
    );

    // CSS url(/...)
    out = out.replace(
      /url\(\s*(['"]?)\/(?!\/)([^'")]+)\1\s*\)/gi,
      (_m, q: string, path: string) => `url(${q}${proxyBase}${path}${q})`,
    );

    return out;
  }

  // Rewrite URLs in JS/CSS — blanket replacement, no HTML-attribute awareness needed.
  patchIveriText(text: string): string {
    const proxyBase = this.getProxyBasePath();
    const portalOriginEsc = this.escapeRegExp(`${this.portalOrigin}/`);
    const portalHostEsc = this.escapeRegExp(new URL(this.portalOrigin).host);
    let out = text;
    out = out.replace(new RegExp(portalOriginEsc, 'gi'), proxyBase);
    out = out.replace(new RegExp(`//${portalHostEsc}/`, 'gi'), proxyBase);
    // Rewrite root-relative string literals in JS (e.g. "/threedsecure/EnrollmentContinue")
    out = out.replace(
      /(["'`])\/(?!\/)(lib|css|js|images|img|fonts|threedsecure|api)\/([^"'`]*?)\1/gi,
      (_m, q: string, first: string, rest: string) => `${q}${proxyBase}${first}/${rest}${q}`,
    );
    out = out.replace(
      /\b(href|src|action|poster)=['"]\/(?!\/)([^'"]*)['"]/gi,
      (_m, attr: string, path: string) => `${attr}="${proxyBase}${path}"`,
    );
    out = out.replace(
      /url\(\s*(['"]?)\/(?!\/)([^'")]+)\1\s*\)/gi,
      (_m, q: string, path: string) => `url(${q}${proxyBase}${path}${q})`,
    );
    return out;
  }

  // ---------------------------------------------------------------------------
  // Cookie jar — stores iVeri session cookies keyed by proxy client ID
  // ---------------------------------------------------------------------------

  storePortalCookies(proxyClientId: string, setCookieHeaders: string[]): void {
    let jar = this.portalCookieJar.get(proxyClientId);
    if (!jar) { jar = new Map(); this.portalCookieJar.set(proxyClientId, jar); }
    for (const header of setCookieHeaders) {
      const first = header.split(';')[0];
      const eq = first.indexOf('=');
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name) jar.set(name, value);
    }
  }

  getPortalCookieHeader(proxyClientId: string): string {
    const jar = this.portalCookieJar.get(proxyClientId);
    if (!jar || jar.size === 0) return '';
    return Array.from(jar.entries()).map(([n, v]) => `${n}=${v}`).join('; ');
  }

  getSetCookieValues(headers: Record<string, unknown>): string[] {
    const raw = headers?.['set-cookie'];
    if (Array.isArray(raw)) return (raw as string[]).filter(Boolean);
    if (typeof raw === 'string' && raw) return [raw];
    return [];
  }

  rewriteSetCookieForProxy(raw: string): string | null {
    if (!raw || !raw.includes('=')) return null;
    const proxyBase = this.getProxyBasePath();
    const segments = raw.split(';').map(s => s.trim()).filter(Boolean);
    if (!segments.length) return null;
    const [nameValue, ...attrs] = segments;
    const rewritten: string[] = [];
    let pathWritten = false;
    for (const attr of attrs) {
      const lower = attr.toLowerCase();
      if (lower.startsWith('domain=')) continue;       // strip domain lock
      if (lower.startsWith('path=')) {
        rewritten.push(`Path=${proxyBase}`);
        pathWritten = true;
        continue;
      }
      rewritten.push(attr);
    }
    if (!pathWritten) rewritten.push(`Path=${proxyBase}`);
    return [nameValue, ...rewritten].join('; ');
  }

  rewritePortalLocation(location: string): string {
    if (location.startsWith(`${this.portalOrigin}/`)) {
      return `${this.getProxyBasePath()}${location.slice(`${this.portalOrigin}/`.length)}`;
    }
    if (location.startsWith('/')) {
      return `${this.getProxyBasePath()}${location.slice(1)}`;
    }
    return location;
  }

  // ---------------------------------------------------------------------------
  // Initiate 3DS enrollment
  // ---------------------------------------------------------------------------

  async initiateSession(params: ThreeDsInitParams): Promise<{ html: string; proxyClientId: string }> {
    const merchantReference = params.paymentInstructionId;
    const encryptedPan = this.encrypt(params.pan);
    const encryptedExpiry = this.encrypt(params.expiryMMYY);

    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);

    await this.prisma.threeDsSession.create({
      data: {
        merchantId: params.merchantId,
        merchantPspConfigId: params.merchantPspConfigId,
        kind: params.kind,
        pan: encryptedPan,
        expiryMMYY: encryptedExpiry,
        amount: params.amountMinor / 100,
        currency: params.currency,
        merchantReference,
        customerId: params.customerId ?? null,
        billId: params.billId ?? null,
        subscriptionId: params.subscriptionId ?? null,
        status: 'PENDING',
        expiresAt,
      },
    });

    const form = new URLSearchParams();
    form.append('ApplicationID', params.pspConfig.appIdCit);
    form.append('ReturnUrl', this.returnUrl);
    form.append('MerchantReference', merchantReference);
    form.append('Amount', String(params.amountMinor));
    form.append('Currency', params.currency === 'LSL' ? 'ZAR' : params.currency);
    form.append('PAN', params.pan);
    form.append('ExpiryDate', params.expiryMMYY);
    if (params.cvv) form.append('CardSecurityCode', params.cvv);

    this.logger.log(`3DS EnrollmentInitial merchantReference=${merchantReference} amount=${params.amountMinor} currency=${params.currency}`);

    const response = await axios.post<string>(this.enrollmentUrl, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'text',
      timeout: 30_000,
      maxRedirects: 0,
    });

    // Seed cookie jar so subsequent portal proxy requests carry the iVeri session cookie
    const proxyClientId = randomUUID();
    const enrollmentCookies = this.getSetCookieValues(response.headers as Record<string, unknown>);
    if (enrollmentCookies.length) {
      this.storePortalCookies(proxyClientId, enrollmentCookies);
      this.logger.log(`3DS enrolled proxyClientId=${proxyClientId} cookies=${enrollmentCookies.map(c => c.split(';')[0].split('=')[0]).join(',')}`);
    } else {
      this.logger.log(`3DS enrolled proxyClientId=${proxyClientId} (no session cookies from iVeri)`);
    }

    let html = response.data as string ?? '';
    html = this.patchIveriHtml(html);

    return { html, proxyClientId };
  }

  // ---------------------------------------------------------------------------
  // Handle iVeri 3DS return (browser POST-back)
  // ---------------------------------------------------------------------------

  async handleReturn(body: Record<string, string>): Promise<{ redirectUrl: string }> {
    const merchantReference = body['MerchantReference'];
    if (!merchantReference) {
      this.logger.warn('3DS return received with no MerchantReference');
      return { redirectUrl: this.buildFailUrl('unknown', 'Missing MerchantReference') };
    }

    const session = await this.prisma.threeDsSession.findFirst({
      where: { merchantReference, status: 'PENDING' },
      include: { merchantPspConfig: true },
    });

    if (!session) {
      this.logger.warn(`3DS return: no active session for merchantReference=${merchantReference}`);
      return { redirectUrl: this.buildFailUrl(merchantReference, 'Session not found or expired') };
    }

    const resultCode = body['ResultCode'] ?? '';
    const resultDesc = body['ResultDescription'] ?? '';

    // Mark session consumed regardless of outcome
    await this.prisma.threeDsSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED' },
    });

    // Fetch the linked PaymentInstruction
    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id: merchantReference },
    });
    if (!instruction) {
      this.logger.error(`3DS return: PaymentInstruction ${merchantReference} not found`);
      return { redirectUrl: this.buildFailUrl(merchantReference, 'Payment record not found') };
    }

    const execution = await this.prisma.paymentExecution.findFirst({
      where: { paymentInstructionId: instruction.id },
      orderBy: { attempt: 'desc' },
    });

    // If 3DS itself failed (enrollment/challenge failed before debit)
    if (resultCode && resultCode !== '0') {
      this.logger.warn(`3DS challenge failed merchantReference=${merchantReference} code=${resultCode} desc=${resultDesc}`);
      await this.markFailed(instruction.id, execution?.id, { resultCode, resultDesc }, null);
      return { redirectUrl: this.buildFailUrl(merchantReference, resultDesc || 'Card authentication failed') };
    }

    // Decrypt PAN for CIT debit
    let pan: string;
    let expiryMMYY: string;
    try {
      pan = this.decrypt(session.pan);
      expiryMMYY = this.decrypt(session.expiryMMYY);
    } catch {
      this.logger.error(`3DS return: failed to decrypt session PAN for merchantReference=${merchantReference}`);
      await this.markFailed(instruction.id, execution?.id, { resultCode: 'DECRYPT_ERROR' }, null);
      return { redirectUrl: this.buildFailUrl(merchantReference, 'Internal error') };
    }

    // Execute CIT debit with 3DS data
    const provider = this.pspRegistry.get('CARD');
    const pspConfig = session.merchantPspConfig.config as Record<string, unknown>;

    const result = await provider.execute({
      paymentId: instruction.id,
      merchantId: session.merchantId,
      direction: 'DEBIT',
      amountMinor: Math.round(Number(session.amount) * 100),
      currency: session.currency,
      payer: instruction.payer as Record<string, unknown>,
      payee: instruction.payee as Record<string, unknown>,
      merchantReference,
      pspConfig,
      cardData: {
        pan,
        expiryMMYY,
        threeDs: {
          electronicCommerceIndicator: body['ElectronicCommerceIndicator'],
          cavv: body['CardHolderAuthenticationData'],
          authenticationId: body['CardHolderAuthenticationID'],
          transactionId: body['ThreeDSecure_DSTransID'],
          protocolVersion: body['ThreeDSecure_ProtocolVersion'],
        },
      },
    });

    this.logger.log(`3DS CIT debit merchantReference=${merchantReference} status=${result.status} pspRef=${result.pspReference}`);

    const newStatus = result.status === 'SUCCESS' ? 'SUCCEEDED' : 'FAILED';

    await this.prisma.paymentInstruction.update({
      where: { id: instruction.id },
      data: { status: newStatus },
    });

    if (execution) {
      await this.prisma.paymentExecution.update({
        where: { id: execution.id },
        data: {
          pspReference: result.pspReference,
          responsePayload: result.rawResponse as object ?? {},
          status: result.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          completedAt: new Date(),
        },
      });
    }

    if (newStatus === 'SUCCEEDED') {
      await this.payments.settleSplits(instruction.id);
    }

    await this.publisher.publishPaymentStatusChanged({
      paymentId: instruction.id,
      billId: null,
      merchantId: session.merchantId,
      previousStatus: 'PENDING',
      newStatus,
      rail: 'CARD',
      pspReference: result.pspReference,
      failureReason: result.failureReason,
    });
    await this.payments.dispatchWebhook(
      instruction.id,
      newStatus === 'SUCCEEDED' ? 'payment.succeeded' : 'payment.failed',
    );

    if (result.status !== 'SUCCESS') {
      return { redirectUrl: this.buildFailUrl(merchantReference, result.failureReason || 'Card declined') };
    }

    // Store TransactionIndex as StoredPaymentMethod
    if (result.pspReference) {
      const rawTx = (result.rawResponse as Record<string, unknown> | null);
      const txData = rawTx?.['Transaction'] as Record<string, unknown> | undefined;
      const maskedPan = txData?.['MaskedPAN'] as string | undefined;
      const storedExpiry = txData?.['ExpiryDate'] as string | undefined;

      const spm = await this.prisma.storedPaymentMethod.upsert({
        where: { transactionIndex: result.pspReference },
        create: {
          merchantId: session.merchantId,
          kind: 'CARD',
          transactionIndex: result.pspReference,
          maskedPan: maskedPan ?? null,
          expiryMMYY: storedExpiry ?? expiryMMYY,
          scheme: null,
          customerId: session.customerId ?? null,
          isActive: true,
        },
        update: {},
      });

      // Activate subscription if this was a subscription onboarding
      if (session.kind === 'SUBSCRIPTION' && session.subscriptionId) {
        await this.prisma.subscription.update({
          where: { id: session.subscriptionId },
          data: {
            storedPaymentMethodId: spm.id,
            status: 'ACTIVE',
          },
        });
        this.logger.log(`Subscription ${session.subscriptionId} activated with SPM ${spm.id}`);
      }
    }

    return { redirectUrl: this.buildSuccessUrl(merchantReference) };
  }

  // ---------------------------------------------------------------------------
  // Proxy iVeri portal assets (CSS, JS, images) to avoid CORS
  // ---------------------------------------------------------------------------

  async proxyPortalRequest(
    path: string,
    method: string,
    incomingHeaders: Record<string, string | string[] | undefined>,
    proxyClientId: string,
    body?: Buffer,
  ): Promise<{ data: Buffer; contentType: string; statusCode: number; location?: string; setCookieHeaders: string[] }> {
    const targetUrl = `${this.portalOrigin}/${path}`;

    // Forward only safe headers; cookies come from our server-side jar, not the browser
    const headers: Record<string, string> = { 'User-Agent': 'GoLink-Transact/1.0' };
    const SKIP = new Set(['host', 'origin', 'referer', 'content-length', 'accept-encoding', 'connection', 'cookie']);
    for (const [k, v] of Object.entries(incomingHeaders)) {
      if (!v || SKIP.has(k.toLowerCase())) continue;
      headers[k] = Array.isArray(v) ? v.join(', ') : v;
    }
    if (incomingHeaders['content-type']) headers['Content-Type'] = incomingHeaders['content-type'] as string;

    // Attach iVeri session cookies from our server-side jar
    const upstreamCookies = this.getPortalCookieHeader(proxyClientId);
    if (upstreamCookies) headers['Cookie'] = upstreamCookies;

    this.logger.log(`3DS proxy ${method} ${targetUrl} clientId=${proxyClientId} bodyBytes=${body?.length ?? 0}`);

    const response = await axios.request<Buffer>({
      method: (method as any) ?? 'GET',
      url: targetUrl,
      headers,
      data: body?.length ? body : undefined,
      responseType: 'arraybuffer',
      timeout: 20_000,
      validateStatus: () => true,
      maxRedirects: 0,
    });

    const contentType = (response.headers['content-type'] as string) ?? 'application/octet-stream';
    const location = response.headers['location'] as string | undefined;
    const setCookieHeaders = this.getSetCookieValues(response.headers as Record<string, unknown>);
    let data = Buffer.from(response.data);

    this.logger.log(`3DS proxy response ${response.status} ct=${contentType} location=${location ?? '-'} cookies=${setCookieHeaders.length}`);

    // Update cookie jar with any new iVeri session cookies
    if (setCookieHeaders.length) {
      this.storePortalCookies(proxyClientId, setCookieHeaders);
    }

    // Patch HTML responses; also patch JS/CSS so iVeri's embedded URLs route through the proxy
    if (contentType.includes('text/html')) {
      data = Buffer.from(this.patchIveriHtml(data.toString('utf8')), 'utf8');
    } else if (contentType.includes('javascript') || contentType.includes('text/css')) {
      data = Buffer.from(this.patchIveriText(data.toString('utf8')), 'utf8');
    }

    return { data, contentType, statusCode: response.status, location, setCookieHeaders };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async markFailed(
    paymentId: string,
    executionId: string | undefined,
    raw: object,
    failureReason: string | null,
  ) {
    await this.prisma.paymentInstruction.update({
      where: { id: paymentId },
      data: { status: 'FAILED' },
    });
    if (executionId) {
      await this.prisma.paymentExecution.update({
        where: { id: executionId },
        data: {
          responsePayload: raw,
          status: 'FAILED',
          completedAt: new Date(),
        },
      });
    }
  }

  private buildSuccessUrl(ref: string): string {
    const base = this.successUrl || 'https://transact.golink.co.ls/pay/success';
    return `${base}?ref=${encodeURIComponent(ref)}`;
  }

  private buildFailUrl(ref: string, reason: string): string {
    const base = this.failUrl || 'https://transact.golink.co.ls/pay/failed';
    return `${base}?ref=${encodeURIComponent(ref)}&reason=${encodeURIComponent(reason)}`;
  }
}
