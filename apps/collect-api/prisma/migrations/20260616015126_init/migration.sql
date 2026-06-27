-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "GolinkProduct" AS ENUM ('TRANSACT', 'COLLECT');

-- CreateEnum
CREATE TYPE "CollectionRail" AS ENUM ('CARD', 'BANK', 'MPESA', 'ECOCASH', 'PAYSLIP', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('ADHOC', 'RECURRING', 'CONTRACT');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('PSO', 'BILLER', 'MERCHANT', 'CUSTOMER_ORG', 'INTERNAL');

-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrganizationReadinessStatus" AS ENUM ('DRAFT', 'INCOMPLETE', 'READY', 'LIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrganizationBillingStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "PartnerOnboardingStatus" AS ENUM ('LEAD', 'ONBOARDING', 'DOCS_SUBMITTED', 'COMPLIANCE_REVIEW', 'COMMERCIAL_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "PricingPlanCode" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UsageMetricCode" AS ENUM ('TRANSACTION_COUNT', 'COLLECTION_AMOUNT', 'RETRY_ATTEMPT', 'RETRY_SUCCESS', 'RECOVERED_AMOUNT', 'AI_SCORE', 'DEFAULT_GUARD_SUCCESS');

-- CreateEnum
CREATE TYPE "UsageEventSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "KycSubjectType" AS ENUM ('CUSTOMER', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "KycVerificationType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "KycCaseStatus" AS ENUM ('DRAFT', 'PENDING', 'INPUT_REQUIRED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "KycDecisionStatus" AS ENUM ('UNKNOWN', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "CustomerIdentityStatus" AS ENUM ('DRAFT', 'KYC_INITIATED', 'UNDER_REVIEW', 'VERIFIED', 'RESTRICTED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "externalRef" TEXT,
    "identityStatus" "CustomerIdentityStatus" NOT NULL DEFAULT 'DRAFT',
    "identityDecision" "KycDecisionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "latestKycCaseId" TEXT,
    "identityRiskScore" DOUBLE PRECISION,
    "identityRiskLabels" JSONB,
    "identityVerifiedAt" TIMESTAMP(3),
    "identityLastChangedAt" TIMESTAMP(3),
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logoUrl" TEXT,
    "externalRef" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Biller" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "profile" TEXT,
    "callbackUrl" TEXT,
    "type" TEXT,
    "defaultCurrency" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Biller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "externalBillId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "product" "GolinkProduct" NOT NULL DEFAULT 'COLLECT',
    "billerId" TEXT NOT NULL,
    "type" "BillType" NOT NULL DEFAULT 'ADHOC',
    "collectionRail" "CollectionRail",
    "customerId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "interval" "SubscriptionInterval",
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProjection" (
    "id" TEXT NOT NULL,
    "transactPaymentId" TEXT NOT NULL,
    "billId" TEXT,
    "merchantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rail" TEXT NOT NULL,
    "pspReference" TEXT,
    "failureReason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerKycProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "mobileNumber" TEXT,
    "residentialAddress" JSONB,
    "nationalIdNumber" TEXT,
    "passportNumber" TEXT,
    "idDocumentType" TEXT,
    "idDocumentNumber" TEXT,
    "idDocumentCountry" TEXT,
    "selfieFileUrl" TEXT,
    "livenessCheckStatus" TEXT,
    "sourceOfFundsRequired" BOOLEAN NOT NULL DEFAULT false,
    "sourceOfFundsNote" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerKycProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycCase" (
    "id" TEXT NOT NULL,
    "subjectType" "KycSubjectType" NOT NULL,
    "verificationType" "KycVerificationType" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'BALLERINE',
    "customerId" TEXT,
    "organizationId" TEXT,
    "status" "KycCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "decisionStatus" "KycDecisionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "providerEntityId" TEXT,
    "providerWorkflowRuntimeId" TEXT,
    "correlationId" TEXT,
    "collectionFlowUrl" TEXT,
    "riskScore" DOUBLE PRECISION,
    "riskLabels" JSONB,
    "decisionPayload" JSONB,
    "metadata" JSONB,
    "lastWebhookAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycWebhookEvent" (
    "id" TEXT NOT NULL,
    "kycCaseId" TEXT,
    "provider" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "providerEventId" TEXT,
    "correlationId" TEXT,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "KycWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBillingProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "readinessStatus" "OrganizationReadinessStatus" NOT NULL DEFAULT 'DRAFT',
    "billingStatus" "OrganizationBillingStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "partnerStatus" "PartnerOnboardingStatus" NOT NULL DEFAULT 'LEAD',
    "verificationDecision" "KycDecisionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "latestKycCaseId" TEXT,
    "verificationRiskScore" DOUBLE PRECISION,
    "verificationRiskLabels" JSONB,
    "verificationApprovedAt" TIMESTAMP(3),
    "verificationLastChangedAt" TIMESTAMP(3),
    "billingEmail" TEXT,
    "billingCurrency" TEXT,
    "lagoCustomerId" TEXT,
    "lagoSubscriptionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationComplianceProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tradingName" TEXT,
    "registrationNumber" TEXT,
    "taxNumber" TEXT,
    "vatNumber" TEXT,
    "businessLicenseNumber" TEXT,
    "businessLicenseExpiry" TIMESTAMP(3),
    "industryCategory" TEXT,
    "websiteUrl" TEXT,
    "businessModel" TEXT,
    "countriesServed" TEXT[],
    "expectedMonthlyVolumeCents" INTEGER,
    "averageTicketSizeCents" INTEGER,
    "settlementCycle" TEXT,
    "technicalIntegrationMethod" TEXT,
    "financeContactName" TEXT,
    "financeContactEmail" TEXT,
    "operationsContactName" TEXT,
    "operationsContactEmail" TEXT,
    "technicalContactName" TEXT,
    "technicalContactEmail" TEXT,
    "disputeContactName" TEXT,
    "disputeContactEmail" TEXT,
    "refundPolicyUrl" TEXT,
    "chargebackProcessNote" TEXT,
    "sourceOfBusiness" TEXT,
    "sourceOfFunds" TEXT,
    "businessType" TEXT,
    "taxIdentificationNumber" TEXT,
    "dateOfEstablishment" TEXT,
    "iHaveSigningAuthority" BOOLEAN NOT NULL DEFAULT false,
    "thereNoCompaniesWithMoreThan25" BOOLEAN NOT NULL DEFAULT false,
    "mainRepresentative" JSONB,
    "headquarters" JSONB,
    "bankInformation" JSONB,
    "storeActivity" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationComplianceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficialOwner" (
    "id" TEXT NOT NULL,
    "complianceProfileId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT,
    "dateOfBirth" TEXT,
    "ownershipPercent" DOUBLE PRECISION,
    "nationalIdNumber" TEXT,
    "passportNumber" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "residentialAddress" JSONB,
    "isPoliticallyExposed" BOOLEAN NOT NULL DEFAULT false,
    "isSanctionsMatch" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeneficialOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAssociatedCompany" (
    "id" TEXT NOT NULL,
    "complianceProfileId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "associationRelationship" TEXT,
    "repFirstName" TEXT,
    "repLastName" TEXT,
    "repEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceAssociatedCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL,
    "complianceProfileId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ballerineFileId" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizedSignatory" (
    "id" TEXT NOT NULL,
    "complianceProfileId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleTitle" TEXT,
    "nationalIdNumber" TEXT,
    "passportNumber" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "proofOfAuthorityUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorizedSignatory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementAccount" (
    "id" TEXT NOT NULL,
    "complianceProfileId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT,
    "branchCode" TEXT,
    "currency" TEXT,
    "proofDocumentUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPricingProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planCode" "PricingPlanCode" NOT NULL DEFAULT 'GROWTH',
    "currency" TEXT NOT NULL,
    "subscriptionFeeCents" INTEGER NOT NULL DEFAULT 0,
    "transactionRateBps" INTEGER NOT NULL DEFAULT 0,
    "minFeeCents" INTEGER NOT NULL DEFAULT 0,
    "retryAttemptFeeCents" INTEGER NOT NULL DEFAULT 0,
    "retrySuccessFeeCents" INTEGER NOT NULL DEFAULT 0,
    "recoveryRateBps" INTEGER NOT NULL DEFAULT 0,
    "aiScoreFeeCents" INTEGER NOT NULL DEFAULT 0,
    "defaultGuardFeeCents" INTEGER NOT NULL DEFAULT 0,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "billerId" TEXT,
    "metricCode" "UsageMetricCode" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "quantity" INTEGER,
    "amountCents" INTEGER,
    "currency" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "syncStatus" "UsageEventSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lagoTransactionId" TEXT,
    "lastSyncError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGrant" (
    "id" TEXT NOT NULL,
    "organizationType" "OrganizationType" NOT NULL,
    "membershipRole" "OrganizationMembershipRole" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_externalRef_key" ON "Customer"("externalRef");

-- CreateIndex
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "Organization_externalRef_idx" ON "Organization"("externalRef");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Biller_code_key" ON "Biller"("code");

-- CreateIndex
CREATE INDEX "Biller_organizationId_idx" ON "Biller"("organizationId");

-- CreateIndex
CREATE INDEX "Biller_code_idx" ON "Biller"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_externalBillId_key" ON "Bill"("externalBillId");

-- CreateIndex
CREATE INDEX "Bill_billerId_idx" ON "Bill"("billerId");

-- CreateIndex
CREATE INDEX "Bill_organizationId_idx" ON "Bill"("organizationId");

-- CreateIndex
CREATE INDEX "Bill_customerId_idx" ON "Bill"("customerId");

-- CreateIndex
CREATE INDEX "Bill_externalBillId_idx" ON "Bill"("externalBillId");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProjection_transactPaymentId_key" ON "PaymentProjection"("transactPaymentId");

-- CreateIndex
CREATE INDEX "PaymentProjection_billId_idx" ON "PaymentProjection"("billId");

-- CreateIndex
CREATE INDEX "PaymentProjection_status_idx" ON "PaymentProjection"("status");

-- CreateIndex
CREATE INDEX "PaymentProjection_occurredAt_idx" ON "PaymentProjection"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerKycProfile_customerId_key" ON "CustomerKycProfile"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "KycCase_providerWorkflowRuntimeId_key" ON "KycCase"("providerWorkflowRuntimeId");

-- CreateIndex
CREATE UNIQUE INDEX "KycCase_correlationId_key" ON "KycCase"("correlationId");

-- CreateIndex
CREATE INDEX "KycCase_customerId_idx" ON "KycCase"("customerId");

-- CreateIndex
CREATE INDEX "KycCase_organizationId_idx" ON "KycCase"("organizationId");

-- CreateIndex
CREATE INDEX "KycCase_status_idx" ON "KycCase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "KycWebhookEvent_providerEventId_key" ON "KycWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "KycWebhookEvent_kycCaseId_idx" ON "KycWebhookEvent"("kycCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBillingProfile_organizationId_key" ON "OrganizationBillingProfile"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationBillingProfile_readinessStatus_idx" ON "OrganizationBillingProfile"("readinessStatus");

-- CreateIndex
CREATE INDEX "OrganizationBillingProfile_billingStatus_idx" ON "OrganizationBillingProfile"("billingStatus");

-- CreateIndex
CREATE INDEX "OrganizationBillingProfile_partnerStatus_idx" ON "OrganizationBillingProfile"("partnerStatus");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationComplianceProfile_organizationId_key" ON "OrganizationComplianceProfile"("organizationId");

-- CreateIndex
CREATE INDEX "BeneficialOwner_complianceProfileId_idx" ON "BeneficialOwner"("complianceProfileId");

-- CreateIndex
CREATE INDEX "ComplianceAssociatedCompany_complianceProfileId_idx" ON "ComplianceAssociatedCompany"("complianceProfileId");

-- CreateIndex
CREATE INDEX "ComplianceDocument_complianceProfileId_idx" ON "ComplianceDocument"("complianceProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceDocument_complianceProfileId_documentId_key" ON "ComplianceDocument"("complianceProfileId", "documentId");

-- CreateIndex
CREATE INDEX "AuthorizedSignatory_complianceProfileId_idx" ON "AuthorizedSignatory"("complianceProfileId");

-- CreateIndex
CREATE INDEX "SettlementAccount_complianceProfileId_idx" ON "SettlementAccount"("complianceProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPricingProfile_organizationId_key" ON "OrganizationPricingProfile"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationPricingProfile_planCode_idx" ON "OrganizationPricingProfile"("planCode");

-- CreateIndex
CREATE INDEX "OrganizationPricingProfile_currency_idx" ON "OrganizationPricingProfile"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUsageEvent_externalEventId_key" ON "OrganizationUsageEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "OrganizationUsageEvent_organizationId_metricCode_idx" ON "OrganizationUsageEvent"("organizationId", "metricCode");

-- CreateIndex
CREATE INDEX "OrganizationUsageEvent_billerId_idx" ON "OrganizationUsageEvent"("billerId");

-- CreateIndex
CREATE INDEX "OrganizationUsageEvent_syncStatus_idx" ON "OrganizationUsageEvent"("syncStatus");

-- CreateIndex
CREATE INDEX "OrganizationUsageEvent_occurredAt_idx" ON "OrganizationUsageEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemUser_email_key" ON "SystemUser"("email");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_role_idx" ON "OrganizationMembership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_isActive_idx" ON "Permission"("isActive");

-- CreateIndex
CREATE INDEX "PermissionGrant_permissionId_idx" ON "PermissionGrant"("permissionId");

-- CreateIndex
CREATE INDEX "PermissionGrant_organizationType_membershipRole_isActive_idx" ON "PermissionGrant"("organizationType", "membershipRole", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGrant_organizationType_membershipRole_permissionI_key" ON "PermissionGrant"("organizationType", "membershipRole", "permissionId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Biller" ADD CONSTRAINT "Biller_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "Biller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProjection" ADD CONSTRAINT "PaymentProjection_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerKycProfile" ADD CONSTRAINT "CustomerKycProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycCase" ADD CONSTRAINT "KycCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycCase" ADD CONSTRAINT "KycCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycWebhookEvent" ADD CONSTRAINT "KycWebhookEvent_kycCaseId_fkey" FOREIGN KEY ("kycCaseId") REFERENCES "KycCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBillingProfile" ADD CONSTRAINT "OrganizationBillingProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationComplianceProfile" ADD CONSTRAINT "OrganizationComplianceProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficialOwner" ADD CONSTRAINT "BeneficialOwner_complianceProfileId_fkey" FOREIGN KEY ("complianceProfileId") REFERENCES "OrganizationComplianceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAssociatedCompany" ADD CONSTRAINT "ComplianceAssociatedCompany_complianceProfileId_fkey" FOREIGN KEY ("complianceProfileId") REFERENCES "OrganizationComplianceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_complianceProfileId_fkey" FOREIGN KEY ("complianceProfileId") REFERENCES "OrganizationComplianceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedSignatory" ADD CONSTRAINT "AuthorizedSignatory_complianceProfileId_fkey" FOREIGN KEY ("complianceProfileId") REFERENCES "OrganizationComplianceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAccount" ADD CONSTRAINT "SettlementAccount_complianceProfileId_fkey" FOREIGN KEY ("complianceProfileId") REFERENCES "OrganizationComplianceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPricingProfile" ADD CONSTRAINT "OrganizationPricingProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUsageEvent" ADD CONSTRAINT "OrganizationUsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUsageEvent" ADD CONSTRAINT "OrganizationUsageEvent_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "Biller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SystemUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGrant" ADD CONSTRAINT "PermissionGrant_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
