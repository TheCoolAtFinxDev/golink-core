-- Bootstrap built-in roles
INSERT INTO "SystemRole" (id, name, description, "isBuiltIn", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'OWNER', 'Full platform access — can manage roles, users, and all operations', true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'ADMIN', 'Administrative access — all operations except role management', true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'OPERATOR', 'Day-to-day operations — manage merchants and payments, review approvals', true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'VIEWER', 'Read-only access across all modules', true, true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description, "isBuiltIn"=true;

-- Assign all permissions to OWNER
INSERT INTO "RolePermission" (id, "roleId", "permissionId", "requires4Eyes")
SELECT gen_random_uuid()::text, r.id, p.id,
  CASE p.code
    WHEN 'merchants.suspend' THEN true
    WHEN 'merchants.psp_config.manage' THEN true
    WHEN 'merchants.api_client.manage' THEN true
    WHEN 'payments.refund' THEN true
    WHEN 'payments.cancel' THEN true
    WHEN 'roles.manage' THEN true
    ELSE false
  END
FROM "SystemRole" r, "Permission" p
WHERE r.name = 'OWNER'
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET "requires4Eyes"=EXCLUDED."requires4Eyes";

-- ADMIN: all except roles.manage
INSERT INTO "RolePermission" (id, "roleId", "permissionId", "requires4Eyes")
SELECT gen_random_uuid()::text, r.id, p.id,
  CASE p.code
    WHEN 'merchants.suspend' THEN true
    WHEN 'merchants.psp_config.manage' THEN true
    WHEN 'merchants.api_client.manage' THEN true
    WHEN 'payments.refund' THEN true
    WHEN 'payments.cancel' THEN true
    ELSE false
  END
FROM "SystemRole" r, "Permission" p
WHERE r.name = 'ADMIN' AND p.code != 'roles.manage'
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET "requires4Eyes"=EXCLUDED."requires4Eyes";

-- OPERATOR: operations subset
INSERT INTO "RolePermission" (id, "roleId", "permissionId", "requires4Eyes")
SELECT gen_random_uuid()::text, r.id, p.id,
  CASE p.code
    WHEN 'merchants.suspend' THEN true
    WHEN 'payments.refund' THEN true
    WHEN 'payments.cancel' THEN true
    ELSE false
  END
FROM "SystemRole" r, "Permission" p
WHERE r.name = 'OPERATOR' AND p.code IN (
  'merchants.read', 'merchants.update', 'merchants.suspend',
  'merchants.psp_config.read', 'merchants.api_client.read',
  'payments.read', 'payments.refund', 'payments.cancel',
  'users.read', 'roles.read', 'approvals.read', 'approvals.review'
)
ON CONFLICT ("roleId", "permissionId") DO UPDATE SET "requires4Eyes"=EXCLUDED."requires4Eyes";

-- VIEWER: read-only subset
INSERT INTO "RolePermission" (id, "roleId", "permissionId", "requires4Eyes")
SELECT gen_random_uuid()::text, r.id, p.id, false
FROM "SystemRole" r, "Permission" p
WHERE r.name = 'VIEWER' AND p.code IN (
  'merchants.read', 'merchants.psp_config.read', 'merchants.api_client.read',
  'payments.read', 'users.read', 'roles.read', 'approvals.read'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
