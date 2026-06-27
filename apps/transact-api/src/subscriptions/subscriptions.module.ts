import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PspModule } from '../psp/psp.module';
import { EventsModule } from '../events/events.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [AuthModule, PspModule, EventsModule, WebhooksModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
