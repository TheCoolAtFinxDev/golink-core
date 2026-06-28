export interface CpayConfig {
  clientCode: string;
  apiKey: string;
  merchantCode: string;
  clientSecret: string;
  baseUrl: string;
  callbackBaseUrl: string;
}

export interface CpayTransactionRequest {
  extTransactionId: string;
  clientCode: string;
  msisdn: string;
  amount: string;
  shortDescription: string;
  checksum: string;
  currency: string;
  redirectUrl: string;
}

export interface CpayTransactionResponse {
  return?: {
    statusCode: string;
    description: string;
    extTransactionId: string;
    cPayTransactionId?: string;
    paymentRequestStatus?: string;
    additionalData?: unknown;
    reasonCode?: string;
  };
  // Some endpoints return top-level fields
  statusCode?: string;
  description?: string;
  extTransactionId?: string;
  cPayTransactionId?: string;
  paymentRequestStatus?: string;
  reasonCode?: string;
}

export interface CpayStatusResponse {
  statusCode: string;
  description: string;
  extTransactionId: string;
  cPayTransactionId?: string;
  paymentRequestStatus?: string;
  additionalData?: unknown;
}

export interface CpayWebhookPayload {
  extTransactionId: string;
  cPayTransactionId?: string;
  paymentRequestStatus?: string;
  statusCode?: string;
  description?: string;
  amount?: string;
  msisdn?: string;
  merchantCode?: string;
  additionalData?: unknown;
}
