import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Merchant, PortalApiService } from '../shared/portal-api.service';

@Component({
  selector: 'app-portal-organization-create-wizard',
  templateUrl: './portal-organization-create-wizard.component.html',
  styleUrls: ['./portal-organization-create-wizard.component.scss'],
  standalone: false,
})
export class PortalOrganizationCreateWizardComponent {
  saving = false;
  error = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
  });

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly fb: FormBuilder,
    private readonly api: PortalApiService,
  ) {}

  onNameChange(): void {
    const name = (this.form.get('name')!.value ?? '').trim();
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    this.form.get('slug')!.setValue(slug, { emitEvent: false });
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, slug } = this.form.getRawValue();
    this.saving = true;
    this.error = '';

    this.api.createMerchant({ name: name!.trim(), slug: slug!.trim() }).subscribe({
      next: (merchant: Merchant) => {
        this.saving = false;
        this.activeModal.close(merchant);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Failed to create merchant.';
      },
    });
  }
}
