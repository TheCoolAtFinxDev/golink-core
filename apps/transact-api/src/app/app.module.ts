import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { EventsModule } from '../events/events.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { PaymentsModule } from '../payments/payments.module';
import { PspModule } from '../psp/psp.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CpsBatchesModule } from '../cps-batches/cps-batches.module';
import { PaymentLinksModule } from '../payment-links/payment-links.module';
import { PublicPayModule } from '../public-pay/public-pay.module';
import { ThreeDsModule } from '../three-ds/three-ds.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StoredPaymentMethodsModule } from '../stored-payment-methods/stored-payment-methods.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: 'apps/transact-api/.env', isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AdminAuthModule,
    EventsModule,
    PspModule,
    MerchantsModule,
    PaymentsModule,
    UsersModule,
    RolesModule,
    ApprovalsModule,
    OrganizationsModule,
    CpsBatchesModule,
    PaymentLinksModule,
    PublicPayModule,
    ThreeDsModule,
    WebhooksModule,
    SubscriptionsModule,
    StoredPaymentMethodsModule,
  ],
})
export class AppModule {}
