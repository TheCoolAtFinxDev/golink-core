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
  selector: 'app-pay-success',
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

          <div class="pay-icon pay-icon-success">
            <i class="ri-checkbox-circle-line"></i>
          </div>

          <h4 class="mt-3 mb-1">Payment Successful</h4>
          <p class="text-muted">Your payment has been completed successfully.</p>

          <!-- Amount hero -->
          <div class="gk-amount-hero" *ngIf="paymentStatus">
            {{ paymentStatus.amountMinor / 100 | number:'1.2-2' }}
            <span class="gk-currency">{{ paymentStatus.currency }}</span>
          </div>

          <!-- Receipt panel -->
          <div class="pay-result-panel mt-3" *ngIf="paymentStatus">
            <div class="result-row">
              <span class="result-label">Status</span>
              <span class="result-value badge bg-success-subtle text-success">
                <i class="ri-checkbox-circle-line me-1"></i>{{ paymentStatus.status }}
              </span>
            </div>
            <div class="result-row">
              <span class="result-label">Method</span>
              <span class="result-value">{{ railLabel(paymentStatus.rail) }}</span>
            </div>
            <div class="result-row" *ngIf="paymentStatus.pspReference">
              <span class="result-label">Transaction ID</span>
              <span class="result-value font-monospace small">{{ paymentStatus.pspReference }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">Reference</span>
              <span class="result-value font-monospace small">{{ paymentStatus.paymentId | slice:0:18 }}…</span>
            </div>
            <div class="result-row">
              <span class="result-label">Date</span>
              <span class="result-value small">{{ today }}</span>
            </div>
          </div>

          <!-- Fallback reference before API responds -->
          <div class="mt-3 text-muted small" *ngIf="ref && !paymentStatus">
            Reference: <span class="font-monospace">{{ ref | slice:0:18 }}…</span>
          </div>

          <!-- Done action -->
          <div class="gk-actions mt-4">
            <button class="btn btn-primary w-100" (click)="done()">
              <i class="ri-home-4-line me-2"></i>Done
            </button>
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
export class PaySuccessComponent implements OnInit {
  ref = '';
  today = '';
  paymentStatus: PaymentStatus | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.ref = this.route.snapshot.queryParamMap.get('ref') ?? '';
    this.today = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    if (this.ref) {
      this.http.get<PaymentStatus>(`/api/3ds/status/${this.ref}`).subscribe({
        next: (s) => { this.paymentStatus = s; },
        error: () => {},
      });
    }

    // Clear the stored shortcode after successful payment
    sessionStorage.removeItem('gk_last_shortcode');
  }

  done(): void {
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
}
