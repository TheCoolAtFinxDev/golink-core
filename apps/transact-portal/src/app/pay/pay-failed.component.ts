import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface PaymentStatus {
  paymentId: string;
  status: string;
  amountMinor: number;
  currency: string;
  rail: string;
  pspReference: string | null;
}

@Component({
  selector: 'app-pay-failed',
  standalone: false,
  template: `
    <div class="pay-page">
      <div class="pay-container">

        <!-- Branding header -->
        <div class="gk-brand-header">
          <div class="pay-brand"><i class="ri-secure-payment-line"></i></div>
          <span class="gk-wordmark">GoLink<span class="gk-wordmark-accent">Pay</span></span>
        </div>

        <div class="pay-card text-center py-4">

          <div class="pay-icon pay-icon-error">
            <i class="ri-close-circle-line"></i>
          </div>

          <h4 class="mt-3 mb-1">Payment Failed</h4>
          <p class="text-muted px-2">{{ friendlyMessage }}</p>

          <!-- Technical reason (collapsed by default, shown if it adds info) -->
          <div *ngIf="rawReason && rawReason !== friendlyMessage" class="gk-detail-chip mt-2">
            <i class="ri-information-line me-1"></i>{{ rawReason }}
          </div>

          <!-- Payment details (loaded from API) -->
          <div class="pay-result-panel mt-4" *ngIf="paymentStatus">
            <div class="result-row">
              <span class="result-label">Amount</span>
              <span class="result-value fw-bold">
                {{ paymentStatus.amountMinor / 100 | number:'1.2-2' }} {{ paymentStatus.currency }}
              </span>
            </div>
            <div class="result-row">
              <span class="result-label">Method</span>
              <span class="result-value">{{ railLabel(paymentStatus.rail) }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">Reference</span>
              <span class="result-value font-monospace small">{{ paymentStatus.paymentId | slice:0:18 }}…</span>
            </div>
          </div>

          <!-- Reference only (fallback before API loads) -->
          <div class="mt-3 text-muted small" *ngIf="ref && !paymentStatus">
            Reference: <span class="font-monospace">{{ ref | slice:0:18 }}…</span>
          </div>

          <!-- Actions -->
          <div class="gk-actions mt-4">
            <a *ngIf="linkShortCode" class="btn btn-primary w-100" [href]="'/pay/' + linkShortCode">
              <i class="ri-refresh-line me-2"></i>Try Again
            </a>
            <button *ngIf="!linkShortCode" class="btn btn-primary w-100" (click)="goBack()">
              <i class="ri-arrow-left-line me-2"></i>Go Back
            </button>
            <a href="mailto:support@golink.co.ls" class="btn btn-outline-secondary w-100 mt-2">
              <i class="ri-customer-service-2-line me-2"></i>Contact Support
            </a>
          </div>

        </div>

        <div class="gk-footer">
          <i class="ri-shield-check-line"></i> Secured by GoLink &nbsp;·&nbsp;
          <a href="https://golink.co.ls" target="_blank" rel="noopener">golink.co.ls</a>
        </div>

      </div>
    </div>
  `,
  styleUrls: ['./pay-page.component.scss'],
})
export class PayFailedComponent implements OnInit {
  ref = '';
  rawReason = '';
  friendlyMessage = '';
  linkShortCode = '';
  paymentStatus: PaymentStatus | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.ref = this.route.snapshot.queryParamMap.get('ref') ?? '';
    this.rawReason = this.route.snapshot.queryParamMap.get('reason') ?? '';
    this.friendlyMessage = this.mapReason(this.rawReason);
    this.linkShortCode = sessionStorage.getItem('gk_last_shortcode') ?? '';

    if (this.ref) {
      this.http.get<PaymentStatus>(`/api/3ds/status/${this.ref}`).subscribe({
        next: (s) => { this.paymentStatus = s; },
        error: () => {},
      });
    }
  }

  goBack(): void {
    window.history.back();
  }

  railLabel(rail: string): string {
    const labels: Record<string, string> = {
      CARD: 'Credit / Debit Card',
      MPESA: 'M-PESA',
      ECOCASH: 'EcoCash',
      EFT: 'EFT / Bank Transfer',
    };
    return labels[rail] ?? rail;
  }

  private mapReason(reason: string): string {
    if (!reason) return 'Your payment could not be completed. Please try again or use a different payment method.';
    // The server maps iVeri result codes to friendly messages — trust that output directly.
    // Only strip technical bracket notation (e.g. "Mandatory parameter not found [SessionID]")
    // that should never reach the user in production.
    if (/\[.*\]/.test(reason)) return 'A temporary system error occurred. Please try again in a moment.';
    return reason;
  }
}
