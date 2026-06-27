import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  Organization,
  PortalApiService,
  SystemUserRecord,
} from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-users',
  templateUrl: './portal-users.component.html',
  styleUrls: ['./portal-users.component.scss'],
  standalone: false,
})
export class PortalUsersComponent implements OnInit {
  loading = true;
  filterLoading = false;
  error = '';

  users: SystemUserRecord[] = [];
  organizations: Organization[] = [];
  total = 0;
  currentPage = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 20, 50, 100];

  search = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  roleFilter: '' | 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' = '';
  organizationFilter = '';

  readonly roleOptions: Array<'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER'> = [
    'OWNER',
    'ADMIN',
    'OPERATOR',
    'VIEWER',
  ];

  constructor(
    private readonly api: PortalApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadUsers();
  }

  loadOrganizations(): void {
    this.filterLoading = true;
    this.api
      .getOrganizations({
        page: 1,
        pageSize: 200,
      })
      .subscribe({
        next: (response) => {
          this.organizations = response.items;
          this.filterLoading = false;
        },
        error: () => {
          this.filterLoading = false;
        },
      });
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    this.api
      .getUsers({
        q: this.search,
        isActive:
          this.statusFilter === 'all'
            ? undefined
            : this.statusFilter === 'active',
        role: this.roleFilter || undefined,
        organizationId: this.organizationFilter || undefined,
        page: this.currentPage,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.users = response.items;
          this.total = response.total;
          this.currentPage = response.page;
          this.pageSize = response.pageSize;
          this.loading = false;
          setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        },
        error: (error) => {
          this.error = (typeof error === 'string' ? error : error?.error?.message) || 'Failed to load users.';
          this.loading = false;
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'all';
    this.roleFilter = '';
    this.organizationFilter = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  openUser(userId: string): void {
    this.router.navigate(['/portal/users', userId]);
  }

  createUser(): void {
    this.router.navigate(['/portal/users/new']);
  }

  get activeCount(): number {
    return this.users.filter((user) => user.isActive).length;
  }

  get withPasswordCount(): number {
    return this.users.filter((user) => user.hasPassword).length;
  }

  get withMembershipCount(): number {
    return this.users.filter((user) => user.memberships.length > 0).length;
  }

  get pageStart(): number {
    if (this.total === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    if (this.total === 0) {
      return 0;
    }

    return Math.min(this.currentPage * this.pageSize, this.total);
  }

  membershipSummary(user: SystemUserRecord): string {
    if (!user.memberships.length) {
      return 'No memberships';
    }

    return user.memberships
      .slice(0, 2)
      .map((membership) => `${membership.organization.code} · ${membership.role}`)
      .join(', ');
  }
}
