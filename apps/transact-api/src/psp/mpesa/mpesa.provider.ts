import { Injectable, Logger } from '@nestjs/common';
import { publicEncrypt, constants, createPublicKey } from 'node:crypto';
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
import type { MpesaAuthResponse, MpesaC2bResponse, MpesaConfig } from './mpesa.types';

const SESSION_TTL_MS = 55 * 60 * 1000; // 55min — Vodacom session lifetime is 1h

@Injectable()
export class MpesaPaymentProvider implements PaymentProvider {
  readonly rail: PspRail = 'MPESA';
  private readonly logger = new Logger(MpesaPaymentProvider.name);

  constructor(private readonly sessionCache: PspSessionCacheService) {}

  private parseConfig(raw: Record<string, unknown>): MpesaConfig {
    return raw as unknown as MpesaConfig;
  }

  // Vodacom OpenAPI requires RSA-PKCS1v1.5 encryption of BOTH the API key (for
  // getSession) AND the session key (for subsequent calls like C2B).
  private encryptKey(key: string, rsaPublicKey: string): string {
    const trimmed = rsaPublicKey.trim();
    let keyObject: ReturnType<typeof createPublicKey>;

    if (trimmed.startsWith('-----')) {
      keyObject = createPublicKey({ key: trimmed, format: 'pem' });
    } else {
      const der = Buffer.from(trimmed, 'base64');
      try {
        keyObject = createPublicKey({ key: der, format: 'der', type: 'spki' });
      } catch {
        keyObject = createPublicKey({ key: der, format: 'der', type: 'pkcs1' });
      }
    }

    return publicEncrypt(
      { key: keyObject, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(key, 'utf8'),
    ).toString('base64');
  }

  private async authenticate(config: MpesaConfig): Promise<{ token: string; expiresAt: Date }> {
    const encryptedKey = this.encryptKey(config.apiKey, config.rsaPublicKey);

    // getSession uses GET, not POST
    const response = await axios.get<MpesaAuthResponse>(
      `${config.baseUrl}/getSession/`,
      {
        headers: {
          'Authorization': `Bearer ${encryptedKey}`,
          'Content-Type': 'application/json',
          'Origin': config.callbackBaseUrl,
        },
        timeout: 30_000,
      },
    );

    const sessionId = response.data?.output_SessionID;
    if (!sessionId) {
      throw new Error(`M-PESA getSession failed: ${response.data?.output_ResponseDesc ?? 'no session ID'}`);
    }

    return {
      token: sessionId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    };
  }

  async execute(params: ExecuteParams): Promise<PaymentExecutionResult> {
    const config = this.parseConfig(params.pspConfig);

    // Get cached raw session key, then encrypt it for use as Bearer token
    const rawSessionKey = await this.sessionCache.getToken(
      params.merchantId,
      'MPESA',
      () => this.authenticate(config),
    );
    const encryptedSessionKey = this.encryptKey(rawSessionKey, config.rsaPublicKey);

    const mobileNumber = params.payer['phone'] as string | undefined
      ?? params.payer['mobileNumber'] as string | undefined;

    if (!mobileNumber) {
      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: 'payer.phone required for M-PESA C2B',
        rawResponse: null,
      };
    }

    // ThirdPartyConversationID: max 40 chars, alphanumeric
    const thirdPartyConvId = `GLNK${params.paymentId.replace(/-/g, '').slice(0, 36)}`;
    // TransactionReference: max 20 chars, alphanumeric (no hyphens)
    const transactionRef = params.paymentId.replace(/-/g, '').slice(0, 20).toUpperCase();

    try {
      const response = await axios.post<MpesaC2bResponse>(
        `${config.baseUrl}/c2bPayment/singleStage/`,
        {
          input_Amount: (params.amountMinor / 100).toFixed(2),
          input_Country: 'LES',
          input_Currency: 'LSL',
          input_CustomerMSISDN: mobileNumber,
          input_ServiceProviderCode: config.shortCode,
          input_ThirdPartyConversationID: thirdPartyConvId,
          input_TransactionReference: transactionRef,
          input_PurchasedItemsDesc: 'Payment',
        },
        {
          headers: {
            'Authorization': `Bearer ${encryptedSessionKey}`,
            'Content-Type': 'application/json',
            'Origin': config.callbackBaseUrl,
          },
          timeout: 30_000,
        },
      );

      const body = response.data;
      const code = body?.output_ResponseCode ?? '';
      const pspReference = body?.output_ConversationID ?? body?.output_TransactionID ?? null;

      if (code === 'INS-0') {
        // Synchronous mode: output_TransactionID present = transaction completed immediately
        // Async mode: only output_ConversationID present = waiting for callback
        const isSynchronous = !!body?.output_TransactionID;
        return {
          status: isSynchronous ? 'SUCCESS' : 'PENDING',
          pspReference,
          failureReason: null,
          rawResponse: body,
        };
      }

      return {
        status: 'FAILED',
        pspReference,
        failureReason: body?.output_ResponseDesc ?? `M-PESA error ${code}`,
        rawResponse: body,
      };
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown; status?: number }; message?: string };
      if (e?.response?.status === 401) {
        await this.sessionCache.invalidate(params.merchantId, 'MPESA');
      }
      this.logger.error(`M-PESA C2B failed paymentId=${params.paymentId}`, e?.message);
      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: e?.message ?? 'M-PESA request failed',
        rawResponse: e?.response?.data ?? null,
      };
    }
  }

  async getStatus(params: GetStatusParams): Promise<PaymentExecutionResult> {
    this.logger.warn(`getStatus called for M-PESA paymentId=${params.paymentId} — rely on callback`);
    return {
      status: 'PENDING',
      pspReference: params.pspReference,
      failureReason: null,
      rawResponse: null,
    };
  }

  async refund(_params: RefundParams): Promise<PaymentExecutionResult> {
    return {
      status: 'FAILED',
      pspReference: null,
      failureReason: 'M-PESA refund/reversal not yet implemented',
      rawResponse: null,
    };
  }
}
