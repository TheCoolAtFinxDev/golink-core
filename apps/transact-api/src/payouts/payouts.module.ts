import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PspModule } from '../psp/psp.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';

@Module({
  imports: [PrismaModule, PspModule, WebhooksModule, EventsModule, AuthModule],
  providers: [PayoutsService],
  controllers: [PayoutsController],
  exports: [PayoutsService],
})
export class PayoutsModule {}
