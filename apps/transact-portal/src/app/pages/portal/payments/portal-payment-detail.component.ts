import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminPaymentRecord, PortalApiService } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-payment-detail',
  templateUrl: './portal-payment-detail.component.html',
  styleUrls: ['./portal-payment-detail.component.scss'],
  standalone: false,
})
export class PortalPaymentDetailComponent implements OnInit {
  loading = true;
  actionLoading = false;
  error = '';
  successMessage = '';
  paymentId = '';
  payment: AdminPaymentRecord | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: PortalApiService,
  ) {}

  ngOnInit(): void {
    this.paymentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.paymentId) {
      this.error = 'Missing payment id.';
      this.loading = false;
      return;
    }
    this.loadPayment();
  }

  loadPayment(): void {
    this.loading = true;
    this.error = '';
    this.api.getPayment(this.paymentId).subscribe({
      next: (payment) => { this.payment = payment; this.loading = false; setTimeout(() => window.dispatchEvent(new Event('resize')), 50); },
      error: (err) => { this.error = err?.error?.message || 'Failed to load payment.'; this.loading = false; },
    });
  }

  retry(): void {
    if (!this.payment) return;
    this.actionLoading = true;
    this.error = '';
    this.api.retryPayment(this.payment.id).subscribe({
      next: (updated) => { this.payment = updated; this.successMessage = 'Payment retry submitted.'; this.actionLoading = false; },
      error: (err) => { this.error = err?.error?.message || 'Failed to retry payment.'; this.actionLoading = false; },
    });
  }

  cancel(): void {
    if (!this.payment || !confirm('Cancel this payment?')) return;
    this.actionLoading = true;
    this.error = '';
    this.api.cancelPayment(this.payment.id).subscribe({
      next: (updated) => { this.payment = updated; this.successMessage = 'Payment cancelled.'; this.actionLoading = false; },
      error: (err) => { this.error = err?.error?.message || 'Failed to cancel payment.'; this.actionLoading = false; },
    });
  }

  refund(): void {
    if (!this.payment || !confirm('Initiate a refund? This will enter the 4-eyes approval queue.')) return;
    this.actionLoading = true;
    this.error = '';
    this.api.refundPayment(this.payment.id).subscribe({
      next: () => { this.successMessage = 'Refund request queued for approval.'; this.actionLoading = false; },
      error: (err) => { this.error = err?.error?.message || 'Failed to initiate refund.'; this.actionLoading = false; },
    });
  }

  get canRetry(): boolean { return this.payment?.status === 'FAILED' || this.payment?.status === 'PENDING'; }
  get canCancel(): boolean { return this.payment?.status === 'PENDING' || this.payment?.status === 'PROCESSING'; }
  get canRefund(): boolean { return this.payment?.status === 'SUCCEEDED'; }

  statusBadgeClass(status?: string | null): string {
    switch (status) {
      case 'SUCCEEDED': return 'bg-success-subtle text-success';
      case 'PROCESSING':
      case 'PENDING':   return 'bg-warning-subtle text-warning';
      case 'FAILED':    return 'bg-danger-subtle text-danger';
      case 'CANCELLED': return 'bg-secondary-subtle text-secondary';
      default:          return 'bg-secondary-subtle text-secondary';
    }
  }

  railBadgeClass(rail?: string): string {
    switch (rail) {
      case 'CARD':    return 'bg-primary-subtle text-primary';
      case 'MPESA':   return 'bg-success-subtle text-success';
      case 'ECOCASH': return 'bg-warning-subtle text-warning';
      case 'EFT':     return 'bg-info-subtle text-info';
      default:        return 'bg-secondary-subtle text-secondary';
    }
  }

  executionStatusBadge(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'bg-success-subtle text-success';
      case 'PENDING': return 'bg-warning-subtle text-warning';
      case 'FAILED':  return 'bg-danger-subtle text-danger';
      default:        return 'bg-secondary-subtle text-secondary';
    }
  }

  goToList(): void {
    this.router.navigate(['/portal/payments']);
  }
}
