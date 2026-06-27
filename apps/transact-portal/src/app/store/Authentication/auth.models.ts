export interface AccessMembership {
  organizationId: string;
  organizationType:
    | 'PSO'
    | 'BILLER'
    | 'MERCHANT'
    | 'CUSTOMER_ORG'
    | 'INTERNAL';
  organizationName?: string;
  organizationCode?: string;
  role: string;
  permissions: string[];
}

export interface User {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  scope?: 'SYSTEM_OWNER' | 'PSO' | 'ORGANIZATION';
  organizationIds?: string[];
  primaryOrganizationId?: string | null;
  primaryOrganizationType?:
    | 'PSO'
    | 'BILLER'
    | 'MERCHANT'
    | 'CUSTOMER_ORG'
    | 'INTERNAL'
    | null;
  capabilities?: string[];
  visibleModules?: string[];
  accessMemberships?: AccessMembership[];
  token?: string;
  status?: string;
}
