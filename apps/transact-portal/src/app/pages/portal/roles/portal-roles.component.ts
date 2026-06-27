import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PortalApiService, SystemRole } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-roles',
  templateUrl: './portal-roles.component.html',
  styleUrls: ['./portal-roles.component.scss'],
  standalone: false,
})
export class PortalRolesComponent implements OnInit {
  loading = true;
  error = '';
  roles: SystemRole[] = [];

  constructor(
    private readonly api: PortalApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.error = '';
    this.api.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load roles.';
        this.loading = false;
      },
    });
  }

  openRole(id: string): void {
    this.router.navigate(['/portal/roles', id]);
  }

  createRole(): void {
    this.router.navigate(['/portal/roles/new']);
  }

  get activeRoles(): number {
    return this.roles.filter((r) => r.isActive).length;
  }

  get builtInCount(): number {
    return this.roles.filter((r) => r.isBuiltIn).length;
  }

  fourEyesCount(role: SystemRole): number {
    return role.permissions?.filter((p) => p.requires4Eyes).length ?? 0;
  }
}
