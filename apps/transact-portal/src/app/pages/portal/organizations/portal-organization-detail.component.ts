import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  ApiClient,
  Merchant,
  MerchantPspConfig,
  PortalApiService,
} from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-organization-detail',
  templateUrl: './portal-organization-detail.component.html',
  styleUrls: ['./portal-organization-detail.component.scss'],
  standalone: false,
})
export class PortalOrganizationDetailComponent implements OnInit {

  readonly tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'psp-rails', label: 'PSP Rails' },
    { id: 'api-keys', label: 'API Keys' },
    { id: 'payment-links', label: 'Payment Links' },
  ] as const;

  loading = true;
  error = '';
  successMessage = '';
  activeTab: (typeof this.tabs)[number]['id'] = 'overview';

  merchantId = '';
  merchant: Merchant | null = null;

  pspConfigs: MerchantPspConfig[] = [];
  pspConfigsError = '';
  pspConfigsSaving = false;
  pspConfigsSuccess = '';
  pspEditingRail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT' | null = null;

  apiClients: ApiClient[] = [];
  apiKeysError = '';
  generatingKey = false;
  generatedKey = '';
  revokingId = '';

  readonly mpesaForm = this.fb.group({
    apiKey: ['', Validators.required],
    rsaPublicKey: ['', Validators.required],
    shortCode: ['', Validators.required],
    baseUrl: ['https://openapi.m-pesa.com', Validators.required],
    callbackBaseUrl: ['https://transact.golink.co.ls', Validators.required],
    isActive: [true],
  });

  readonly ecocashForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    merchantCode: ['', Validators.required],
    baseUrl: ['https://dt-externalproxy-1.etl.co.ls/etl/uat/ecoussd', Validators.required],
    isActive: [true],
  });

  readonly cardForm = this.fb.group({
    url: ['https://portal.nedsecure.co.za/api/transactions', Validators.required],
    certId: ['', Validators.required],
    appIdCit: ['', Validators.required],
    appIdMit: ['', Validators.required],
    merchantProfileId: ['', Validators.required],
    mode: ['1', Validators.required],
    isActive: [true],
  });

  readonly apiKeyForm = this.fb.group({
    name: ['', Validators.required],
    sourceSystem: ['portal', Validators.required],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: PortalApiService,
    private readonly fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.merchantId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.merchantId) {
      this.error = 'Missing merchant id.';
      this.loading = false;
      return;
    }
    this.loadMerchant();
  }

  loadMerchant(): void {
    this.loading = true;
    this.error = '';
    this.api.getMerchant(this.merchantId).subscribe({
      next: (merchant) => {
        this.merchant = merchant;
        this.pspConfigs = merchant.pspConfigs ?? [];
        this.apiClients = merchant.apiClients ?? [];
        this.patchPspForms(this.pspConfigs);
        this.loading = false;
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load merchant.';
        this.loading = false;
      },
    });
  }

  goToList(): void {
    this.router.navigate(['/portal/partners']);
  }

  setActiveTab(tabId: (typeof this.tabs)[number]['id']): void {
    this.activeTab = tabId;
  }

  patchPspForms(configs: MerchantPspConfig[]): void {
    const mpesa = configs.find((c) => c.rail === 'MPESA');
    if (mpesa) {
      this.mpesaForm.patchValue({
        apiKey: (mpesa.config['apiKey'] as string) ?? '',
        rsaPublicKey: (mpesa.config['rsaPublicKey'] as string) ?? '',
        shortCode: (mpesa.config['shortCode'] as string) ?? '',
        baseUrl: (mpesa.config['baseUrl'] as string) ?? 'https://openapi.m-pesa.com',
        callbackBaseUrl: (mpesa.config['callbackBaseUrl'] as string) ?? 'https://transact.golink.co.ls',
        isActive: mpesa.isActive,
      });
    }
    const ecocash = configs.find((c) => c.rail === 'ECOCASH');
    if (ecocash) {
      this.ecocashForm.patchValue({
        username: (ecocash.config['username'] as string) ?? '',
        password: (ecocash.config['password'] as string) ?? '',
        merchantCode: (ecocash.config['merchantCode'] as string) ?? '',
        baseUrl: (ecocash.config['baseUrl'] as string) ?? '',
        isActive: ecocash.isActive,
      });
    }
    const card = configs.find((c) => c.rail === 'CARD');
    if (card) {
      this.cardForm.patchValue({
        url: (card.config['url'] as string) ?? 'https://portal.nedsecure.co.za/api/transactions',
        certId: (card.config['certId'] as string) ?? '',
        appIdCit: (card.config['appIdCit'] as string) ?? '',
        appIdMit: (card.config['appIdMit'] as string) ?? '',
        merchantProfileId: (card.config['merchantProfileId'] as string) ?? '',
        mode: (card.config['mode'] as string) ?? '1',
        isActive: card.isActive,
      });
    }
  }

  getPspConfig(rail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT'): MerchantPspConfig | undefined {
    return this.pspConfigs.find((c) => c.rail === rail);
  }

  editPspRail(rail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT'): void {
    this.pspEditingRail = rail;
    this.pspConfigsSuccess = '';
    this.pspConfigsError = '';
  }

  cancelPspEdit(): void {
    this.pspEditingRail = null;
    this.patchPspForms(this.pspConfigs);
  }

  saveMpesaConfig(): void {
    if (this.mpesaForm.invalid) { this.mpesaForm.markAllAsTouched(); return; }
    const v = this.mpesaForm.getRawValue();
    this.pspConfigsSaving = true;
    this.pspConfigsSuccess = '';
    this.pspConfigsError = '';
    this.api.saveMerchantPspConfig(this.merchantId, 'MPESA', {
      apiKey: v.apiKey!,
      rsaPublicKey: v.rsaPublicKey!,
      shortCode: v.shortCode!,
      baseUrl: v.baseUrl!,
      callbackBaseUrl: v.callbackBaseUrl!,
    }, v.isActive!).subscribe({
      next: () => {
        this.pspConfigsSuccess = 'M-PESA configuration saved.';
        this.pspConfigsSaving = false;
        this.pspEditingRail = null;
        this.loadMerchant();
      },
      error: (err) => {
        this.pspConfigsError = err?.error?.message || 'Failed to save M-PESA config.';
        this.pspConfigsSaving = false;
      },
    });
  }

  saveEcocashConfig(): void {
    if (this.ecocashForm.invalid) { this.ecocashForm.markAllAsTouched(); return; }
    const v = this.ecocashForm.getRawValue();
    this.pspConfigsSaving = true;
    this.pspConfigsSuccess = '';
    this.pspConfigsError = '';
    this.api.saveMerchantPspConfig(this.merchantId, 'ECOCASH', {
      username: v.username!,
      password: v.password!,
      merchantCode: v.merchantCode!,
      baseUrl: v.baseUrl!,
    }, v.isActive!).subscribe({
      next: () => {
        this.pspConfigsSuccess = 'EcoCash configuration saved.';
        this.pspConfigsSaving = false;
        this.pspEditingRail = null;
        this.loadMerchant();
      },
      error: (err) => {
        this.pspConfigsError = err?.error?.message || 'Failed to save EcoCash config.';
        this.pspConfigsSaving = false;
      },
    });
  }

  saveCardConfig(): void {
    if (this.cardForm.invalid) { this.cardForm.markAllAsTouched(); return; }
    const v = this.cardForm.getRawValue();
    this.pspConfigsSaving = true;
    this.pspConfigsSuccess = '';
    this.pspConfigsError = '';
    this.api.saveMerchantPspConfig(this.merchantId, 'CARD', {
      url: v.url!,
      certId: v.certId!,
      appIdCit: v.appIdCit!,
      appIdMit: v.appIdMit!,
      merchantProfileId: v.merchantProfileId!,
      mode: v.mode!,
    }, v.isActive!).subscribe({
      next: () => {
        this.pspConfigsSuccess = 'Card (iVeri) configuration saved.';
        this.pspConfigsSaving = false;
        this.pspEditingRail = null;
        this.loadMerchant();
      },
      error: (err) => {
        this.pspConfigsError = err?.error?.message || 'Failed to save Card config.';
        this.pspConfigsSaving = false;
      },
    });
  }

  generateApiKey(): void {
    if (this.apiKeyForm.invalid) { this.apiKeyForm.markAllAsTouched(); return; }
    const v = this.apiKeyForm.getRawValue();
    this.generatingKey = true;
    this.generatedKey = '';
    this.apiKeysError = '';
    this.api.generateMerchantApiKey(this.merchantId, { name: v.name!, sourceSystem: v.sourceSystem! }).subscribe({
      next: (result) => {
        this.generatingKey = false;
        this.generatedKey = result.rawKey;
        this.apiKeyForm.reset({ name: '', sourceSystem: 'portal' });
        this.loadMerchant();
      },
      error: (err) => {
        this.generatingKey = false;
        this.apiKeysError = err?.error?.message || 'Failed to generate API key.';
      },
    });
  }

  async revokeApiKey(client: ApiClient): Promise<void> {
    const result = await Swal.fire({
      title: 'Revoke API Key?',
      text: `"${client.name}" will be permanently revoked. Any integration using it will stop working.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06548',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, revoke',
    });
    if (!result.isConfirmed) return;

    this.revokingId = client.id;
    this.api.revokeMerchantApiKey(this.merchantId, client.id).subscribe({
      next: () => {
        this.revokingId = '';
        this.loadMerchant();
      },
      error: (err) => {
        this.revokingId = '';
        this.apiKeysError = err?.error?.message || 'Failed to revoke API key.';
      },
    });
  }

  async suspendMerchant(): Promise<void> {
    const result = await Swal.fire({
      title: 'Suspend Merchant?',
      text: 'Payment processing will be suspended for this merchant.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06548',
      confirmButtonText: 'Yes, suspend',
    });
    if (!result.isConfirmed) return;

    this.api.suspendMerchant(this.merchantId).subscribe({
      next: () => { this.loadMerchant(); },
      error: (err) => { this.error = err?.error?.message || 'Failed to suspend merchant.'; },
    });
  }

  unsuspendMerchant(): void {
    this.api.unsuspendMerchant(this.merchantId).subscribe({
      next: () => { this.loadMerchant(); },
      error: (err) => { this.error = err?.error?.message || 'Failed to reactivate merchant.'; },
    });
  }

  viewPaymentLinks(): void {
    this.router.navigate(['/portal/payment-links'], { queryParams: { merchantId: this.merchantId } });
  }

  get merchantAvatar(): string {
    const name = this.merchant?.name?.trim() ?? '';
    if (!name) return 'M';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  statusBadgeClass(status: string): string {
    return status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
  }
}
