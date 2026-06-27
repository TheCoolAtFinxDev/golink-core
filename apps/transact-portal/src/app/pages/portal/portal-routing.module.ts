import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PortalDashboardComponent } from './dashboard/portal-dashboard.component';
import { PortalOrganizationsComponent } from './organizations/portal-organizations.component';
import { PortalOrganizationDetailComponent } from './organizations/portal-organization-detail.component';
import { PortalPaymentsComponent } from './payments/portal-payments.component';
import { PortalPaymentDetailComponent } from './payments/portal-payment-detail.component';
import { PortalPaymentCreateComponent } from './payments/portal-payment-create.component';
import { PortalCpsBatchesComponent } from './cps-batches/portal-cps-batches.component';
import { PortalPaymentLinksComponent } from './payment-links/portal-payment-links.component';
import { PortalUsersComponent } from './users/portal-users.component';
import { PortalUserDetailComponent } from './users/portal-user-detail.component';
import { PortalRolesComponent } from './roles/portal-roles.component';
import { PortalRoleDetailComponent } from './roles/portal-role-detail.component';
import { PortalApprovalsComponent } from './approvals/portal-approvals.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: PortalDashboardComponent },

  // Merchants
  { path: 'merchants', component: PortalOrganizationsComponent },
  { path: 'merchants/:id', component: PortalOrganizationDetailComponent },

  // Payments
  { path: 'payments', component: PortalPaymentsComponent },
  { path: 'payments/new', component: PortalPaymentCreateComponent },
  { path: 'payments/:id', component: PortalPaymentDetailComponent },

  // CPS Batches
  { path: 'cps-batches', component: PortalCpsBatchesComponent },

  // Payment Links
  { path: 'payment-links', component: PortalPaymentLinksComponent },

  // Approvals (4-eyes queue)
  { path: 'approvals', component: PortalApprovalsComponent },

  // Admin users
  { path: 'users', component: PortalUsersComponent },
  { path: 'users/new', component: PortalUserDetailComponent },
  { path: 'users/:id', component: PortalUserDetailComponent },

  // Roles & Permissions
  { path: 'roles', component: PortalRolesComponent },
  { path: 'roles/new', component: PortalRoleDetailComponent },
  { path: 'roles/:id', component: PortalRoleDetailComponent },

  // Legacy redirects
  { path: 'partners', redirectTo: 'merchants' },
  { path: 'partners/:id', redirectTo: 'merchants/:id' },
  { path: 'organizations', redirectTo: 'merchants' },
  { path: 'organizations/:id', redirectTo: 'merchants/:id' },
  { path: 'billers', redirectTo: 'dashboard' },
  { path: 'billers/:id', redirectTo: 'dashboard' },
  { path: 'customers', redirectTo: 'dashboard' },
  { path: 'customers/:id', redirectTo: 'dashboard' },
  { path: 'bills', redirectTo: 'dashboard' },
  { path: 'bills/:id', redirectTo: 'dashboard' },
  { path: 'subscriptions', redirectTo: 'dashboard' },
  { path: 'subscriptions/:id', redirectTo: 'dashboard' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PortalRoutingModule {}
