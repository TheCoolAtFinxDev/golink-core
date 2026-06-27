export enum GolinkEventType {
  CollectCustomerCreated = 'collect.customer.created',
  CollectBillCreated = 'collect.bill.created',
  CollectBillUpdated = 'collect.bill.updated',
  TransactPaymentCreated = 'transact.payment.created',
  TransactPaymentStatusChanged = 'transact.payment.status_changed',
}

export const GOLINK_STREAM_NAMES = {
  COLLECT: 'golink.collect.events',
  TRANSACT: 'golink.transact.events',
} as const;

export type GolinkEventSource = 'collect-api' | 'transact-api';

export type PaymentRail = 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type BillStatus =
  | 'PENDING'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED';
