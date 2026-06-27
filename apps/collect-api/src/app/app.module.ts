import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { CustomersModule } from '../customers/customers.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BillsModule } from '../bills/bills.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: 'apps/collect-api/.env', isGlobal: true }),
    PrismaModule,
    AuthModule,
    EventsModule,
    CustomersModule,
    OrganizationsModule,
    BillsModule,
  ],
})
export class AppModule {}
