import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PspRegistryService } from '../psp/psp-registry.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { RedisPublisherService } from '../events/redis-publisher.service';
import type { ExecuteParams } from '../psp/payment-provider.interface';

export interface PayoutRunResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ instructionId: string; reason: string }>;
}

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pspRegistry: PspRegistryService,
    private readonly webhooks: WebhooksService,
    private readonly publisher: RedisPublisherService,
  ) {}

  // ---------------------------------------------------------------------------
  // Scheduled — daily at 02:00 UTC. Can also be triggered manually via admin endpoint.
  // ---------------------------------------------------------------------------
  @Cron('0 2 * * *')
  async scheduledRun(): Promise<void> {
    this.logger.log('Scheduled payout run starting...');
    const result = await this.run();
    this.logger.log(
      `Scheduled payout run complete — processed=${result.processed} succeeded=${result.succeeded} failed=${result.failed} skipped=${result.skipped}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Core run — finds PENDING CREDIT split instructions and executes them
  // ---------------------------------------------------------------------------
  async run(dryRun = false): Promise<PayoutRunResult> {
    if (this.running) {
      this.logger.warn('Payout run already in progress — skipping');
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0, errors: [] };
    }

    this.running = true;
    const result: PayoutRunResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0, errors: [] };

    try {
      // Find PENDING CREDIT instructions created by split settlement
      const instructions = await this.prisma.paymentInstruction.findMany({
        where: {
          direction: 'CREDIT',
          status: 'PENDING',
          sourceReference: { startsWith: 'split:' },
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });

      this.logger.log(`Payout run: found ${instructions.length} pending split credit instructions`);

      for (const instruction of instructions) {
        result.processed++;

        try {
          // Resolve recipient merchant's settlement account
          const settlementAccount = await this.prisma.storedPaymentMethod.findFirst({
            where: {
              merchantId: instruction.merchantId,
              isActive: true,
              isSettlementAccount: true,
            },
          });

          if (!settlementAccount) {
            this.logger.warn(
              `Payout skipped — no settlement account for merchant ${instruction.merchantId} (instructionId=${instruction.id})`,
            );
            result.skipped++;
            result.errors.push({
              instructionId: instruction.id,
              reason: `Merchant ${instruction.merchantId} has no settlement account registered`,
            });
            continue;
          }

          // Resolve rail from settlement account
          const rail = settlementAccount.walletRail ?? instruction.rail;

          // Resolve PSP config for the originating merchant (the one who collected)
          // CREDIT goes out from Golink's float — use the source payment's merchant PSP config
          const sourceSplit = await this.prisma.paymentSplit.findFirst({
            where: { creditInstructionId: instruction.id },
            include: {
              paymentInstruction: {
                select: { merchantId: true, rail: true },
              },
            },
          });

          const sourceMerchantId = sourceSplit?.paymentInstruction.merchantId ?? instruction.merchantId;
          const pspConfig = await this.prisma.merchantPspConfig.findUnique({
            where: { merchantId_rail: { merchantId: sourceMerchantId, rail } },
          });

          if (!pspConfig || !pspConfig.isActive) {
            this.logger.warn(
              `Payout skipped — no active PSP config for rail ${rail} merchant ${sourceMerchantId} (instructionId=${instruction.id})`,
            );
            result.skipped++;
            result.errors.push({
              instructionId: instruction.id,
              reason: `No active ${rail} PSP config for merchant ${sourceMerchantId}`,
            });
            continue;
          }

          // Build payee from settlement account
          const payee: Record<string, unknown> = {
            ...(instruction.payee as Record<string, unknown>),
            ...(settlementAccount.mobileNumber ? { phone: settlementAccount.mobileNumber } : {}),
            ...(settlementAccount.accountNumber
              ? {
                  accountNumber: settlementAccount.accountNumber,
                  bankCode: settlementAccount.bankCode,
                  accountName: settlementAccount.accountName,
                }
              : {}),
          };

          if (dryRun) {
            this.logger.log(
              `[DRY RUN] Would execute payout instructionId=${instruction.id} rail=${rail} amount=${instruction.amount} payee=${JSON.stringify(payee)}`,
            );
            result.succeeded++;
            continue;
          }

          // Update instruction with resolved payee and mark PROCESSING
          await this.prisma.paymentInstruction.update({
            where: { id: instruction.id },
            data: { payee, rail, status: 'PROCESSING' },
          });

          // Create execution record
          const lastExecution = await this.prisma.paymentExecution.findFirst({
            where: { paymentInstructionId: instruction.id },
            orderBy: { attempt: 'desc' },
          });
          const attempt = (lastExecution?.attempt ?? 0) + 1;

          const execution = await this.prisma.paymentExecution.create({
            data: {
              paymentInstructionId: instruction.id,
              attempt,
              pspRail: rail,
              pspMerchantConfigId: pspConfig.id,
              requestPayload: {},
              status: 'PENDING',
            },
          });

          // Execute via PSP
          const provider = this.pspRegistry.get(rail);
          const params: ExecuteParams = {
            paymentId: instruction.id,
            merchantId: sourceMerchantId,
            direction: 'CREDIT',
            amountMinor: Math.round(Number(instruction.amount) * 100),
            currency: instruction.currency,
            payer: instruction.payer as Record<string, unknown>,
            payee,
            merchantReference: instruction.sourceReference ?? instruction.id,
            pspConfig: pspConfig.config as Record<string, unknown>,
          };

          const execResult = await provider.execute(params);

          const finalStatus = execResult.status === 'SUCCESS' ? 'SUCCEEDED' : 'FAILED';

          await this.prisma.paymentExecution.update({
            where: { id: execution.id },
            data: {
              status: execResult.status,
              pspReference: execResult.pspReference ?? null,
              responsePayload: (execResult.rawResponse ?? {}) as never,
              completedAt: new Date(),
            },
          });

          const updated = await this.prisma.paymentInstruction.update({
            where: { id: instruction.id },
            data: { status: finalStatus },
          });

          await this.webhooks.dispatch(
            instruction.id,
            finalStatus === 'SUCCEEDED' ? 'payment.succeeded' : 'payment.failed',
          );

          await this.publisher.publish('golink.transact.events', {
            type: 'transact.payment.status_changed',
            merchantId: instruction.merchantId,
            paymentId: instruction.id,
            previousStatus: 'PROCESSING',
            newStatus: finalStatus,
            rail,
          });

          if (finalStatus === 'SUCCEEDED') {
            result.succeeded++;
            this.logger.log(`Payout succeeded instructionId=${instruction.id} rail=${rail} amount=${instruction.amount}`);
          } else {
            result.failed++;
            this.logger.warn(`Payout failed instructionId=${instruction.id} reason=${execResult.failureReason}`);
            result.errors.push({ instructionId: instruction.id, reason: execResult.failureReason ?? 'PSP rejection' });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Payout error instructionId=${instruction.id} err=${msg}`);
          result.failed++;
          result.errors.push({ instructionId: instruction.id, reason: msg });

          await this.prisma.paymentInstruction.update({
            where: { id: instruction.id },
            data: { status: 'FAILED' },
          }).catch(() => null);
        }
      }
    } finally {
      this.running = false;
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Summary of pending payouts (for admin dashboard)
  // ---------------------------------------------------------------------------
  async summary() {
    const [pending, total] = await Promise.all([
      this.prisma.paymentInstruction.aggregate({
        where: { direction: 'CREDIT', status: 'PENDING', sourceReference: { startsWith: 'split:' } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.paymentInstruction.aggregate({
        where: { direction: 'CREDIT', sourceReference: { startsWith: 'split:' } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      pendingCount: pending._count,
      pendingAmountMinor: Math.round(Number(pending._sum.amount ?? 0) * 100),
      totalCount: total._count,
      totalAmountMinor: Math.round(Number(total._sum.amount ?? 0) * 100),
    };
  }
}
