import { Module } from '@nestjs/common';
import { RedisConsumerService } from './redis-consumer.service';

@Module({
  providers: [RedisConsumerService],
})
export class EventsModule {}
