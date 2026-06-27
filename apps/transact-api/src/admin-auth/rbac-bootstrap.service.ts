import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class RbacBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RbacBootstrapService.name);

  constructor(private readonly adminAuth: AdminAuthService) {}

  async onApplicationBootstrap() {
    try {
      await this.adminAuth.bootstrapRbac();
      this.logger.log('RBAC permissions and built-in roles bootstrapped');
    } catch (err) {
      this.logger.error('RBAC bootstrap failed', err);
    }
  }
}
