import { Injectable } from '@angular/core';
import { AccessMembership, User } from 'src/app/store/Authentication/auth.models';

type PermissionMatch = 'all' | 'any';

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  getCurrentUser(): User | null {
    const rawUser = sessionStorage.getItem('currentUser');
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      return null;
    }
  }

  getCapabilities(): string[] {
    return this.getCurrentUser()?.capabilities ?? [];
  }

  getVisibleModules(): string[] {
    return this.getCurrentUser()?.visibleModules ?? [];
  }

  getPrimaryOrganizationId(): string | null {
    return this.getCurrentUser()?.primaryOrganizationId ?? null;
  }

  getAccessMemberships(): AccessMembership[] {
    return this.getCurrentUser()?.accessMemberships ?? [];
  }

  canAccessAnyOrganization(): boolean {
    return this.can('organization.read.any');
  }

  getScopedOrganizationMembership(): AccessMembership | null {
    const memberships = this.getAccessMemberships();
    if (!memberships.length) {
      return null;
    }

    const primaryOrganizationId = this.getPrimaryOrganizationId();
    if (primaryOrganizationId) {
      const primaryMembership = memberships.find(
        (membership) => membership.organizationId === primaryOrganizationId,
      );
      if (primaryMembership) {
        return primaryMembership;
      }
    }

    return memberships[0] ?? null;
  }

  getScopedOrganizationId(): string | null {
    return this.getScopedOrganizationMembership()?.organizationId ?? null;
  }

  resolveOrganizationId(requestedOrganizationId?: string | null): string {
    const normalizedRequested = requestedOrganizationId?.trim() ?? '';
    if (this.canAccessAnyOrganization()) {
      return normalizedRequested;
    }

    return this.getScopedOrganizationId() ?? normalizedRequested;
  }

  getOrganizationLabel(organizationId?: string | null): string {
    if (!organizationId?.trim()) {
      return '';
    }

    const membership = this.getAccessMemberships().find(
      (item) => item.organizationId === organizationId,
    );

    return (
      membership?.organizationName?.trim() ||
      membership?.organizationCode?.trim() ||
      organizationId
    );
  }

  can(permission: string): boolean {
    return this.getCapabilities().includes(permission);
  }

  canAny(permissions: string[]): boolean {
    if (!permissions.length) {
      return true;
    }

    return permissions.some((permission) => this.can(permission));
  }

  canAll(permissions: string[]): boolean {
    return permissions.every((permission) => this.can(permission));
  }

  hasModule(moduleName: string): boolean {
    return this.getVisibleModules().includes(moduleName);
  }

  hasOrganizationPermission(permission: string, organizationId: string): boolean {
    return this.getAccessMemberships().some(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.permissions.includes(permission),
    );
  }

  matchesPermissions(
    permissions: string[] = [],
    mode: PermissionMatch = 'all',
  ): boolean {
    if (!permissions.length) {
      return true;
    }

    return mode === 'all'
      ? this.canAll(permissions)
      : this.canAny(permissions);
  }
}
