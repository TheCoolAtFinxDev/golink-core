# Golink Transact — System Overview

## What It Is

Golink Transact is a **Payment Orchestration Layer** — a multi-tenant payment aggregator that sits between your business applications and the actual payment service providers (PSPs). Instead of every application you build talking directly to M-PESA, EcoCash, or a card processor, they all talk to one API. Transact handles routing, retry logic, idempotency, event notification, and the audit trail.

It is the replacement for the payment processing component of the old Golink monolith, extracted and rebuilt as an independent, reusable service within the Golink Suite NX monorepo.

---

## What It Does

At the highest level it does five things:

**1. Accepts payment instructions from any upstream system**
Any app that has an API key can submit a payment instruction — a request to collect or pay out money. The caller says what rail (M-PESA, EcoCash, card, EFT), the amount, the payer, the direction (DEBIT = collect from customer, CREDIT = pay out to someone), and an idempotency key. Transact does everything else.

**2. Routes to the right PSP and executes**
Based on the rail and the calling merchant's configured credentials, Transact sends the instruction to the correct PSP, handles the protocol, manages auth tokens (M-PESA session keys, EcoCash JWTs), and maps the response back to a uniform status.

**3. Publishes events to subscribers**
When payment status changes, Transact notifies interested parties via two channels: Redis Streams (for internal Golink services like the Collect platform) and HTTP webhooks (for external integration partners).

**4. Handles recurring billing**
Subscriptions are scheduled on the platform itself — a cron job runs every minute, finds due subscriptions, and executes payment cycles automatically. Card subscriptions use stored tokens (MIT — Merchant-Initiated Transactions). Mobile money subscriptions fire-and-forget a USSD push.

**5. Provides an admin control plane**
A role-based admin interface lets Golink operators manage merchants, configure PSP credentials, review payments, approve sensitive actions (4-eyes control), and manage the platform.

---

## The Components

### API Server — `transact-api` (NestJS)

The core service, running as a Docker container on the `odoo_stack_default` network. It exposes a REST API at `https://transact.golink.co.ls/api` (production) and `https://sandbox.transact.golink.co.ls/api` (sandbox).

Its internal modules:

| Module | What it does |
|---|---|
| **Payments** | Core: submit, retrieve, cancel, refund, admin-create payment instructions |
| **PSP** | Adapter layer per rail — iVeri (card), M-PESA, EcoCash, Nedbank CPS (EFT) |
| **3DS** | Handles the iVeri 3D Secure browser redirect flow for card payments |
| **Subscriptions** | Creates, manages and runs recurring billing schedules (DAILY/WEEKLY/MONTHLY) |
| **Stored Payment Methods** | Tokenised card references and mobile wallet registrations for reuse |
| **Webhooks** | Endpoint registration, HMAC-signed delivery, 5-attempt exponential retry |
| **Merchants** | Sub-merchant onboarding and management |
| **Auth / API Keys** | API key issuance (bcrypt-hashed), merchant-scoped access control |
| **Admin Auth** | JWT-based login for Golink operators |
| **RBAC** | Roles, permissions, merchant membership — who can do what |
| **4-Eyes Approvals** | Sensitive actions (cancel, refund) require a second operator to approve |
| **Payment Links** | Shareable short-code payment URLs with optional amount, expiry, rail restriction |
| **CPS Batches** | Nedbank batch EFT file tracking (skeleton, ready to build out) |
| **Events** | Redis Streams publisher — broadcasts payment events to Golink Collect |

### Portal — `transact-portal`

A reverse proxy / static server sitting in front of the API. It serves the admin UI assets and proxies `/api/*` requests through to `transact-api`. Running as a separate Docker container on the same network.

### Database — PostgreSQL (`golink_transact`)

22 tables covering the full domain. Key tables:

| Table | Purpose |
|---|---|
| `PaymentInstruction` | The central record. Every payment, refund, split credit, and subscription cycle creates one. Direction-neutral (DEBIT or CREDIT), stores payer/payee as JSON, linked to a rail, idempotency key enforced at DB level. |
| `PaymentExecution` | One row per PSP call attempt. Stores the full request/response payload for audit. |
| `PaymentSplit` | Marketplace split settlement: a DEBIT collection can declare splits; on success, CREDIT instructions are created per split recipient. |
| `Subscription` | Recurring billing schedule with interval, next run time, attempt counter, max retries. |
| `StoredPaymentMethod` | Card tokens (`TransactionIndex/maskedPan/expiryMMYY`) and mobile wallet numbers for MIT and subscriptions. |
| `ThreeDsSession` | State for the card 3DS browser flow; PAN stored AES-256 encrypted at rest. |
| `WebhookEndpoint` / `WebhookEvent` | Delivery tracking with full retry state. |
| `MerchantPspConfig` | Per-merchant PSP credentials as a JSON blob. No PSP credentials live in `.env`. |
| `ApprovalRequest` | 4-eyes workflow records. |

