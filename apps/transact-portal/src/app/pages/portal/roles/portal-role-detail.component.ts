import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PortalApiService, SystemRole, PermissionDef } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-role-detail',
  templateUrl: './portal-role-detail.component.html',
  styleUrls: ['./portal-role-detail.component.scss'],
  standalone: false,
})
export class PortalRoleDetailComponent implements OnInit {
  loading = true;
  saving = false;
  error = '';
  successMessage = '';

  roleId = '';
  role: SystemRole | null = null;
  allPermissions: PermissionDef[] = [];

  readonly roleForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly api: PortalApiService,
  ) {}

  ngOnInit(): void {
    this.roleId = this.route.snapshot.paramMap.get('id') ?? 'new';
    this.loadPermissions();
    if (!this.isCreateMode) {
      this.loadRole();
    } else {
      this.loading = false;
    }
  }

  get isCreateMode(): boolean {
    return this.roleId === 'new';
  }

  get pageTitle(): string {
    return this.isCreateMode ? 'Create Role' : (this.role?.name ?? 'Role');
  }

  loadRole(): void {
    this.loading = true;
    this.api.getRole(this.roleId).subscribe({
      next: (role) => {
        this.role = role;
        this.roleForm.patchValue({ name: role.name, description: role.description ?? '' });
        if (role.isBuiltIn) {
          this.roleForm.get('name')?.disable();
        }
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load role.';
        this.loading = false;
      },
    });
  }

  loadPermissions(): void {
    this.api.getPermissions().subscribe({
      next: (perms) => { this.allPermissions = perms; },
    });
  }

  saveRole(): void {
    if (this.roleForm.invalid) return;
    this.saving = true;
    this.error = '';

    const data = this.roleForm.getRawValue();

    const req = this.isCreateMode
      ? this.api.createRole({ name: data.name!, description: data.description ?? undefined })
      : this.api.updateRole(this.roleId, { description: data.description ?? undefined });

    req.subscribe({
      next: (role) => {
        this.successMessage = this.isCreateMode ? 'Role created.' : 'Role updated.';
        this.saving = false;
        if (this.isCreateMode) {
          this.router.navigate(['/portal/roles', role.id]);
        } else {
          this.role = role;
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to save role.';
        this.saving = false;
      },
    });
  }

  hasPermission(permissionId: string): boolean {
    return this.role?.permissions?.some((g) => g.permissionId === permissionId) ?? false;
  }

  is4Eyes(permissionId: string): boolean {
    return this.role?.permissions?.find((g) => g.permissionId === permissionId)?.requires4Eyes ?? false;
  }

  togglePermission(permissionId: string): void {
    if (!this.role) return;
    const has = this.hasPermission(permissionId);
    const snapshot = this.role;

    // optimistic update
    if (has) {
      this.role = { ...this.role, permissions: this.role.permissions?.filter((g) => g.permissionId !== permissionId) };
    } else {
      const perm = this.allPermissions.find((p) => p.id === permissionId);
      if (perm) {
        this.role = {
          ...this.role,
          permissions: [...(this.role.permissions ?? []), { id: '', permissionId, requires4Eyes: false, permission: perm }],
        };
      }
    }

    const req$ = has
      ? this.api.removeRolePermission(snapshot.id, permissionId)
      : this.api.setRolePermission(snapshot.id, permissionId, false);

    req$.subscribe({
      next: (updated) => { this.role = updated; },
      error: (err) => { this.role = snapshot; this.error = err?.error?.message || 'Failed to update permission.'; },
    });
  }

  toggle4Eyes(permissionId: string): void {
    if (!this.role) return;
    const current = this.is4Eyes(permissionId);
    const snapshot = this.role;

    // optimistic update
    this.role = {
      ...this.role,
      permissions: this.role.permissions?.map((g) =>
        g.permissionId === permissionId ? { ...g, requires4Eyes: !current } : g,
      ),
    };

    this.api.setRolePermission(snapshot.id, permissionId, !current).subscribe({
      next: (updated) => { this.role = updated; },
      error: (err) => { this.role = snapshot; this.error = err?.error?.message || 'Failed to update 4-eyes flag.'; },
    });
  }

  permissionsByCategory(): Array<{ category: string; permissions: PermissionDef[] }> {
    const map = new Map<string, PermissionDef[]>();
    for (const p of this.allPermissions) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries())
      .map(([category, permissions]) => ({ category, permissions }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  back(): void {
    this.router.navigate(['/portal/roles']);
  }
}
