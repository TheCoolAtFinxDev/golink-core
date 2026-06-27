import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface MerchantPspConfig {
  id: string;
  merchantId: string;
  rail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT';
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClient {
  id: string;
  name: string;
  sourceSystem: string;
  keyPrefix?: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  pspConfigs?: MerchantPspConfig[];
  apiClients?: ApiClient[];
}

export interface PagedResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
  isActive: boolean;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    hasPassword?: boolean;
  };
}

export interface Organization {
  id: string;
  type: 'PSO' | 'BILLER' | 'MERCHANT' | 'CUSTOMER_ORG' | 'INTERNAL';
  name: string;
  code: string;
  logoUrl?: string | null;
  externalRef?: string | null;
  contactEmail?: string | null;
  isActive: boolean;
  meta?: Record<string, unknown> | null;
  readinessStatus: 'DRAFT' | 'INCOMPLETE' | 'READY' | 'LIVE' | 'SUSPENDED';
  billingStatus: 'NOT_CONFIGURED' | 'PENDING' | 'ACTIVE' | 'PAUSED';
  partnerStatus?:
    | 'LEAD'
    | 'ONBOARDING'
    | 'DOCS_SUBMITTED'
    | 'COMPLIANCE_REVIEW'
    | 'COMMERCIAL_REVIEW'
    | 'APPROVED'
    | 'ACTIVE'
    | 'RESTRICTED'
    | 'REJECTED'
    | 'OFFBOARDED';
  verificationDecision?:
    | 'UNKNOWN'
    | 'APPROVED'
    | 'REJECTED'
    | 'MANUAL_REVIEW'
    | 'PENDING';
  latestKycCaseId?: string | null;
  verificationRiskScore?: number | null;
  verificationRiskLabels?: Record<string, unknown> | null;
  verificationApprovedAt?: string | null;
  verificationLastChangedAt?: string | null;
  billingEmail?: string | null;
  billingCurrency?: string | null;
  lagoCustomerId?: string | null;
  lagoSubscriptionId?: string | null;
  billingNotes?: string | null;
  billingReadiness: {
    eligible: boolean;
    targetStatus: 'PENDING' | 'ACTIVE' | null;
    blockers: string[];
    items: Array<{
      key: string;
      label: string;
      status: 'complete' | 'warning' | 'incomplete';
      detail: string;
    }>;
  };
  hasBillerProfile: boolean;
  pricingProfile?: {
    planCode: 'STARTER' | 'GROWTH' | 'ENTERPRISE' | 'CUSTOM';
    currency: string;
    subscriptionFeeCents: number;
    transactionRateBps: number;
    minFeeCents: number;
    retryAttemptFeeCents: number;
    retrySuccessFeeCents: number;
    recoveryRateBps: number;
    aiScoreFeeCents: number;
    defaultGuardFeeCents: number;
    discountBps: number;
    notes?: string | null;
  } | null;
  complianceProfile?: OrganizationComplianceProfile | null;
  linkedBillerProfiles?: Array<{
    id: string;
    name: string;
    code: string;
    callbackUrl?: string | null;
    defaultCurrency?: string | null;
  }>;
  linkedBillerProfile?: {
    id: string;
    callbackUrl?: string | null;
    defaultCurrency?: string | null;
  } | null;
  primaryMember?: {
    id: string;
    role: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
    isPrimary: boolean;
    isActive: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      isActive: boolean;
    };
  } | null;
  stats: {
    members: number;
    billers?: number;
    bills: number;
    subscriptions: number;
    payments: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateOrganizationBillingProfileInput {
  readinessStatus?: 'DRAFT' | 'INCOMPLETE' | 'READY' | 'LIVE' | 'SUSPENDED' | null;
  billingStatus?: 'NOT_CONFIGURED' | 'PENDING' | 'ACTIVE' | 'PAUSED' | null;
  billingEmail?: string | null;
  billingCurrency?: string | null;
  lagoCustomerId?: string | null;
  lagoSubscriptionId?: string | null;
  notes?: string | null;
}

export interface OrganizationBillerProfileInput {
  name?: string | null;
  code?: string | null;
  profile?: string | null;
  type?: string | null;
  callbackUrl?: string | null;
  defaultCurrency?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface UpdateOrganizationMemberInput {
  name?: string | null;
  email?: string | null;
  role?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | null;
  isActive?: boolean;
  isPrimary?: boolean;
  password?: string | null;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  externalRef?: string;
  organizationId?: string | null;
  identityStatus?:
    | 'DRAFT'
    | 'KYC_INITIATED'
    | 'UNDER_REVIEW'
    | 'VERIFIED'
    | 'RESTRICTED'
    | 'REJECTED'
    | 'SUSPENDED';
  identityDecision?:
    | 'UNKNOWN'
    | 'APPROVED'
    | 'REJECTED'
    | 'MANUAL_REVIEW'
    | 'PENDING';
  latestKycCaseId?: string | null;
  identityRiskScore?: number | null;
  identityRiskLabels?: Record<string, unknown> | null;
  identityVerifiedAt?: string | null;
  identityLastChangedAt?: string | null;
  kycProfile?: CustomerKycProfile | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertCustomerInput {
  email: string;
  name?: string | null;
  externalRef?: string | null;
}

export interface MergeCustomersResult {
  primaryCustomerId: string;
  mergedCount: number;
  mergedIds: string[];
}

export interface CreateBillInput {
  billerCode: string;
  customerId: string;
  externalBillId?: string;
  type: 'ADHOC' | 'CONTRACT' | 'INDEFINITE';
  amount: number;
  currency: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  interval?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null;
}

export interface CustomerKycProfile {
  id?: string;
  customerId?: string;
  dateOfBirth?: string | null;
  mobileNumber?: string | null;
  residentialAddress?: Record<string, unknown> | null;
  nationalIdNumber?: string | null;
  passportNumber?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  idDocumentCountry?: string | null;
  selfieFileUrl?: string | null;
  livenessCheckStatus?: string | null;
  sourceOfFundsRequired?: boolean;
  sourceOfFundsNote?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BeneficialOwner {
  id?: string;
  firstName: string;
  lastName: string;
  role?: string | null;
  dateOfBirth?: string | null;
  ownershipPercent?: number | null;
  nationalIdNumber?: string | null;
  passportNumber?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  residentialAddress?: Record<string, unknown> | null;
  isPoliticallyExposed?: boolean;
  isSanctionsMatch?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface MainRepresentative {
  firstName: string;
  lastName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  jobTitle?: string | null;
}

export interface Headquarters {
  street: string;
  streetNumber?: string | null;
  city: string;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
}

export interface BankInformation {
  country: string;
  name: string;
  holderName: string;
  accountNumber: string;
  currencyCode: string;
}

export interface ProcessingDetails {
  businessModel?: string[];
  annualSalesVolume?: number | null;
  otherBusinessModel?: string | null;
}

export interface StoreActivity {
  industry: string;
  websiteUrls?: string | null;
  processingDetails?: ProcessingDetails | null;
}

export interface AssociatedCompany {
  id?: string;
  registrationNumber: string;
  country: string;
  companyName: string;
  associationRelationship?: string | null;
  repFirstName?: string | null;
  repLastName?: string | null;
  repEmail?: string | null;
}

export interface ComplianceDocument {
  id: string;
  documentId: string;
  category: string;
  type: string;
  ballerineFileId: string;
  fileName?: string | null;
  mimeType?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthorizedSignatory {
  id?: string;
  fullName: string;
  roleTitle?: string | null;
  nationalIdNumber?: string | null;
  passportNumber?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  proofOfAuthorityUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SettlementAccount {
  id?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType?: string | null;
  branchCode?: string | null;
  currency?: string | null;
  proofDocumentUrl?: string | null;
  isPrimary?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface SuggestedOrganizationMember {
  name: string;
  email?: string | null;
  title?: string | null;
  source?: string | null;
  suggestedRole?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | null;
}

export interface OrganizationComplianceProfile {
  id?: string;
  organizationId?: string;
  tradingName?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  vatNumber?: string | null;
  businessLicenseNumber?: string | null;
  businessLicenseExpiry?: string | null;
  industryCategory?: string | null;
  websiteUrl?: string | null;
  businessModel?: string | null;
  countriesServed?: string[];
  expectedMonthlyVolumeCents?: number | null;
  averageTicketSizeCents?: number | null;
  settlementCycle?: string | null;
  technicalIntegrationMethod?: string | null;
  financeContactName?: string | null;
  financeContactEmail?: string | null;
  operationsContactName?: string | null;
  operationsContactEmail?: string | null;
  technicalContactName?: string | null;
  technicalContactEmail?: string | null;
  disputeContactName?: string | null;
  disputeContactEmail?: string | null;
  refundPolicyUrl?: string | null;
  chargebackProcessNote?: string | null;
  sourceOfBusiness?: string | null;
  sourceOfFunds?: string | null;
  businessType?: string | null;
  taxIdentificationNumber?: string | null;
  dateOfEstablishment?: string | null;
  iHaveSigningAuthority?: boolean;
  thereNoCompaniesWithMoreThan25?: boolean;
  mainRepresentative?: MainRepresentative | null;
  headquarters?: Headquarters | null;
  bankInformation?: BankInformation | null;
  storeActivity?: StoreActivity | null;
  beneficialOwners?: BeneficialOwner[];
  authorizedSignatories?: AuthorizedSignatory[];
  settlementAccounts?: SettlementAccount[];
  associatedCompanies?: AssociatedCompany[];
  documents?: ComplianceDocument[];
  suggestedMembers?: SuggestedOrganizationMember[];
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface KycCase {
  id: string;
  subjectType?: 'CUSTOMER' | 'ORGANIZATION' | string;
  verificationType?: 'INDIVIDUAL' | 'BUSINESS' | string;
  provider?: string;
  customerId?: string | null;
  organizationId?: string | null;
  status?: string;
  decisionStatus?: string;
  providerEntityId?: string | null;
  providerWorkflowDefinitionId?: string | null;
  providerWorkflowRuntimeId?: string | null;
  correlationId?: string | null;
  collectionFlowUrl?: string | null;
  riskScore?: number | null;
  riskLabels?: Record<string, unknown> | null;
  decisionPayload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  lastWebhookAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComplianceCheckResult {
  started: boolean;
  status: 'started' | 'existing_case_reused' | 'not_ready' | 'failed_to_start';
  caseId?: string;
  caseStatus?: string;
  collectionFlowUrl?: string | null;
  reason?: string;
}

export interface UpdateOrganizationComplianceProfileResponse
  extends OrganizationComplianceProfile {
  complianceCheck?: ComplianceCheckResult;
}

export interface CustomerIdentity {
  subjectType: 'customer';
  customerId: string;
  status: Customer['identityStatus'];
  decision: Customer['identityDecision'];
  riskScore?: number | null;
  riskLabels?: Record<string, unknown> | null;
  latestKycCaseId?: string | null;
  verifiedAt?: string | null;
  updatedAt?: string | null;
  canTransact: boolean;
  latestCase?: KycCase | null;
}

export interface OrganizationIdentity {
  subjectType: 'organization';
  organizationId: string;
  partnerStatus: Organization['partnerStatus'];
  decision: Organization['verificationDecision'];
  riskScore?: number | null;
  riskLabels?: Record<string, unknown> | null;
  latestKycCaseId?: string | null;
  approvedAt?: string | null;
  updatedAt?: string | null;
  readinessStatus: Organization['readinessStatus'];
  canAcceptBillIntake: boolean;
  latestCase?: KycCase | null;
}

export interface StartKycInput {
  workflowId?: string | null;
  correlationId?: string | null;
  externalEntityId?: string | null;
  entityData?: Record<string, unknown> | null;
  documents?: unknown[] | null;
  metadata?: Record<string, unknown> | null;
  webhookUrl?: string | null;
}

export interface Bill {
  id: string;
  customerId?: string | null;
  organizationId?: string;
  billerId?: string;
  externalBillId: string;
  amount: number;
  currency: string;
  status: string;
  type?: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  interval?: string | null;
  createdAt?: string;
  customer?: { id: string; name?: string; email: string } | null;
  subscription?: {
    id: string;
    paymentMethodId?: string | null;
    paymentMethod?: { id: string; kind: string; last4?: string | null; scheme?: string | null; maskedPan?: string | null } | null;
  } | null;
}

export interface BillDetail extends Bill {
  updatedAt?: string;
  meta?: Record<string, unknown> | null;
  organization?: Pick<
    Organization,
    'id' | 'type' | 'name' | 'code' | 'contactEmail' | 'isActive'
  > | null;
  biller?: Biller | null;
  customer?: Customer | null;
  subscription?: SubscriptionDetail | null;
  payments: PaymentDetail[];
}

export interface Subscription {
  id: string;
  customerId: string;
  organizationId?: string | null;
  paymentMethodId?: string | null;
  amount: number;
  currency: string;
  interval: string;
  status: string;
  nextRunAt: string;
  attempt: number;
  maxAttempts: number;
  merchantProfileId?: string | null;
  createdAt?: string;
  customer?: { id: string; name?: string; email: string } | null;
  paymentMethod?: { id: string; kind: string; last4?: string | null; scheme?: string | null; maskedPan?: string | null } | null;
}

export interface SubscriptionDetail extends Subscription {
  updatedAt?: string;
  lastResultCode?: string | null;
  lastResultDesc?: string | null;
  organization?: Pick<
    Organization,
    'id' | 'type' | 'name' | 'code' | 'contactEmail' | 'isActive'
  > | null;
  customer?: Customer | null;
  paymentMethod?: PaymentMethodSummary | null;
  bill?: Bill | null;
  billInternal?: BillDetail | null;
  payments: PaymentDetail[];
}

export interface UpdateSubscriptionInput {
  amount?: number;
  currency?: string;
  interval?: string;
  nextRunAt?: string;
  status?: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'PAST_DUE';
  maxAttempts?: number;
  merchantProfileId?: string;
  paymentMethodId?: string;
}

export interface Payment {
  id: string;
  customerId?: string | null;
  organizationId?: string | null;
  subscriptionId?: string | null;
  billId?: string | null;
  status: string;
  type: string;
  amount: number;
  currency: string;
  attempt?: number;
  merchantReference?: string;
  createdAt?: string;
  customer?: { id: string; name?: string; email: string } | null;
  organization?: { id: string; name: string; code: string } | null;
  bill?: {
    id: string;
    externalBillId?: string | null;
    biller?: { id: string; name: string; code: string } | null;
  } | null;
  subscription?: { id: string } | null;
}

export interface PaymentMethodSummary {
  id: string;
  customerId?: string | null;
  kind: string;
  scheme?: string | null;
  last4?: string | null;
  token?: string | null;
  transactionIndex?: string | null;
  maskedPan?: string | null;
  expiryMMYY?: string | null;
  originApplicationId?: string | null;
  originMerchantProfileId?: string | null;
  status?: string | null;
  createdAt?: string;
}

export interface PaymentDetail extends Payment {
  paymentMethodId?: string | null;
  transactionIndex?: string | null;
  requestId?: string | null;
  rawRequest?: Record<string, unknown> | null;
  rawResponse?: Record<string, unknown> | null;
  organization?: Pick<
    Organization,
    'id' | 'type' | 'name' | 'code' | 'contactEmail' | 'isActive'
  > | null;
  customer?: Customer | null;
  bill?: BillDetail | null;
  subscription?: SubscriptionDetail | null;
  paymentMethod?: PaymentMethodSummary | null;
}

export interface Biller {
  id: string;
  organizationId: string;
  organizationType: string;
  name: string;
  code: string;
  profile?: string | null;
  type?: string | null;
  logoUrl?: string | null;
  externalRef?: string;
  contactEmail?: string;
  callbackUrl?: string;
  defaultCurrency?: string;
  isActive: boolean;
  meta?: Record<string, unknown> | null;
  primaryAdmin?: {
    membershipId: string;
    role: string;
    isPrimary: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      isActive: boolean;
    };
  } | null;
  organization?: {
    id: string;
    type: string;
    name: string;
    code: string;
    logoUrl?: string | null;
    externalRef?: string | null;
    contactEmail?: string | null;
    isActive: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationUsageEvent {
  id: string;
  organizationId: string;
  billerId?: string | null;
  biller?: Pick<Biller, 'id' | 'name' | 'code'> | null;
  metricCode:
    | 'TRANSACTION_COUNT'
    | 'COLLECTION_AMOUNT'
    | 'RETRY_ATTEMPT'
    | 'RETRY_SUCCESS'
    | 'RECOVERED_AMOUNT'
    | 'AI_SCORE'
    | 'DEFAULT_GUARD_SUCCESS';
  externalEventId: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  quantity?: number | null;
  amountCents?: number | null;
  currency?: string | null;
  occurredAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED';
  lagoTransactionId?: string | null;
  lastSyncError?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillerSummary {
  billerId: string;
  code: string;
  stats: {
    subscriptions: number;
    bills: number;
    payments: number;
    members: number;
  };
}

export interface UpsertBillerInput {
  name: string;
  code: string;
  logoUrl?: string | null;
  externalRef?: string | null;
  contactEmail?: string | null;
  callbackUrl?: string | null;
  defaultCurrency?: string | null;
  isActive?: boolean;
  meta?: Record<string, unknown> | null;
  initialAdminName?: string | null;
  initialAdminEmail?: string | null;
  initialAdminRole?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | null;
}

export interface CreateOrganizationMemberInput {
  name: string;
  email: string;
  role?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | null;
  isPrimary?: boolean;
  password?: string | null;
}

export interface CreateOrganizationInput {
  type: 'PSO' | 'BILLER' | 'MERCHANT' | 'CUSTOMER_ORG' | 'INTERNAL';
  name: string;
  code: string;
  externalRef?: string | null;
  contactEmail?: string | null;
  isActive?: boolean;
  meta?: Record<string, unknown> | null;
}

export interface SystemUserMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
  isActive: boolean;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
  organization: {
    id: string;
    type: 'PSO' | 'BILLER' | 'MERCHANT' | 'CUSTOMER_ORG' | 'INTERNAL';
    name: string;
    code: string;
    isActive: boolean;
  };
}

export interface SystemUserRecord {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  hasPassword: boolean;
  createdAt?: string;
  updatedAt?: string;
  memberships: SystemUserMembership[];
}

export interface CreateSystemUserInput {
  email: string;
  name: string;
  isActive?: boolean;
  password?: string | null;
  memberships?: Array<{
    organizationId: string;
    role?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | null;
    isPrimary?: boolean;
    isActive?: boolean;
  }>;
}

export interface UpdateSystemUserInput {
  email?: string | null;
  name?: string | null;
  isActive?: boolean;
  password?: string | null;
}

export interface UpsertSystemUserMembershipInput {
  organizationId: string;
  role?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | null;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface PermissionDef {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface RolePermissionGrant {
  id: string;
  permissionId: string;
  requires4Eyes: boolean;
  permission: PermissionDef;
}

export interface SystemRole {
  id: string;
  name: string;
  description?: string | null;
  isBuiltIn: boolean;
  isActive: boolean;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
  permissions?: RolePermissionGrant[];
}

// ─── Transact-API Payment Types ────────────────────────────────────────────

export interface AdminPaymentExecution {
  id: string;
  attempt: number;
  pspRail: string;
  pspReference?: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  executedAt: string;
  completedAt?: string | null;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
}

export interface AdminPaymentRecord {
  id: string;
  merchantId: string;
  direction: 'DEBIT' | 'CREDIT';
  rail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT';
  sourceSystem: string;
  sourceReference?: string | null;
  payer: Record<string, unknown>;
  payee: Record<string, unknown>;
  amount: number;
  currency: string;
  description?: string | null;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  storedPaymentMethodId?: string | null;
  subscriptionId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  executions?: AdminPaymentExecution[];
}

export interface AdminCreatePaymentInput {
  merchantId: string;
  direction: 'DEBIT' | 'CREDIT';
  rail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT';
  amountMinor: number;
  currency: string;
  payer: Record<string, unknown>;
  payee: Record<string, unknown>;
  description?: string;
  sourceReference?: string;
  cardData?: { pan: string; expiryMMYY: string };
}

// ─── CPS Batch Types ────────────────────────────────────────────────────────

export interface CpsBatch {
  id: string;
  merchantId: string;
  sequenceNumber: number;
  status: 'DRAFT' | 'SUBMITTED' | 'ACK' | 'NACK' | 'PARTIALLY_FAILED';
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Payment Link Types ─────────────────────────────────────────────────────

export interface PaymentLink {
  id: string;
  merchantId: string;
  shortCode: string;
  title: string;
  description?: string | null;
  amountMinor?: number | null;
  currency: string;
  allowedRails: string[];
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  notifiedVia: string[];
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentLinkInput {
  merchantId: string;
  title: string;
  description?: string;
  amountMinor?: number;
  currency: string;
  allowedRails?: string[];
  expiresAt?: string;
  maxUses?: number;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
}

export interface ApprovalRequest {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  payload: Record<string, unknown>;
  requesterNotes?: string | null;
  reviewerNotes?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  expiresAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester: { id: string; name: string; email: string };
  reviewer?: { id: string; name: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class PortalApiService {
  constructor(private readonly http: HttpClient) {}

  getOrganizations(params?: {
    q?: string;
    type?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResponse<Organization>> {
    const searchParams = new URLSearchParams();

    if (params?.q?.trim()) searchParams.set('q', params.q.trim());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.isActive !== undefined) {
      searchParams.set('isActive', String(params.isActive));
    }
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const query = searchParams.toString();
    const url = query ? `/api/organizations?${query}` : '/api/organizations';

    return this.http.get<PagedResponse<Organization>>(url);
  }

  getOrganization(id: string): Observable<Organization> {
    return this.http.get<Organization>(`/api/organizations/${id}`);
  }

  createOrganization(payload: CreateOrganizationInput): Observable<Organization> {
    return this.http.post<Organization>('/api/organizations', payload);
  }

  getOrganizationIdentity(id: string): Observable<OrganizationIdentity> {
    return this.http.get<OrganizationIdentity>(`/api/identity/organizations/${id}`);
  }

  getOrganizationComplianceProfile(
    id: string,
  ): Observable<OrganizationComplianceProfile | null> {
    return this.http.get<OrganizationComplianceProfile | null>(
      `/api/organizations/${id}/compliance-profile`,
    );
  }

  updateOrganizationComplianceProfile(
    id: string,
    payload: Partial<OrganizationComplianceProfile>,
  ): Observable<UpdateOrganizationComplianceProfileResponse> {
    return this.http.patch<UpdateOrganizationComplianceProfileResponse>(
      `/api/organizations/${id}/compliance-profile`,
      payload,
    );
  }

  uploadComplianceDocument(
    organizationId: string,
    file: File,
    documentId: string,
    category: string,
    type: string,
  ): Observable<ComplianceDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', documentId);
    formData.append('category', category);
    formData.append('type', type);
    return this.http.post<ComplianceDocument>(
      `/api/organizations/${organizationId}/compliance-profile/documents`,
      formData,
    );
  }

  deleteComplianceDocument(
    organizationId: string,
    docId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `/api/organizations/${organizationId}/compliance-profile/documents/${docId}`,
    );
  }

  updateOrganizationBillingProfile(
    id: string,
    payload: UpdateOrganizationBillingProfileInput,
  ): Observable<Organization> {
    return this.http.patch<Organization>(
      `/api/organizations/${id}/billing-profile`,
      payload,
    );
  }

  activateOrganizationBilling(id: string): Observable<Organization> {
    return this.http.post<Organization>(`/api/organizations/${id}/billing/activate`, {});
  }

  startOrganizationKyb(id: string, payload?: StartKycInput): Observable<KycCase> {
    return this.http.post<KycCase>(
      `/api/organizations/${id}/compliance-check/start`,
      payload ?? {},
    );
  }

  getLatestOrganizationKycCase(id: string): Observable<KycCase | null> {
    return this.http.get<KycCase | null>(`/api/organizations/${id}/compliance-check/latest`);
  }

  getOrganizationUsageEvents(
    id: string,
    params?: {
      limit?: number;
      syncStatus?: string;
    },
  ): Observable<OrganizationUsageEvent[]> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.syncStatus) searchParams.set('syncStatus', params.syncStatus);

    const query = searchParams.toString();
    const url = query
      ? `/api/organizations/${id}/usage-events?${query}`
      : `/api/organizations/${id}/usage-events`;

    return this.http.get<OrganizationUsageEvent[]>(url);
  }

  getOrganizationBiller(id: string): Observable<Biller> {
    return this.http.get<Biller>(`/api/organizations/${id}/biller`);
  }

  getOrganizationBillers(id: string): Observable<Biller[]> {
    return this.http.get<Biller[]>(`/api/organizations/${id}/billers`);
  }

  createOrganizationBiller(
    id: string,
    payload: OrganizationBillerProfileInput,
  ): Observable<Biller> {
    return this.http.post<Biller>(`/api/organizations/${id}/biller`, payload);
  }

  createOrganizationBillerProfile(
    id: string,
    payload: OrganizationBillerProfileInput,
  ): Observable<Biller> {
    return this.http.post<Biller>(`/api/organizations/${id}/billers`, payload);
  }

  updateOrganizationBiller(
    id: string,
    payload: OrganizationBillerProfileInput,
  ): Observable<Biller> {
    return this.http.patch<Biller>(`/api/organizations/${id}/biller`, payload);
  }

  getCustomers(params?: {
    q?: string;
    hasExternalRef?: boolean;
    organizationId?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResponse<Customer>> {
    const searchParams = new URLSearchParams();

    if (params?.q?.trim()) searchParams.set('q', params.q.trim());
    if (params?.hasExternalRef !== undefined) {
      searchParams.set('hasExternalRef', String(params.hasExternalRef));
    }
    if (params?.organizationId) {
      searchParams.set('organizationId', params.organizationId);
    }
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const query = searchParams.toString();
    const url = query ? `/api/customers?${query}` : '/api/customers';

    return this.http.get<PagedResponse<Customer>>(url);
  }

  searchCustomers(params?: {
    search?: string;
    email?: string;
    limit?: number;
  }): Observable<Customer[]> {
    const searchParams = new URLSearchParams();

    if (params?.search?.trim()) searchParams.set('search', params.search.trim());
    if (params?.email?.trim()) searchParams.set('email', params.email.trim());
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    const url = query ? `/api/customers/search?${query}` : '/api/customers/search';

    return this.http.get<Customer[]>(url);
  }

  createCustomer(payload: UpsertCustomerInput): Observable<Customer> {
    return this.http.post<Customer>('/api/customers', payload);
  }

  mergeCustomers(payload: {
    primaryCustomerId: string;
    duplicateCustomerIds: string[];
  }): Observable<MergeCustomersResult> {
    return this.http.post<MergeCustomersResult>('/api/customers/merge', payload);
  }

  getCustomer(id: string): Observable<Customer> {
    return this.http.get<Customer>(`/api/customers/${id}`);
  }

  updateCustomer(id: string, payload: Partial<UpsertCustomerInput>): Observable<Customer> {
    return this.http.patch<Customer>(`/api/customers/${id}`, payload);
  }

  getCustomerIdentity(id: string): Observable<CustomerIdentity> {
    return this.http.get<CustomerIdentity>(`/api/identity/customers/${id}`);
  }

  getCustomerKycProfile(id: string): Observable<CustomerKycProfile | null> {
    return this.http.get<CustomerKycProfile | null>(`/api/customers/${id}/kyc-profile`);
  }

  updateCustomerKycProfile(
    id: string,
    payload: Partial<CustomerKycProfile>,
  ): Observable<CustomerKycProfile> {
    return this.http.patch<CustomerKycProfile>(`/api/customers/${id}/kyc-profile`, payload);
  }

  startCustomerKyc(id: string, payload?: StartKycInput): Observable<KycCase> {
    return this.http.post<KycCase>(`/api/kyc/customers/${id}/start`, payload ?? {});
  }

  getLatestCustomerKycCase(id: string): Observable<KycCase | null> {
    return this.http.get<KycCase | null>(`/api/kyc/customers/${id}/latest`);
  }

  getCustomerPaymentMethods(customerId: string): Observable<PaymentMethodSummary[]> {
    return this.http.get<PaymentMethodSummary[]>(
      `/api/payment-methods?customerId=${encodeURIComponent(customerId)}`,
    );
  }

  getBills(params?: {
    customerId?: string;
    organizationId?: string;
    billerCode?: string;
    status?: string;
    externalBillId?: string;
  }): Observable<Bill[]> {
    const searchParams = new URLSearchParams();

    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.billerCode) searchParams.set('billerCode', params.billerCode);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.externalBillId) searchParams.set('externalBillId', params.externalBillId);

    const query = searchParams.toString();
    const url = query ? `/api/bills?${query}` : '/api/bills';

    return this.http.get<Bill[]>(url);
  }

  getBill(id: string): Observable<BillDetail> {
    return this.http.get<BillDetail>(`/api/bills/${id}`);
  }

  createBill(payload: CreateBillInput): Observable<Bill> {
    return this.http.post<Bill>('/api/bills', payload);
  }

  getSubscriptions(params?: {
    customerId?: string;
    organizationId?: string;
    billerCode?: string;
    status?: string;
  }): Observable<Subscription[]> {
    const searchParams = new URLSearchParams();

    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.billerCode) searchParams.set('billerCode', params.billerCode);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const url = query ? `/api/subscriptions?${query}` : '/api/subscriptions';

    return this.http.get<Subscription[]>(url);
  }

  getSubscription(id: string): Observable<SubscriptionDetail> {
    return this.http.get<SubscriptionDetail>(`/api/subscriptions/${id}`);
  }

  updateSubscription(id: string, payload: UpdateSubscriptionInput): Observable<Subscription> {
    return this.http.patch<Subscription>(`/api/subscriptions/${id}`, payload);
  }

  pauseSubscription(id: string): Observable<Subscription> {
    return this.http.patch<Subscription>(`/api/subscriptions/${id}/pause`, {});
  }

  resumeSubscription(id: string): Observable<Subscription> {
    return this.http.patch<Subscription>(`/api/subscriptions/${id}/resume`, {});
  }

  cancelSubscription(id: string): Observable<Subscription> {
    return this.http.patch<Subscription>(`/api/subscriptions/${id}/cancel`, {});
  }

  runSubscriptionNow(id: string): Observable<{
    subscriptionId: string;
    status: string;
    paymentId?: string | null;
    nextRunAt?: string | null;
    gateway?: string | null;
  }> {
    return this.http.post<{
      subscriptionId: string;
      status: string;
      paymentId?: string | null;
      nextRunAt?: string | null;
      gateway?: string | null;
    }>(`/api/subscriptions/${id}/run-now`, {});
  }

  getPayments(params?: { merchantId?: string }): Observable<AdminPaymentRecord[]> {
    const url = params?.merchantId
      ? `/api/admin/payments?merchantId=${params.merchantId}`
      : '/api/admin/payments';
    return this.http.get<AdminPaymentRecord[]>(url);
  }

  getPayment(id: string): Observable<AdminPaymentRecord> {
    return this.http.get<AdminPaymentRecord>(`/api/admin/payments/${id}`);
  }

  retryPayment(id: string): Observable<AdminPaymentRecord> {
    return this.http.post<AdminPaymentRecord>(`/api/admin/payments/${id}/retry`, {});
  }

  adminCreatePayment(dto: AdminCreatePaymentInput): Observable<AdminPaymentRecord> {
    return this.http.post<AdminPaymentRecord>('/api/admin/payments', dto);
  }

  getBillers(params?: {
    q?: string;
    organizationId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResponse<Biller>> {
    const searchParams = new URLSearchParams();

    if (params?.q?.trim()) searchParams.set('q', params.q.trim());
    if (params?.organizationId) {
      searchParams.set('organizationId', params.organizationId);
    }
    if (params?.isActive !== undefined) {
      searchParams.set('isActive', String(params.isActive));
    }
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const query = searchParams.toString();
    const url = query ? `/api/billers?${query}` : '/api/billers';

    return this.http.get<PagedResponse<Biller>>(url);
  }

  getBiller(id: string): Observable<Biller> {
    return this.http.get<Biller>(`/api/billers/${id}`);
  }

  getBillerSummary(id: string): Observable<BillerSummary> {
    return this.http.get<BillerSummary>(`/api/billers/${id}/summary`);
  }

  createBiller(payload: UpsertBillerInput): Observable<Biller> {
    return this.http.post<Biller>('/api/billers', payload);
  }

  updateBiller(id: string, payload: Partial<UpsertBillerInput>): Observable<Biller> {
    return this.http.patch<Biller>(`/api/billers/${id}`, payload);
  }

  deactivateBiller(id: string): Observable<Biller> {
    return this.http.delete<Biller>(`/api/billers/${id}`);
  }

  getOrganizationMembers(
    organizationId: string,
  ): Observable<PagedResponse<OrganizationMember>> {
    return this.http.get<PagedResponse<OrganizationMember>>(
      `/api/organizations/${organizationId}/members`,
    );
  }

  createOrganizationMember(
    organizationId: string,
    payload: CreateOrganizationMemberInput,
  ): Observable<OrganizationMember> {
    return this.http.post<OrganizationMember>(
      `/api/organizations/${organizationId}/members`,
      payload,
    );
  }

  updateOrganizationMember(
    organizationId: string,
    memberId: string,
    payload: UpdateOrganizationMemberInput,
  ): Observable<OrganizationMember> {
    return this.http.patch<OrganizationMember>(
      `/api/organizations/${organizationId}/members/${memberId}`,
      payload,
    );
  }

  deactivateOrganizationMember(
    organizationId: string,
    memberId: string,
  ): Observable<OrganizationMember> {
    return this.http.delete<OrganizationMember>(
      `/api/organizations/${organizationId}/members/${memberId}`,
    );
  }

  getUsers(params?: {
    q?: string;
    isActive?: boolean;
    organizationId?: string;
    role?: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
    page?: number;
    pageSize?: number;
  }): Observable<PagedResponse<SystemUserRecord>> {
    const searchParams = new URLSearchParams();

    if (params?.q?.trim()) searchParams.set('q', params.q.trim());
    if (params?.isActive !== undefined) {
      searchParams.set('isActive', String(params.isActive));
    }
    if (params?.organizationId) {
      searchParams.set('organizationId', params.organizationId);
    }
    if (params?.role) {
      searchParams.set('role', params.role);
    }
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const query = searchParams.toString();
    const url = query ? `/api/users?${query}` : '/api/users';

    return this.http.get<PagedResponse<SystemUserRecord>>(url);
  }

  getUser(id: string): Observable<SystemUserRecord> {
    return this.http.get<SystemUserRecord>(`/api/users/${id}`);
  }

  createUser(payload: CreateSystemUserInput): Observable<SystemUserRecord> {
    return this.http.post<SystemUserRecord>('/api/users', payload);
  }

  updateUser(id: string, payload: UpdateSystemUserInput): Observable<SystemUserRecord> {
    return this.http.patch<SystemUserRecord>(`/api/users/${id}`, payload);
  }

  deactivateUser(id: string): Observable<SystemUserRecord> {
    return this.http.delete<SystemUserRecord>(`/api/users/${id}`);
  }

  addUserMembership(
    userId: string,
    payload: UpsertSystemUserMembershipInput,
  ): Observable<SystemUserRecord> {
    return this.http.post<SystemUserRecord>(`/api/users/${userId}/memberships`, payload);
  }

  updateUserMembership(
    userId: string,
    membershipId: string,
    payload: UpsertSystemUserMembershipInput,
  ): Observable<SystemUserRecord> {
    return this.http.patch<SystemUserRecord>(
      `/api/users/${userId}/memberships/${membershipId}`,
      payload,
    );
  }

  deactivateUserMembership(
    userId: string,
    membershipId: string,
  ): Observable<SystemUserRecord> {
    return this.http.delete<SystemUserRecord>(`/api/users/${userId}/memberships/${membershipId}`);
  }

  // ─── Roles ─────────────────────────────────────────────────────────────────

  getRoles(): Observable<SystemRole[]> {
    return this.http.get<SystemRole[]>('/api/roles');
  }

  getRole(id: string): Observable<SystemRole> {
    return this.http.get<SystemRole>(`/api/roles/${id}`);
  }

  getPermissions(): Observable<PermissionDef[]> {
    return this.http.get<PermissionDef[]>('/api/roles/permissions');
  }

  createRole(payload: { name: string; description?: string }): Observable<SystemRole> {
    return this.http.post<SystemRole>('/api/roles', payload);
  }

  updateRole(id: string, payload: { name?: string; description?: string; isActive?: boolean }): Observable<SystemRole> {
    return this.http.patch<SystemRole>(`/api/roles/${id}`, payload);
  }

  setRolePermission(roleId: string, permissionId: string, requires4Eyes: boolean): Observable<SystemRole> {
    return this.http.post<SystemRole>(`/api/roles/${roleId}/permissions/${permissionId}`, { requires4Eyes });
  }

  removeRolePermission(roleId: string, permissionId: string): Observable<SystemRole> {
    return this.http.delete<SystemRole>(`/api/roles/${roleId}/permissions/${permissionId}`);
  }

  // ─── Approvals ─────────────────────────────────────────────────────────────

  getApprovals(status?: string): Observable<ApprovalRequest[]> {
    const url = status ? `/api/approvals?status=${status}` : '/api/approvals';
    return this.http.get<ApprovalRequest[]>(url);
  }

  getApproval(id: string): Observable<ApprovalRequest> {
    return this.http.get<ApprovalRequest>(`/api/approvals/${id}`);
  }

  approveRequest(id: string, notes?: string): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`/api/approvals/${id}/approve`, { notes });
  }

  rejectRequest(id: string, notes?: string): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`/api/approvals/${id}/reject`, { notes });
  }

  cancelRequest(id: string): Observable<ApprovalRequest> {
    return this.http.delete<ApprovalRequest>(`/api/approvals/${id}`);
  }

  // ─── Admin Merchants ────────────────────────────────────────────────────────

  getMerchants(): Observable<Merchant[]> {
    return this.http.get<Merchant[]>('/api/merchants');
  }

  getMerchant(id: string): Observable<Merchant> {
    return this.http.get<Merchant>(`/api/merchants/${id}`);
  }

  createMerchant(dto: { name: string; slug: string }): Observable<Merchant> {
    return this.http.post<Merchant>('/api/merchants', dto);
  }

  updateMerchant(id: string, dto: { name?: string }): Observable<Merchant> {
    return this.http.patch<Merchant>(`/api/merchants/${id}`, dto);
  }

  generateMerchantApiKey(merchantId: string, dto: { name: string; sourceSystem: string }): Observable<{ client: ApiClient; rawKey: string }> {
    return this.http.post<{ client: ApiClient; rawKey: string }>(`/api/merchants/${merchantId}/api-clients`, dto);
  }

  revokeMerchantApiKey(merchantId: string, clientId: string): Observable<ApiClient> {
    return this.http.delete<ApiClient>(`/api/merchants/${merchantId}/api-clients/${clientId}`);
  }

  getMerchantPspConfigs(merchantId: string): Observable<MerchantPspConfig[]> {
    return this.http.get<{ pspConfigs: MerchantPspConfig[] }>(`/api/merchants/${merchantId}`).pipe(
      map((m) => m.pspConfigs ?? []),
    );
  }

  saveMerchantPspConfig(
    merchantId: string,
    rail: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT',
    config: Record<string, unknown>,
    isActive = true,
  ): Observable<MerchantPspConfig> {
    return this.http.post<MerchantPspConfig>(`/api/merchants/${merchantId}/psp-configs`, { rail, config, isActive });
  }

  suspendMerchant(id: string, reason?: string): Observable<unknown> {
    return this.http.post(`/api/merchants/${id}/suspend`, { reason });
  }

  unsuspendMerchant(id: string, reason?: string): Observable<unknown> {
    return this.http.post(`/api/merchants/${id}/unsuspend`, { reason });
  }

  cancelPayment(id: string, reason?: string): Observable<AdminPaymentRecord> {
    return this.http.post<AdminPaymentRecord>(`/api/admin/payments/${id}/cancel`, { reason });
  }

  refundPayment(id: string, reason?: string): Observable<{ queued: boolean; approvalRequest: ApprovalRequest }> {
    return this.http.post<{ queued: boolean; approvalRequest: ApprovalRequest }>(`/api/admin/payments/${id}/refund`, { reason });
  }

  // ─── CPS Batches ────────────────────────────────────────────────────────────

  getCpsBatches(merchantId?: string): Observable<CpsBatch[]> {
    const url = merchantId ? `/api/admin/cps-batches?merchantId=${merchantId}` : '/api/admin/cps-batches';
    return this.http.get<CpsBatch[]>(url);
  }

  uploadCpsBatch(merchantId: string, file: File): Observable<CpsBatch> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CpsBatch>(`/api/admin/cps-batches/upload?merchantId=${merchantId}`, form);
  }

  submitCpsBatch(id: string): Observable<CpsBatch> {
    return this.http.post<CpsBatch>(`/api/admin/cps-batches/${id}/submit`, {});
  }

  // ─── Payment Links ──────────────────────────────────────────────────────────

  getPaymentLinks(merchantId?: string): Observable<PaymentLink[]> {
    const url = merchantId ? `/api/admin/payment-links?merchantId=${merchantId}` : '/api/admin/payment-links';
    return this.http.get<PaymentLink[]>(url);
  }

  getPaymentLink(id: string): Observable<PaymentLink> {
    return this.http.get<PaymentLink>(`/api/admin/payment-links/${id}`);
  }

  createPaymentLink(dto: CreatePaymentLinkInput): Observable<PaymentLink> {
    return this.http.post<PaymentLink>('/api/admin/payment-links', dto);
  }

  cancelPaymentLink(id: string): Observable<PaymentLink> {
    return this.http.delete<PaymentLink>(`/api/admin/payment-links/${id}`);
  }

  notifyPaymentLink(id: string, channels: string[]): Observable<{ notified: boolean; channels: Record<string, string>; shortCode: string }> {
    return this.http.post<{ notified: boolean; channels: Record<string, string>; shortCode: string }>(
      `/api/admin/payment-links/${id}/notify`,
      { channels },
    );
  }
}
