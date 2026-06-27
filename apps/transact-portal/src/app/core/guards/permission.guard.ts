import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AccessControlService } from '../services/access-control.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | UrlTree {
    const currentUser = this.accessControl.getCurrentUser();
    if (!currentUser) {
      return this.router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const permissionsAll = (route.data['permissions'] as string[] | undefined) ?? [];
    const permissionsAny =
      (route.data['permissionsAny'] as string[] | undefined) ?? [];
    const fallbackUrl =
      (route.data['fallbackUrl'] as string | undefined) ?? '/portal/dashboard';

    const allowedAll = this.accessControl.matchesPermissions(permissionsAll, 'all');
    const allowedAny = this.accessControl.matchesPermissions(permissionsAny, 'any');

    if (allowedAll && allowedAny) {
      return true;
    }

    if (
      fallbackUrl === '/portal/my-organization' &&
      this.accessControl.can('organization.read.own')
    ) {
      return this.router.createUrlTree(['/portal/my-organization']);
    }

    return this.router.createUrlTree([fallbackUrl]);
  }
}
