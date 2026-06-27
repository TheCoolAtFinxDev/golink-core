import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PspSessionCacheService } from '../psp-session-cache.service';
import type {
  ExecuteParams,
  GetStatusParams,
  PaymentExecutionResult,
  PaymentProvider,
  PspRail,
  RefundParams,
} from '../payment-provider.interface';
import type {
  EcocashConfig,
  EcocashLoginResponse,
  EcocashPayMerchantResponse,
  EcocashStatusResponse,
} from './ecocash.types';

@Injectable()
export class EcocashPaymentProvider implements PaymentProvider {
  readonly rail: PspRail = 'ECOCASH';
  private readonly logger = new Logger(EcocashPaymentProvider.name);

  constructor(private readonly sessionCache: PspSessionCacheService) {}

  private parseConfig(raw: Record<string, unknown>): EcocashConfig {
    return raw as unknown as EcocashConfig;
  }

  private async authenticate(config: EcocashConfig): Promise<{ token: string; expiresAt: Date }> {
    const response = await axios.post<EcocashLoginResponse>(
      `${config.baseUrl}/auth/login`,
      { username: config.username, password: config.password },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30_000 },
    );

    const token = response.data?.token;
    if (!token) {
      throw new Error(`EcoCash auth failed: ${response.data?.message ?? 'no token returned'}`);
    }

    // Use expiry_date if provided, otherwise default to 55 minutes
    const expiresAt = response.data?.expiry_date
      ? new Date(response.data.expiry_date)
      : new Date(Date.now() + 55 * 60 * 1000);

    return { token, expiresAt };
  }

  private normalizeMsisdn(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    // Already has Lesotho country code (266) or other country code
    if (digits.startsWith('266') && digits.length >= 11) return digits;
    // Local 8-digit format → prepend 266
    if (digits.length === 8) return `266${digits}`;
    return digits;
  }

  async execute(params: ExecuteParams): Promise<PaymentExecutionResult> {
    const config = this.parseConfig(params.pspConfig);

    let jwt: string;
    try {
      jwt = await this.sessionCache.getToken(
        params.merchantId,
        'ECOCASH',
        () => this.authenticate(config),
      );
    } catch (authErr: unknown) {
      const e = authErr as { message?: string };
      this.logger.error(`EcoCash auth failed for paymentId=${params.paymentId}`, e?.message);
      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: e?.message ?? 'EcoCash authentication failed',
        rawResponse: null,
      };
    }

    const rawMsisdn = params.payer['phone'] as string | undefined
      ?? params.payer['mobileNumber'] as string | undefined;

    if (!rawMsisdn) {
      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: 'payer.phone required for EcoCash payment',
        rawResponse: null,
      };
    }

    const msisdn = this.normalizeMsisdn(rawMsisdn);
    const requestId = `GLNK-${params.paymentId.slice(0, 8).toUpperCase()}`;

    const requestPayload = {
      msisdn,
      short_code: config.merchantCode,
      amount: (params.amountMinor / 100).toFixed(2),
      request_id: requestId,
    };

    this.logger.log(`EcoCash pay-merchant payload: ${JSON.stringify(requestPayload)}`);

    try {
      const response = await axios.post<EcocashPayMerchantResponse>(
        `${config.baseUrl}/pay-merchant`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          timeout: 30_000,
        },
      );

      const body = response.data;
      const txn = (body?.extra_data as { transaction?: { transaction_id?: string } } | undefined)?.transaction;
      const pspReference = txn?.transaction_id ?? body?.request_id ?? requestId;
      const msg = (body?.message ?? '').toLowerCase();

      this.logger.log(
        `EcoCash pay-merchant paymentId=${params.paymentId} pspRef=${pspReference} message=${body?.message}`,
      );

      // UAT returns synchronous result; check message for success
      if (msg.includes('success')) {
        return { status: 'SUCCESS', pspReference, failureReason: null, rawResponse: body };
      }

      // Otherwise treat as PENDING — customer USSD confirmation in flight
      return { status: 'PENDING', pspReference, failureReason: null, rawResponse: body };
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown; status?: number }; message?: string };
      if (e?.response?.status === 401) {
        await this.sessionCache.invalidate(params.merchantId, 'ECOCASH');
      }
      this.logger.error(`EcoCash pay-merchant failed paymentId=${params.paymentId}`, e?.message);
      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: e?.message ?? 'EcoCash request failed',
        rawResponse: e?.response?.data ?? null,
      };
    }
  }

  async getStatus(params: GetStatusParams): Promise<PaymentExecutionResult> {
    if (!params.pspReference) {
      return { status: 'PENDING', pspReference: null, failureReason: null, rawResponse: null };
    }

    const config = this.parseConfig(params.pspConfig ?? {});

    let jwt: string;
    try {
      jwt = await this.sessionCache.getToken(
        params.merchantId,
        'ECOCASH',
        () => this.authenticate(config),
      );
    } catch {
      return { status: 'PENDING', pspReference: params.pspReference, failureReason: null, rawResponse: null };
    }

    try {
      const response = await axios.get<EcocashStatusResponse>(
        `${config.baseUrl}/check/transaction/${params.pspReference}`,
        {
          headers: { 'Authorization': `Bearer ${jwt}` },
          timeout: 15_000,
        },
      );

      const body = response.data;
      const code = body?.code;

      this.logger.log(
        `EcoCash getStatus paymentId=${params.paymentId} ref=${params.pspReference} code=${code} message=${body?.message}`,
      );

      // code 0 = success; other codes may mean pending or failed
      if (code === 0) {
        return { status: 'SUCCESS', pspReference: params.pspReference, failureReason: null, rawResponse: body };
      }

      return { status: 'PENDING', pspReference: params.pspReference, failureReason: null, rawResponse: body };
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown; status?: number }; message?: string };
      this.logger.error(`EcoCash getStatus failed paymentId=${params.paymentId}`, e?.message);
      return { status: 'PENDING', pspReference: params.pspReference, failureReason: null, rawResponse: null };
    }
  }

  async refund(_params: RefundParams): Promise<PaymentExecutionResult> {
    return {
      status: 'FAILED',
      pspReference: null,
      failureReason: 'EcoCash refund not yet implemented',
      rawResponse: null,
    };
  }
}
