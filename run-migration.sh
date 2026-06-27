#!/bin/bash
export DATABASE_URL="postgresql://DB_USER:DB_PASS@localhost:5432/golink_transact?schema=public"
npx prisma migrate dev --schema=apps/transact-api/prisma/schema.prisma --name=rbac_system
