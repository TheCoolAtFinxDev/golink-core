-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PspRail" AS ENUM ('CARD', 'MPESA', 'ECOCASH', 'EFT');

-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('GOLINK_COLLECT', 'ODOO_ERP', 'MERCHANT_POS', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "PaymentMethodKind" AS ENUM ('CARD', 'MOBILE_WALLET', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "ThreeDsSessionKind" AS ENUM ('ADHOC', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ThreeDsSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "CpsBatchStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACK', 'NACK', 'PARTIALLY_FAILED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantPspConfig" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "rail" "PspRail" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantPspConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "sourceSystem" "SourceSystem" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstruction" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "apiClientId" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "rail" "PspRail" NOT NULL,
    "sourceSystem" "SourceSystem" NOT NULL,
    "sourceReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "payer" JSONB NOT NULL,
    "payee" JSONB NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "storedPaymentMethodId" TEXT,
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentExecution" (
    "id" TEXT NOT NULL,
    "paymentInstructionId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "pspRail" "PspRail" NOT NULL,
    "pspMerchantConfigId" TEXT NOT NULL,
    "pspReference" TEXT,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "cpsBatchId" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredPaymentMethod" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "kind" "PaymentMethodKind" NOT NULL,
    "transactionIndex" TEXT,
    "maskedPan" TEXT,
    "expiryMMYY" TEXT,
    "scheme" TEXT,
    "mobileNumber" TEXT,
    "walletRail" "PspRail",
    "accountNumber" TEXT,
    "bankCode" TEXT,
    "accountName" TEXT,
    "customerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoredPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeDsSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "merchantPspConfigId" TEXT NOT NULL,
    "kind" "ThreeDsSessionKind" NOT NULL,
    "pan" TEXT NOT NULL,
    "expiryMMYY" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "merchantReference" TEXT NOT NULL,
    "customerId" TEXT,
    "billId" TEXT,
    "subscriptionId" TEXT,
    "storedPaymentMethodId" TEXT,
    "status" "ThreeDsSessionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeDsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "storedPaymentMethodId" TEXT NOT NULL,
    "rail" "PspRail" NOT NULL,
    "customerId" TEXT,
    "billId" TEXT,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PspSessionCache" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "rail" "PspRail" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PspSessionCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpsBatch" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "fileContent" TEXT NOT NULL,
    "status" "CpsBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "ackFileContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpsBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpsUnpaid" (
    "id" TEXT NOT NULL,
    "cpsBatchId" TEXT NOT NULL,
    "paymentInstructionId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonDescription" TEXT NOT NULL,
    "unpaidDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CpsUnpaid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "paymentInstructionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "apiClientId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPspConfig_merchantId_rail_key" ON "MerchantPspConfig"("merchantId", "rail");

-- CreateIndex
CREATE INDEX "ApiClient_keyPrefix_idx" ON "ApiClient"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInstruction_idempotencyKey_key" ON "PaymentInstruction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentInstruction_merchantId_status_idx" ON "PaymentInstruction"("merchantId", "status");

-- CreateIndex
CREATE INDEX "PaymentInstruction_merchantId_sourceSystem_sourceReference_idx" ON "PaymentInstruction"("merchantId", "sourceSystem", "sourceReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentExecution_paymentInstructionId_attempt_key" ON "PaymentExecution"("paymentInstructionId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "StoredPaymentMethod_transactionIndex_key" ON "StoredPaymentMethod"("transactionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ThreeDsSession_sessionToken_key" ON "ThreeDsSession"("sessionToken");

-- CreateIndex
CREATE INDEX "ThreeDsSession_status_expiresAt_idx" ON "ThreeDsSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Subscription_status_nextRunAt_idx" ON "Subscription"("status", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "PspSessionCache_merchantId_rail_key" ON "PspSessionCache"("merchantId", "rail");

-- CreateIndex
CREATE UNIQUE INDEX "CpsBatch_merchantId_sequenceNumber_key" ON "CpsBatch"("merchantId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_nextRetryAt_idx" ON "WebhookEvent"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_apiClientId_idx" ON "ApiLog"("apiClientId");

-- AddForeignKey
ALTER TABLE "MerchantPspConfig" ADD CONSTRAINT "MerchantPspConfig_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiClient" ADD CONSTRAINT "ApiClient_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstruction" ADD CONSTRAINT "PaymentInstruction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstruction" ADD CONSTRAINT "PaymentInstruction_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstruction" ADD CONSTRAINT "PaymentInstruction_storedPaymentMethodId_fkey" FOREIGN KEY ("storedPaymentMethodId") REFERENCES "StoredPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstruction" ADD CONSTRAINT "PaymentInstruction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentExecution" ADD CONSTRAINT "PaymentExecution_paymentInstructionId_fkey" FOREIGN KEY ("paymentInstructionId") REFERENCES "PaymentInstruction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentExecution" ADD CONSTRAINT "PaymentExecution_pspMerchantConfigId_fkey" FOREIGN KEY ("pspMerchantConfigId") REFERENCES "MerchantPspConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentExecution" ADD CONSTRAINT "PaymentExecution_cpsBatchId_fkey" FOREIGN KEY ("cpsBatchId") REFERENCES "CpsBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredPaymentMethod" ADD CONSTRAINT "StoredPaymentMethod_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeDsSession" ADD CONSTRAINT "ThreeDsSession_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeDsSession" ADD CONSTRAINT "ThreeDsSession_merchantPspConfigId_fkey" FOREIGN KEY ("merchantPspConfigId") REFERENCES "MerchantPspConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeDsSession" ADD CONSTRAINT "ThreeDsSession_storedPaymentMethodId_fkey" FOREIGN KEY ("storedPaymentMethodId") REFERENCES "StoredPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeDsSession" ADD CONSTRAINT "ThreeDsSession_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_storedPaymentMethodId_fkey" FOREIGN KEY ("storedPaymentMethodId") REFERENCES "StoredPaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PspSessionCache" ADD CONSTRAINT "PspSessionCache_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpsBatch" ADD CONSTRAINT "CpsBatch_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpsUnpaid" ADD CONSTRAINT "CpsUnpaid_cpsBatchId_fkey" FOREIGN KEY ("cpsBatchId") REFERENCES "CpsBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpsUnpaid" ADD CONSTRAINT "CpsUnpaid_paymentInstructionId_fkey" FOREIGN KEY ("paymentInstructionId") REFERENCES "PaymentInstruction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_paymentInstructionId_fkey" FOREIGN KEY ("paymentInstructionId") REFERENCES "PaymentInstruction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
