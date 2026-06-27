import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PspRegistryService } from '../psp/psp-registry.service';
import { RedisPublisherService } from '../events/redis-publisher.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import type { ExecuteParams } from '../psp/payment-provider.interface';
import type { PspRail, PaymentStatus, SubscriptionInterval } from '../../generated/prisma';

export interface CreateSubscriptionDto {
  storedPaymentMethodId: string;
  amountMinor: number;
  currency: string;
  interval: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startAt?: string;
  maxAttempts?: number;
  description?: string;
  sourceReference?: string;
  metadata?: Record<string, unknown>;
  payer?: Record<string, unknown>;
}

function advanceDate(from: Date, interval: SubscriptionInterval): Date {
  const d = new Date(from);
  if (interval === 'DAILY') d.setDate(d.getDate() + 1);
  else if (interval === 'WEEKLY') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pspRegistry: PspRegistryService,
    private readonly publisher: RedisPublisherService,
    private readonly webhooks: WebhooksService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(merchantId: string, dto: CreateSubscriptionDto) {
    const spm = await this.prisma.storedPaymentMethod.findFirst({
      where: { id: dto.storedPaymentMethodId, merchantId, isActive: true },
    });
    if (!spm) {
      throw new NotFoundException(`StoredPaymentMethod ${dto.storedPaymentMethodId} not found`);
    }

    const rail: PspRail = spm.kind === 'CARD' ? 'CARD' : (spm.walletRail ?? 'MPESA');

    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId, rail } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      throw new UnprocessableEntityException(`No active PSP config for rail ${rail}`);
    }

    const payer: Record<string, unknown> = dto.payer ?? (
      spm.kind === 'MOBILE_WALLET'
        ? { phone: spm.mobileNumber ?? '' }
        : { name: 'Subscriber' }
    );

    const startAt = dto.startAt ? new Date(dto.startAt) : new Date();

    return this.prisma.subscription.create({
      data: {
        merchantId,
        storedPaymentMethodId: spm.id,
        rail,
        amount: dto.amountMinor / 100,
        currency: dto.currency,
        interval: dto.interval,
        status: 'ACTIVE',
        nextRunAt: startAt,
        attempt: 0,
        maxAttempts: dto.maxAttempts ?? 3,
        payer,
        description: dto.description ?? null,
        sourceReference: dto.sourceReference ?? null,
        metadata: dto.metadata ?? undefined,
      },
    });
  }

  async findAll(merchantId: string) {
    return this.prisma.subscription.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      include: { storedPaymentMethod: { select: { id: true, kind: true, mobileNumber: true, maskedPan: true, walletRail: true } } },
    });
  }

  async findOne(id: string, merchantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, merchantId },
      include: {
        storedPaymentMethod: { select: { id: true, kind: true, mobileNumber: true, maskedPan: true, walletRail: true } },
        paymentInstructions: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, status: true, createdAt: true } },
      },
    });
    if (!sub) throw new NotFoundException(`Subscription ${id} not found`);
    return sub;
  }

  async pause(id: string, merchantId: string) {
    return this.updateStatus(id, merchantId, 'PAUSED', ['ACTIVE']);
  }

  async resume(id: string, merchantId: string) {
    return this.updateStatus(id, merchantId, 'ACTIVE', ['PAUSED']);
  }

  async cancel(id: string, merchantId: string) {
    return this.updateStatus(id, merchantId, 'CANCELLED', ['ACTIVE', 'PAUSED']);
  }

  private async updateStatus(
    id: string,
    merchantId: string,
    newStatus: 'ACTIVE' | 'PAUSED' | 'CANCELLED',
    allowedFrom: string[],
  ) {
    const sub = await this.prisma.subscription.findFirst({ where: { id, merchantId } });
    if (!sub) throw new NotFoundException(`Subscription ${id} not found`);
    if (!allowedFrom.includes(sub.status)) {
      throw new UnprocessableEntityException(
        `Cannot transition subscription from ${sub.status} to ${newStatus}`,
      );
    }
    return this.prisma.subscription.update({ where: { id }, data: { status: newStatus } });
  }

  // ---------------------------------------------------------------------------
  // Scheduler — runs every minute
  // ---------------------------------------------------------------------------

  @Cron(CronExpression.EVERY_MINUTE)
  async runDue(): Promise<void> {
    const due = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', nextRunAt: { lte: new Date() } },
      include: { storedPaymentMethod: true },
      take: 100,
      orderBy: { nextRunAt: 'asc' },
    });

    if (due.length) {
      this.logger.log(`Subscription scheduler: ${due.length} due`);
    }

    for (const sub of due) {
      await this.executeSubscriptionCycle(sub);
    }
  }

  // ---------------------------------------------------------------------------
  // Execute one subscription billing cycle
  // ---------------------------------------------------------------------------

  private async executeSubscriptionCycle(
    sub: Awaited<ReturnType<typeof this.prisma.subscription.findFirst>> & {
      storedPaymentMethod: Awaited<ReturnType<typeof this.prisma.storedPaymentMethod.findFirst>>;
    },
  ): Promise<void> {
    if (!sub || !sub.storedPaymentMethod) return;

    const spm = sub.storedPaymentMethod;
    const idempotencyKey = `scheduled:${sub.id}:${sub.nextRunAt.toISOString()}`;

    // Skip if this cycle was already fired (idempotency)
    const alreadyFired = await this.prisma.paymentInstruction.findUnique({
      where: { idempotencyKey },
    });
    if (alreadyFired) {
      this.logger.warn(`Subscription ${sub.id} cycle already fired, skipping`);
      return;
    }

    const pspConfig = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId: sub.merchantId, rail: sub.rail } },
    });
    if (!pspConfig || !pspConfig.isActive) {
      this.logger.error(`Subscription ${sub.id}: no active PSP config for rail ${sub.rail}`);
      return;
    }

    const apiClient = await this.prisma.apiClient.findFirst({
      where: { merchantId: sub.merchantId, isActive: true },
    });

    const amountMinor = Math.round(Number(sub.amount) * 100);
    const payer = (sub.payer as Record<string, unknown>) ?? {};
    const payee = { name: 'Subscription' };

    // Create PaymentInstruction
    const instruction = await this.prisma.paymentInstruction.create({
      data: {
        merchantId: sub.merchantId,
        apiClientId: apiClient?.id ?? '',
        direction: 'DEBIT',
        rail: sub.rail,
        sourceSystem: 'OTHER',
        sourceReference: sub.sourceReference ?? null,
        idempotencyKey,
        payer,
        payee,
        amount: sub.amount,
        currency: sub.currency,
        description: sub.description ?? `Subscription charge`,
        metadata: { subscriptionId: sub.id, ...(sub.metadata as object ?? {}) },
        subscriptionId: sub.id,
        storedPaymentMethodId: spm.id,
        status: 'PENDING',
      },
    });

    const execution = await this.prisma.paymentExecution.create({
      data: {
        paymentInstructionId: instruction.id,
        attempt: 1,
        pspRail: sub.rail,
        pspMerchantConfigId: pspConfig.id,
        requestPayload: {},
        status: 'PENDING',
      },
    });

    // Build PSP execution params
    const storedToken: ExecuteParams['storedToken'] = spm.kind === 'CARD'
      ? { transactionIndex: spm.transactionIndex ?? undefined, maskedPan: spm.maskedPan ?? undefined, expiryMMYY: spm.expiryMMYY ?? undefined }
      : { mobileNumber: spm.mobileNumber ?? undefined };

    const execParams: ExecuteParams = {
      paymentId: instruction.id,
      merchantId: sub.merchantId,
      direction: 'DEBIT',
      amountMinor,
      currency: sub.currency,
      payer,
      payee,
      merchantReference: instruction.id,
      pspConfig: pspConfig.config as Record<string, unknown>,
      storedToken,
    };

    const provider = this.pspRegistry.get(sub.rail as PspRail);
    const result = await provider.execute(execParams);

    this.logger.log(`Subscription ${sub.id} cycle paymentId=${instruction.id} pspStatus=${result.status}`);

    // Update execution record
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
      result.status === 'SUCCESS' ? 'SUCCEEDED'
      : result.status === 'PENDING' ? 'PROCESSING'
      : 'FAILED';

    await this.prisma.paymentInstruction.update({
      where: { id: instruction.id },
      data: { status: newStatus },
    });

    // Advance subscription based on result
    if (result.status === 'SUCCESS') {
      // Card: synchronous success → advance to next cycle
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { nextRunAt: advanceDate(sub.nextRunAt, sub.interval), attempt: 0 },
      });
      await this.webhooks.dispatch(instruction.id, 'payment.succeeded');
    } else if (result.status === 'PENDING') {
      // Mobile money: async — advance optimistically; customer approves via USSD
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { nextRunAt: advanceDate(sub.nextRunAt, sub.interval) },
      });
    } else {
      // Synchronous failure (card declined etc.)
      const newAttempt = sub.attempt + 1;
      const exhausted = newAttempt >= sub.maxAttempts;
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          attempt: newAttempt,
          status: exhausted ? 'EXHAUSTED' : 'ACTIVE',
          // On failure, retry next day (not next interval)
          nextRunAt: exhausted ? sub.nextRunAt : new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await this.webhooks.dispatch(instruction.id, 'payment.failed');
    }

    await this.publisher.publishPaymentStatusChanged({
      paymentId: instruction.id,
      billId: null,
      merchantId: sub.merchantId,
      previousStatus: 'PENDING',
      newStatus,
      rail: sub.rail,
      pspReference: result.pspReference,
      failureReason: result.failureReason,
    });
  }
}
