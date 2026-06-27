import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { PspModule } from '../psp/psp.module';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PaymentsService } from './payments.service';
import { PaymentsController, AdminPaymentsController, PspCallbackController } from './payments.controller';

@Module({
  imports: [AdminAuthModule, ApprovalsModule, PspModule, EventsModule, AuthModule, WebhooksModule],
  controllers: [PaymentsController, AdminPaymentsController, PspCallbackController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
