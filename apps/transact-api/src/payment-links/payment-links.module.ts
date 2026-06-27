import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController } from './payment-links.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentLinksController],
  providers: [PaymentLinksService],
  exports: [PaymentLinksService],
})
export class PaymentLinksModule {}
