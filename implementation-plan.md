# Golink Suite — Implementation Plan

**Created:** 2026-06-15  
**Author:** Mohau Ramakhula  
**Stack:** NX Monorepo · NestJS · Angular · PostgreSQL · Redis Streams  
**Root:** `/home/octoadmin/golink-suite/`

---

## 1. Overview

The Golink Suite is a restructuring of the existing Golink monolith into two fully independent services, co-developed in a single NX monorepo for shared type safety and simplified contract management.

| Service | Role | Port (dev) | Database |
|---|---|---|---|
| **Golink Transact API** | Payment Orchestration Layer | 4001 | `golink_transact` |
| **Golink Collect API** | Collections & Billing Platform | 4002 | `golink_collect` |
| **Transact Portal** | Merchant / PSP admin dashboard | 4201 | — |
| **Collect Portal** | Collect ops & biller portal | 4200 | — |

**Communication between services:**
- Collect → Transact: REST API calls (Collect submits PaymentInstructions to Transact)
- Transact → Collect: Redis Streams domain events (Transact publishes payment status changes)

---

## 2. Repository Structure

```
golink-suite/
├── apps/
│   ├── transact-api/              # NestJS — Payment Orchestration Layer
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── merchants/
│   │   │   ├── payments/
│   │   │   ├── psp/
│   │   │   │   ├── iveri/
│   │   │   │   ├── mpesa/
│   │   │   │   ├── ecocash/
│   │   │   │   └── cps/           # Shell only (Phase 1)
│   │   │   ├── 3ds/
│   │   │   ├── subscriptions/
│   │   │   ├── webhooks/
│   │   │   └── auth/              # API key auth
│   │   └── prisma/
│   │       └── schema.prisma      # golink_transact DB
│   │
│   ├── collect-api/               # NestJS — Collections Platform
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── customers/
│   │   │   ├── organizations/
│   │   │   ├── bills/
│   │   │   ├── billers/
│   │   │   ├── kyc/
│   │   │   ├── payment-projections/ # Read-only snapshots of Transact events
│   │   │   └── auth/              # JWT auth
│   │   └── prisma/
│   │       └── schema.prisma      # golink_collect DB
│   │
│   ├── transact-portal/           # Angular — Merchant/PSP Admin Dashboard
│   └── collect-portal/            # Angular — Collect Ops Portal
│
├── libs/
│   ├── domain-events/             # Shared Redis Stream event type contracts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── event-types.ts     # GolinkEventType enum
│   │       └── payloads/          # Per-event payload interfaces
│   │
│   ├── transact-client/           # HTTP client for Collect → Transact calls
│   │   └── src/
│   │       └── index.ts           # OpenAPI-generated or hand-written client
│   │
│   └── shared-ui/                 # Shared Angular components (Phase 3+)
│
├── docker/
│   └── docker-compose.yml         # Redis only — pg is the existing `pg` container
│
├── implementation-plan.md
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## 3. Infrastructure

### 3.1 PostgreSQL — Existing Container (no new container)

The existing `pg` container (postgres:16, port 5432, user `payfac/payfac`) will host two new databases. The existing `payfac` database (current live system) is untouched.

```sql
-- Run once to provision new databases
CREATE DATABASE golink_transact OWNER payfac;
CREATE DATABASE golink_collect  OWNER payfac;
```

Connection strings:
```
# transact-api
DATABASE_URL="postgresql://payfac:payfac@localhost:5432/golink_transact?schema=public"

# collect-api
DATABASE_URL="postgresql://payfac:payfac@localhost:5432/golink_collect?schema=public"
```

### 3.2 Redis — New Container

A Redis container is added via `docker/docker-compose.yml` in this repo. It is used exclusively for Redis Streams (domain event bus between services).

```yaml
# docker/docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    container_name: golink-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - ./redis-data:/data
    command: redis-server --appendonly yes
