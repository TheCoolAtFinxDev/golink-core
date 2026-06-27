import { Module } from '@nestjs/common';
import { RedisPublisherService } from './redis-publisher.service';

@Module({
  providers: [RedisPublisherService],
  exports: [RedisPublisherService],
})
export class EventsModule {}
