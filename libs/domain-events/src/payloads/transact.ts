import type { PaymentRail, PaymentStatus } from '../event-types.js';

export interface TransactPaymentCreatedPayload {
  paymentId: string;
  billId: string | null;
  merchantId: string;
  amount: number;
  currency: string;
  rail: PaymentRail;
  status: PaymentStatus;
  sourceReference: string | null;
}

export interface TransactPaymentStatusChangedPayload {
  paymentId: string;
  billId: string | null;
  merchantId: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  rail: PaymentRail;
  pspReference: string | null;
  failureReason: string | null;
}
