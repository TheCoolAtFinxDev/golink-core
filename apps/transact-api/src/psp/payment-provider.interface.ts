export type PspRail = 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT' | 'CPAY' | 'PAYSLIP';
export type PaymentDirection = 'DEBIT' | 'CREDIT';
export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface ThreeDsData {
  eci?: string;
  cavv?: string;
  transactionId?: string;
  authenticationId?: string;
  protocolVersion?: string;
  electronicCommerceIndicator?: string;
}

export interface StoredTokenData {
  transactionIndex?: string;
  maskedPan?: string;
  expiryMMYY?: string;
  mobileNumber?: string;
  accountNumber?: string;
  bankCode?: string;
}

export interface CitCardData {
  pan: string;
  expiryMMYY: string;
  threeDs?: ThreeDsData;
}

export interface ExecuteParams {
  paymentId: string;
  merchantId: string;
  direction: PaymentDirection;
  amountMinor: number;
  currency: string;
  payer: Record<string, unknown>;
  payee: Record<string, unknown>;
  merchantReference: string;
  pspConfig: Record<string, unknown>;
  cardData?: CitCardData;
  storedToken?: StoredTokenData;
}

export interface GetStatusParams {
  paymentId: string;
  merchantId: string;
  pspReference: string;
  pspConfig: Record<string, unknown>;
}

export interface RefundParams {
  paymentId: string;
  originalPspReference: string;
  amountMinor: number;
  currency: string;
  merchantReference: string;
  pspConfig: Record<string, unknown>;
}

export interface PaymentExecutionResult {
  status: ExecutionStatus;
  pspReference: string | null;
  failureReason: string | null;
  rawResponse: unknown;
}

export interface PaymentProvider {
  readonly rail: PspRail;
  execute(params: ExecuteParams): Promise<PaymentExecutionResult>;
  getStatus(params: GetStatusParams): Promise<PaymentExecutionResult>;
  refund(params: RefundParams): Promise<PaymentExecutionResult>;
}
