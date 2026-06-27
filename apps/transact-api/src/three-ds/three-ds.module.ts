import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PspModule } from '../psp/psp.module';
import { EventsModule } from '../events/events.module';
import { PaymentsModule } from '../payments/payments.module';
import { ThreeDsService } from './three-ds.service';
import { ThreeDsController } from './three-ds.controller';

@Module({
  imports: [PrismaModule, PspModule, EventsModule, PaymentsModule],
  controllers: [ThreeDsController],
  providers: [ThreeDsService],
  exports: [ThreeDsService],
})
export class ThreeDsModule {}
