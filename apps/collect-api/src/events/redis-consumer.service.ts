import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  GolinkDomainEvent,
  GolinkEventType,
  GOLINK_STREAM_NAMES,
  TransactPaymentCreatedPayload,
  TransactPaymentStatusChangedPayload,
} from '@golink-suite/domain-events';
import { PrismaService } from '../prisma/prisma.service';

const CONSUMER_GROUP = 'collect-api';
const CONSUMER_NAME = 'collect-api-1';
const BLOCK_MS = 5000;

@Injectable()
export class RedisConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConsumerService.name);
  private redis!: Redis;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(url);
    await this.ensureConsumerGroup();
    this.running = true;
    this.poll();
  }

  async onModuleDestroy() {
    this.running = false;
    await this.redis.quit();
  }

  private async ensureConsumerGroup() {
    try {
      await this.redis.xgroup(
        'CREATE',
        GOLINK_STREAM_NAMES.TRANSACT,
        CONSUMER_GROUP,
        '$',
        'MKSTREAM',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('BUSYGROUP')) throw err;
    }
  }

  private async poll() {
    while (this.running) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP',
          CONSUMER_GROUP,
          CONSUMER_NAME,
          'BLOCK',
          BLOCK_MS,
          'COUNT',
          10,
          'STREAMS',
          GOLINK_STREAM_NAMES.TRANSACT,
          '>',
        );

        if (!results) continue;

        for (const [, messages] of results as [string, [string, string[]][]][]) {
          for (const [id, fields] of messages) {
            await this.handleMessage(id, fields);
          }
        }
      } catch (err) {
        if (this.running) {
          this.logger.error('Redis consumer error', err);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  private async handleMessage(id: string, fields: string[]) {
    const raw = fields[fields.indexOf('event') + 1];
    if (!raw) {
      await this.redis.xack(GOLINK_STREAM_NAMES.TRANSACT, CONSUMER_GROUP, id);
      return;
    }

    try {
      const event = JSON.parse(raw) as GolinkDomainEvent;

      if (event.type === GolinkEventType.TransactPaymentCreated) {
        await this.handlePaymentCreated(event as GolinkDomainEvent<TransactPaymentCreatedPayload>);
      } else if (event.type === GolinkEventType.TransactPaymentStatusChanged) {
        await this.handlePaymentStatusChanged(event as GolinkDomainEvent<TransactPaymentStatusChangedPayload>);
      }

      await this.redis.xack(GOLINK_STREAM_NAMES.TRANSACT, CONSUMER_GROUP, id);
    } catch (err) {
      this.logger.error(`Failed to process message ${id}`, err);
    }
  }

  private async handlePaymentCreated(event: GolinkDomainEvent<TransactPaymentCreatedPayload>) {
    const p = event.payload;
    await this.prisma.paymentProjection.upsert({
      where: { transactPaymentId: p.paymentId },
      create: {
        transactPaymentId: p.paymentId,
        billId: p.billId ?? null,
        merchantId: p.merchantId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        rail: p.rail,
        occurredAt: new Date(event.occurredAt),
      },
      update: {},
    });
  }

  private async handlePaymentStatusChanged(event: GolinkDomainEvent<TransactPaymentStatusChangedPayload>) {
    const p = event.payload;
    await this.prisma.paymentProjection.updateMany({
      where: { transactPaymentId: p.paymentId },
      data: {
        status: p.newStatus,
        pspReference: p.pspReference ?? undefined,
        failureReason: p.failureReason ?? undefined,
        updatedAt: new Date(event.occurredAt),
      },
    });
  }
}
