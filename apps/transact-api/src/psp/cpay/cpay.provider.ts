import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';
import type {
  ExecuteParams,
  GetStatusParams,
  PaymentExecutionResult,
  PaymentProvider,
  PspRail,
  RefundParams,
} from '../payment-provider.interface';
import type { CpayConfig, CpayTransactionResponse, CpayStatusResponse } from './cpay.types';

// C-Pay UAT uses a self-signed cert; disable verification for non-prod
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

@Injectable()
export class CpayPaymentProvider implements PaymentProvider {
  readonly rail: PspRail = 'CPAY';
  private readonly logger = new Logger(CpayPaymentProvider.name);

  private parseConfig(raw: Record<string, unknown>): CpayConfig {
    return raw as unknown as CpayConfig;
  }

  /**
   * Checksum = base64(HMAC-SHA256(clientCode + extTransactionId + amount, clientSecret))
   * Ref: https://www.jokecamp.com/blog/examples-of-creating-base64-hashes-using-hmac-sha256-in-different-languages/
   */
  private buildChecksum(config: CpayConfig, extTransactionId: string, amount: string): string {
    const data = `${config.clientCode}${extTransactionId}${amount}`;
    return crypto.createHmac('sha256', config.clientSecret).update(data).digest('base64');
  }

  async execute(params: ExecuteParams): Promise<PaymentExecutionResult> {
    const config = this.parseConfig(params.pspConfig);
    const extTransactionId = `GLNK-${params.paymentId.replace(/-/g, '').slice(0, 16)}`;
    const amount = (params.amountMinor / 100).toFixed(2);

    const msisdn = (params.payer['phone'] ?? params.payer['mobileNumber']) as string | undefined;
    if (!msisdn) {
      return { status: 'FAILED', pspReference: null, failureReason: 'payer.phone required for C-Pay', rawResponse: null };
    }

    const checksum = this.buildChecksum(config, extTransactionId, amount);
    const redirectUrl = `${config.callbackBaseUrl}/api/psp/cpay/callback`;

    try {
      const { data } = await axios.post<CpayTransactionResponse>(
        `${config.baseUrl}/api/cpaypayments/paymentrequest/async/transactions`,
        {
          transactionRequest: {
            extTransactionId,
            clientCode: config.clientCode,
            msisdn,
            amount,
            shortDescription: (params.payer['description'] as string ?? params.paymentId.slice(0, 20)).slice(0, 20),
            checksum,
            currency: params.currency ?? 'LSL',
            redirectUrl,
          },
        },
        {
          headers: { Authorization: config.apiKey, 'Content-Type': 'application/json' },
          httpsAgent,
          timeout: 30_000,
        },
      );

      const resp = data.return ?? data as CpayTransactionResponse['return'];
      const statusCode = resp?.statusCode;

      if (statusCode === '200' || resp?.paymentRequestStatus === 'open') {
        return {
          status: 'PENDING',
          pspReference: resp?.cPayTransactionId ?? extTransactionId,
          failureReason: null,
          rawResponse: data,
        };
      }

      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: resp?.description ?? `C-Pay error ${statusCode}`,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown; status?: number }; message?: string };
      this.logger.error(`C-Pay charge failed paymentId=${params.paymentId}`, e?.message);
      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: e?.message ?? 'C-Pay request failed',
        rawResponse: e?.response?.data ?? null,
      };
    }
  }

  async getStatus(params: GetStatusParams): Promise<PaymentExecutionResult> {
    const config = this.parseConfig(params.pspConfig);
    const today = new Date().toISOString().slice(0, 10);

    try {
      const { data } = await axios.get<CpayStatusResponse>(
        `${config.baseUrl}/api/cpaypayments/transaction-status`,
        {
          headers: { Authorization: config.apiKey },
          params: { requestReference: params.pspReference, dateTime: today },
          httpsAgent,
          timeout: 15_000,
        },
      );

      const finalStatus = this.resolveStatus(data.paymentRequestStatus ?? '');
      return {
        status: finalStatus,
        pspReference: data.cPayTransactionId ?? params.pspReference,
        failureReason: finalStatus === 'FAILED' ? (data.description ?? 'Payment denied') : null,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`C-Pay status check failed paymentId=${params.paymentId}`, msg);
      return { status: 'PENDING', pspReference: params.pspReference, failureReason: null, rawResponse: null };
    }
  }

  async refund(_params: RefundParams): Promise<PaymentExecutionResult> {
    return {
      status: 'FAILED',
      pspReference: null,
      failureReason: 'C-Pay refunds must be processed via the C-Pay merchant portal',
      rawResponse: null,
    };
  }

  resolveStatus(paymentRequestStatus: string): 'SUCCESS' | 'FAILED' | 'PENDING' {
    switch (paymentRequestStatus?.toLowerCase()) {
      case 'processed':
      case 'success':
        return 'SUCCESS';
      case 'denied':
      case 'canceled':
      case 'cancelled':
      case 'expired':
      case 'reversed':
      case 'failed':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }
}
