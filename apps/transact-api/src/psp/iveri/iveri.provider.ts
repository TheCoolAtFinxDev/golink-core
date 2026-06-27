import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type {
  ExecuteParams,
  GetStatusParams,
  PaymentExecutionResult,
  PaymentProvider,
  PspRail,
  RefundParams,
} from '../payment-provider.interface';
import type { IveriConfig, IveriTransactionResult } from './iveri.types';
import * as iVeriCodes from './iveri-codes.json';

const DEBIT_TIMEOUT_MS = 60_000;

@Injectable()
export class IveriPaymentProvider implements PaymentProvider {
  readonly rail: PspRail = 'CARD';
  private readonly logger = new Logger(IveriPaymentProvider.name);

  private parseConfig(raw: Record<string, unknown>): IveriConfig {
    return raw as unknown as IveriConfig;
  }

  private mapCurrency(currency: string): string {
    return currency === 'LSL' ? 'ZAR' : currency;
  }

  private redactCardData(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const cloned = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
    const scrub = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        const k = key.toLowerCase();
        if (k === 'pan' || k === 'cardsecuritycode' || k === 'expirydate') {
          obj[key] = '***';
        } else if (obj[key] && typeof obj[key] === 'object') {
          scrub(obj[key] as Record<string, unknown>);
        }
      }
    };
    scrub(cloned);
    return cloned;
  }

  private interpretSuccess(body: IveriTransactionResult): {
    success: boolean;
    description: string;
  } {
    const result = body?.Transaction?.Result ?? {};
    const code = String(result.Code ?? '');
    const status = String(result.Status ?? '');
    const description = String(result.Description ?? '');

    if (code === '0' && status === '0') return { success: true, description };

    const userMessage = this.resolveUserMessage(code, description);
    return { success: false, description: userMessage };
  }

  // Resolves a customer-facing message from iveri-codes.json.
  // Priority: bank description pattern (most specific) → iVeri result code → raw description → fallback.
  // Bank patterns come first because code 4 "Denied" is generic — the description carries
  // the actual reason (e.g. "Insufficient Funds", "Do Not Honour").
  private resolveUserMessage(code: string, description: string): string {
    // 1. Bank description pattern — most specific reason from the acquiring bank
    if (description) {
      const lower = description.toLowerCase();
      for (const { pattern, userMessage } of iVeriCodes.bankDescriptionPatterns) {
        if (lower.includes(pattern)) return userMessage;
      }
    }

    // 2. iVeri result code — category-level reason
    const codeTable = iVeriCodes.iveriResultCodes as Record<string, { userMessage: string | null }>;
    const entry = codeTable[code];
    if (entry?.userMessage) return entry.userMessage;

    // 3. Raw description if it looks readable
    if (description && description.length <= 120 && !/\[.*\]/.test(description)) {
      return description;
    }

    return iVeriCodes.fallback;
  }

  private async post(
    url: string,
    payload: unknown,
    paymentId: string,
  ): Promise<PaymentExecutionResult> {
    try {
      const response = await axios.post<IveriTransactionResult>(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: DEBIT_TIMEOUT_MS,
      });

      const body = response.data;
      const { success, description } = this.interpretSuccess(body);
      const pspReference = body?.Transaction?.TransactionIndex ?? null;

      return {
        status: success ? 'SUCCESS' : 'FAILED',
        pspReference,
        failureReason: success ? null : description,
        rawResponse: body,
      };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown; status?: number }; message?: string };
      this.logger.error(`iVeri POST failed paymentId=${paymentId}`, axiosErr?.message);
      return {
        status: 'FAILED',
        pspReference: null,
        failureReason: axiosErr?.message ?? 'iVeri request failed',
        rawResponse: axiosErr?.response?.data ?? null,
      };
    }
  }

  private buildCitPayload(params: ExecuteParams, config: IveriConfig): unknown {
    if (!params.cardData) throw new Error('cardData required for CIT');
    const { pan, expiryMMYY, threeDs } = params.cardData;

    const tx: Record<string, unknown> = {
      ApplicationID: config.appIdCit,
      Command: 'Debit',
      Mode: config.mode,
      MerchantReference: params.merchantReference,
      MerchantTrace: params.merchantReference,
      Currency: this.mapCurrency(params.currency),
      Amount: String(params.amountMinor),
      PAN: pan,
      ExpiryDate: expiryMMYY,
      CardHolderPresence: threeDs ? 'CIT, COF, ThreeDSecure' : 'CIT, COF, SecureChannel',
    };

    if (threeDs) {
      tx['ElectronicCommerceIndicator'] = threeDs.electronicCommerceIndicator ?? threeDs.eci ?? 'ThreeDSecure';
      if (threeDs.cavv) tx['CardHolderAuthenticationData'] = threeDs.cavv;
      if (threeDs.authenticationId) tx['CardHolderAuthenticationID'] = threeDs.authenticationId;
      if (threeDs.transactionId) tx['ThreeDSecure_DSTransID'] = threeDs.transactionId;
      if (threeDs.protocolVersion) tx['ThreeDSecure_ProtocolVersion'] = threeDs.protocolVersion;
    }

    return {
      Version: '2.0',
      CertificateID: config.certId,
      ProductType: 'Enterprise',
      ProductVersion: 'WebAPI',
      Direction: 'Request',
      Transaction: tx,
    };
  }

  private buildMitPayload(params: ExecuteParams, config: IveriConfig): unknown {
    if (!params.storedToken?.transactionIndex) {
      throw new Error('storedToken.transactionIndex required for MIT');
    }

    const tx: Record<string, unknown> = {
      ApplicationID: config.appIdMit,
      Command: 'Debit',
      Mode: config.mode,
      MerchantReference: params.merchantReference,
      MerchantTrace: params.merchantReference,
      Currency: this.mapCurrency(params.currency),
      Amount: String(params.amountMinor),
      TransactionIndex: params.storedToken.transactionIndex,
      CardHolderPresence: 'MIT, COF, Recurring, SecureChannel',
      PANFormat: 'TransactionIndex',
      MerchantProfileID: config.merchantProfileId,
    };

    if (params.storedToken.maskedPan) tx['PAN'] = params.storedToken.maskedPan;
    if (params.storedToken.expiryMMYY) tx['ExpiryDate'] = params.storedToken.expiryMMYY;

    return {
      Version: '2.0',
      CertificateID: config.certId,
      ProductType: 'Enterprise',
      ProductVersion: 'WebAPI',
      Direction: 'Request',
      Transaction: tx,
    };
  }

  private buildRefundPayload(params: RefundParams, config: IveriConfig): unknown {
    return {
      Version: '2.0',
      CertificateID: config.certId,
      ProductType: 'Enterprise',
      ProductVersion: 'WebAPI',
      Direction: 'Request',
      Transaction: {
        ApplicationID: config.appIdCit,
        Command: 'Credit',
        Mode: config.mode,
        MerchantReference: params.merchantReference,
        MerchantTrace: params.merchantReference,
        Currency: this.mapCurrency(params.currency),
        Amount: String(params.amountMinor),
        TransactionIndex: params.originalPspReference,
      },
    };
  }

  async execute(params: ExecuteParams): Promise<PaymentExecutionResult> {
    const config = this.parseConfig(params.pspConfig);

    const payload = params.storedToken?.transactionIndex
      ? this.buildMitPayload(params, config)
      : this.buildCitPayload(params, config);

    this.logger.log(`iVeri execute paymentId=${params.paymentId} redacted=${JSON.stringify(this.redactCardData(payload))}`);
    return this.post(config.url, payload, params.paymentId);
  }

  async getStatus(_params: GetStatusParams): Promise<PaymentExecutionResult> {
    // iVeri is synchronous — status is always known from execute() response
    return {
      status: 'FAILED',
      pspReference: null,
      failureReason: 'iVeri does not support async status polling',
      rawResponse: null,
    };
  }

  async refund(params: RefundParams): Promise<PaymentExecutionResult> {
    const config = this.parseConfig(params.pspConfig);
    const payload = this.buildRefundPayload(params, config);
    return this.post(config.url, payload, params.paymentId);
  }
}
