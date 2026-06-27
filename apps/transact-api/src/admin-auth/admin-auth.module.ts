import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from './admin-jwt.guard';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { RbacBootstrapService } from './rbac-bootstrap.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('ADMIN_JWT_SECRET', 'glk-admin-jwt-secret-change-in-prod'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy, AdminJwtGuard, RbacBootstrapService],
  exports: [AdminJwtGuard, AdminJwtStrategy, JwtModule],
})
export class AdminAuthModule {}
