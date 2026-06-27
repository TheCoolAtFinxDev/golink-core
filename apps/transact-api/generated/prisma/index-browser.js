
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

exports.Prisma.MerchantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MerchantPspConfigScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  rail: 'rail',
  isActive: 'isActive',
  config: 'config',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApiClientScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  name: 'name',
  keyHash: 'keyHash',
  keyPrefix: 'keyPrefix',
  sourceSystem: 'sourceSystem',
  isActive: 'isActive',
  lastUsedAt: 'lastUsedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentInstructionScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  apiClientId: 'apiClientId',
  direction: 'direction',
  rail: 'rail',
  sourceSystem: 'sourceSystem',
  sourceReference: 'sourceReference',
  idempotencyKey: 'idempotencyKey',
  payer: 'payer',
  payee: 'payee',
  amount: 'amount',
  currency: 'currency',
  description: 'description',
  metadata: 'metadata',
  status: 'status',
  storedPaymentMethodId: 'storedPaymentMethodId',
  subscriptionId: 'subscriptionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentExecutionScalarFieldEnum = {
  id: 'id',
  paymentInstructionId: 'paymentInstructionId',
  attempt: 'attempt',
  pspRail: 'pspRail',
  pspMerchantConfigId: 'pspMerchantConfigId',
  pspReference: 'pspReference',
  requestPayload: 'requestPayload',
  responsePayload: 'responsePayload',
  status: 'status',
  cpsBatchId: 'cpsBatchId',
  executedAt: 'executedAt',
  completedAt: 'completedAt'
};

exports.Prisma.StoredPaymentMethodScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  kind: 'kind',
  transactionIndex: 'transactionIndex',
  maskedPan: 'maskedPan',
  expiryMMYY: 'expiryMMYY',
  scheme: 'scheme',
  mobileNumber: 'mobileNumber',
  walletRail: 'walletRail',
  accountNumber: 'accountNumber',
  bankCode: 'bankCode',
  accountName: 'accountName',
  customerId: 'customerId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ThreeDsSessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  merchantId: 'merchantId',
  merchantPspConfigId: 'merchantPspConfigId',
  kind: 'kind',
  pan: 'pan',
  expiryMMYY: 'expiryMMYY',
  amount: 'amount',
  currency: 'currency',
  merchantReference: 'merchantReference',
  customerId: 'customerId',
  billId: 'billId',
  subscriptionId: 'subscriptionId',
  storedPaymentMethodId: 'storedPaymentMethodId',
  status: 'status',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  storedPaymentMethodId: 'storedPaymentMethodId',
  rail: 'rail',
  customerId: 'customerId',
  billId: 'billId',
  amount: 'amount',
  currency: 'currency',
  interval: 'interval',
  status: 'status',
  nextRunAt: 'nextRunAt',
  attempt: 'attempt',
  maxAttempts: 'maxAttempts',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  payer: 'payer',
  description: 'description',
  sourceReference: 'sourceReference',
  metadata: 'metadata'
};

exports.Prisma.PspSessionCacheScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  rail: 'rail',
  token: 'token',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CpsBatchScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  sequenceNumber: 'sequenceNumber',
  fileContent: 'fileContent',
  status: 'status',
  submittedAt: 'submittedAt',
  acknowledgedAt: 'acknowledgedAt',
  ackFileContent: 'ackFileContent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CpsUnpaidScalarFieldEnum = {
  id: 'id',
  cpsBatchId: 'cpsBatchId',
  paymentInstructionId: 'paymentInstructionId',
  reasonCode: 'reasonCode',
  reasonDescription: 'reasonDescription',
  unpaidDate: 'unpaidDate',
  createdAt: 'createdAt'
};

