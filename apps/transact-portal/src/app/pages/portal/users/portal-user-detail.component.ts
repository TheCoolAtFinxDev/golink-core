import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Organization,
  PortalApiService,
  SystemUserMembership,
  SystemUserRecord,
} from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-user-detail',
  templateUrl: './portal-user-detail.component.html',
  styleUrls: ['./portal-user-detail.component.scss'],
  standalone: false,
})
export class PortalUserDetailComponent implements OnInit {
  loading = true;
  saving = false;
  membershipSaving = false;
  error = '';
  successMessage = '';

  userId = '';
  user: SystemUserRecord | null = null;
  organizations: Organization[] = [];
  editingMembershipId = '';

  readonly roleOptions: Array<'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER'> = [
    'OWNER',
    'ADMIN',
    'OPERATOR',
    'VIEWER',
  ];

  readonly userForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    isActive: [true],
    password: ['', [Validators.minLength(8)]],
  });

  readonly membershipForm = this.formBuilder.group({
    organizationId: ['', [Validators.required]],
    role: ['OPERATOR', [Validators.required]],
    isPrimary: [false],
    isActive: [true],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly formBuilder: FormBuilder,
    private readonly api: PortalApiService,
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') ?? 'new';
    this.loadOrganizations();

    if (this.isCreateMode) {
      this.loading = false;
      return;
    }

    this.loadUser();
  }

  get isCreateMode(): boolean {
    return this.userId === 'new';
  }

  get pageTitle(): string {
    return this.isCreateMode ? 'Create User' : this.user?.name || 'User Workspace';
  }

  get pageSubtitle(): string {
    return this.isCreateMode
      ? 'Create a system user first, then assign memberships and portal credentials.'
      : 'Manage credentials, status, and organization memberships from one workspace.';
  }

  get primaryMembershipCode(): string {
    return this.user?.memberships.find((membership) => membership.isPrimary)?.organization.code || 'Unset';
  }

  loadOrganizations(): void {
    this.api
      .getOrganizations({
        page: 1,
        pageSize: 200,
      })
      .subscribe({
        next: (response) => {
          this.organizations = response.items;
        },
      });
  }

  loadUser(): void {
    this.loading = true;
    this.error = '';

    this.api.getUser(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.userForm.reset({
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          password: '',
        });
        this.resetMembershipForm();
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: (error) => {
        this.error = error?.error?.message || 'Failed to load user.';
        this.loading = false;
      },
    });
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.getRawValue();
    const payload = {
      name: (value.name ?? '').trim(),
      email: (value.email ?? '').trim().toLowerCase(),
      isActive: !!value.isActive,
      password: (value.password ?? '').trim() || undefined,
    };

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    const request$ = this.isCreateMode
      ? this.api.createUser(payload)
      : this.api.updateUser(this.userId, payload);

    request$.subscribe({
      next: (user) => {
        this.saving = false;
        this.user = user;
        this.userForm.patchValue({ password: '' });
        this.successMessage = this.isCreateMode
          ? 'User created successfully.'
          : 'User updated successfully.';

        if (this.isCreateMode) {
          void this.router.navigate(['/portal/users', user.id]);
          return;
        }

        this.loadUser();
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message || 'Failed to save user.';
      },
    });
  }

  editMembership(membership: SystemUserMembership): void {
    this.editingMembershipId = membership.id;
    this.membershipForm.reset({
      organizationId: membership.organizationId,
      role: membership.role,
      isPrimary: membership.isPrimary,
      isActive: membership.isActive,
    });
  }

  resetMembershipForm(): void {
    this.editingMembershipId = '';
    this.membershipForm.reset({
      organizationId: '',
      role: 'OPERATOR',
      isPrimary: false,
      isActive: true,
    });
  }

  saveMembership(): void {
    if (!this.user || this.membershipForm.invalid) {
      this.membershipForm.markAllAsTouched();
      return;
    }

    const value = this.membershipForm.getRawValue();
    const payload = {
      organizationId: value.organizationId ?? '',
      role: (value.role ?? 'OPERATOR') as
        | 'OWNER'
        | 'ADMIN'
        | 'OPERATOR'
        | 'VIEWER',
      isPrimary: !!value.isPrimary,
      isActive: !!value.isActive,
    };

    this.membershipSaving = true;
    this.error = '';
    this.successMessage = '';

    const request$ = this.editingMembershipId
      ? this.api.updateUserMembership(this.user.id, this.editingMembershipId, payload)
      : this.api.addUserMembership(this.user.id, payload);

    request$.subscribe({
      next: (user) => {
        this.user = user;
        this.membershipSaving = false;
        this.successMessage = this.editingMembershipId
          ? 'Membership updated successfully.'
          : 'Membership added successfully.';
        this.resetMembershipForm();
      },
      error: (error) => {
        this.membershipSaving = false;
        this.error = error?.error?.message || 'Failed to save membership.';
      },
    });
  }

  deactivateMembership(membership: SystemUserMembership): void {
    if (!this.user) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate ${membership.organization.name} membership for ${this.user.email}?`,
    );
    if (!confirmed) {
      return;
    }

    this.membershipSaving = true;
    this.error = '';
    this.successMessage = '';

    this.api.deactivateUserMembership(this.user.id, membership.id).subscribe({
      next: (user) => {
        this.user = user;
        this.membershipSaving = false;
        this.successMessage = 'Membership deactivated successfully.';
        this.resetMembershipForm();
      },
      error: (error) => {
        this.membershipSaving = false;
        this.error = error?.error?.message || 'Failed to deactivate membership.';
      },
    });
  }

  deactivateUser(): void {
    if (!this.user) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate ${this.user.email}? This will disable all memberships as well.`,
    );
    if (!confirmed) {
      return;
    }

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    this.api.deactivateUser(this.user.id).subscribe({
      next: (user) => {
        this.user = user;
        this.saving = false;
        this.successMessage = 'User deactivated successfully.';
        this.userForm.patchValue({
          isActive: user.isActive,
          password: '',
        });
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message || 'Failed to deactivate user.';
      },
    });
  }

  openOrganization(organizationId: string): void {
    void this.router.navigate(['/portal/partners', organizationId]);
  }

  goBack(): void {
    void this.router.navigate(['/portal/users']);
  }
}
