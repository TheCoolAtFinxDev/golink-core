import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Merchant, PortalApiService } from '../shared/portal-api.service';
import { PortalOrganizationCreateWizardComponent } from './portal-organization-create-wizard.component';

@Component({
  selector: 'app-portal-organizations',
  templateUrl: './portal-organizations.component.html',
  styleUrls: ['./portal-organizations.component.scss'],
  standalone: false,
})
export class PortalOrganizationsComponent implements OnInit {
  loading = true;
  error = '';
  successMessage = '';
  search = '';
  merchants: Merchant[] = [];

  constructor(
    private readonly api: PortalApiService,
    private readonly router: Router,
    private readonly modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.loadMerchants();
  }

  loadMerchants(): void {
    this.loading = true;
    this.error = '';
    this.api.getMerchants().subscribe({
      next: (merchants) => {
        this.merchants = merchants;
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load merchants.';
        this.loading = false;
      },
    });
  }

  get filteredMerchants(): Merchant[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.merchants;
    return this.merchants.filter(
      (m) => m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q),
    );
  }

  openMerchant(merchant: Merchant): void {
    this.router.navigate(['/portal/partners', merchant.id]);
  }

  openCreateWizard(): void {
    const modalRef = this.modalService.open(PortalOrganizationCreateWizardComponent, {
      size: 'lg',
      scrollable: true,
    });

    modalRef.closed.subscribe((created: Merchant | undefined) => {
      if (!created) return;
      this.successMessage = `Merchant "${created.name}" created successfully.`;
      this.loadMerchants();
    });
  }

  get activeCount(): number {
    return this.merchants.filter((m) => m.status === 'ACTIVE').length;
  }

  statusBadgeClass(status: string): string {
    return status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
  }
}
