import { Injectable } from '@nestjs/common';
import type {
  ExecuteParams,
  GetStatusParams,
  PaymentExecutionResult,
  PaymentProvider,
  PspRail,
  RefundParams,
} from '../payment-provider.interface';

// Payslip (Employer deduction) provider — pending API documentation
// Flow: employer deducts payment from employee payslip at payroll run;
//       Golink initiates deduction request, employer confirms at payroll processing.
@Injectable()
export class PayslipPaymentProvider implements PaymentProvider {
  readonly rail: PspRail = 'PAYSLIP';

  async execute(_params: ExecuteParams): Promise<PaymentExecutionResult> {
    return {
      status: 'FAILED',
      pspReference: null,
      failureReason: 'Payslip rail not yet implemented — pending API documentation',
      rawResponse: null,
    };
  }

  async getStatus(_params: GetStatusParams): Promise<PaymentExecutionResult> {
    return { status: 'PENDING', pspReference: null, failureReason: null, rawResponse: null };
  }

  async refund(_params: RefundParams): Promise<PaymentExecutionResult> {
    return {
      status: 'FAILED',
      pspReference: null,
      failureReason: 'Payslip refunds not yet implemented',
      rawResponse: null,
    };
  }
}
