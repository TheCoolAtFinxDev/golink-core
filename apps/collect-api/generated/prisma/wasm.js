
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  phoneNumber: 'phoneNumber',
  alternativePhoneNumber: 'alternativePhoneNumber',
  externalRef: 'externalRef',
  identityStatus: 'identityStatus',
  identityDecision: 'identityDecision',
  latestKycCaseId: 'latestKycCaseId',
  identityRiskScore: 'identityRiskScore',
  identityRiskLabels: 'identityRiskLabels',
  identityVerifiedAt: 'identityVerifiedAt',
  identityLastChangedAt: 'identityLastChangedAt',
  organizationId: 'organizationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  type: 'type',
  name: 'name',
  code: 'code',
  logoUrl: 'logoUrl',
  externalRef: 'externalRef',
  contactEmail: 'contactEmail',
  isActive: 'isActive',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BillerScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  code: 'code',
  profile: 'profile',
  callbackUrl: 'callbackUrl',
  type: 'type',
  defaultCurrency: 'defaultCurrency',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BillScalarFieldEnum = {
  id: 'id',
  externalBillId: 'externalBillId',
  organizationId: 'organizationId',
  product: 'product',
  billerId: 'billerId',
  type: 'type',
  collectionRail: 'collectionRail',
  customerId: 'customerId',
  amount: 'amount',
  currency: 'currency',
  description: 'description',
  startDate: 'startDate',
  endDate: 'endDate',
  interval: 'interval',
  status: 'status',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentProjectionScalarFieldEnum = {
  id: 'id',
  transactPaymentId: 'transactPaymentId',
  billId: 'billId',
  merchantId: 'merchantId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  rail: 'rail',
  pspReference: 'pspReference',
  failureReason: 'failureReason',
  occurredAt: 'occurredAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerKycProfileScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  firstName: 'firstName',
  lastName: 'lastName',
  dateOfBirth: 'dateOfBirth',
  nationality: 'nationality',
  nationalIdNumber: 'nationalIdNumber',
  passportNumber: 'passportNumber',
  idDocumentType: 'idDocumentType',
  idDocumentNumber: 'idDocumentNumber',
  idDocumentCountry: 'idDocumentCountry',
  selfieFileUrl: 'selfieFileUrl',
  livenessCheckStatus: 'livenessCheckStatus',
  sourceOfFundsRequired: 'sourceOfFundsRequired',
  sourceOfFundsNote: 'sourceOfFundsNote',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerAddressScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  city: 'city',
  province: 'province',
  country: 'country',
  postalCode: 'postalCode',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerEmployerScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  employmentType: 'employmentType',
  employerName: 'employerName',
  occupation: 'occupation',
  phoneNumber: 'phoneNumber',
  addressLine1: 'addressLine1',
  city: 'city',
  country: 'country',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerBankAccountScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  bankName: 'bankName',
  accountName: 'accountName',
  accountNumber: 'accountNumber',
  accountType: 'accountType',
  branchCode: 'branchCode',
  isPrimary: 'isPrimary',
  isVerified: 'isVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KycCaseScalarFieldEnum = {
  id: 'id',
  subjectType: 'subjectType',
  verificationType: 'verificationType',
  provider: 'provider',
  customerId: 'customerId',
  organizationId: 'organizationId',
  status: 'status',
  decisionStatus: 'decisionStatus',
  providerEntityId: 'providerEntityId',
  providerWorkflowRuntimeId: 'providerWorkflowRuntimeId',
  correlationId: 'correlationId',
  collectionFlowUrl: 'collectionFlowUrl',
  riskScore: 'riskScore',
  riskLabels: 'riskLabels',
  decisionPayload: 'decisionPayload',
  metadata: 'metadata',
  lastWebhookAt: 'lastWebhookAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KycWebhookEventScalarFieldEnum = {
  id: 'id',
  kycCaseId: 'kycCaseId',
  provider: 'provider',
  eventName: 'eventName',
  providerEventId: 'providerEventId',
  correlationId: 'correlationId',
  signature: 'signature',
  payload: 'payload',
  receivedAt: 'receivedAt',
  processedAt: 'processedAt'
};

exports.Prisma.OrganizationBillingProfileScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  readinessStatus: 'readinessStatus',
  billingStatus: 'billingStatus',
  partnerStatus: 'partnerStatus',
  verificationDecision: 'verificationDecision',
  latestKycCaseId: 'latestKycCaseId',
  verificationRiskScore: 'verificationRiskScore',
  verificationRiskLabels: 'verificationRiskLabels',
  verificationApprovedAt: 'verificationApprovedAt',
  verificationLastChangedAt: 'verificationLastChangedAt',
  billingEmail: 'billingEmail',
  billingCurrency: 'billingCurrency',
  lagoCustomerId: 'lagoCustomerId',
  lagoSubscriptionId: 'lagoSubscriptionId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationComplianceProfileScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  tradingName: 'tradingName',
  registrationNumber: 'registrationNumber',
  taxNumber: 'taxNumber',
  vatNumber: 'vatNumber',
  businessLicenseNumber: 'businessLicenseNumber',
  businessLicenseExpiry: 'businessLicenseExpiry',
  industryCategory: 'industryCategory',
  websiteUrl: 'websiteUrl',
  businessModel: 'businessModel',
  countriesServed: 'countriesServed',
  expectedMonthlyVolumeCents: 'expectedMonthlyVolumeCents',
  averageTicketSizeCents: 'averageTicketSizeCents',
  settlementCycle: 'settlementCycle',
  technicalIntegrationMethod: 'technicalIntegrationMethod',
  financeContactName: 'financeContactName',
  financeContactEmail: 'financeContactEmail',
  operationsContactName: 'operationsContactName',
  operationsContactEmail: 'operationsContactEmail',
  technicalContactName: 'technicalContactName',
  technicalContactEmail: 'technicalContactEmail',
  disputeContactName: 'disputeContactName',
  disputeContactEmail: 'disputeContactEmail',
  refundPolicyUrl: 'refundPolicyUrl',
  chargebackProcessNote: 'chargebackProcessNote',
  sourceOfBusiness: 'sourceOfBusiness',
  sourceOfFunds: 'sourceOfFunds',
  businessType: 'businessType',
  taxIdentificationNumber: 'taxIdentificationNumber',
  dateOfEstablishment: 'dateOfEstablishment',
  iHaveSigningAuthority: 'iHaveSigningAuthority',
  thereNoCompaniesWithMoreThan25: 'thereNoCompaniesWithMoreThan25',
  mainRepresentative: 'mainRepresentative',
  headquarters: 'headquarters',
  bankInformation: 'bankInformation',
  storeActivity: 'storeActivity',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BeneficialOwnerScalarFieldEnum = {
  id: 'id',
  complianceProfileId: 'complianceProfileId',
  firstName: 'firstName',
  lastName: 'lastName',
  role: 'role',
  dateOfBirth: 'dateOfBirth',
  ownershipPercent: 'ownershipPercent',
  nationalIdNumber: 'nationalIdNumber',
  passportNumber: 'passportNumber',
  phoneNumber: 'phoneNumber',
  email: 'email',
  residentialAddress: 'residentialAddress',
  isPoliticallyExposed: 'isPoliticallyExposed',
  isSanctionsMatch: 'isSanctionsMatch',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceAssociatedCompanyScalarFieldEnum = {
  id: 'id',
  complianceProfileId: 'complianceProfileId',
  registrationNumber: 'registrationNumber',
  country: 'country',
  companyName: 'companyName',
  associationRelationship: 'associationRelationship',
  repFirstName: 'repFirstName',
  repLastName: 'repLastName',
  repEmail: 'repEmail',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceDocumentScalarFieldEnum = {
  id: 'id',
  complianceProfileId: 'complianceProfileId',
  documentId: 'documentId',
  category: 'category',
  type: 'type',
  ballerineFileId: 'ballerineFileId',
  fileName: 'fileName',
  mimeType: 'mimeType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuthorizedSignatoryScalarFieldEnum = {
  id: 'id',
  complianceProfileId: 'complianceProfileId',
  fullName: 'fullName',
  roleTitle: 'roleTitle',
  nationalIdNumber: 'nationalIdNumber',
  passportNumber: 'passportNumber',
  phoneNumber: 'phoneNumber',
  email: 'email',
  proofOfAuthorityUrl: 'proofOfAuthorityUrl',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SettlementAccountScalarFieldEnum = {
  id: 'id',
  complianceProfileId: 'complianceProfileId',
  bankName: 'bankName',
  accountName: 'accountName',
  accountNumber: 'accountNumber',
  accountType: 'accountType',
  branchCode: 'branchCode',
  currency: 'currency',
  proofDocumentUrl: 'proofDocumentUrl',
  isPrimary: 'isPrimary',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationPricingProfileScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  planCode: 'planCode',
  currency: 'currency',
  subscriptionFeeCents: 'subscriptionFeeCents',
  transactionRateBps: 'transactionRateBps',
  minFeeCents: 'minFeeCents',
  retryAttemptFeeCents: 'retryAttemptFeeCents',
  retrySuccessFeeCents: 'retrySuccessFeeCents',
  recoveryRateBps: 'recoveryRateBps',
  aiScoreFeeCents: 'aiScoreFeeCents',
  defaultGuardFeeCents: 'defaultGuardFeeCents',
  discountBps: 'discountBps',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationUsageEventScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  billerId: 'billerId',
  metricCode: 'metricCode',
  externalEventId: 'externalEventId',
  sourceEntityType: 'sourceEntityType',
  sourceEntityId: 'sourceEntityId',
  quantity: 'quantity',
  amountCents: 'amountCents',
  currency: 'currency',
  occurredAt: 'occurredAt',
  syncStatus: 'syncStatus',
  lagoTransactionId: 'lagoTransactionId',
  lastSyncError: 'lastSyncError',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemUserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  passwordHash: 'passwordHash',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationMembershipScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  role: 'role',
  isActive: 'isActive',
  isPrimary: 'isPrimary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionGrantScalarFieldEnum = {
  id: 'id',
  organizationType: 'organizationType',
  membershipRole: 'membershipRole',
  permissionId: 'permissionId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.CustomerIdentityStatus = exports.$Enums.CustomerIdentityStatus = {
  DRAFT: 'DRAFT',
  KYC_INITIATED: 'KYC_INITIATED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  RESTRICTED: 'RESTRICTED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED'
};

exports.KycDecisionStatus = exports.$Enums.KycDecisionStatus = {
  UNKNOWN: 'UNKNOWN',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  MANUAL_REVIEW: 'MANUAL_REVIEW'
};

exports.OrganizationType = exports.$Enums.OrganizationType = {
  PSO: 'PSO',
  BILLER: 'BILLER',
  MERCHANT: 'MERCHANT',
  CUSTOMER_ORG: 'CUSTOMER_ORG',
  INTERNAL: 'INTERNAL'
};

exports.GolinkProduct = exports.$Enums.GolinkProduct = {
  TRANSACT: 'TRANSACT',
  COLLECT: 'COLLECT'
};

exports.BillType = exports.$Enums.BillType = {
  ADHOC: 'ADHOC',
  RECURRING: 'RECURRING',
  CONTRACT: 'CONTRACT'
};

exports.CollectionRail = exports.$Enums.CollectionRail = {
  CARD: 'CARD',
  BANK: 'BANK',
  MPESA: 'MPESA',
  ECOCASH: 'ECOCASH',
  PAYSLIP: 'PAYSLIP',
  EMPLOYER: 'EMPLOYER'
};

exports.SubscriptionInterval = exports.$Enums.SubscriptionInterval = {
  MINUTE: 'MINUTE',
  HOUR: 'HOUR',
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR'
};

exports.BillStatus = exports.$Enums.BillStatus = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED'
};

exports.EmploymentType = exports.$Enums.EmploymentType = {
  EMPLOYED: 'EMPLOYED',
  SELF_EMPLOYED: 'SELF_EMPLOYED',
  UNEMPLOYED: 'UNEMPLOYED',
  RETIRED: 'RETIRED',
  STUDENT: 'STUDENT',
  OTHER: 'OTHER'
};

exports.KycSubjectType = exports.$Enums.KycSubjectType = {
  CUSTOMER: 'CUSTOMER',
  ORGANIZATION: 'ORGANIZATION'
};

exports.KycVerificationType = exports.$Enums.KycVerificationType = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS'
};

exports.KycCaseStatus = exports.$Enums.KycCaseStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};

exports.OrganizationReadinessStatus = exports.$Enums.OrganizationReadinessStatus = {
  DRAFT: 'DRAFT',
  INCOMPLETE: 'INCOMPLETE',
  READY: 'READY',
  LIVE: 'LIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.OrganizationBillingStatus = exports.$Enums.OrganizationBillingStatus = {
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED'
};

exports.PartnerOnboardingStatus = exports.$Enums.PartnerOnboardingStatus = {
  LEAD: 'LEAD',
  ONBOARDING: 'ONBOARDING',
  DOCS_SUBMITTED: 'DOCS_SUBMITTED',
  COMPLIANCE_REVIEW: 'COMPLIANCE_REVIEW',
  COMMERCIAL_REVIEW: 'COMMERCIAL_REVIEW',
  APPROVED: 'APPROVED'
};

exports.PricingPlanCode = exports.$Enums.PricingPlanCode = {
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE',
  CUSTOM: 'CUSTOM'
};

exports.UsageMetricCode = exports.$Enums.UsageMetricCode = {
  TRANSACTION_COUNT: 'TRANSACTION_COUNT',
  COLLECTION_AMOUNT: 'COLLECTION_AMOUNT',
  RETRY_ATTEMPT: 'RETRY_ATTEMPT',
  RETRY_SUCCESS: 'RETRY_SUCCESS',
  RECOVERED_AMOUNT: 'RECOVERED_AMOUNT',
  AI_SCORE: 'AI_SCORE',
  DEFAULT_GUARD_SUCCESS: 'DEFAULT_GUARD_SUCCESS'
};

exports.UsageEventSyncStatus = exports.$Enums.UsageEventSyncStatus = {
  PENDING: 'PENDING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED'
};

exports.OrganizationMembershipRole = exports.$Enums.OrganizationMembershipRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER'
};

