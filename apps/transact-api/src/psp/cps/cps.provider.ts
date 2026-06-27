import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ExecuteParams,
  GetStatusParams,
  PaymentExecutionResult,
  PaymentProvider,
  PspRail,
  RefundParams,
} from '../payment-provider.interface';

@Injectable()
export class CpsPaymentProvider implements PaymentProvider {
  readonly rail: PspRail = 'EFT';
  private readonly logger = new Logger(CpsPaymentProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(params: ExecuteParams): Promise<PaymentExecutionResult> {
    // Phase 3 shell: create a DRAFT CpsBatch entry; full SFTP implementation in Phase 4+
    this.logger.log(`CPS execute (shell) paymentId=${params.paymentId}`);

    const batch = await this.prisma.cpsBatch.create({
      data: {
        merchantId: params.merchantId,
        sequenceNumber: await this.nextSequenceNumber(params.merchantId),
        fileContent: '',
        status: 'DRAFT',
      },
    });

    return {
      status: 'PENDING',
      pspReference: batch.id,
      failureReason: null,
      rawResponse: { batchId: batch.id, note: 'CPS shell — SFTP upload pending' },
    };
  }

  async getStatus(params: GetStatusParams): Promise<PaymentExecutionResult> {
    const batch = await this.prisma.cpsBatch.findUnique({
      where: { id: params.pspReference },
    });

    if (!batch) {
      return {
        status: 'FAILED',
        pspReference: params.pspReference,
        failureReason: 'CpsBatch not found',
        rawResponse: null,
      };
    }

    const statusMap: Record<string, PaymentExecutionResult['status']> = {
      ACK: 'SUCCESS',
      NACK: 'FAILED',
      PARTIALLY_FAILED: 'FAILED',
      DRAFT: 'PENDING',
      SUBMITTED: 'PENDING',
    };

    return {
      status: statusMap[batch.status] ?? 'PENDING',
      pspReference: params.pspReference,
      failureReason: batch.status === 'NACK' ? 'CPS batch rejected' : null,
      rawResponse: { batchStatus: batch.status },
    };
  }

  async refund(_params: RefundParams): Promise<PaymentExecutionResult> {
    // CPS credit (9999 record) — Phase 4+
    return {
      status: 'FAILED',
      pspReference: null,
      failureReason: 'CPS credit (refund) not yet implemented',
      rawResponse: null,
    };
  }

  private async nextSequenceNumber(merchantId: string): Promise<number> {
    const last = await this.prisma.cpsBatch.findFirst({
      where: { merchantId },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });
    return (last?.sequenceNumber ?? 0) + 1;
  }
}
