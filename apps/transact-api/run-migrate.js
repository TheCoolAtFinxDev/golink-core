// Temporary script to apply RBAC migration
const { PrismaClient } = require('./generated/prisma');

process.env.DATABASE_URL = 'postgresql://DB_USER:DB_PASS@localhost:5432/golink_transact?schema=public';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const statements = [
  `DROP TABLE IF EXISTS "AdminUser"`,
  `DO $$ BEGIN CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "SystemUser" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "passwordHash" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SystemUser_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "SystemRole" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "isBuiltIn" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SystemRole_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Permission" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "category" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "Permission_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "RolePermission" ("id" TEXT NOT NULL, "roleId" TEXT NOT NULL, "permissionId" TEXT NOT NULL, "requires4Eyes" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "MerchantMembership" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "merchantId" TEXT NOT NULL, "roleId" TEXT NOT NULL, "isPrimary" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MerchantMembership_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "ApprovalRequest" ("id" TEXT NOT NULL, "requesterId" TEXT NOT NULL, "reviewerId" TEXT, "action" TEXT NOT NULL, "resourceType" TEXT NOT NULL, "resourceId" TEXT, "payload" JSONB NOT NULL, "requesterNotes" TEXT, "reviewerNotes" TEXT, "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING', "expiresAt" TIMESTAMP(3), "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SystemUser_email_key" ON "SystemUser"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SystemRole_name_key" ON "SystemRole"("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Permission_code_key" ON "Permission"("code")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MerchantMembership_userId_merchantId_key" ON "MerchantMembership"("userId", "merchantId")`,
  `CREATE INDEX IF NOT EXISTS "MerchantMembership_userId_isActive_idx" ON "MerchantMembership"("userId", "isActive")`,
  `CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_createdAt_idx" ON "ApprovalRequest"("status", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ApprovalRequest_requesterId_idx" ON "ApprovalRequest"("requesterId")`,
  `ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_roleId_fkey"`,
  `ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "SystemRole"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_permissionId_fkey"`,
  `ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "MerchantMembership" DROP CONSTRAINT IF EXISTS "MerchantMembership_userId_fkey"`,
  `ALTER TABLE "MerchantMembership" ADD CONSTRAINT "MerchantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SystemUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "MerchantMembership" DROP CONSTRAINT IF EXISTS "MerchantMembership_merchantId_fkey"`,
  `ALTER TABLE "MerchantMembership" ADD CONSTRAINT "MerchantMembership_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "MerchantMembership" DROP CONSTRAINT IF EXISTS "MerchantMembership_roleId_fkey"`,
  `ALTER TABLE "MerchantMembership" ADD CONSTRAINT "MerchantMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "SystemRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "ApprovalRequest" DROP CONSTRAINT IF EXISTS "ApprovalRequest_requesterId_fkey"`,
  `ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "SystemUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "ApprovalRequest" DROP CONSTRAINT IF EXISTS "ApprovalRequest_reviewerId_fkey"`,
  `ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "SystemUser"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'manual', NOW(), '20260616100000_rbac_system', NULL, NULL, NOW(), 1) ON CONFLICT (migration_name) DO NOTHING`
];

async function main() {
  console.log('Applying RBAC migration...');
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      process.stdout.write('.');
    } catch (e) {
      console.error('\nFailed:', stmt.substring(0, 100));
      console.error(e.message);
      process.exit(1);
    }
  }
  console.log('\nMigration applied successfully.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