---

## How a Payment Flows

### Mobile Money (M-PESA / EcoCash)

```
Caller  →  POST /api/payments  →  PaymentsService.submit()
                                       │
                                  Idempotency check (DB)
                                       │
                               PspRegistryService.getAdapter()
                                       │
                              [M-PESA / EcoCash adapter]
                                Get/refresh session key → PspSessionCache
                                POST to Vodacom / ETL API
                                       │
                              Result: PENDING (USSD push sent to customer)
                                       │
                        Customer approves on handset
                                       │
                    POST /api/psp/mpesa/callback  (Vodacom calls us back)
                    POST /api/psp/ecocash/callback  (ETL calls us back)
                                       │
                    PaymentsService.handlePspCallback()
                              Status → SUCCEEDED / FAILED
                              PaymentSplits settled (if any)
                              payment.succeeded webhook fired
                              Redis Stream event published
```

### Card (iVeri 3DS)

```
Caller  →  POST /api/payments (rail: CARD)
                    │
            ThreeDsService — creates ThreeDsSession, encrypts PAN
                    │
          POST to iVeri EnrollmentInitial
                    │
          Returns redirect URL to caller
                    │
          Customer browser → bank 3DS page → POST back to
          /api/3ds/return (our return URL)
                    │
          ThreeDsService.handleReturn()
          Decrypts session, calls iVeri to complete auth
          PaymentsService.settleSplits() if succeeded
          payment.succeeded / payment.failed webhook fired
```

### Subscriptions (automated)

```
@Cron EVERY_MINUTE
    ↓
SubscriptionsService.runDue()
    Find ACTIVE subscriptions where nextRunAt ≤ now
    For each:
        Build idempotency key = "scheduled:{subId}:{nextRunAt}"
        Execute via PSP adapter
        CARD success → advance nextRunAt, reset attempt count
        Mobile PENDING → advance nextRunAt immediately (async USSD)
        Failure → increment attempt; if exhausted → EXHAUSTED status
```

---

## Payment Rails

| Rail | PSP | Protocol | Settlement |
|---|---|---|---|
| `MPESA` | Vodacom Lesotho | REST + session key auth | USSD push, async callback |
| `ECOCASH` | Econet Telecom Lesotho | REST + JWT auth | USSD push, async callback |
| `CARD` | iVeri / Nedsecure | HTTPS + 3DS redirect | Synchronous (after 3DS) |
| `EFT` | Nedbank CPS | Batch file upload | File-based, ACK/NACK |

---

## Security Model

| Mechanism | Detail |
|---|---|
| **API Keys** | Format `glk_live_<random>`. Stored as bcrypt hashes. Scoped to one merchant. Passed as `X-Api-Key` header on every request. |
| **Webhook signatures** | Every delivery carries `X-Golink-Signature: sha256=<hmac>` signed with a per-endpoint secret. Recipients verify before trusting. |
| **4-Eyes approvals** | Cancel and refund permissions can be configured to require a second Golink operator to approve before executing. Enforced at the controller level. |
| **PAN encryption** | Card numbers in ThreeDsSessions are AES-256 encrypted in the application layer before being stored. |
| **PSP credentials in DB** | Never in `.env` or code. Each merchant's PSP config is a JSON blob in `MerchantPspConfig`, loaded at runtime. |

---

## Environments

| | Production | Sandbox |
|---|---|---|
| **URL** | `https://transact.golink.co.ls` | `https://sandbox.transact.golink.co.ls` |
| **Swagger docs** | `/api/docs` | `/api/docs` |
| **API container** | `transact-api` → port 4001 | `transact-api-sandbox` → port 4011 |
| **Portal container** | `transact-portal` → port 4200 | `transact-portal-sandbox` → port 4211 |
| **Database** | `golink_transact` | `golink_transact_sandbox` |
| **SSL** | Let's Encrypt (npm-7) | Let's Encrypt (cert 28) |
| **Network** | `odoo_stack_default` | `odoo_stack_default` |

Sandbox PSP credentials are configured per merchant in `MerchantPspConfig` — set `mode: TEST` for iVeri, point to UAT endpoints for EcoCash and M-PESA. No production data is accessible from sandbox.

---

## Who Connects to It

Any system becomes an integration partner by getting a merchant record and an API key. Current and planned integrations:

| System | Type | Status |
|---|---|---|
| Golink Collect | Internal (Redis Streams + API key) | Live |
| Tsela (school transport) | External merchant | Sandbox integration underway |
| Marketplace app | External merchant | Requirements pending |

**Platform philosophy:** every integration request strengthens the platform generically. Splits, subscriptions, webhooks, stored payment methods, and refunds were all built as platform capabilities — not custom per-partner solutions.
