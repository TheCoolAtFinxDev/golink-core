import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { PortalRoutingModule } from './portal-routing.module';
import { PortalDashboardComponent } from './dashboard/portal-dashboard.component';
import { PortalOrganizationsComponent } from './organizations/portal-organizations.component';
import { PortalOrganizationDetailComponent } from './organizations/portal-organization-detail.component';
import { PortalOrganizationCreateWizardComponent } from './organizations/portal-organization-create-wizard.component';
import { PortalOrganizationWorkspaceModalComponent } from './organizations/portal-organization-workspace-modal.component';
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

@NgModule({
  declarations: [
    PortalDashboardComponent,
    PortalOrganizationsComponent,
    PortalOrganizationDetailComponent,
    PortalOrganizationCreateWizardComponent,
    PortalOrganizationWorkspaceModalComponent,
    PortalPaymentsComponent,
    PortalPaymentDetailComponent,
    PortalPaymentCreateComponent,
    PortalCpsBatchesComponent,
    PortalPaymentLinksComponent,
    PortalUsersComponent,
    PortalUserDetailComponent,
    PortalRolesComponent,
    PortalRoleDetailComponent,
    PortalApprovalsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbModalModule,
    NgbPaginationModule,
    RouterModule,
    BaseChartDirective,
    PortalRoutingModule,
  ],
  providers: [
    provideCharts(withDefaultRegisterables()),
  ],
})
export class PortalModule {}