exports.Prisma.ModelName = {
  Customer: 'Customer',
  Organization: 'Organization',
  Biller: 'Biller',
  Bill: 'Bill',
  PaymentProjection: 'PaymentProjection',
  CustomerKycProfile: 'CustomerKycProfile',
  CustomerAddress: 'CustomerAddress',
  CustomerEmployer: 'CustomerEmployer',
  CustomerBankAccount: 'CustomerBankAccount',
  KycCase: 'KycCase',
  KycWebhookEvent: 'KycWebhookEvent',
  OrganizationBillingProfile: 'OrganizationBillingProfile',
  OrganizationComplianceProfile: 'OrganizationComplianceProfile',
  BeneficialOwner: 'BeneficialOwner',
  ComplianceAssociatedCompany: 'ComplianceAssociatedCompany',
  ComplianceDocument: 'ComplianceDocument',
  AuthorizedSignatory: 'AuthorizedSignatory',
  SettlementAccount: 'SettlementAccount',
  OrganizationPricingProfile: 'OrganizationPricingProfile',
  OrganizationUsageEvent: 'OrganizationUsageEvent',
  SystemUser: 'SystemUser',
  OrganizationMembership: 'OrganizationMembership',
  Permission: 'Permission',
  PermissionGrant: 'PermissionGrant'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