```

```
REDIS_URL="redis://localhost:6379"
```

### 3.3 PM2 — Process Management

New PM2 ecosystem entries (separate from the existing golink entries):

```js
// ecosystem.config.js (in golink-suite root)
module.exports = {
  apps: [
    {
      name: 'transact-api',
      script: 'dist/apps/transact-api/main.js',
      env: { NODE_ENV: 'production', PORT: 4001 }
    },
    {
      name: 'collect-api',
      script: 'dist/apps/collect-api/main.js',
      env: { NODE_ENV: 'production', PORT: 4002 }
    }
  ]
}
```

---

## 4. Payment Service Providers

All PSPs are integrated into `transact-api` only. Collect never calls PSPs directly.

| PSP | Rail | Auth | Protocol | Sync? |
|---|---|---|---|---|
| **iVeri** | CARD | Client cert + AppID | REST/XML | Sync (3DS async) |
| **M-PESA** | MPESA | RSA-encrypted API key → Session Key | REST/JSON | Async (poll/callback) |
| **EcoCash** | ECOCASH | JWT (username/password) | REST/JSON | Sync |
| **Nedbank CPS** | EFT | SFTP credentials | File-based | Async (hours) |

### iVeri (Multi-Merchant)
- CIT (Customer Initiated Transaction) — card present / browser enrolled
- MIT (Merchant Initiated Transaction) — uses stored `TransactionIndex`
- 3DS enrollment bridged via `ThreeDsSession` table (replaces current in-memory Map)
- Per-merchant credentials stored in `MerchantPspConfig` (not .env)
- Currency: LSL → ZAR mapping at PSP layer

### M-PESA Lesotho (Vodacom)
- Auth flow: POST encrypted API key → receive Session Key (expires 24h) → use for subsequent calls
- Session Key stored in `PspSessionCache` table with expiry
- C2B: `POST /mpesa/v1/c2b/paymentRequest` — triggers USSD push to customer phone
- Direct Debit: separate mandate flow (Phase 2)
- Callback URL required for async payment confirmation

### EcoCash (ETL Lesotho)
- Auth flow: POST `username/password` → receive JWT → use Bearer token
- JWT stored in `PspSessionCache` table with expiry
- C2B: `POST /etl/uat/ecoussd/api/pay-merchant`
- Reference: `https://dt-externalproxy-1.etl.co.ls/etl/uat/ecoussd/swagger-ui/index.html`

### Nedbank CPS (Shell — Phase 1 skeleton only)
- File-based: generate 400-char fixed-width flat file → SFTP upload → poll for ACK/NACK
- Transaction types: `0000` (debit/collection), `9999` (credit/payment)
- Per-merchant config: `clientProfileNumber`, `nominatedAccountNumber`, `chargesAccountNumber`, SFTP credentials
- `CpsBatch` table tracks file submissions and acknowledgement status
- `CpsUnpaid` table tracks bounce-backs (debit accepted but later returned unpaid)

---

## 5. Domain Events (Redis Streams)

Shared contracts defined in `libs/domain-events`. Both services import from this lib.

### Event Stream Names
```
golink.collect.events   ← published by collect-api
golink.transact.events  ← published by transact-api
```

### Event Catalogue

| Event Type | Published by | Consumed by | Payload summary |
|---|---|---|---|
| `collect.customer.created` | collect-api | transact-api (projection) | customerId, name, phone |
| `collect.bill.created` | collect-api | transact-api (projection) | billId, organizationId, amount, currency |
| `collect.bill.updated` | collect-api | transact-api (projection) | billId, status, updatedFields |
| `transact.payment.created` | transact-api | collect-api | paymentId, billId, amount, rail, status |
| `transact.payment.status_changed` | transact-api | collect-api | paymentId, previousStatus, newStatus, pspReference |

### Event Envelope
```typescript
interface GolinkDomainEvent<T = unknown> {
  id: string;           // UUID
  type: GolinkEventType;
  source: 'collect-api' | 'transact-api';
  occurredAt: string;   // ISO8601
  subject: string;      // entity ID (e.g. payment:abc123)
  payload: T;
}
```

---

## 6. Transact API — Data Model

### Core Tables

**`Merchant`** — represents an upstream system or merchant entity
- `id`, `name`, `slug`, `status` (ACTIVE/SUSPENDED)
- One Merchant has many `MerchantPspConfig` entries (one per PSP rail they use)
- One Merchant has many `ApiClient` entries (API keys)

**`MerchantPspConfig`** — per-PSP credentials/config per merchant
- `merchantId`, `rail` (CARD/MPESA/ECOCASH/EFT), `isActive`
- `config` (JSON) — PSP-specific config blob:
  - iVeri: `{ certId, appIdCit, appIdMit, merchantProfileId, mode }`
  - M-PESA: `{ apiKey, shortCode, callbackBaseUrl }`
  - EcoCash: `{ username, password, merchantCode, callbackBaseUrl }`
  - CPS: `{ clientProfileNumber, nominatedAccountNumber, chargesAccountNumber, fileClientId, sftpHost, sftpPort, sftpUsername, sftpPassword, sftpInputPath, sftpSuccessPath, sftpFailPath }`

