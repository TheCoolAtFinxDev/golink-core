import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHmac, randomBytes } from 'node:crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.succeeded',
  'payment.failed',
  'payment.cancelled',
  'payment.refunded',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

// Retry delays in minutes: attempt 1→2, 2→3, 3→4, 4→5, then give up
const RETRY_DELAYS_MS = [1, 5, 30, 120].map(m => m * 60 * 1000);
const MAX_ATTEMPTS = 5;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Endpoint management
  // ---------------------------------------------------------------------------

  async register(merchantId: string, url: string, events: string[]) {
    const unknown = events.filter(e => !(WEBHOOK_EVENTS as readonly string[]).includes(e));
    if (unknown.length) {
      throw new UnprocessableEntityException(
        `Unknown event type(s): ${unknown.join(', ')}. Valid: ${WEBHOOK_EVENTS.join(', ')}`,
      );
    }

    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: { merchantId, url, secret, events, isActive: true },
    });

    // Return the secret only at creation time — never again
    return { ...endpoint, secret };
  }

  async list(merchantId: string) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { merchantId, isActive: true },
      select: {
        id: true, url: true, events: true, isActive: true, createdAt: true, updatedAt: true,
        // Secret intentionally omitted from list
      },
    });
    return endpoints;
  }

  async deactivate(id: string, merchantId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, merchantId },
    });
    if (!endpoint) throw new NotFoundException(`Webhook endpoint ${id} not found`);
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, url: true, isActive: true, updatedAt: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Dispatch — called whenever a payment status changes
  // ---------------------------------------------------------------------------

  async dispatch(paymentInstructionId: string, eventType: WebhookEventType): Promise<void> {
    const instruction = await this.prisma.paymentInstruction.findUnique({
      where: { id: paymentInstructionId },
      include: { splits: true },
    });
    if (!instruction) return;

    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        merchantId: instruction.merchantId,
        isActive: true,
        OR: [
          { events: { has: eventType } },
          { events: { has: '*' } },
        ],
      },
    });

    if (!endpoints.length) return;

    const payload = this.buildPayload(eventType, instruction);

    for (const endpoint of endpoints) {
      const event = await this.prisma.webhookEvent.create({
        data: {
          endpointId: endpoint.id,
          paymentInstructionId,
          eventType,
          payload,
          status: 'PENDING',
        },
      });

      // Attempt immediate delivery — failure is handled by the retry cron
      await this.deliver(event.id, endpoint.url, endpoint.secret, payload);
    }
  }

  // ---------------------------------------------------------------------------
  // Retry cron — runs every 30 seconds
  // ---------------------------------------------------------------------------

  @Cron(CronExpression.EVERY_30_SECONDS)
  async retryPendingEvents(): Promise<void> {
    const due = await this.prisma.webhookEvent.findMany({
      where: {
        status: 'PENDING',
        attempts: { lt: MAX_ATTEMPTS },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      include: { endpoint: { select: { url: true, secret: true, isActive: true } } },
      take: 50,
      orderBy: { nextRetryAt: 'asc' },
    });

    for (const event of due) {
      if (!event.endpoint.isActive) {
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: { status: 'FAILED' },
        });
        continue;
      }
      await this.deliver(event.id, event.endpoint.url, event.endpoint.secret, event.payload as Record<string, unknown>);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal delivery
  // ---------------------------------------------------------------------------

  private async deliver(
    eventId: string,
    url: string,
    secret: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const sig = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

    const event = await this.prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (!event) return;

    const attempt = event.attempts + 1;

    try {
      await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Golink-Signature': sig,
          'X-Golink-Event': event.eventType,
          'X-Golink-Delivery': eventId,
        },
        timeout: 10_000,
        validateStatus: status => status >= 200 && status < 300,
      });

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { status: 'DELIVERED', attempts: attempt, lastAttemptAt: new Date(), nextRetryAt: null },
      });

      this.logger.log(`Webhook delivered eventId=${eventId} url=${url} attempt=${attempt}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook delivery failed eventId=${eventId} attempt=${attempt} err=${msg}`);

      const isFinal = attempt >= MAX_ATTEMPTS;
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      const nextRetryAt = isFinal ? null : new Date(Date.now() + delay);

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: isFinal ? 'FAILED' : 'PENDING',
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextRetryAt,
        },
      });

      if (isFinal) {
        this.logger.error(`Webhook permanently failed eventId=${eventId} url=${url} after ${attempt} attempts`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Payload builder
  // ---------------------------------------------------------------------------

  private buildPayload(
    eventType: WebhookEventType,
    instruction: Awaited<ReturnType<typeof this.prisma.paymentInstruction.findUnique>> & {
      splits?: Array<{ merchantId: string; amountMinor: number; status: string; description: string | null }>;
    },
  ): Record<string, unknown> {
    if (!instruction) return {};
    return {
      id: `evt_${instruction.id}_${eventType.replace('.', '_')}`,
      type: eventType,
      created: new Date().toISOString(),
      data: {
        paymentId: instruction.id,
        merchantId: instruction.merchantId,
        status: instruction.status,
        direction: instruction.direction,
        rail: instruction.rail,
        amountMinor: Math.round(Number(instruction.amount) * 100),
        currency: instruction.currency,
        sourceReference: instruction.sourceReference ?? null,
        description: instruction.description ?? null,
        metadata: instruction.metadata ?? null,
        ...(instruction.splits?.length
          ? {
              splits: instruction.splits.map(s => ({
                merchantId: s.merchantId,
                amountMinor: s.amountMinor,
                description: s.description,
                status: s.status,
              })),
            }
          : {}),
      },
    };
  }
}
