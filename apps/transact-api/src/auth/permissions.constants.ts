export const PermissionCodes = {
  // Merchants
  MERCHANTS_READ: 'merchants.read',
  MERCHANTS_CREATE: 'merchants.create',
  MERCHANTS_UPDATE: 'merchants.update',
  MERCHANTS_SUSPEND: 'merchants.suspend',
  MERCHANTS_PSP_READ: 'merchants.psp_config.read',
  MERCHANTS_PSP_MANAGE: 'merchants.psp_config.manage',
  MERCHANTS_API_CLIENT_READ: 'merchants.api_client.read',
  MERCHANTS_API_CLIENT_MANAGE: 'merchants.api_client.manage',
  // Payments
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_RETRY: 'payments.retry',
  PAYMENTS_REFUND: 'payments.refund',
  PAYMENTS_CANCEL: 'payments.cancel',
  // CPS Batches
  CPS_BATCHES_READ: 'cps_batches.read',
  CPS_BATCHES_MANAGE: 'cps_batches.manage',
  // Payment Links
  PAYMENT_LINKS_READ: 'payment_links.read',
  PAYMENT_LINKS_MANAGE: 'payment_links.manage',
  // Users
  USERS_READ: 'users.read',
  USERS_MANAGE: 'users.manage',
  // Roles
  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',
  // Approvals
  APPROVALS_READ: 'approvals.read',
  APPROVALS_REVIEW: 'approvals.review',
} as const;

export type PermissionCode = (typeof PermissionCodes)[keyof typeof PermissionCodes];

export const PermissionDefinitions: Array<{
  code: PermissionCode;
  name: string;
  description: string;
  category: string;
}> = [
  { code: PermissionCodes.MERCHANTS_READ, name: 'View merchants', description: 'View merchant list and details', category: 'merchants' },
  { code: PermissionCodes.MERCHANTS_CREATE, name: 'Create merchants', description: 'Onboard new merchants', category: 'merchants' },
  { code: PermissionCodes.MERCHANTS_UPDATE, name: 'Update merchants', description: 'Edit merchant profile and settings', category: 'merchants' },
  { code: PermissionCodes.MERCHANTS_SUSPEND, name: 'Suspend merchants', description: 'Suspend or reactivate merchants', category: 'merchants' },
  { code: PermissionCodes.MERCHANTS_PSP_READ, name: 'View PSP configs', description: 'View PSP gateway configurations', category: 'merchants' },
  { code: PermissionCodes.MERCHANTS_PSP_MANAGE, name: 'Manage PSP configs', description: 'Create and update PSP gateway configurations', category: 'merchants' },
  { code: PermissionCodes.MERCHANTS_API_CLIENT_READ, name: 'View API clients', description: 'View merchant API client credentials', category: 'merchants' },
  { code: PermissionCodes.MERCHANTS_API_CLIENT_MANAGE, name: 'Manage API clients', description: 'Create and rotate merchant API client credentials', category: 'merchants' },
  { code: PermissionCodes.PAYMENTS_READ, name: 'View payments', description: 'View payment instructions and executions', category: 'payments' },
  { code: PermissionCodes.PAYMENTS_CREATE, name: 'Create payments', description: 'Initiate new payments on behalf of a merchant', category: 'payments' },
  { code: PermissionCodes.PAYMENTS_RETRY, name: 'Retry payments', description: 'Re-execute failed payment instructions', category: 'payments' },
  { code: PermissionCodes.PAYMENTS_REFUND, name: 'Initiate refunds', description: 'Initiate payment refunds', category: 'payments' },
  { code: PermissionCodes.PAYMENTS_CANCEL, name: 'Cancel payments', description: 'Cancel pending payment instructions', category: 'payments' },
  { code: PermissionCodes.CPS_BATCHES_READ, name: 'View CPS batches', description: 'View CPS batch upload history', category: 'payments' },
  { code: PermissionCodes.CPS_BATCHES_MANAGE, name: 'Manage CPS batches', description: 'Upload and submit CPS payment batches', category: 'payments' },
  { code: PermissionCodes.PAYMENT_LINKS_READ, name: 'View payment links', description: 'View payment links and request-to-pay records', category: 'payments' },
  { code: PermissionCodes.PAYMENT_LINKS_MANAGE, name: 'Manage payment links', description: 'Create, cancel, and notify payment links', category: 'payments' },
  { code: PermissionCodes.USERS_READ, name: 'View users', description: 'View system users and their memberships', category: 'users' },
  { code: PermissionCodes.USERS_MANAGE, name: 'Manage users', description: 'Create, update, and deactivate system users', category: 'users' },
  { code: PermissionCodes.ROLES_READ, name: 'View roles', description: 'View roles and their permission assignments', category: 'roles' },
  { code: PermissionCodes.ROLES_MANAGE, name: 'Manage roles', description: 'Create and edit roles and their permission assignments', category: 'roles' },
  { code: PermissionCodes.APPROVALS_READ, name: 'View approvals', description: 'View pending and resolved approval requests', category: 'approvals' },
  { code: PermissionCodes.APPROVALS_REVIEW, name: 'Review approvals', description: 'Approve or reject pending requests', category: 'approvals' },
];

