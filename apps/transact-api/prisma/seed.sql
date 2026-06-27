-- Seed: super admin SystemUser + bootstrap RBAC
-- Password hash for "Admin@2026!" using scrypt scheme (will be updated via app seed endpoint)

-- Bootstrap permissions
INSERT INTO "Permission" (id, code, name, description, category, "isActive") VALUES
  (gen_random_uuid()::text, 'merchants.read', 'View merchants', 'View merchant list and details', 'merchants', true),
  (gen_random_uuid()::text, 'merchants.create', 'Create merchants', 'Onboard new merchants', 'merchants', true),
  (gen_random_uuid()::text, 'merchants.update', 'Update merchants', 'Edit merchant profile and settings', 'merchants', true),
  (gen_random_uuid()::text, 'merchants.suspend', 'Suspend merchants', 'Suspend or reactivate merchants', 'merchants', true),
  (gen_random_uuid()::text, 'merchants.psp_config.read', 'View PSP configs', 'View PSP gateway configurations', 'merchants', true),
  (gen_random_uuid()::text, 'merchants.psp_config.manage', 'Manage PSP configs', 'Create and update PSP gateway configurations', 'merchants', true),
  (gen_random_uuid()::text, 'merchants.api_client.read', 'View API clients', 'View merchant API client credentials', 'merchants', true),
  (gen_random_uuid()::text, 'merchants.api_client.manage', 'Manage API clients', 'Create and rotate merchant API client credentials', 'merchants', true),
  (gen_random_uuid()::text, 'payments.read', 'View payments', 'View payment instructions and executions', 'payments', true),
  (gen_random_uuid()::text, 'payments.refund', 'Initiate refunds', 'Initiate payment refunds', 'payments', true),
  (gen_random_uuid()::text, 'payments.cancel', 'Cancel payments', 'Cancel pending payment instructions', 'payments', true),
  (gen_random_uuid()::text, 'users.read', 'View users', 'View system users and their memberships', 'users', true),
  (gen_random_uuid()::text, 'users.manage', 'Manage users', 'Create, update, and deactivate system users', 'users', true),
  (gen_random_uuid()::text, 'roles.read', 'View roles', 'View roles and their permission assignments', 'roles', true),
  (gen_random_uuid()::text, 'roles.manage', 'Manage roles', 'Create and edit roles and their permission assignments', 'roles', true),
  (gen_random_uuid()::text, 'approvals.read', 'View approvals', 'View pending and resolved approval requests', 'approvals', true),
  (gen_random_uuid()::text, 'approvals.review', 'Review approvals', 'Approve or reject pending requests', 'approvals', true)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;
