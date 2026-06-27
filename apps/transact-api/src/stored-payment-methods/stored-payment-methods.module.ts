import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StoredPaymentMethodsService } from './stored-payment-methods.service';
import { StoredPaymentMethodsController } from './stored-payment-methods.controller';

@Module({
  imports: [AuthModule],
  controllers: [StoredPaymentMethodsController],
  providers: [StoredPaymentMethodsService],
  exports: [StoredPaymentMethodsService],
})
export class StoredPaymentMethodsModule {}
