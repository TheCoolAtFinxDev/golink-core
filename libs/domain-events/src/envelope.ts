import { randomUUID } from 'node:crypto';
import type { GolinkEventType, GolinkEventSource } from './event-types.js';
import type {
  CollectCustomerCreatedPayload,
  CollectBillCreatedPayload,
  CollectBillUpdatedPayload,
} from './payloads/collect.js';
import type {
  TransactPaymentCreatedPayload,
  TransactPaymentStatusChangedPayload,
} from './payloads/transact.js';

export interface GolinkDomainEvent<T = unknown> {
  id: string;
  type: GolinkEventType;
  source: GolinkEventSource;
  occurredAt: string;
  subject: string;
  payload: T;
}

export type GolinkEventPayloadMap = {
  [GolinkEventType.CollectCustomerCreated]: CollectCustomerCreatedPayload;
  [GolinkEventType.CollectBillCreated]: CollectBillCreatedPayload;
  [GolinkEventType.CollectBillUpdated]: CollectBillUpdatedPayload;
  [GolinkEventType.TransactPaymentCreated]: TransactPaymentCreatedPayload;
  [GolinkEventType.TransactPaymentStatusChanged]: TransactPaymentStatusChangedPayload;
};

export function createGolinkDomainEvent<T extends GolinkEventType>(
  type: T,
  source: GolinkEventSource,
  subject: string,
  payload: GolinkEventPayloadMap[T],
): GolinkDomainEvent<GolinkEventPayloadMap[T]> {
  return {
    id: randomUUID(),
    type,
    source,
    occurredAt: new Date().toISOString(),
    subject,
    payload,
  };
}
