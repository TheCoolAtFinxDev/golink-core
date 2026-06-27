import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentLinksModule } from '../payment-links/payment-links.module';
import { PaymentsModule } from '../payments/payments.module';
import { ThreeDsModule } from '../three-ds/three-ds.module';
import { PublicPayController } from './public-pay.controller';

@Module({
  imports: [PrismaModule, PaymentLinksModule, PaymentsModule, ThreeDsModule],
  controllers: [PublicPayController],
})
export class PublicPayModule {}