**`ApiClient`** — API keys for upstream systems (Collect, Odoo, POS, etc.)
- `merchantId`, `name`, `keyHash` (bcrypt), `keyPrefix` (first 8 chars for lookup)
- `sourceSystem` (GOLINK_COLLECT / ODOO_ERP / MERCHANT_POS / OTHER)
- `isActive`, `lastUsedAt`

**`PaymentInstruction`** — direction-neutral payment request
- `direction` (DEBIT / CREDIT)
- `rail` (CARD / MPESA / ECOCASH / EFT)
- `merchantId`, `apiClientId`
- `sourceSystem`, `sourceReference` (upstream's own ID — idempotency)
- `idempotencyKey` (unique per merchant+sourceRef)
- `payer` (JSON) — `{ type: CUSTOMER|ORGANISATION, id?, name, phone?, bankAccount? }`
- `payee` (JSON) — `{ type: MERCHANT|CUSTOMER, id?, name, accountNumber? }`
- `amount`, `currency`
- `description`, `metadata` (JSON)
- `status` (PENDING / PROCESSING / SUCCEEDED / FAILED / CANCELLED)
- `storedPaymentMethodId?` — for MIT/recurring
- `subscriptionId?` — if triggered by a subscription run

**`PaymentExecution`** — record of each PSP call attempt
- `paymentInstructionId`, `attempt` (1, 2, 3…)
- `pspRail`, `pspMerchantConfigId`
- `pspReference` — PSP's own transaction ID
- `requestPayload` (JSON, redacted for card data)
- `responsePayload` (JSON)
- `status` (PENDING / SUCCESS / FAILED / TIMEOUT)
- `executedAt`, `completedAt`
- For CPS: `cpsBatchId?` (links to the batch file)

**`StoredPaymentMethod`** — tokenised payment credentials
- `merchantId`, `kind` (CARD / MOBILE_WALLET / BANK_ACCOUNT)
- Card: `transactionIndex` (iVeri MIT token, unique), `maskedPan`, `expiryMMYY`, `scheme`
- Mobile: `mobileNumber`, `walletRail`
- Bank: `accountNumber`, `bankCode`, `accountName`
- `customerId?` (soft reference — Collect's customer ID)

**`ThreeDsSession`** — replaces current in-memory Map
- `sessionToken` (UUID), `merchantId`, `merchantPspConfigId`
- `kind` (ADHOC / SUBSCRIPTION)
- `pan`, `expiryMMYY` (encrypted at rest)
- `amount`, `currency`, `merchantReference`
- `customerId?`, `billId?`, `subscriptionId?`, `storedPaymentMethodId?`
- `status` (PENDING / COMPLETED / EXPIRED), `expiresAt`

**`Subscription`** — recurring billing schedule
- `merchantId`, `storedPaymentMethodId`, `rail`
- `customerId` (Collect soft ref), `billId` (Collect soft ref)
- `amount`, `currency`, `interval` (DAILY/WEEKLY/MONTHLY)
- `status` (ACTIVE / PAUSED / CANCELLED / EXHAUSTED)
- `nextRunAt`, `attempt`, `maxAttempts`

**`PspSessionCache`** — short-lived PSP auth tokens (M-PESA Session Key, EcoCash JWT)
- `merchantId`, `rail`, `token`, `expiresAt`

**`CpsBatch`** — Nedbank CPS file submission tracker
- `merchantId`, `sequenceNumber`, `fileContent` (the generated flat file)
- `status` (DRAFT / SUBMITTED / ACK / NACK / PARTIALLY_FAILED)
- `submittedAt`, `acknowledgedAt`, `ackFileContent`

**`CpsUnpaid`** — Nedbank CPS returned unpaid items
- `cpsBatchId`, `paymentInstructionId`
- `reasonCode`, `reasonDescription`, `unpaidDate`

**`WebhookEndpoint`** — per-merchant outbound webhook config
- `merchantId`, `url`, `secret`, `events` (string[]), `isActive`

**`WebhookEvent`** — outbound webhook delivery log
- `endpointId`, `paymentInstructionId`, `eventType`
- `payload` (JSON), `status`, `attempts`, `lastAttemptAt`, `nextRetryAt`

**`ApiLog`** — inbound API request log (all requests)
- `apiClientId?`, `method`, `path`, `statusCode`
- `requestBody` (JSON, redacted), `responseBody` (JSON), `durationMs`

---

## 7. Collect API — Data Model

Migrated from existing `payfac` schema. Collect owns: Customers, Organizations, Billers, Bills, KYC, Subscriptions-config, and read-only Payment projections.

### Core Tables (migrated)
- `Customer` — individual or business paying customer
- `Organization` — merchant organization (PSO, Biller, Operator)
- `Biller` — bill issuer linked to an Organization
- `Bill` — individual billable item (one-time or recurring trigger)
- `KycCase` — KYC verification case
- `CustomerKycProfile`, `OrganizationBillingProfile`, `OrganizationComplianceProfile`
- `SystemUser`, `OrganizationMembership`, `Permission`, `PermissionGrant`

### New Tables (Transact projections)
- `PaymentProjection` — local read-only snapshot of Transact payment events
  - `transactPaymentId`, `billId`, `amount`, `currency`, `status`, `rail`, `occurredAt`
  - Updated by Redis Stream consumer when Transact publishes status change events

---

## 8. Authentication

### Transact API — API Key Auth
- Upstream systems (Collect, Odoo, POS) present `X-Api-Key: glk_live_xxxxxxxx` header
- Transact hashes the key, looks up `ApiClient` by `keyPrefix` + `keyHash`
- Resolves `merchantId` and `sourceSystem` from `ApiClient`
- No user sessions — fully stateless per-request key auth
- **Future:** Migrate to WSO2 IS/APM OAuth2 client credentials flow

### Collect API — JWT Auth (unchanged from current)
- User login → JWT issued with `userId`, `organizationId`, `scope`
- All existing auth middleware preserved
- Collect calls Transact with its own API key (not user JWTs)

---

## 9. Implementation Phases

### Phase 0 — NX Workspace Setup
- [ ] Initialise NX monorepo at `/home/octoadmin/golink-suite/`
- [ ] Create app stubs: `transact-api`, `collect-api`, `transact-portal`, `collect-portal`
- [ ] Create lib stubs: `domain-events`, `transact-client`
- [ ] Configure NX module boundary rules (apps cannot import sibling app source)
- [ ] Add `docker/docker-compose.yml` (Redis)
- [ ] Start Redis container
- [ ] Provision `golink_transact` and `golink_collect` databases in existing `pg` container
- [ ] Add `.env` files for both API apps

### Phase 1 — Domain Events Library
- [ ] Define `GolinkEventType` enum in `libs/domain-events`
- [ ] Define payload interfaces for all 5 event types
- [ ] Define `GolinkDomainEvent<T>` envelope interface
- [ ] Export `createGolinkDomainEvent` factory function
- [ ] Both API apps import this lib (enforced at compile time)

### Phase 2 — Transact API: Core + Auth
- [ ] Write Prisma schema for `golink_transact` (all tables above)
- [ ] Run `prisma migrate dev` → first migration
- [ ] Implement `ApiClient` hashed key generation endpoint (admin only)
- [ ] Implement API key authentication middleware/guard
- [ ] Implement `Merchant` CRUD (admin endpoints)
- [ ] Implement `MerchantPspConfig` CRUD (admin endpoints)

### Phase 3 — Transact API: PSP Layer
- [ ] Define `PaymentProvider` interface (execute, getStatus, refund)
- [ ] Implement `IveriPaymentProvider` (migrate from existing, add multi-merchant)
- [ ] Implement `MpesaPaymentProvider` (new — REST + session key)
- [ ] Implement `EcocashPaymentProvider` (new — REST + JWT)
- [ ] Implement `CpsPaymentProvider` (shell — file generation + SFTP stub)
- [ ] Implement `PspSessionCache` service (token refresh for M-PESA, EcoCash)
- [ ] Unit tests for each PSP provider

### Phase 4 — Transact API: Payment Orchestration
- [ ] `PaymentInstruction` CRUD + routing logic
- [ ] Idempotency enforcement (unique constraint on `merchantId + idempotencyKey`)
- [ ] `PaymentExecution` service (attempt tracking, retry logic)
- [ ] `ThreeDsSession` service (replace in-memory Map in current 3DS flow)
- [ ] `Subscription` scheduler (migrate from existing, now in Transact)
- [ ] Redis Streams publisher (publishes `transact.payment.*` events)
- [ ] `WebhookEvent` outbound delivery service

### Phase 5 — Collect API: Core Migration
- [ ] Write Prisma schema for `golink_collect` (migrated tables)
- [ ] Run `prisma migrate dev` → first migration
- [ ] Migrate modules: Customers, Organizations, Billers, Bills, KYC
- [ ] Migrate auth (JWT, existing user/permission model unchanged)
- [ ] Implement Redis Streams consumer (subscribe to `golink.transact.events`)
- [ ] Implement `PaymentProjection` updater (persist Transact event snapshots)
- [ ] Replace direct PSP calls with HTTP calls to Transact API (via `libs/transact-client`)

### Phase 6 — Transact Portal (Angular)
- [ ] Scaffold Angular app in `apps/transact-portal`
- [ ] Merchant onboarding & PSP config management screens
- [ ] Payment instruction monitoring & search
- [ ] API client (key) management screen
- [ ] Webhook endpoint configuration

### Phase 7 — Collect Portal (Angular)
- [ ] Scaffold Angular app in `apps/collect-portal`
- [ ] Migrate existing admin portal from `/home/octoadmin/golink/collect/admin-portal`
- [ ] Replace payment data views with `PaymentProjection` data (from Collect DB)

### Phase 8 — Data Migration
- [ ] Write migration script: `payfac` → `golink_collect` (Customers, Orgs, Bills, Billers, KYC)
- [ ] Write migration script: `payfac` → `golink_transact` (Payments → PaymentInstruction + PaymentExecution, PaymentMethods → StoredPaymentMethod)
- [ ] Dry-run migration against restored backup
- [ ] Validate row counts and foreign key integrity

### Phase 9 — Cutover
- [ ] Deploy both new API services in parallel (ports 4001, 4002 alongside live 3001, 3002)
- [ ] Run smoke tests against new services with live data
- [ ] Update Nginx Proxy Manager: switch proxy hosts to new ports
- [ ] Update PM2 ecosystem: stop old services, start new
- [ ] Monitor for 24h, decommission old services

---

## 10. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Repo structure | NX monorepo | Shared `libs/domain-events` enforces event contracts at compile time |
| Service communication | REST (sync) + Redis Streams (async) | REST for real-time Collect→Transact calls; Streams for eventual consistency back |
| PSP credentials | Per-merchant in DB (`MerchantPspConfig`) | Allows multiple merchants per PSP rail without .env coupling |
| 3DS sessions | `ThreeDsSession` table | Survives restarts and multi-instance deployments |
| Auth | API keys (Transact) + JWT (Collect) | Pre-WSO2; migrate to OAuth2 client credentials later |
| Database | Two separate DBs in existing `pg` container | Zero new infrastructure; clean isolation; payfac DB untouched |
| CPS integration | File-based shell (Phase 1), full SFTP (Phase 2+) | Unblocks architecture without needing live Nedbank credentials |
| Direction neutrality | `PaymentInstruction.direction` (DEBIT/CREDIT) | Ready for B2C/B2B outbound payments from Day 1 |

---

## 11. Environment Variables Reference

### transact-api `.env`
```
NODE_ENV=development
PORT=4001
DATABASE_URL=postgresql://payfac:payfac@localhost:5432/golink_transact?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=<shared-with-collect>

# iVeri (fallback defaults — overridden by MerchantPspConfig in DB)
IVERI_URL=https://portal.iveri.net/Lite/Transactions/Execute.aspx
IVERI_3DS_URL=https://portal.iveri.net/Lite/Transactions/3DSecure.aspx

# API key signing secret (for key generation)
API_KEY_SECRET=<random-256-bit>
```

### collect-api `.env`
```
NODE_ENV=development
PORT=4002
DATABASE_URL=postgresql://payfac:payfac@localhost:5432/golink_collect?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=<shared-with-transact>

# Transact API base URL (for submitting PaymentInstructions)
TRANSACT_API_URL=http://localhost:4001
TRANSACT_API_KEY=glk_live_<collect-api-key>
```

---

## 12. Out of Scope (Deferred)

- WSO2 IS / APM OAuth2 migration (auth upgrade — post-v1)
- Nedbank CPS full SFTP implementation (shell only in Phase 1)
- M-PESA Direct Debit / mandate flow (Phase 2+)
- EcoCash Credit / B2C payout (Phase 2+)
- `shared-ui` Angular component library (Phase 3+)
- Multi-region deployment / read replicas
- End-to-end test suite (Playwright / Cypress)
