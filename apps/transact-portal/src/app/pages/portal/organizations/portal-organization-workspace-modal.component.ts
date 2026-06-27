import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  AssociatedCompany,
  AuthorizedSignatory,
  BeneficialOwner,
  Biller,
  CreateOrganizationMemberInput,
  Organization,
  OrganizationBillerProfileInput,
  OrganizationComplianceProfile,
  OrganizationMember,
  PortalApiService,
  SettlementAccount,
} from '../shared/portal-api.service';

type OrganizationWizardMode = 'billing' | 'biller' | 'compliance' | 'member';

@Component({
  selector: 'app-portal-organization-workspace-modal',
  templateUrl: './portal-organization-workspace-modal.component.html',
  styleUrls: ['./portal-organization-workspace-modal.component.scss'],
  standalone: false,
})
export class PortalOrganizationWorkspaceModalComponent implements OnInit {
  @Input() organization!: Organization;
  @Input() complianceProfile: OrganizationComplianceProfile | null = null;
  @Input() members: OrganizationMember[] = [];
  @Input() billers: Biller[] = [];
  @Input() mode: OrganizationWizardMode = 'compliance';

  currentStep = 0;
  saving = false;
  error = '';
  successMessage = '';
  editingBeneficialOwnerIndex: number | null = null;
  editingAssociatedCompanyIndex: number | null = null;
  editingAuthorizedSignatoryIndex: number | null = null;
  editingSettlementAccountIndex: number | null = null;
  beneficialOwnersDraft: BeneficialOwner[] = [];
  associatedCompaniesDraft: AssociatedCompany[] = [];
  authorizedSignatoriesDraft: AuthorizedSignatory[] = [];
  settlementAccountsDraft: SettlementAccount[] = [];

  readonly memberRoleOptions: Array<CreateOrganizationMemberInput['role']> = [
    'OWNER',
    'ADMIN',
    'OPERATOR',
    'VIEWER',
  ];

  readonly billingProfileForm = this.formBuilder.group({
    readinessStatus: ['DRAFT', [Validators.required]],
    billingStatus: ['NOT_CONFIGURED', [Validators.required]],
    billingEmail: ['', [Validators.email]],
    billingCurrency: [''],
    lagoCustomerId: [''],
    lagoSubscriptionId: [''],
    notes: [''],
  });

