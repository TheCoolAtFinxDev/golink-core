import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreatePaymentLinkInput, PaymentLink, PortalApiService } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-payment-links',
  templateUrl: './portal-payment-links.component.html',
  styleUrls: ['./portal-payment-links.component.scss'],
  standalone: false,
})
export class PortalPaymentLinksComponent implements OnInit {
  loading = true;
  saving = false;
  error = '';
  successMessage = '';

  links: PaymentLink[] = [];
  showCreateForm = false;
  notifyingId: string | null = null;
  notifyChannels: Record<string, boolean> = { sms: false, email: false, whatsapp: false };

  readonly railOptions = ['CARD', 'MPESA', 'ECOCASH', 'EFT'];

  readonly form = this.fb.group({
    merchantId: ['', Validators.required],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    amountType: ['fixed'],
    amountMinor: [null as number | null],
    currency: ['ZWG', Validators.required],
    allowedRails: [[] as string[]],
    expiresAt: [''],
    maxUses: [null as number | null],
    recipientName: [''],
    recipientPhone: [''],
    recipientEmail: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: PortalApiService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getPaymentLinks().subscribe({
      next: (links) => { this.links = links; this.loading = false; setTimeout(() => window.dispatchEvent(new Event('resize')), 50); },
      error: (err) => { this.error = err?.error?.message || 'Failed to load payment links.'; this.loading = false; },
    });
  }

  toggleRail(rail: string): void {
    const current = this.form.get('allowedRails')?.value ?? [];
    const updated = current.includes(rail)
      ? current.filter((r: string) => r !== rail)
      : [...current, rail];
    this.form.get('allowedRails')?.setValue(updated);
  }

  isRailSelected(rail: string): boolean {
    return (this.form.get('allowedRails')?.value ?? []).includes(rail);
  }

  get isOpenAmount(): boolean {
    return this.form.get('amountType')?.value === 'open';
  }

  createLink(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = '';

    const v = this.form.getRawValue();
    const dto: CreatePaymentLinkInput = {
      merchantId: v.merchantId!,
      title: v.title!,
      description: v.description || undefined,
      currency: v.currency!,
      allowedRails: v.allowedRails as string[],
      maxUses: v.maxUses ?? undefined,
      expiresAt: v.expiresAt || undefined,
      recipientName: v.recipientName || undefined,
      recipientPhone: v.recipientPhone || undefined,
      recipientEmail: v.recipientEmail || undefined,
    };
    if (!this.isOpenAmount && v.amountMinor) {
      dto.amountMinor = v.amountMinor;
    }

    this.api.createPaymentLink(dto).subscribe({
      next: (link) => {
        this.links = [link, ...this.links];
        this.successMessage = `Payment link created! Share: /pay/${link.shortCode}`;
        this.showCreateForm = false;
        this.form.reset({ amountType: 'fixed', currency: 'ZWG', allowedRails: [] });
        this.saving = false;
      },
      error: (err) => { this.error = err?.error?.message || 'Failed to create link.'; this.saving = false; },
    });
  }

  cancelLink(link: PaymentLink): void {
    if (!confirm(`Cancel payment link "${link.title}"?`)) return;
    this.api.cancelPaymentLink(link.id).subscribe({
      next: (updated) => {
        this.links = this.links.map((l) => (l.id === updated.id ? updated : l));
        this.successMessage = 'Payment link cancelled.';
      },
      error: (err) => { this.error = err?.error?.message || 'Failed to cancel link.'; },
    });
  }

  startNotify(link: PaymentLink): void {
    this.notifyingId = link.id;
    this.notifyChannels = { sms: !!link.recipientPhone, email: !!link.recipientEmail, whatsapp: false };
  }

  sendNotification(link: PaymentLink): void {
    const channels = Object.entries(this.notifyChannels)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!channels.length) { this.error = 'Select at least one notification channel.'; return; }

    this.api.notifyPaymentLink(link.id, channels).subscribe({
      next: () => {
        this.successMessage = `Notification queued via: ${channels.join(', ')}`;
        this.notifyingId = null;
        this.load();
      },
      error: (err) => { this.error = err?.error?.message || 'Notification failed.'; },
    });
  }

  copyLink(shortCode: string): void {
    const url = `${window.location.origin}/pay/${shortCode}`;
    navigator.clipboard.writeText(url).then(() => {
      this.successMessage = `Link copied: ${url}`;
    });
  }

  get activeCount(): number { return this.links.filter((l) => l.status === 'ACTIVE').length; }
  get exhaustedCount(): number { return this.links.filter((l) => l.status === 'EXHAUSTED').length; }

  statusBadge(status: string): string {
    switch (status) {
      case 'ACTIVE':    return 'bg-success-subtle text-success';
      case 'EXPIRED':   return 'bg-warning-subtle text-warning';
      case 'EXHAUSTED': return 'bg-info-subtle text-info';
      case 'CANCELLED': return 'bg-danger-subtle text-danger';
      default:          return 'bg-secondary-subtle text-secondary';
    }
  }
}
