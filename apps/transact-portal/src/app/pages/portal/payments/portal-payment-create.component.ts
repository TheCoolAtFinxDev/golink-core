import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PortalApiService } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-payment-create',
  templateUrl: './portal-payment-create.component.html',
  styleUrls: ['./portal-payment-create.component.scss'],
  standalone: false,
})
export class PortalPaymentCreateComponent implements OnInit {
  saving = false;
  error = '';
  merchants: Array<{ id: string; name: string; slug: string }> = [];
  merchantsLoading = true;

  readonly form = this.fb.group({
    merchantId: ['', Validators.required],
    direction: ['DEBIT', Validators.required],
    rail: ['', Validators.required],
    amountMinor: [null as number | null, [Validators.required, Validators.min(1)]],
    currency: ['LSL', Validators.required],
    payerName: ['', Validators.required],
    payerPhone: [''],
    payerEmail: [''],
    payeeName: [''],
    description: [''],
    sourceReference: [''],
    cardPan: [''],
    cardExpiry: [''],
  });

  readonly railOptions = [
    { value: 'ECOCASH', label: 'EcoCash' },
    { value: 'MPESA', label: 'M-PESA' },
    { value: 'CARD', label: 'Card (iVeri)' },
    { value: 'EFT', label: 'EFT / CPS' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: PortalApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.api.getMerchants().subscribe({
      next: (res) => { this.merchants = Array.isArray(res) ? res : []; this.merchantsLoading = false; },
      error: () => { this.merchants = []; this.merchantsLoading = false; },
    });

    this.form.get('rail')?.valueChanges.subscribe((rail) => {
      const phoneCtrl = this.form.get('payerPhone')!;
      const panCtrl = this.form.get('cardPan')!;
      const expiryCtrl = this.form.get('cardExpiry')!;

      phoneCtrl.setValidators(rail === 'MPESA' || rail === 'ECOCASH' ? [Validators.required] : []);
      panCtrl.setValidators(rail === 'CARD' ? [Validators.required] : []);
      expiryCtrl.setValidators(rail === 'CARD' ? [Validators.required] : []);

      [phoneCtrl, panCtrl, expiryCtrl].forEach(c => c.updateValueAndValidity());
    });
  }

  get selectedRail(): string { return this.form.get('rail')?.value ?? ''; }
  get isMobileRail(): boolean { return this.selectedRail === 'MPESA' || this.selectedRail === 'ECOCASH'; }
  get isCardRail(): boolean { return this.selectedRail === 'CARD'; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = '';

    const v = this.form.getRawValue();
    const payer: Record<string, string> = { name: v.payerName! };
    if (v.payerPhone) payer['phone'] = v.payerPhone;
    if (v.payerEmail) payer['email'] = v.payerEmail;

    this.api.adminCreatePayment({
      merchantId: v.merchantId!,
      direction: v.direction as 'DEBIT' | 'CREDIT',
      rail: v.rail as 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT',
      amountMinor: v.amountMinor!,
      currency: v.currency!,
      payer,
      payee: v.payeeName ? { name: v.payeeName } : {},
      description: v.description || undefined,
      sourceReference: v.sourceReference || undefined,
      cardData: v.rail === 'CARD' && v.cardPan ? { pan: v.cardPan, expiryMMYY: v.cardExpiry! } : undefined,
    }).subscribe({
      next: (payment) => {
        this.saving = false;
        this.router.navigate(['/portal/payments', payment.id]);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to create payment.';
        this.saving = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/portal/payments']); }
}
