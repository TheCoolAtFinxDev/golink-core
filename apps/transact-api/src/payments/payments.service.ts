import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PspRegistryService } from '../psp/psp-registry.service';
import { RedisPublisherService } from '../events/redis-publisher.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import type { ApiClientContext } from '../auth/api-key.guard';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type { ExecuteParams } from '../psp/payment-provider.interface';
import type { PaymentStatus } from '../../generated/prisma';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pspRegistry: PspRegistryService,
    private readonly publisher: RedisPublisherService,
    private readonly webhooks: WebhooksService,
  ) {}

  async submit(dto: CreatePaymentDto, clientCtx: ApiClientContext) {
    const { merchantId, apiClientId, sourceSystem } = clientCtx;

    // 1. Idempotency check
    const fullKey = `${merchantId}:${dto.idempotencyKey}`;
    const existing = await this.prisma.paymentInstruction.findUnique({
      where: { idempotencyKey: fullKey },
      include: { splits: true },
    });
    if (existing) return existing;

    // 2. Resolve PSP config
    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId, rail: dto.rail } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      throw new UnprocessableEntityException(`No active PSP config for rail ${dto.rail}`);
    }

    // 2b. Validate splits
    if (dto.splits?.length) {
      const sum = dto.splits.reduce((acc, s) => acc + s.amountMinor, 0);
      if (sum !== dto.amountMinor) {
        throw new UnprocessableEntityException(
          `Split amounts total ${sum} but payment amountMinor is ${dto.amountMinor} — they must be equal`,
        );
      }
      const splitMerchants = await this.prisma.merchant.findMany({
        where: { id: { in: dto.splits.map(s => s.merchantId) }, status: 'ACTIVE' },
        select: { id: true },
      });
      const foundIds = new Set(splitMerchants.map(m => m.id));
      const missing = dto.splits.find(s => !foundIds.has(s.merchantId));
      if (missing) {
        throw new UnprocessableEntityException(
          `Split merchant ${missing.merchantId} not found or is not active`,
        );
      }
    }

    // 3. Resolve stored token if provided
    let storedToken: ExecuteParams['storedToken'];
    if (dto.storedPaymentMethodId) {
      const spm = await this.prisma.storedPaymentMethod.findFirst({
        where: { id: dto.storedPaymentMethodId, merchantId, isActive: true },
      });
      if (!spm) throw new NotFoundException(`StoredPaymentMethod ${dto.storedPaymentMethodId} not found`);
      storedToken = {
        transactionIndex: spm.transactionIndex ?? undefined,
        maskedPan: spm.maskedPan ?? undefined,
        expiryMMYY: spm.expiryMMYY ?? undefined,
        mobileNumber: spm.mobileNumber ?? undefined,
        accountNumber: spm.accountNumber ?? undefined,
        bankCode: spm.bankCode ?? undefined,
      };
    }

    // 4. Create PaymentInstruction
    const instruction = await this.prisma.paymentInstruction.create({
      data: {
        merchantId,
        apiClientId,
        direction: dto.direction,
        rail: dto.rail,
        sourceSystem,
        sourceReference: dto.sourceReference,
        idempotencyKey: fullKey,
        payer: dto.payer,
        payee: dto.payee,
        amount: dto.amountMinor / 100,
        currency: dto.currency,
        description: dto.description,
        metadata: dto.metadata,
        storedPaymentMethodId: dto.storedPaymentMethodId,
        subscriptionId: dto.subscriptionId,
        status: 'PENDING',
      },
    });

    // 4b. Create PaymentSplit records
    if (dto.splits?.length) {
      await this.prisma.paymentSplit.createMany({
        data: dto.splits.map(s => ({
          paymentInstructionId: instruction.id,
          merchantId: s.merchantId,
          amountMinor: s.amountMinor,
          description: s.description ?? null,
        })),
      });
    }

    // 5. Publish payment.created event + dispatch webhook
    await this.publisher.publishPaymentCreated({
      paymentId: instruction.id,
      billId: null,
      merchantId,
      amount: dto.amountMinor / 100,
      currency: dto.currency,
      rail: dto.rail,
      status: 'PENDING',
      sourceReference: dto.sourceReference ?? null,
    });
    await this.webhooks.dispatch(instruction.id, 'payment.created');

    // 6. Create PaymentExecution record
    const execution = await this.prisma.paymentExecution.create({
      data: {
        paymentInstructionId: instruction.id,
        attempt: 1,
        pspRail: dto.rail,
        pspMerchantConfigId: pspConfig.id,
        requestPayload: {},
        status: 'PENDING',
      },
    });

    // 7. Execute against PSP
    const provider = this.pspRegistry.get(dto.rail);
    const merchantReference = instruction.id;

    const execParams: ExecuteParams = {
      paymentId: instruction.id,
      merchantId,
      direction: dto.direction,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      payer: dto.payer,
      payee: dto.payee,
      merchantReference,
      pspConfig: pspConfig.config as Record<string, unknown>,
      storedToken,
      cardData: dto.cardData,
    };

    const result = await provider.execute(execParams);
    this.logger.log(`PSP result paymentId=${instruction.id} status=${result.status} pspRef=${result.pspReference}`);

    // 8. Update execution
    await this.prisma.paymentExecution.update({
      where: { id: execution.id },
      data: {
        pspReference: result.pspReference,
        responsePayload: result.rawResponse as object ?? {},
        requestPayload: execParams as unknown as object,
        status: result.status === 'SUCCESS' ? 'SUCCESS'
               : result.status === 'PENDING' ? 'PENDING'
               : 'FAILED',
        completedAt: result.status !== 'PENDING' ? new Date() : null,
      },
    });

    // 9. Determine final instruction status
    const newStatus: PaymentStatus =
      result.status === 'SUCCESS' ? 'SUCCEEDED'
      : result.status === 'PENDING' ? 'PROCESSING'
      : 'FAILED';

    const updatedInstruction = await this.prisma.paymentInstruction.update({
      where: { id: instruction.id },
      data: { status: newStatus },
    });

    // 10. Settle splits on synchronous success
    if (newStatus === 'SUCCEEDED') {
      await this.settleSplits(instruction.id);
    }

    // 11. Publish status_changed event + dispatch webhook if not still processing
    if (newStatus !== 'PROCESSING') {
      await this.publisher.publishPaymentStatusChanged({
        paymentId: instruction.id,
        billId: null,
        merchantId,
        previousStatus: 'PENDING',
        newStatus,
        rail: dto.rail,
        pspReference: result.pspReference,
        failureReason: result.failureReason,
      });
      await this.webhooks.dispatch(
        instruction.id,
        newStatus === 'SUCCEEDED' ? 'payment.succeeded' : 'payment.failed',
      );
    }

    // 12. Store TransactionIndex for card CIT if present
    if (dto.rail === 'CARD' && result.pspReference && dto.cardData && !dto.storedPaymentMethodId) {
      const raw = result.rawResponse as Record<string, unknown> | null;
      const transactionIndex = result.pspReference;
      const maskedPan = (raw?.['Transaction'] as Record<string, unknown>)?.['MaskedPAN'] as string | undefined;
      const expiryMMYY = (raw?.['Transaction'] as Record<string, unknown>)?.['ExpiryDate'] as string | undefined;

      if (transactionIndex) {
        await this.prisma.storedPaymentMethod.upsert({
          where: { transactionIndex },
          create: {
            merchantId,
            kind: 'CARD',
            transactionIndex,
            maskedPan: maskedPan ?? null,
            expiryMMYY: expiryMMYY ?? null,
            scheme: null,
          },
          update: {},
        });
      }
    }

    return updatedInstruction;
  }

  async findAll(
    merchantId: string,
    opts: {
      status?: string;
      from?: string;
      to?: string;
      rail?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { status, from, to, rail, limit = 50, offset = 0 } = opts;
    return this.prisma.paymentInstruction.findMany({
      where: {
        merchantId,
        ...(status ? { status: status as never } : {}),
        ...(rail ? { rail: rail as never } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      skip: offset,
      include: {
        executions: { orderBy: { attempt: 'desc' }, take: 1 },
        splits: true,
      },
    });
  }

  async findOne(id: string, merchantId: string) {
    const instruction = await this.prisma.paymentInstruction.findFirst({
      where: { id, merchantId },
      include: {
        executions: { orderBy: { attempt: 'desc' }, take: 1 },
        splits: true,
      },
    });
    if (!instruction) throw new NotFoundException(`Payment ${id} not found`);
    return instruction;
  }

  async findOneAdmin(id: string) {
    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id },
      include: {
        executions: { orderBy: { attempt: 'asc' } },
        splits: true,
      },
    });
    if (!instruction) throw new NotFoundException(`Payment ${id} not found`);
    return instruction;
  }

  async findAllAdmin(opts: {
    merchantId?: string;
    status?: string;
    from?: string;
    to?: string;
    rail?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { merchantId, status, from, to, rail, limit = 100, offset = 0 } = opts;
    return this.prisma.paymentInstruction.findMany({
      where: {
        ...(merchantId ? { merchantId } : {}),
        ...(status ? { status: status as never } : {}),
        ...(rail ? { rail: rail as never } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
      include: { executions: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
  }

  async cancel(id: string) {
    const instruction = await this.prisma.paymentInstruction.findUnique({ where: { id } });
    if (!instruction) throw new NotFoundException(`Payment ${id} not found`);
    if (instruction.status !== 'PENDING' && instruction.status !== 'PROCESSING') {
      throw new UnprocessableEntityException(`Payment ${id} is not cancellable (status: ${instruction.status})`);
    }
    return this.prisma.paymentInstruction.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async retry(id: string) {
    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id },
      include: { executions: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
    if (!instruction) throw new NotFoundException(`Payment ${id} not found`);
    if (instruction.status !== 'FAILED' && instruction.status !== 'PENDING') {
      throw new UnprocessableEntityException(`Only FAILED or stuck PENDING payments can be retried (status: ${instruction.status})`);
    }

    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId: instruction.merchantId, rail: instruction.rail } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      throw new UnprocessableEntityException(`No active PSP config for rail ${instruction.rail}`);
    }

    const lastAttempt = instruction.executions[0]?.attempt ?? 0;
    const execution = await this.prisma.paymentExecution.create({
      data: {
        paymentInstructionId: id,
        attempt: lastAttempt + 1,
        pspRail: instruction.rail,
        pspMerchantConfigId: pspConfig.id,
        requestPayload: {},
        status: 'PENDING',
      },
    });

    await this.prisma.paymentInstruction.update({ where: { id }, data: { status: 'PROCESSING' } });

    const provider = this.pspRegistry.get(instruction.rail);
    const execParams: ExecuteParams = {
      paymentId: id,
      merchantId: instruction.merchantId,
      direction: instruction.direction,
      amountMinor: Number(instruction.amount) * 100,
      currency: instruction.currency,
      payer: instruction.payer as Record<string, unknown>,
      payee: instruction.payee as Record<string, unknown>,
      merchantReference: id,
      pspConfig: pspConfig.config as Record<string, unknown>,
    };

    const result = await provider.execute(execParams);
    this.logger.log(`Retry PSP result paymentId=${id} status=${result.status}`);

    await this.prisma.paymentExecution.update({
      where: { id: execution.id },
      data: {
        pspReference: result.pspReference,
        responsePayload: result.rawResponse as object ?? {},
        requestPayload: execParams as unknown as object,
        status: result.status === 'SUCCESS' ? 'SUCCESS' : result.status === 'PENDING' ? 'PENDING' : 'FAILED',
        completedAt: result.status !== 'PENDING' ? new Date() : null,
      },
    });

    const newStatus: PaymentStatus =
      result.status === 'SUCCESS' ? 'SUCCEEDED' : result.status === 'PENDING' ? 'PROCESSING' : 'FAILED';

    return this.prisma.paymentInstruction.update({
      where: { id },
      data: { status: newStatus },
      include: { executions: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
  }

  async adminCreate(dto: {
    merchantId: string;
    direction: 'DEBIT' | 'CREDIT';
    rail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT';
    amountMinor: number;
    currency: string;
    payer: Record<string, unknown>;
    payee: Record<string, unknown>;
    description?: string;
    sourceReference?: string;
    paymentLinkId?: string;
  }) {
    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId: dto.merchantId, rail: dto.rail as any } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      throw new UnprocessableEntityException(`No active PSP config for rail ${dto.rail} on merchant ${dto.merchantId}`);
    }

    const idempotencyKey = `admin:${dto.merchantId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    const instruction = await this.prisma.paymentInstruction.create({
      data: {
        merchantId: dto.merchantId,
        apiClientId: (await this.prisma.apiClient.findFirst({ where: { merchantId: dto.merchantId } }))?.id ?? '',
        direction: dto.direction as any,
        rail: dto.rail as any,
        sourceSystem: 'OTHER',
        sourceReference: dto.sourceReference,
        idempotencyKey,
        payer: dto.payer,
        payee: dto.payee,
        amount: dto.amountMinor / 100,
        currency: dto.currency,
        description: dto.description,
        metadata: dto.paymentLinkId ? { paymentLinkId: dto.paymentLinkId } : undefined,
        status: 'PENDING',
      },
    });

    const execution = await this.prisma.paymentExecution.create({
      data: {
        paymentInstructionId: instruction.id,
        attempt: 1,
        pspRail: dto.rail as any,
        pspMerchantConfigId: pspConfig.id,
        requestPayload: {},
        status: 'PENDING',
      },
    });

    const provider = this.pspRegistry.get(dto.rail as any);
    const execParams: ExecuteParams = {
      paymentId: instruction.id,
      merchantId: dto.merchantId,
      direction: dto.direction,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      payer: dto.payer,
      payee: dto.payee,
      merchantReference: instruction.id,
      pspConfig: pspConfig.config as Record<string, unknown>,
    };

    const result = await provider.execute(execParams);

    await this.prisma.paymentExecution.update({
      where: { id: execution.id },
      data: {
        pspReference: result.pspReference,
        responsePayload: result.rawResponse as object ?? {},
        requestPayload: execParams as unknown as object,
        status: result.status === 'SUCCESS' ? 'SUCCESS' : result.status === 'PENDING' ? 'PENDING' : 'FAILED',
        completedAt: result.status !== 'PENDING' ? new Date() : null,
      },
    });

    const newStatus: PaymentStatus =
      result.status === 'SUCCESS' ? 'SUCCEEDED' : result.status === 'PENDING' ? 'PROCESSING' : 'FAILED';

    return this.prisma.paymentInstruction.update({
      where: { id: instruction.id },
      data: { status: newStatus },
      include: { executions: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
  }

  async dispatchWebhook(paymentInstructionId: string, eventType: 'payment.succeeded' | 'payment.failed' | 'payment.created' | 'payment.cancelled' | 'payment.refunded'): Promise<void> {
    await this.webhooks.dispatch(paymentInstructionId, eventType);
  }

  async refund(id: string, merchantId: string, amountMinor?: number, reason?: string) {
    // 1. Find original payment scoped to calling merchant
    const instruction = await this.prisma.paymentInstruction.findFirst({
      where: { id, merchantId },
      include: { executions: { orderBy: { attempt: 'desc' }, take: 1 } },
    });
    if (!instruction) throw new NotFoundException(`Payment ${id} not found`);

    if (instruction.status !== 'SUCCEEDED') {
      throw new UnprocessableEntityException(
        `Only SUCCEEDED payments can be refunded (current status: ${instruction.status})`,
      );
    }

    const originalAmountMinor = Math.round(Number(instruction.amount) * 100);
    const refundAmountMinor = amountMinor ?? originalAmountMinor;

    if (refundAmountMinor > originalAmountMinor) {
      throw new UnprocessableEntityException(
        `Refund amount ${refundAmountMinor} exceeds original payment amount ${originalAmountMinor}`,
      );
    }

    // 2. Prevent duplicate refunds on the same payment
    const existingRefund = await this.prisma.paymentInstruction.findFirst({
      where: { merchantId, sourceReference: `refund:${id}`, direction: 'CREDIT' },
    });
    if (existingRefund) {
      throw new UnprocessableEntityException(
        `A refund for payment ${id} already exists (refund id: ${existingRefund.id})`,
      );
    }

    // 3. PSP config + original PSP reference
    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId, rail: instruction.rail } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      throw new UnprocessableEntityException(`No active PSP config for rail ${instruction.rail}`);
    }

    const originalExecution = instruction.executions[0];
    if (!originalExecution?.pspReference) {
      throw new UnprocessableEntityException(
        `Cannot refund payment ${id} — no PSP reference found on the original execution`,
      );
    }

    // 4. Create CREDIT instruction to record the refund
    const refundInstruction = await this.prisma.paymentInstruction.create({
      data: {
        merchantId,
        apiClientId: instruction.apiClientId,
        direction: 'CREDIT',
        rail: instruction.rail,
        sourceSystem: instruction.sourceSystem,
        sourceReference: `refund:${id}`,
        idempotencyKey: `refund:${id}:${refundAmountMinor}`,
        payer: instruction.payer,
        payee: instruction.payee,
        amount: refundAmountMinor / 100,
        currency: instruction.currency,
        description: reason ? `Refund: ${reason}` : `Refund of payment ${id}`,
        metadata: { originalPaymentId: id, reason: reason ?? null },
        status: 'PENDING',
      },
    });

    const execution = await this.prisma.paymentExecution.create({
      data: {
        paymentInstructionId: refundInstruction.id,
        attempt: 1,
        pspRail: instruction.rail,
        pspMerchantConfigId: pspConfig.id,
        requestPayload: {},
        status: 'PENDING',
      },
    });

    // 5. Execute refund against PSP
    const provider = this.pspRegistry.get(instruction.rail);
    const result = await provider.refund({
      paymentId: refundInstruction.id,
      originalPspReference: originalExecution.pspReference,
      amountMinor: refundAmountMinor,
      currency: instruction.currency,
      merchantReference: refundInstruction.id,
      pspConfig: pspConfig.config as Record<string, unknown>,
    });

    this.logger.log(`Refund paymentId=${id} refundId=${refundInstruction.id} status=${result.status}`);

    // 6. Update execution and instruction
    await this.prisma.paymentExecution.update({
      where: { id: execution.id },
      data: {
        pspReference: result.pspReference,
        responsePayload: result.rawResponse as object ?? {},
        requestPayload: { originalPspReference: originalExecution.pspReference, amountMinor: refundAmountMinor } as object,
        status: result.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        completedAt: new Date(),
      },
    });

    const newStatus: PaymentStatus = result.status === 'SUCCESS' ? 'SUCCEEDED' : 'FAILED';

    const updated = await this.prisma.paymentInstruction.update({
      where: { id: refundInstruction.id },
      data: { status: newStatus },
    });

    // 7. Fire webhook and event
    if (newStatus === 'SUCCEEDED') {
      await this.webhooks.dispatch(refundInstruction.id, 'payment.refunded');
    }

    await this.publisher.publishPaymentStatusChanged({
      paymentId: refundInstruction.id,
      billId: null,
      merchantId,
      previousStatus: 'PENDING',
      newStatus,
      rail: instruction.rail,
      pspReference: result.pspReference,
      failureReason: result.failureReason,
    });

    return {
      ...updated,
      originalPaymentId: id,
      failureReason: result.failureReason ?? undefined,
    };
  }

  async settleSplits(paymentInstructionId: string): Promise<void> {
    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id: paymentInstructionId },
      include: { splits: { where: { status: 'PENDING' } } },
    });
    if (!instruction?.splits.length) return;

    for (const split of instruction.splits) {
      const splitMerchant = await this.prisma.merchant.findUnique({
        where: { id: split.merchantId },
        select: { name: true },
      });

      const creditInstruction = await this.prisma.paymentInstruction.create({
        data: {
          merchantId: split.merchantId,
          apiClientId: instruction.apiClientId,
          direction: 'CREDIT',
          rail: instruction.rail,
          sourceSystem: 'OTHER',
          sourceReference: `split:${split.id}`,
          idempotencyKey: `split:${split.id}:credit`,
          payer: instruction.payer,
          payee: { name: splitMerchant?.name ?? 'Merchant' },
          amount: split.amountMinor / 100,
          currency: instruction.currency,
          description: split.description ?? instruction.description,
          metadata: { splitId: split.id, sourcePaymentId: paymentInstructionId },
          status: 'PENDING',
        },
      });

      await this.prisma.paymentSplit.update({
        where: { id: split.id },
        data: { status: 'SETTLED', creditInstructionId: creditInstruction.id },
      });

      this.logger.log(
        `Split settled splitId=${split.id} creditId=${creditInstruction.id} merchantId=${split.merchantId} amountMinor=${split.amountMinor}`,
      );
    }
  }

  async handlePspCallback(rail: string, body: unknown): Promise<Record<string, unknown> | void> {
    this.logger.log(`PSP callback received rail=${rail} body=${JSON.stringify(body)}`);
    if (rail === 'MPESA') return this.handleMpesaCallback(body as Record<string, unknown>);
    else if (rail === 'ECOCASH') await this.handleEcocashCallback(body as Record<string, unknown>);
    else if (rail === 'CPAY') await this.handleCpayCallback(body as Record<string, unknown>);
  }

  private async handleCpayCallback(body: Record<string, unknown>): Promise<void> {
    // C-Pay sends extTransactionId (our GLNK- correlation ID) and paymentRequestStatus
    const extTransactionId = (body['extTransactionId'] ?? body['requestReference']) as string | undefined;
    const cPayTransactionId = body['cPayTransactionId'] as string | undefined;
    const paymentRequestStatus = ((body['paymentRequestStatus'] as string | undefined) ?? '').toLowerCase();

    if (!extTransactionId) {
      this.logger.warn('C-Pay callback missing extTransactionId');
      return;
    }

    // Our pspReference is either the cPayTransactionId (if returned in initiation) or extTransactionId
    const execution = await this.prisma.paymentExecution.findFirst({
      where: { pspReference: { in: [cPayTransactionId ?? '', extTransactionId].filter(Boolean) }, pspRail: 'CPAY' },
    });

    if (!execution) {
      this.logger.warn(`C-Pay callback: no execution for extTransactionId=${extTransactionId}`);
      return;
    }

    const success = paymentRequestStatus === 'processed' || paymentRequestStatus === 'success';
    const failed = ['denied', 'canceled', 'cancelled', 'expired', 'reversed', 'failed'].includes(paymentRequestStatus);

    if (!success && !failed) {
      this.logger.log(`C-Pay callback: intermediate status=${paymentRequestStatus} — ignoring`);
      return;
    }

    const newExecStatus = success ? 'SUCCESS' : 'FAILED';
    const newStatus: PaymentStatus = success ? 'SUCCEEDED' : 'FAILED';

    await this.prisma.paymentExecution.update({
      where: { id: execution.id },
      data: {
        status: newExecStatus,
        pspReference: cPayTransactionId ?? execution.pspReference,
        responsePayload: body as object,
        completedAt: new Date(),
      },
    });

    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id: execution.paymentInstructionId },
    });
    if (!instruction || instruction.status !== 'PROCESSING') return;

    await this.prisma.paymentInstruction.update({ where: { id: instruction.id }, data: { status: newStatus } });

    if (newStatus === 'SUCCEEDED') {
      await this.settleSplits(instruction.id);
    }

    await this.publisher.publishPaymentStatusChanged({
      paymentId: instruction.id,
      billId: null,
      merchantId: instruction.merchantId,
      previousStatus: 'PROCESSING',
      newStatus,
      rail: 'CPAY',
      pspReference: cPayTransactionId ?? extTransactionId,
      failureReason: success ? null : ((body['description'] as string | undefined) ?? 'C-Pay payment failed'),
    });
    await this.webhooks.dispatch(instruction.id, newStatus === 'SUCCEEDED' ? 'payment.succeeded' : 'payment.failed');
  }

  private async handleEcocashCallback(body: Record<string, unknown>): Promise<void> {
    // EcoCash may send callback with request_id or transaction_id
    const txnId = (body['transactionId'] ?? body['transaction_id']) as string | undefined;
    const requestId = body['request_id'] as string | undefined;
    const pspRef = txnId ?? requestId ?? null;

    if (!pspRef) {
      this.logger.warn('EcoCash callback missing transaction reference');
      return;
    }

    const execution = await this.prisma.paymentExecution.findFirst({
      where: { pspReference: pspRef, pspRail: 'ECOCASH' },
    });

    if (!execution) {
      this.logger.warn(`EcoCash callback: no execution found for pspReference=${pspRef}`);
      return;
    }

    const code = body['code'];
    const message = ((body['message'] as string | undefined) ?? '').toLowerCase();
    const success = code === 0 || code === '0' || message.includes('success');
    const newExecStatus = success ? 'SUCCESS' : 'FAILED';
    const newStatus: PaymentStatus = success ? 'SUCCEEDED' : 'FAILED';

    await this.prisma.paymentExecution.update({
      where: { id: execution.id },
      data: { status: newExecStatus, responsePayload: body as object, completedAt: new Date() },
    });

    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id: execution.paymentInstructionId },
    });
    if (!instruction || instruction.status !== 'PROCESSING') return;

    await this.prisma.paymentInstruction.update({
      where: { id: instruction.id },
      data: { status: newStatus },
    });

    if (newStatus === 'SUCCEEDED') {
      await this.settleSplits(instruction.id);
    }

    await this.publisher.publishPaymentStatusChanged({
      paymentId: instruction.id,
      billId: null,
      merchantId: instruction.merchantId,
      previousStatus: 'PROCESSING',
      newStatus,
      rail: 'ECOCASH',
      pspReference: pspRef,
      failureReason: success ? null : ((body['message'] as string | undefined) ?? 'EcoCash payment failed'),
    });
    await this.webhooks.dispatch(
      instruction.id,
      newStatus === 'SUCCEEDED' ? 'payment.succeeded' : 'payment.failed',
    );
  }

  private async handleMpesaCallback(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Vodacom async callback fields (differ from the initial sync response fields)
    const resultCode = body['input_ResultCode'] as string | undefined;
    const conversationId = body['input_OriginalConversationID'] as string | undefined;
    const transactionId = body['input_TransactionID'] as string | undefined;
    const thirdPartyConvId = (body['input_ThirdPartyConversationID'] as string | undefined) ?? '';

    if (!conversationId) {
      this.logger.warn('M-PESA callback missing input_OriginalConversationID');
      return this.mpesaAck('', thirdPartyConvId);
    }

    const execution = await this.prisma.paymentExecution.findFirst({
      where: { pspReference: conversationId, pspRail: 'MPESA' },
    });

    if (!execution) {
      this.logger.warn(`M-PESA callback: no execution found for conversationId=${conversationId}`);
      return this.mpesaAck(conversationId, thirdPartyConvId);
    }

    const success = resultCode === 'INS-0';
    const newExecStatus = success ? 'SUCCESS' : 'FAILED';
    const newStatus: PaymentStatus = success ? 'SUCCEEDED' : 'FAILED';

    await this.prisma.paymentExecution.update({
      where: { id: execution.id },
      data: {
        status: newExecStatus,
        pspReference: transactionId ?? conversationId,
        responsePayload: body as object,
        completedAt: new Date(),
      },
    });

    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id: execution.paymentInstructionId },
    });

    if (instruction && instruction.status === 'PROCESSING') {
      await this.prisma.paymentInstruction.update({
        where: { id: instruction.id },
        data: { status: newStatus },
      });

      if (newStatus === 'SUCCEEDED') {
        await this.settleSplits(instruction.id);
      }

      await this.publisher.publishPaymentStatusChanged({
        paymentId: instruction.id,
        billId: null,
        merchantId: instruction.merchantId,
        previousStatus: 'PROCESSING',
        newStatus,
        rail: 'MPESA',
        pspReference: transactionId ?? conversationId,
        failureReason: success ? null : ((body['input_ResultDesc'] as string | undefined) ?? `M-PESA code ${resultCode}`),
      });
      await this.webhooks.dispatch(
        instruction.id,
        newStatus === 'SUCCEEDED' ? 'payment.succeeded' : 'payment.failed',
      );
    }

    return this.mpesaAck(conversationId, thirdPartyConvId);
  }

  private mpesaAck(conversationId: string, thirdPartyConvId: string): Record<string, unknown> {
    return {
      output_OriginalConversationID: conversationId,
      output_ResponseCode: '0',
      output_ResponseDesc: 'Successfully Accepted Result',
      output_ThirdPartyConversationID: thirdPartyConvId,
    };
  }
}