// Default 4-eyes flags per built-in role
export const FourEyesDefaults: Partial<Record<PermissionCode, boolean>> = {
  [PermissionCodes.MERCHANTS_SUSPEND]: true,
  [PermissionCodes.MERCHANTS_PSP_MANAGE]: true,
  [PermissionCodes.MERCHANTS_API_CLIENT_MANAGE]: true,
  [PermissionCodes.PAYMENTS_REFUND]: true,
  [PermissionCodes.PAYMENTS_CANCEL]: true,
  [PermissionCodes.ROLES_MANAGE]: true,
};

const allCodes = Object.values(PermissionCodes) as PermissionCode[];

export const BuiltInRoles: Array<{
  name: string;
  description: string;
  permissions: PermissionCode[];
}> = [
  {
    name: 'OWNER',
    description: 'Full platform access — can manage roles, users, and all operations',
    permissions: allCodes,
  },
  {
    name: 'ADMIN',
    description: 'Administrative access — all operations except role management',
    permissions: allCodes.filter((c) => c !== PermissionCodes.ROLES_MANAGE),
  },
  {
    name: 'OPERATOR',
    description: 'Day-to-day operations — manage merchants and payments, review approvals',
    permissions: [
      PermissionCodes.MERCHANTS_READ,
      PermissionCodes.MERCHANTS_UPDATE,
      PermissionCodes.MERCHANTS_SUSPEND,
      PermissionCodes.MERCHANTS_PSP_READ,
      PermissionCodes.MERCHANTS_API_CLIENT_READ,
      PermissionCodes.PAYMENTS_READ,
      PermissionCodes.PAYMENTS_CREATE,
      PermissionCodes.PAYMENTS_RETRY,
      PermissionCodes.PAYMENTS_REFUND,
      PermissionCodes.PAYMENTS_CANCEL,
      PermissionCodes.CPS_BATCHES_READ,
      PermissionCodes.CPS_BATCHES_MANAGE,
      PermissionCodes.PAYMENT_LINKS_READ,
      PermissionCodes.PAYMENT_LINKS_MANAGE,
      PermissionCodes.USERS_READ,
      PermissionCodes.ROLES_READ,
      PermissionCodes.APPROVALS_READ,
      PermissionCodes.APPROVALS_REVIEW,
    ],
  },
  {
    name: 'VIEWER',
    description: 'Read-only access across all modules',
    permissions: [
      PermissionCodes.MERCHANTS_READ,
      PermissionCodes.MERCHANTS_PSP_READ,
      PermissionCodes.MERCHANTS_API_CLIENT_READ,
      PermissionCodes.PAYMENTS_READ,
      PermissionCodes.USERS_READ,
      PermissionCodes.ROLES_READ,
      PermissionCodes.APPROVALS_READ,
    ],
  },
];
