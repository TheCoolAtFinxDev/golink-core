import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';

interface LinkInfo {
  id: string;
  shortCode: string;
  title: string;
  description?: string | null;
  amountMinor?: number | null;
  currency: string;
  allowedRails: string[];
  recipientName?: string | null;
  expiresAt?: string | null;
  status: string;
}

interface PaymentResult {
  paymentId: string;
  status: string;
  amountMinor: number;
  currency: string;
}

@Component({
  selector: 'app-pay-page',
  templateUrl: './pay-page.component.html',
  styleUrls: ['./pay-page.component.scss'],
  standalone: false,
})
export class PayPageComponent implements OnInit {
  loading = true;
  submitting = false;
  error = '';
  linkInfo: LinkInfo | null = null;
  result: PaymentResult | null = null;

  readonly railOptions = [
    { value: 'MPESA',   label: 'M-PESA', icon: 'ri-smartphone-line' },
    { value: 'ECOCASH', label: 'EcoCash', icon: 'ri-smartphone-line' },
    { value: 'CARD',    label: 'Card', icon: 'ri-bank-card-line' },
    { value: 'EFT',     label: 'EFT / Bank', icon: 'ri-building-2-line' },
  ];

  readonly form = this.fb.group({
    selectedRail: ['', Validators.required],
    payerName: ['', Validators.required],
    payerPhone: [''],
    payerEmail: [''],
    amountMinor: [null as number | null],
    pan: [''],
    expiryMMYY: [''],
    cvv: [''],
  });

  shortCode = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.shortCode = this.route.snapshot.paramMap.get('shortCode') ?? '';
    this.loadLink();
  }

  loadLink(): void {
    this.loading = true;
    this.http.get<LinkInfo>(`/api/pay/${this.shortCode}`).subscribe({
      next: (link) => {
        this.zone.run(() => {
          this.linkInfo = link;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.error = err?.error?.message ?? err?.message ?? 'Payment link not found or expired.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  get availableRails(): typeof this.railOptions {
    if (!this.linkInfo?.allowedRails?.length) return this.railOptions;
    return this.railOptions.filter((r) => this.linkInfo!.allowedRails.includes(r.value));
  }

  get selectedRail(): string { return this.form.get('selectedRail')?.value ?? ''; }
  get isMobileRail(): boolean { return this.selectedRail === 'MPESA' || this.selectedRail === 'ECOCASH'; }
  get isCardRail(): boolean { return this.selectedRail === 'CARD'; }
  get hasFixedAmount(): boolean { return !!(this.linkInfo?.amountMinor); }
  get displayAmount(): string {
    const amt = this.linkInfo?.amountMinor ?? this.form.get('amountMinor')?.value ?? 0;
    return `${(Number(amt) / 100).toFixed(2)} ${this.linkInfo?.currency ?? ''}`;
  }

  selectRail(rail: string): void {
    this.form.get('selectedRail')?.setValue(rail);

    const phone = this.form.get('payerPhone')!;
    const pan = this.form.get('pan')!;
    const expiry = this.form.get('expiryMMYY')!;

    phone.clearValidators();
    pan.clearValidators();
    expiry.clearValidators();

    if (this.isMobileRail) {
      phone.setValidators(Validators.required);
    }
    if (rail === 'CARD') {
      pan.setValidators([Validators.required, Validators.pattern(/^\d{12,19}$/)]);
      expiry.setValidators([Validators.required, Validators.pattern(/^\d{4}$/)]);
    }

    [phone, pan, expiry].forEach(c => c.updateValueAndValidity());
  }

  pay(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.error = '';

    if (this.isCardRail) {
      this.initiateCard3ds();
      return;
    }

    const v = this.form.getRawValue();
    const payer: Record<string, string> = { name: v.payerName! };
    if (v.payerPhone) payer['phone'] = v.payerPhone;
    if (v.payerEmail) payer['email'] = v.payerEmail;

    const body: Record<string, unknown> = { rail: v.selectedRail, payer };
    if (!this.hasFixedAmount && v.amountMinor) body['amountMinor'] = v.amountMinor;

    this.http.post<PaymentResult>(`/api/pay/${this.shortCode}/submit`, body).subscribe({
      next: (res) => { this.result = res; this.submitting = false; },
      error: (err) => { this.error = err?.error?.message || 'Payment failed. Please try again.'; this.submitting = false; },
    });
  }

  private initiateCard3ds(): void {
    const v = this.form.getRawValue();

    // Use a native form POST so the browser performs a real page navigation.
    // document.write() from an async fetch callback triggers Chrome's parser-blocking
    // intervention, which silently prevents iVeri's auto-submit <script> from running.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/api/pay/${this.shortCode}/init-card`;
    form.style.display = 'none';

    const addField = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addField('pan', (v.pan ?? '').replace(/\s/g, ''));
    addField('expiryMMYY', v.expiryMMYY ?? '');
    if (v.cvv) addField('cvv', v.cvv);
    if (v.payerName) addField('payerName', v.payerName);
    if (v.payerEmail) addField('payerEmail', v.payerEmail);

    sessionStorage.setItem('gk_last_shortcode', this.shortCode);
    document.body.appendChild(form);
    form.submit();
  }
}