  readonly billerForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
    profile: [''],
    type: [''],
    callbackUrl: [''],
    defaultCurrency: ['LSL'],
  });

  readonly memberForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['ADMIN', [Validators.required]],
    isPrimary: [false],
    password: ['', [Validators.minLength(8)]],
  });

  readonly complianceProfileForm = this.formBuilder.group({
    tradingName: [''],
    registrationNumber: [''],
    taxNumber: [''],
    vatNumber: [''],
    businessLicenseNumber: [''],
    businessLicenseExpiry: [''],
    industryCategory: [''],
    websiteUrl: [''],
    businessModel: [''],
    countriesServed: [''],
    expectedMonthlyVolumeCents: [''],
    averageTicketSizeCents: [''],
    settlementCycle: [''],
    technicalIntegrationMethod: [''],
    financeContactName: [''],
    financeContactEmail: [''],
    operationsContactName: [''],
    operationsContactEmail: [''],
    technicalContactName: [''],
    technicalContactEmail: [''],
    disputeContactName: [''],
    disputeContactEmail: [''],
    refundPolicyUrl: [''],
    chargebackProcessNote: [''],
    sourceOfBusiness: [''],
    sourceOfFunds: [''],
    // KYB alignment fields
    businessType: [''],
    taxIdentificationNumber: [''],
    dateOfEstablishment: [''],
    iHaveSigningAuthority: [true],
    thereNoCompaniesWithMoreThan25: [false],
    mainRepFirstName: [''],
    mainRepLastName: [''],
    mainRepPhone: [''],
    mainRepDateOfBirth: [''],
    mainRepEmail: [''],
    mainRepJobTitle: [''],
    hqStreet: [''],
    hqStreetNumber: [''],
    hqCity: [''],
    hqPostalCode: [''],
    hqCountry: [''],
    hqPhone: [''],
    storeIndustry: [''],
    storeWebsiteUrls: [''],
    storeBusinessModel: [''],
    storeAnnualSalesVolume: [''],
    storeOtherBusinessModel: [''],
    bankCountry: [''],
    bankName: [''],
    bankHolderName: [''],
    bankAccountNumber: [''],
    bankCurrencyCode: [''],
  });

  readonly beneficialOwnerForm = this.formBuilder.group({
    firstName: [''],
    lastName: [''],
    role: [''],
    dateOfBirth: [''],
    ownershipPercent: [''],
    nationalIdNumber: [''],
    passportNumber: [''],
    phoneNumber: [''],
    email: [''],
    residentialAddress: [''],
    isPoliticallyExposed: [false],
    isSanctionsMatch: [false],
  });

  readonly associatedCompanyForm = this.formBuilder.group({
    registrationNumber: [''],
    country: [''],
    companyName: [''],
    associationRelationship: [''],
    repFirstName: [''],
    repLastName: [''],
    repEmail: [''],
  });

  readonly authorizedSignatoryForm = this.formBuilder.group({
    fullName: [''],
    roleTitle: [''],
    nationalIdNumber: [''],
    passportNumber: [''],
    phoneNumber: [''],
    email: [''],
    proofOfAuthorityUrl: [''],
  });

  readonly settlementAccountForm = this.formBuilder.group({
    bankName: [''],
    accountName: [''],
    accountNumber: [''],
    accountType: [''],
    branchCode: [''],
    currency: [''],
    proofDocumentUrl: [''],
    isPrimary: [false],
  });

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly formBuilder: FormBuilder,
    private readonly api: PortalApiService,
  ) {}

  ngOnInit(): void {
    this.patchForms();
  }

  get wizardTitle(): string {
    switch (this.mode) {
      case 'billing':
        return 'Billing Workspace';
      case 'biller':
        return 'Operating Profile Wizard';
      case 'member':
        return 'Member Access Wizard';
      default:
        return 'Compliance Wizard';
    }
  }

  get wizardDescription(): string {
    switch (this.mode) {
      case 'billing':
        return 'Capture billing controls and Lago linkage in a single guided flow.';
      case 'biller':
        return 'Create linked operating profiles without leaving the partner workspace.';
      case 'member':
        return 'Add responsible users and optionally enable portal access for PSO operations.';
      default:
        return 'Capture legal identity and complete KYB data in focused steps with editable record lists.';
    }
  }

  get supportsPortalCredentials(): boolean {
    return this.organization?.type === 'PSO';
  }

  get steps(): string[] {
    switch (this.mode) {
      case 'billing':
        return ['Billing Controls', 'Lago & Review'];
      case 'biller':
        return ['Operating Profile', 'Review'];
      case 'member':
        return ['Member Identity', 'Review'];
      default:
        return [
          'Business Identity',
          'Main Representative',
          'Headquarters',
          'Business Activity',
          'Banking',
          'Contacts & Risk',
          'Beneficial Owners',
          'Associated Companies',
          'Authorized Signatories',
          'Settlement Accounts',
        ];
    }
  }

  get progress(): number {
    return ((this.currentStep + 1) / this.steps.length) * 100;
  }

  goToStep(index: number): void {
    if (index < this.currentStep) {
      this.currentStep = index;
      return;
    }

    if (!this.canAdvanceTo(index)) {
      return;
    }

    this.currentStep = index;
  }

  nextStep(): void {
    if (this.currentStep >= this.steps.length - 1) {
      return;
    }

    if (!this.canAdvanceTo(this.currentStep + 1)) {
      return;
    }

    this.currentStep += 1;
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep -= 1;
    }
  }

  save(): void {
    this.error = '';
    this.successMessage = '';

    switch (this.mode) {
      case 'billing':
        this.saveBillingProfile();
        return;
      case 'biller':
        this.saveBillerProfile();
        return;
      case 'member':
        this.saveMember();
        return;
      default:
        this.saveComplianceProfile();
    }
  }

  addBeneficialOwner(): void {
    this.editingBeneficialOwnerIndex = null;
    this.resetBeneficialOwnerForm();
  }

  removeBeneficialOwner(index: number): void {
    this.beneficialOwnersDraft.splice(index, 1);
    if (this.editingBeneficialOwnerIndex === index) {
      this.cancelBeneficialOwnerEdit();
    } else if (
      this.editingBeneficialOwnerIndex !== null &&
      this.editingBeneficialOwnerIndex > index
    ) {
      this.editingBeneficialOwnerIndex -= 1;
    }
  }

  addAssociatedCompany(): void {
    this.editingAssociatedCompanyIndex = null;
    this.resetAssociatedCompanyForm();
  }

  removeAssociatedCompany(index: number): void {
    this.associatedCompaniesDraft.splice(index, 1);
    if (this.editingAssociatedCompanyIndex === index) {
      this.cancelAssociatedCompanyEdit();
    } else if (
      this.editingAssociatedCompanyIndex !== null &&
      this.editingAssociatedCompanyIndex > index
    ) {
      this.editingAssociatedCompanyIndex -= 1;
    }
  }

  editAssociatedCompany(index: number): void {
    this.editingAssociatedCompanyIndex = index;
    this.patchAssociatedCompanyForm(this.associatedCompaniesDraft[index]);
  }

  saveAssociatedCompanyDraft(): void {
    const company = this.normalizeAssociatedCompany(this.associatedCompanyForm);
    if (!company) {
      this.associatedCompanyForm.markAllAsTouched();
      this.error = 'Provide at least the company name before saving the record.';
      return;
    }

    this.error = '';
    if (this.editingAssociatedCompanyIndex === null) {
      this.associatedCompaniesDraft = [...this.associatedCompaniesDraft, company];
    } else {
      this.associatedCompaniesDraft = this.associatedCompaniesDraft.map((item, index) =>
        index === this.editingAssociatedCompanyIndex ? company : item,
      );
    }
    this.cancelAssociatedCompanyEdit();
  }

  cancelAssociatedCompanyEdit(): void {
    this.editingAssociatedCompanyIndex = null;
    this.resetAssociatedCompanyForm();
  }

  addAuthorizedSignatory(): void {
    this.editingAuthorizedSignatoryIndex = null;
    this.resetAuthorizedSignatoryForm();
  }

  removeAuthorizedSignatory(index: number): void {
    this.authorizedSignatoriesDraft.splice(index, 1);
    if (this.editingAuthorizedSignatoryIndex === index) {
      this.cancelAuthorizedSignatoryEdit();
    } else if (
      this.editingAuthorizedSignatoryIndex !== null &&
      this.editingAuthorizedSignatoryIndex > index
    ) {
      this.editingAuthorizedSignatoryIndex -= 1;
    }
  }

  addSettlementAccount(): void {
    this.editingSettlementAccountIndex = null;
    this.resetSettlementAccountForm();
  }

  removeSettlementAccount(index: number): void {
    this.settlementAccountsDraft.splice(index, 1);
    if (this.editingSettlementAccountIndex === index) {
      this.cancelSettlementAccountEdit();
    } else if (
      this.editingSettlementAccountIndex !== null &&
      this.editingSettlementAccountIndex > index
    ) {
      this.editingSettlementAccountIndex -= 1;
    }
  }

  editBeneficialOwner(index: number): void {
    this.editingBeneficialOwnerIndex = index;
    this.patchBeneficialOwnerForm(this.beneficialOwnersDraft[index]);
  }

  saveBeneficialOwnerDraft(): void {
    const owner = this.normalizeBeneficialOwner(this.beneficialOwnerForm);
    if (!owner) {
      this.beneficialOwnerForm.markAllAsTouched();
      this.error = 'Provide at least the beneficial owner name before saving the record.';
      return;
    }

    this.error = '';
    if (this.editingBeneficialOwnerIndex === null) {
      this.beneficialOwnersDraft = [...this.beneficialOwnersDraft, owner];
    } else {
      this.beneficialOwnersDraft = this.beneficialOwnersDraft.map((item, index) =>
        index === this.editingBeneficialOwnerIndex ? owner : item,
      );
    }
    this.cancelBeneficialOwnerEdit();
  }

  cancelBeneficialOwnerEdit(): void {
    this.editingBeneficialOwnerIndex = null;
    this.resetBeneficialOwnerForm();
  }

  editAuthorizedSignatory(index: number): void {
    this.editingAuthorizedSignatoryIndex = index;
    this.patchAuthorizedSignatoryForm(this.authorizedSignatoriesDraft[index]);
  }

  saveAuthorizedSignatoryDraft(): void {
    const signatory = this.normalizeAuthorizedSignatory(this.authorizedSignatoryForm);
    if (!signatory) {
      this.authorizedSignatoryForm.markAllAsTouched();
      this.error = 'Provide at least the signatory name before saving the record.';
      return;
    }

    this.error = '';
    if (this.editingAuthorizedSignatoryIndex === null) {
      this.authorizedSignatoriesDraft = [...this.authorizedSignatoriesDraft, signatory];
    } else {
      this.authorizedSignatoriesDraft = this.authorizedSignatoriesDraft.map((item, index) =>
        index === this.editingAuthorizedSignatoryIndex ? signatory : item,
      );
    }
    this.cancelAuthorizedSignatoryEdit();
  }

  cancelAuthorizedSignatoryEdit(): void {
    this.editingAuthorizedSignatoryIndex = null;
    this.resetAuthorizedSignatoryForm();
  }

  editSettlementAccount(index: number): void {
    this.editingSettlementAccountIndex = index;
    this.patchSettlementAccountForm(this.settlementAccountsDraft[index]);
  }

  saveSettlementAccountDraft(): void {
    const account = this.normalizeSettlementAccount(this.settlementAccountForm);
    if (!account) {
      this.settlementAccountForm.markAllAsTouched();
      this.error =
        'Provide bank name, account name, and account number before saving the settlement account.';
      return;
    }

    this.error = '';
    if (this.editingSettlementAccountIndex === null) {
      this.settlementAccountsDraft = [...this.settlementAccountsDraft, account];
    } else {
      this.settlementAccountsDraft = this.settlementAccountsDraft.map((item, index) =>
        index === this.editingSettlementAccountIndex ? account : item,
      );
    }
    this.cancelSettlementAccountEdit();
  }

  cancelSettlementAccountEdit(): void {
    this.editingSettlementAccountIndex = null;
    this.resetSettlementAccountForm();
  }

  private patchForms(): void {
    this.billingProfileForm.reset({
      readinessStatus: this.organization.readinessStatus,
      billingStatus: this.organization.billingStatus,
      billingEmail: this.organization.billingEmail ?? '',
      billingCurrency: this.organization.billingCurrency ?? '',
      lagoCustomerId: this.organization.lagoCustomerId ?? '',
      lagoSubscriptionId: this.organization.lagoSubscriptionId ?? '',
      notes: this.organization.billingNotes ?? '',
    });

    this.billerForm.reset({
      name: this.organization.name,
      code: '',
      profile: '',
      type: this.organization.type === 'MERCHANT' ? 'MERCHANT' : 'BILLER',
      callbackUrl: '',
      defaultCurrency: this.organization.billingCurrency ?? 'LSL',
    });

    this.memberForm.reset({
      name: '',
      email: '',
      role: 'ADMIN',
      isPrimary: this.members.length === 0,
      password: '',
    });

    this.patchComplianceProfileForm(this.complianceProfile);
  }

  private canAdvanceTo(index: number): boolean {
    const currentGroup = this.getCurrentStepGroup();
    if (!currentGroup) {
      return true;
    }

    if (currentGroup.invalid) {
      currentGroup.markAllAsTouched();
      return false;
    }

    return index <= this.steps.length - 1;
  }

  private getCurrentStepGroup(): FormGroup | null {
    if (this.mode === 'billing') {
      return this.currentStep === 0 ? this.billingProfileForm : null;
    }

    if (this.mode === 'biller') {
      return this.currentStep === 0 ? this.billerForm : null;
    }

    if (this.mode === 'member') {
      return this.currentStep === 0 ? this.memberForm : null;
    }

    if (this.mode !== 'compliance') {
      return null;
    }

    if (this.currentStep === 6) {
      return this.beneficialOwnerForm as FormGroup;
    }

    if (this.currentStep === 7) {
      return this.associatedCompanyForm as FormGroup;
    }

    if (this.currentStep === 8) {
      return this.authorizedSignatoryForm as FormGroup;
    }

    if (this.currentStep === 9) {
      return this.settlementAccountForm as FormGroup;
    }

    return this.complianceProfileForm as FormGroup;
  }

  private saveBillingProfile(): void {
    if (this.billingProfileForm.invalid) {
      this.billingProfileForm.markAllAsTouched();
      return;
    }

    const value = this.billingProfileForm.getRawValue();
    this.saving = true;

    this.api
      .updateOrganizationBillingProfile(this.organization.id, {
        readinessStatus: (value.readinessStatus ?? 'DRAFT') as Organization['readinessStatus'],
        billingStatus: (value.billingStatus ?? 'NOT_CONFIGURED') as Organization['billingStatus'],
        billingEmail: (value.billingEmail ?? '').trim() || null,
        billingCurrency: (value.billingCurrency ?? '').trim().toUpperCase() || null,
        lagoCustomerId: (value.lagoCustomerId ?? '').trim() || null,
        lagoSubscriptionId: (value.lagoSubscriptionId ?? '').trim() || null,
        notes: (value.notes ?? '').trim() || null,
      })
      .subscribe({
        next: (organization) => {
          this.saving = false;
          this.activeModal.close({ mode: this.mode, organization });
        },
        error: (error) => {
          this.saving = false;
          this.error = error?.error?.message || 'Failed to update billing profile.';
        },
      });
  }

  private saveBillerProfile(): void {
    if (this.billerForm.invalid) {
      this.billerForm.markAllAsTouched();
      return;
    }

    const value = this.billerForm.getRawValue();
    const payload: OrganizationBillerProfileInput = {
      name: (value.name ?? '').trim() || null,
      code: (value.code ?? '').trim().toUpperCase() || null,
      profile: (value.profile ?? '').trim() || null,
      type: (value.type ?? '').trim() || null,
      callbackUrl: (value.callbackUrl ?? '').trim() || null,
      defaultCurrency: (value.defaultCurrency ?? '').trim().toUpperCase() || null,
    };

    this.saving = true;
    this.api.createOrganizationBillerProfile(this.organization.id, payload).subscribe({
      next: (biller) => {
        this.saving = false;
        this.activeModal.close({ mode: this.mode, biller });
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message || 'Failed to create the linked biller profile.';
      },
    });
  }

  private saveMember(): void {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }

    const value = this.memberForm.getRawValue();
    this.saving = true;

    this.api
      .createOrganizationMember(this.organization.id, {
        name: (value.name ?? '').trim(),
        email: (value.email ?? '').trim().toLowerCase(),
        role: (value.role ?? 'ADMIN') as CreateOrganizationMemberInput['role'],
        isPrimary: !!value.isPrimary,
        password: (value.password ?? '').trim() || undefined,
      })
      .subscribe({
        next: (member) => {
          this.saving = false;
          this.activeModal.close({ mode: this.mode, member });
        },
        error: (error) => {
          this.saving = false;
          this.error = error?.error?.message || 'Failed to create organization member.';
        },
      });
  }

  private saveComplianceProfile(): void {
    const value = this.complianceProfileForm.getRawValue();

    const mainRepFirstName = (value.mainRepFirstName ?? '').trim();
    const mainRepLastName = (value.mainRepLastName ?? '').trim();
    const mainRepresentative = (mainRepFirstName || mainRepLastName) ? {
      firstName: mainRepFirstName || '',
      lastName: mainRepLastName || '',
      phone: (value.mainRepPhone ?? '').trim() || null,
      dateOfBirth: (value.mainRepDateOfBirth ?? '') || null,
      email: (value.mainRepEmail ?? '').trim() || null,
      jobTitle: (value.mainRepJobTitle ?? '').trim() || null,
    } : null;

    const hqCity = (value.hqCity ?? '').trim();
    const headquarters = hqCity ? {
      street: (value.hqStreet ?? '').trim() || '',
      streetNumber: (value.hqStreetNumber ?? '').trim() || null,
      city: hqCity,
      postalCode: (value.hqPostalCode ?? '').trim() || null,
      country: (value.hqCountry ?? '').trim() || '',
      phone: (value.hqPhone ?? '').trim() || null,
    } : null;

    const bankName = (value.bankName ?? '').trim();
    const bankInformation = bankName ? {
      country: (value.bankCountry ?? '').trim() || '',
      name: bankName,
      holderName: (value.bankHolderName ?? '').trim() || '',
      accountNumber: (value.bankAccountNumber ?? '').trim() || '',
      currencyCode: (value.bankCurrencyCode ?? '').trim() || '',
    } : null;

    const storeIndustry = (value.storeIndustry ?? '').trim();
    const storeActivity = storeIndustry ? {
      industry: storeIndustry,
      websiteUrls: (value.storeWebsiteUrls ?? '').trim() || null,
      processingDetails: {
        businessModel: (value.storeBusinessModel ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
        annualSalesVolume: value.storeAnnualSalesVolume ? Number(value.storeAnnualSalesVolume) : null,
        otherBusinessModel: (value.storeOtherBusinessModel ?? '').trim() || null,
      },
    } : null;

    this.saving = true;
    this.api
      .updateOrganizationComplianceProfile(this.organization.id, {
        tradingName: (value.tradingName ?? '').trim() || null,
        registrationNumber: (value.registrationNumber ?? '').trim() || null,
        taxNumber: (value.taxNumber ?? '').trim() || null,
        vatNumber: (value.vatNumber ?? '').trim() || null,
        businessLicenseNumber: (value.businessLicenseNumber ?? '').trim() || null,
        businessLicenseExpiry: value.businessLicenseExpiry || null,
        industryCategory: (value.industryCategory ?? '').trim() || null,
        websiteUrl: (value.websiteUrl ?? '').trim() || null,
        businessModel: (value.businessModel ?? '').trim() || null,
        countriesServed: (value.countriesServed ?? '')
          .split(',')
          .map((part: string) => part.trim().toUpperCase())
          .filter(Boolean),
        expectedMonthlyVolumeCents: value.expectedMonthlyVolumeCents
          ? Number(value.expectedMonthlyVolumeCents)
          : null,
        averageTicketSizeCents: value.averageTicketSizeCents
          ? Number(value.averageTicketSizeCents)
          : null,
        settlementCycle: (value.settlementCycle ?? '').trim() || null,
        technicalIntegrationMethod:
          (value.technicalIntegrationMethod ?? '').trim() || null,
        financeContactName: (value.financeContactName ?? '').trim() || null,
        financeContactEmail: (value.financeContactEmail ?? '').trim() || null,
        operationsContactName: (value.operationsContactName ?? '').trim() || null,
        operationsContactEmail: (value.operationsContactEmail ?? '').trim() || null,
        technicalContactName: (value.technicalContactName ?? '').trim() || null,
        technicalContactEmail: (value.technicalContactEmail ?? '').trim() || null,
        disputeContactName: (value.disputeContactName ?? '').trim() || null,
        disputeContactEmail: (value.disputeContactEmail ?? '').trim() || null,
        refundPolicyUrl: (value.refundPolicyUrl ?? '').trim() || null,
        chargebackProcessNote: (value.chargebackProcessNote ?? '').trim() || null,
        sourceOfBusiness: (value.sourceOfBusiness ?? '').trim() || null,
        sourceOfFunds: (value.sourceOfFunds ?? '').trim() || null,
        businessType: (value.businessType ?? '').trim() || null,
        taxIdentificationNumber: (value.taxIdentificationNumber ?? '').trim() || null,
        dateOfEstablishment: (value.dateOfEstablishment ?? '') || null,
        iHaveSigningAuthority: !!value.iHaveSigningAuthority,
        thereNoCompaniesWithMoreThan25: !!value.thereNoCompaniesWithMoreThan25,
        mainRepresentative,
        headquarters,
        bankInformation,
        storeActivity,
        beneficialOwners: this.beneficialOwnersDraft,
        associatedCompanies: this.associatedCompaniesDraft,
        authorizedSignatories: this.authorizedSignatoriesDraft,
        settlementAccounts: this.settlementAccountsDraft,
      })
      .subscribe({
        next: (profile) => {
          this.saving = false;
          this.activeModal.close({ mode: this.mode, profile });
        },
        error: (error) => {
          this.saving = false;
          this.error = error?.error?.message || 'Failed to update compliance profile.';
        },
      });
  }

  private patchComplianceProfileForm(profile: OrganizationComplianceProfile | null): void {
    this.beneficialOwnersDraft = [...(profile?.beneficialOwners ?? [])];
    this.associatedCompaniesDraft = [...(profile?.associatedCompanies ?? [])];
    this.authorizedSignatoriesDraft = [...(profile?.authorizedSignatories ?? [])];
    this.settlementAccountsDraft = [...(profile?.settlementAccounts ?? [])];
    this.resetBeneficialOwnerForm();
    this.resetAssociatedCompanyForm();
    this.resetAuthorizedSignatoryForm();
    this.resetSettlementAccountForm();

    const mainRep = profile?.mainRepresentative as Record<string, unknown> | null | undefined;
    const hq = profile?.headquarters as Record<string, unknown> | null | undefined;
    const bank = profile?.bankInformation as Record<string, unknown> | null | undefined;
    const store = profile?.storeActivity as Record<string, unknown> | null | undefined;
    const storeProcessing = store?.['processingDetails'] as Record<string, unknown> | null | undefined;

    this.complianceProfileForm.reset({
      tradingName: profile?.tradingName ?? '',
      registrationNumber: profile?.registrationNumber ?? '',
      taxNumber: profile?.taxNumber ?? '',
      vatNumber: profile?.vatNumber ?? '',
      businessLicenseNumber: profile?.businessLicenseNumber ?? '',
      businessLicenseExpiry: profile?.businessLicenseExpiry
        ? profile.businessLicenseExpiry.slice(0, 10)
        : '',
      industryCategory: profile?.industryCategory ?? '',
      websiteUrl: profile?.websiteUrl ?? '',
      businessModel: profile?.businessModel ?? '',
      countriesServed: (profile?.countriesServed ?? []).join(', '),
      expectedMonthlyVolumeCents: profile?.expectedMonthlyVolumeCents?.toString() ?? '',
      averageTicketSizeCents: profile?.averageTicketSizeCents?.toString() ?? '',
      settlementCycle: profile?.settlementCycle ?? '',
      technicalIntegrationMethod: profile?.technicalIntegrationMethod ?? '',
      financeContactName: profile?.financeContactName ?? '',
      financeContactEmail: profile?.financeContactEmail ?? '',
      operationsContactName: profile?.operationsContactName ?? '',
      operationsContactEmail: profile?.operationsContactEmail ?? '',
      technicalContactName: profile?.technicalContactName ?? '',
      technicalContactEmail: profile?.technicalContactEmail ?? '',
      disputeContactName: profile?.disputeContactName ?? '',
      disputeContactEmail: profile?.disputeContactEmail ?? '',
      refundPolicyUrl: profile?.refundPolicyUrl ?? '',
      chargebackProcessNote: profile?.chargebackProcessNote ?? '',
      sourceOfBusiness: profile?.sourceOfBusiness ?? '',
      sourceOfFunds: profile?.sourceOfFunds ?? '',
      businessType: profile?.businessType ?? '',
      taxIdentificationNumber: profile?.taxIdentificationNumber ?? '',
      dateOfEstablishment: profile?.dateOfEstablishment ? profile.dateOfEstablishment.slice(0, 10) : '',
      iHaveSigningAuthority: profile?.iHaveSigningAuthority ?? true,
      thereNoCompaniesWithMoreThan25: profile?.thereNoCompaniesWithMoreThan25 ?? false,
      mainRepFirstName: (mainRep?.['firstName'] as string) ?? '',
      mainRepLastName: (mainRep?.['lastName'] as string) ?? '',
      mainRepPhone: (mainRep?.['phone'] as string) ?? '',
      mainRepDateOfBirth: (mainRep?.['dateOfBirth'] as string) ?? '',
      mainRepEmail: (mainRep?.['email'] as string) ?? '',
      mainRepJobTitle: (mainRep?.['jobTitle'] as string) ?? '',
      hqStreet: (hq?.['street'] as string) ?? '',
      hqStreetNumber: (hq?.['streetNumber'] as string) ?? '',
      hqCity: (hq?.['city'] as string) ?? '',
      hqPostalCode: (hq?.['postalCode'] as string) ?? '',
      hqCountry: (hq?.['country'] as string) ?? '',
      hqPhone: (hq?.['phone'] as string) ?? '',
      storeIndustry: (store?.['industry'] as string) ?? '',
      storeWebsiteUrls: (store?.['websiteUrls'] as string) ?? '',
      storeBusinessModel: Array.isArray(storeProcessing?.['businessModel'])
        ? (storeProcessing['businessModel'] as string[]).join(', ')
        : '',
      storeAnnualSalesVolume: storeProcessing?.['annualSalesVolume'] != null
        ? String(storeProcessing['annualSalesVolume'])
        : '',
      storeOtherBusinessModel: (storeProcessing?.['otherBusinessModel'] as string) ?? '',
      bankCountry: (bank?.['country'] as string) ?? '',
      bankName: (bank?.['name'] as string) ?? '',
      bankHolderName: (bank?.['holderName'] as string) ?? '',
      bankAccountNumber: (bank?.['accountNumber'] as string) ?? '',
      bankCurrencyCode: (bank?.['currencyCode'] as string) ?? '',
    });
  }

  private resetBeneficialOwnerForm(): void {
    this.beneficialOwnerForm.reset({
      firstName: '',
      lastName: '',
      role: '',
      dateOfBirth: '',
      ownershipPercent: '',
      nationalIdNumber: '',
      passportNumber: '',
      phoneNumber: '',
      email: '',
      residentialAddress: '',
      isPoliticallyExposed: false,
      isSanctionsMatch: false,
    });
  }

  private patchBeneficialOwnerForm(owner?: BeneficialOwner): void {
    this.beneficialOwnerForm.reset({
      firstName: owner?.firstName ?? '',
      lastName: owner?.lastName ?? '',
      role: owner?.role ?? '',
      dateOfBirth: owner?.dateOfBirth ?? '',
      ownershipPercent:
        owner?.ownershipPercent !== null && owner?.ownershipPercent !== undefined
          ? owner.ownershipPercent.toString()
          : '',
      nationalIdNumber: owner?.nationalIdNumber ?? '',
      passportNumber: owner?.passportNumber ?? '',
      phoneNumber: owner?.phoneNumber ?? '',
      email: owner?.email ?? '',
      residentialAddress: this.stringifyJson(owner?.residentialAddress),
      isPoliticallyExposed: owner?.isPoliticallyExposed ?? false,
      isSanctionsMatch: owner?.isSanctionsMatch ?? false,
    });
  }

  private resetAssociatedCompanyForm(): void {
    this.associatedCompanyForm.reset({
      registrationNumber: '',
      country: '',
      companyName: '',
      associationRelationship: '',
      repFirstName: '',
      repLastName: '',
      repEmail: '',
    });
  }

  private patchAssociatedCompanyForm(company?: AssociatedCompany): void {
    this.associatedCompanyForm.reset({
      registrationNumber: company?.registrationNumber ?? '',
      country: company?.country ?? '',
      companyName: company?.companyName ?? '',
      associationRelationship: company?.associationRelationship ?? '',
      repFirstName: company?.repFirstName ?? '',
      repLastName: company?.repLastName ?? '',
      repEmail: company?.repEmail ?? '',
    });
  }

  private normalizeAssociatedCompany(source: FormGroup): AssociatedCompany | null {
    const value = source.getRawValue();
    const companyName = (value.companyName ?? '').trim();
    if (!companyName) {
      return null;
    }

    return {
      registrationNumber: (value.registrationNumber ?? '').trim() || null,
      country: (value.country ?? '').trim() || null,
      companyName,
      associationRelationship: (value.associationRelationship ?? '').trim() || null,
      repFirstName: (value.repFirstName ?? '').trim() || null,
      repLastName: (value.repLastName ?? '').trim() || null,
      repEmail: (value.repEmail ?? '').trim() || null,
    };
  }

  private resetAuthorizedSignatoryForm(): void {
    this.authorizedSignatoryForm.reset({
      fullName: '',
      roleTitle: '',
      nationalIdNumber: '',
      passportNumber: '',
      phoneNumber: '',
      email: '',
      proofOfAuthorityUrl: '',
    });
  }

  private patchAuthorizedSignatoryForm(signatory?: AuthorizedSignatory): void {
    this.authorizedSignatoryForm.reset({
      fullName: signatory?.fullName ?? '',
      roleTitle: signatory?.roleTitle ?? '',
      nationalIdNumber: signatory?.nationalIdNumber ?? '',
      passportNumber: signatory?.passportNumber ?? '',
      phoneNumber: signatory?.phoneNumber ?? '',
      email: signatory?.email ?? '',
      proofOfAuthorityUrl: signatory?.proofOfAuthorityUrl ?? '',
    });
  }

  private resetSettlementAccountForm(): void {
    this.settlementAccountForm.reset({
      bankName: '',
      accountName: '',
      accountNumber: '',
      accountType: '',
      branchCode: '',
      currency: '',
      proofDocumentUrl: '',
      isPrimary: false,
    });
  }

  private patchSettlementAccountForm(account?: SettlementAccount): void {
    this.settlementAccountForm.reset({
      bankName: account?.bankName ?? '',
      accountName: account?.accountName ?? '',
      accountNumber: account?.accountNumber ?? '',
      accountType: account?.accountType ?? '',
      branchCode: account?.branchCode ?? '',
      currency: account?.currency ?? '',
      proofDocumentUrl: account?.proofDocumentUrl ?? '',
      isPrimary: account?.isPrimary ?? false,
    });
  }

  private normalizeBeneficialOwner(source: FormGroup): BeneficialOwner | null {
    const value = source.getRawValue();
    const firstName = (value.firstName ?? '').trim();
    const lastName = (value.lastName ?? '').trim();
    if (!firstName && !lastName) {
      return null;
    }

    return {
      firstName,
      lastName,
      role: (value.role ?? '').trim() || null,
      dateOfBirth: (value.dateOfBirth ?? '').trim() || null,
      ownershipPercent:
        value.ownershipPercent !== '' && value.ownershipPercent !== null
          ? Number(value.ownershipPercent)
          : null,
      nationalIdNumber: (value.nationalIdNumber ?? '').trim() || null,
      passportNumber: (value.passportNumber ?? '').trim() || null,
      phoneNumber: (value.phoneNumber ?? '').trim() || null,
      email: (value.email ?? '').trim() || null,
      residentialAddress: this.parseJson(value.residentialAddress),
      isPoliticallyExposed: !!value.isPoliticallyExposed,
      isSanctionsMatch: !!value.isSanctionsMatch,
    };
  }

  private normalizeAuthorizedSignatory(source: FormGroup): AuthorizedSignatory | null {
    const value = source.getRawValue();
    const fullName = (value.fullName ?? '').trim();
    if (!fullName) {
      return null;
    }

    return {
      fullName,
      roleTitle: (value.roleTitle ?? '').trim() || null,
      nationalIdNumber: (value.nationalIdNumber ?? '').trim() || null,
      passportNumber: (value.passportNumber ?? '').trim() || null,
      phoneNumber: (value.phoneNumber ?? '').trim() || null,
      email: (value.email ?? '').trim() || null,
      proofOfAuthorityUrl: (value.proofOfAuthorityUrl ?? '').trim() || null,
    };
  }

  private normalizeSettlementAccount(source: FormGroup): SettlementAccount | null {
    const value = source.getRawValue();
    const bankName = (value.bankName ?? '').trim();
    const accountName = (value.accountName ?? '').trim();
    const accountNumber = (value.accountNumber ?? '').trim();
    if (!bankName || !accountName || !accountNumber) {
      return null;
    }

    return {
      bankName,
      accountName,
      accountNumber,
      accountType: (value.accountType ?? '').trim() || null,
      branchCode: (value.branchCode ?? '').trim() || null,
      currency: (value.currency ?? '').trim().toUpperCase() || null,
      proofDocumentUrl: (value.proofDocumentUrl ?? '').trim() || null,
      isPrimary: !!value.isPrimary,
    };
  }

  private stringifyJson(value: Record<string, unknown> | null | undefined): string {
    if (!value || Object.keys(value).length === 0) {
      return '';
    }

    return JSON.stringify(value, null, 2);
  }

  private parseJson(value: unknown): Record<string, unknown> | null {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) {
      return null;
    }

    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}
