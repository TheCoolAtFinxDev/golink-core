import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminPaymentRecord, PortalApiService } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-payments',
  templateUrl: './portal-payments.component.html',
  styleUrls: ['./portal-payments.component.scss'],
  standalone: false,
})
export class PortalPaymentsComponent implements OnInit {
  loading = true;
  error = '';

  merchantId = '';
  search = '';
  localStatusFilter = 'all';
  localRailFilter = 'all';
  currentPage = 1;
  pageSize = 20;
  readonly pageSizeOptions = [10, 20, 50, 100];

  allPayments: AdminPaymentRecord[] = [];
  selectedPaymentIds: string[] = [];
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private readonly api: PortalApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading = true;
    this.error = '';
    this.api.getPayments(this.merchantId ? { merchantId: this.merchantId } : undefined).subscribe({
      next: (payments) => {
        this.allPayments = payments;
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load payments.';
        this.loading = false;
      },
    });
  }

  openPayment(payment: AdminPaymentRecord): void {
    this.router.navigate(['/portal/payments', payment.id]);
  }

  get filteredPayments(): AdminPaymentRecord[] {
    const q = this.search.trim().toLowerCase();
    return this.allPayments.filter((p) => {
      if (this.localStatusFilter !== 'all' && p.status !== this.localStatusFilter) return false;
      if (this.localRailFilter !== 'all' && p.rail !== this.localRailFilter) return false;
      if (!q) return true;
      const payerStr = JSON.stringify(p.payer).toLowerCase();
      const payeeStr = JSON.stringify(p.payee).toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        (p.sourceReference ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.merchantId.toLowerCase().includes(q) ||
        payerStr.includes(q) ||
        payeeStr.includes(q)
      );
    });
  }

  get sortedFilteredPayments(): AdminPaymentRecord[] {
    if (!this.sortColumn) return this.filteredPayments;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.filteredPayments].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[this.sortColumn] ?? '');
      const bv = String((b as unknown as Record<string, unknown>)[this.sortColumn] ?? '');
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }

  get payments(): AdminPaymentRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedFilteredPayments.slice(start, start + this.pageSize);
  }

  get total(): number { return this.filteredPayments.length; }
  get pageStart(): number { return this.total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.currentPage * this.pageSize, this.total); }

  applyFilters(): void { this.currentPage = 1; }
  clearFilters(): void { this.search = ''; this.localStatusFilter = 'all'; this.localRailFilter = 'all'; this.currentPage = 1; }
  onPageChange(page: number): void { this.currentPage = page; }
  onPageSizeChange(): void { this.currentPage = 1; }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'ri-arrow-up-down-line text-muted opacity-50';
    return this.sortDirection === 'asc' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line';
  }

  get allVisibleSelected(): boolean {
    return this.payments.length > 0 && this.payments.every((p) => this.selectedPaymentIds.includes(p.id));
  }

  get hasSelection(): boolean { return this.selectedPaymentIds.length > 0; }

  toggleSelection(id: string, event?: Event): void {
    event?.stopPropagation();
    if (this.selectedPaymentIds.includes(id)) {
      this.selectedPaymentIds = this.selectedPaymentIds.filter((x) => x !== id);
    } else {
      this.selectedPaymentIds = [...this.selectedPaymentIds, id];
    }
  }

  toggleSelectAllVisible(event?: Event): void {
    event?.stopPropagation();
    if (this.allVisibleSelected) {
      const ids = new Set(this.payments.map((p) => p.id));
      this.selectedPaymentIds = this.selectedPaymentIds.filter((id) => !ids.has(id));
    } else {
      const merged = new Set([...this.selectedPaymentIds, ...this.payments.map((p) => p.id)]);
      this.selectedPaymentIds = Array.from(merged);
    }
  }

  exportSelectedPayments(): void {
    const selected = this.allPayments.filter((p) => this.selectedPaymentIds.includes(p.id));
    const header = ['id', 'merchantId', 'rail', 'direction', 'status', 'amount', 'currency', 'sourceReference', 'createdAt'];
    const escapeCsv = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.join(','),
      ...selected.map((p) =>
        header.map((c) => escapeCsv(String((p as unknown as Record<string, unknown>)[c] ?? ''))).join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payments-selected.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  get succeededCount(): number { return this.allPayments.filter((p) => p.status === 'SUCCEEDED').length; }
  get pendingCount(): number { return this.allPayments.filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING').length; }
  get failedCount(): number { return this.allPayments.filter((p) => p.status === 'FAILED').length; }

  get succeededVolume(): number {
    return this.allPayments
      .filter((p) => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  get displayCurrency(): string { return this.allPayments[0]?.currency ?? ''; }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'SUCCEEDED': return 'bg-success-subtle text-success';
      case 'PROCESSING':
      case 'PENDING':   return 'bg-warning-subtle text-warning';
      case 'FAILED':    return 'bg-danger-subtle text-danger';
      case 'CANCELLED': return 'bg-secondary-subtle text-secondary';
      default:          return 'bg-secondary-subtle text-secondary';
    }
  }

  railBadgeClass(rail: string): string {
    switch (rail) {
      case 'CARD':    return 'bg-primary-subtle text-primary';
      case 'MPESA':   return 'bg-success-subtle text-success';
      case 'ECOCASH': return 'bg-warning-subtle text-warning';
      case 'EFT':     return 'bg-info-subtle text-info';
      default:        return 'bg-secondary-subtle text-secondary';
    }
  }

  payerLabel(payment: AdminPaymentRecord): string {
    const p = payment.payer as Record<string, string>;
    return p['name'] ?? p['phone'] ?? p['accountName'] ?? payment.merchantId;
  }
}
