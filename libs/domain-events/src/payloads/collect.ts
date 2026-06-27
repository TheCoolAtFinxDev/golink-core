import type { BillStatus } from '../event-types.js';

export interface CollectCustomerCreatedPayload {
  customerId: string;
  name: string;
  phone: string;
}

export interface CollectBillCreatedPayload {
  billId: string;
  organizationId: string;
  customerId: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface CollectBillUpdatedPayload {
  billId: string;
  status: BillStatus;
  updatedFields: Partial<{
    amount: number;
    currency: string;
    description: string;
    dueDate: string;
    status: BillStatus;
  }>;
}
