import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  createGolinkDomainEvent,
  GolinkEventType,
  GOLINK_STREAM_NAMES,
  type TransactPaymentCreatedPayload,
  type TransactPaymentStatusChangedPayload,
} from '@golink-suite/domain-events';

@Injectable()
export class RedisPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPublisherService.name);
  private redis!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(url, { lazyConnect: false });
    this.redis.on('error', (err) => this.logger.error('Redis error', err.message));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async publishPaymentCreated(payload: TransactPaymentCreatedPayload): Promise<void> {
    const event = createGolinkDomainEvent(
      GolinkEventType.TransactPaymentCreated,
      'transact-api',
      `payment:${payload.paymentId}`,
      payload,
    );
    await this.xadd(event);
  }

  async publishPaymentStatusChanged(payload: TransactPaymentStatusChangedPayload): Promise<void> {
    const event = createGolinkDomainEvent(
      GolinkEventType.TransactPaymentStatusChanged,
      'transact-api',
      `payment:${payload.paymentId}`,
      payload,
    );
    await this.xadd(event);
  }

  private async xadd(event: ReturnType<typeof createGolinkDomainEvent>): Promise<void> {
    try {
      await this.redis.xadd(
        GOLINK_STREAM_NAMES.TRANSACT,
        '*',
        'event',
        JSON.stringify(event),
      );
    } catch (err: unknown) {
      this.logger.error(`Failed to publish event type=${event.type}`, (err as Error).message);
    }
  }
}