exports.Prisma.WebhookEndpointScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  url: 'url',
  secret: 'secret',
  events: 'events',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookEventScalarFieldEnum = {
  id: 'id',
  endpointId: 'endpointId',
  paymentInstructionId: 'paymentInstructionId',
  eventType: 'eventType',
  payload: 'payload',
  status: 'status',
  attempts: 'attempts',
  lastAttemptAt: 'lastAttemptAt',
  nextRetryAt: 'nextRetryAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentSplitScalarFieldEnum = {
  id: 'id',
  paymentInstructionId: 'paymentInstructionId',
  merchantId: 'merchantId',
  amountMinor: 'amountMinor',
  description: 'description',
  status: 'status',
  creditInstructionId: 'creditInstructionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentLinkScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  shortCode: 'shortCode',
  title: 'title',
  description: 'description',
  amountMinor: 'amountMinor',
  currency: 'currency',
  allowedRails: 'allowedRails',
  expiresAt: 'expiresAt',
  maxUses: 'maxUses',
  useCount: 'useCount',
  recipientName: 'recipientName',
  recipientPhone: 'recipientPhone',
  recipientEmail: 'recipientEmail',
  notifiedVia: 'notifiedVia',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApiLogScalarFieldEnum = {
  id: 'id',
  apiClientId: 'apiClientId',
  method: 'method',
  path: 'path',
  statusCode: 'statusCode',
  requestBody: 'requestBody',
  responseBody: 'responseBody',
  durationMs: 'durationMs',
  createdAt: 'createdAt'
};

exports.Prisma.SystemUserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  passwordHash: 'passwordHash',
  isActive: 'isActive',
  isSuperAdmin: 'isSuperAdmin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemRoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isBuiltIn: 'isBuiltIn',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  category: 'category',
  isActive: 'isActive'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  roleId: 'roleId',
  permissionId: 'permissionId',
  requires4Eyes: 'requires4Eyes'
};

exports.Prisma.MerchantMembershipScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  merchantId: 'merchantId',
  roleId: 'roleId',
  isPrimary: 'isPrimary',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApprovalRequestScalarFieldEnum = {
  id: 'id',
  requesterId: 'requesterId',
  reviewerId: 'reviewerId',
  action: 'action',
  resourceType: 'resourceType',
  resourceId: 'resourceId',
  payload: 'payload',
  requesterNotes: 'requesterNotes',
  reviewerNotes: 'reviewerNotes',
  status: 'status',
  expiresAt: 'expiresAt',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
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
exports.MerchantStatus = exports.$Enums.MerchantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.PspRail = exports.$Enums.PspRail = {
  CARD: 'CARD',
  MPESA: 'MPESA',
  ECOCASH: 'ECOCASH',
  EFT: 'EFT'
};

exports.SourceSystem = exports.$Enums.SourceSystem = {
  GOLINK_COLLECT: 'GOLINK_COLLECT',
  ODOO_ERP: 'ODOO_ERP',
  MERCHANT_POS: 'MERCHANT_POS',
  OTHER: 'OTHER'
};

exports.PaymentDirection = exports.$Enums.PaymentDirection = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.ExecutionStatus = exports.$Enums.ExecutionStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT'
};

exports.PaymentMethodKind = exports.$Enums.PaymentMethodKind = {
  CARD: 'CARD',
  MOBILE_WALLET: 'MOBILE_WALLET',
  BANK_ACCOUNT: 'BANK_ACCOUNT'
};

exports.ThreeDsSessionKind = exports.$Enums.ThreeDsSessionKind = {
  ADHOC: 'ADHOC',
  SUBSCRIPTION: 'SUBSCRIPTION'
};

exports.ThreeDsSessionStatus = exports.$Enums.ThreeDsSessionStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED'
};

exports.SubscriptionInterval = exports.$Enums.SubscriptionInterval = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  EXHAUSTED: 'EXHAUSTED'
};

exports.CpsBatchStatus = exports.$Enums.CpsBatchStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  ACK: 'ACK',
  NACK: 'NACK',
  PARTIALLY_FAILED: 'PARTIALLY_FAILED'
};

exports.WebhookDeliveryStatus = exports.$Enums.WebhookDeliveryStatus = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED'
};

exports.SplitStatus = exports.$Enums.SplitStatus = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
  FAILED: 'FAILED'
};

exports.PaymentLinkStatus = exports.$Enums.PaymentLinkStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  EXHAUSTED: 'EXHAUSTED',
  CANCELLED: 'CANCELLED'
};

exports.ApprovalStatus = exports.$Enums.ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

exports.Prisma.ModelName = {
  Merchant: 'Merchant',
  MerchantPspConfig: 'MerchantPspConfig',
  ApiClient: 'ApiClient',
  PaymentInstruction: 'PaymentInstruction',
  PaymentExecution: 'PaymentExecution',
  StoredPaymentMethod: 'StoredPaymentMethod',
  ThreeDsSession: 'ThreeDsSession',
  Subscription: 'Subscription',
  PspSessionCache: 'PspSessionCache',
  CpsBatch: 'CpsBatch',
  CpsUnpaid: 'CpsUnpaid',
  WebhookEndpoint: 'WebhookEndpoint',
  WebhookEvent: 'WebhookEvent',
  PaymentSplit: 'PaymentSplit',
  PaymentLink: 'PaymentLink',
  ApiLog: 'ApiLog',
  SystemUser: 'SystemUser',
  SystemRole: 'SystemRole',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  MerchantMembership: 'MerchantMembership',
  ApprovalRequest: 'ApprovalRequest'
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
