# Golink Transact — Integration Guide

**Version:** 1.1  
**Last Updated:** 2026-06-27  
**Base URL (Production):** `https://transact.golink.co.ls/api`  
**Base URL (Sandbox):** `https://sandbox.transact.golink.co.ls/api`  
**API Docs (Swagger):** `{baseUrl}/docs`  
**OpenAPI JSON:** `{baseUrl}/docs-json`

---

## 1. Authentication

All merchant API endpoints require an API key in the request header:

```
X-Api-Key: glk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Key format: `glk_live_<32-char alphanumeric>`. Keys are issued per merchant via the Golink Transact portal or by the Golink team during onboarding.

- Keys are **scoped to a single merchant** — all requests are automatically isolated to that merchant's data.
- Keys can be revoked and reissued without affecting existing payment records.
- There is no IP allow-listing requirement, but we recommend restricting outbound calls to your server IPs.

---

## 2. Environments

| Environment | Base URL | Swagger UI | Status |
|---|---|---|---|
| **Sandbox** | `https://sandbox.transact.golink.co.ls/api` | `/api/docs` | Live |
| **Production** | `https://transact.golink.co.ls/api` | `/api/docs` | Live |

Sandbox is a fully isolated environment — separate database, separate containers, separate TLS certificate. No production data is accessible. PSP credentials are configured per merchant in the sandbox and point to test/UAT endpoints:

- **Card:** iVeri test mode — use test PANs `4111111111111111` (Visa) / `5500005555555559` (Mastercard)
- **M-PESA:** Vodacom sandbox — USSD pushes simulate approval
- **EcoCash:** ETL UAT environment (`dt-externalproxy-1.etl.co.ls`)

To get sandbox access, contact `integrations@golink.co.ls` with your application name and expected integration type. A merchant record and API key will be provisioned within one business day.

---

## 3. Currencies and Amounts

- All amounts are in **minor units** (lisente / cents). LSL 10.00 = `1000`.
- Supported currency: `LSL` (Lesotho Loti). Additional currencies on request.
- No rounding is applied — amounts must be whole integers in minor units.

---

## 4. Idempotency

Every `POST /payments` request requires an `idempotencyKey` field. The key is **scoped per merchant** — the same key from two different merchants creates two separate payments.

- If a request is retried with the same key, the original response is returned without re-executing the payment. Safe to retry on network timeouts.
- Keys are stored indefinitely; there is no expiry window.

```json
{
  "idempotencyKey": "order-abc123-attempt-1"
}
```

---

## 5. Payments

### 5.1 Initiate a payment

```
POST /payments
```

**Headers:** `X-Api-Key: glk_live_...`

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `direction` | `DEBIT` \| `CREDIT` | Yes | DEBIT = collect from payer. CREDIT = send to payee. |
| `rail` | `CARD` \| `MPESA` \| `ECOCASH` \| `EFT` | Yes | Payment rail |
| `idempotencyKey` | string | Yes | Your unique key for this payment attempt |
| `amountMinor` | integer | Yes | Amount in minor units (≥ 1) |
| `currency` | string | Yes | 3-letter ISO 4217 code, e.g. `LSL` |
| `payer` | object | Yes | Payer identity. Include `phone` (266XXXXXXXX) for mobile money; `name` for card. |
| `payee` | object | Yes | Payee identity, e.g. `{ "name": "City Express Buses" }` |
| `sourceReference` | string | No | Your internal reference (order ID, student ID, etc.) |
| `description` | string | No | Human-readable description shown to payer |
| `metadata` | object | No | Arbitrary key-value stored with the payment |
| `splits` | array | No | Marketplace split — see Section 8 |
| `storedPaymentMethodId` | string | No | Token for repeat card or mobile money payments |
| `subscriptionId` | string | No | Link to a subscription record |
| `cardData` | object | No | Card details for CARD rail — see Section 7 |

**Example — M-PESA collection:**

```json
POST /payments
{
  "direction": "DEBIT",
  "rail": "MPESA",
  "idempotencyKey": "tsela-fee-jan-2026-child-42",
  "amountMinor": 95000,
  "currency": "LSL",
  "payer": { "name": "Lineo Mokoena", "phone": "26662345678" },
  "payee": { "name": "City Express Buses" },
  "sourceReference": "enrollment-42",
  "description": "January bus fee"
}
```

**Response statuses:**

| Status | Meaning |
|---|---|
| `PENDING` | Created but not yet submitted to PSP |
| `PROCESSING` | Submitted to PSP; awaiting async confirmation (mobile money) |
| `SUCCEEDED` | Payment completed successfully |
| `FAILED` | Rejected by PSP — see execution `responsePayload` |
| `CANCELLED` | Cancelled before execution |

M-PESA and EcoCash return `PROCESSING` immediately — the customer receives a USSD prompt. Final status arrives via webhook (Section 10) or polling `GET /payments/:id`.

### 5.2 Get payment status

```
GET /payments/:id
```

Returns the instruction with its latest execution attempt and any splits.

### 5.3 Refund a payment

```
POST /payments/:id/refund
```

| Field | Type | Required | Description |
|---|---|---|---|
| `amountMinor` | integer | No | Amount to refund. Defaults to full original amount. |
| `reason` | string | No | Reason stored on the refund record |

- Supported on **CARD** rail (synchronous iVeri credit). Mobile money refunds are on the roadmap.
- One refund per original payment. Contact support for exceptional cases.
- On success a `payment.refunded` webhook event is dispatched.

---

## 6. Listing & Reconciliation

### 6.1 List payment instructions

```
GET /payments
```

Returns a paginated list of payment instructions scoped to the calling merchant. All query parameters are optional and combinable.

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED` |
| `rail` | string | Filter by rail: `MPESA`, `ECOCASH`, `CARD`, `EFT` |
| `from` | ISO 8601 | Start of date range (inclusive), e.g. `2026-06-01T00:00:00Z` |
| `to` | ISO 8601 | End of date range (inclusive), e.g. `2026-06-30T23:59:59Z` |
| `limit` | integer | Max results to return (default 50, max 200) |
| `offset` | integer | Pagination offset (default 0) |
| `format` | string | `json` (default) or `csv` |

**Example — fetch all succeeded M-PESA payments for June:**

```
GET /payments?status=SUCCEEDED&rail=MPESA&from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z
```

### 6.2 CSV reconciliation export

Add `format=csv` to receive a plain-text CSV file suitable for import into Excel or your accounting system:

```
GET /payments?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z&format=csv
```

The response sets `Content-Type: text/csv` and `Content-Disposition: attachment`. Columns:

```
id, direction, rail, status, amountMinor, currency, sourceReference, description, createdAt
```

---

## 7. Disbursements (Payouts)

Disbursements — paying a provider, partner, or third party — use the same `POST /payments` endpoint with `direction: CREDIT`. There is no separate disbursement endpoint; the direction field controls the flow of funds.

### 7.1 Initiate a payout

```
POST /payments
```

```json
{
  "direction": "CREDIT",
  "rail": "MPESA",
  "idempotencyKey": "claim-payout-claim-789",
  "amountMinor": 76000,
  "currency": "LSL",
  "payer": { "name": "IthembaHealth Platform" },
  "payee": { "name": "Dr. Thabo Lerotholi", "phone": "26658123456" },
  "sourceReference": "claim-789",
  "description": "Claim payout — consultation 2026-06-25"
}
```

**Supported rails for disbursement:**

| Rail | Payee identifier | Notes |
|---|---|---|
| `MPESA` | `payee.phone` in `266XXXXXXXX` format | B2C / B2B mobile money transfer |
| `ECOCASH` | `payee.phone` in `266XXXXXXXX` format | B2C / B2B mobile money transfer |
| `EFT` | `payee.accountNumber`, `payee.bankCode`, `payee.accountName` | Nedbank CPS batch — not yet production-ready |

**Response:** Same structure as a collection. Status will be `PENDING` → PSP processes → `SUCCEEDED` or `FAILED`. Final status delivered via webhook (`payment.succeeded` / `payment.failed`).

### 7.2 Webhook on disbursement completion

Register a webhook endpoint (Section 11) with the `payment.succeeded` and `payment.failed` events. The payload `data.direction` field will be `CREDIT` so you can distinguish disbursement events from collection events in the same handler:

```json
{
  "type": "payment.succeeded",
  "data": {
    "direction": "CREDIT",
    "rail": "MPESA",
    "amountMinor": 76000,
    "sourceReference": "claim-789"
  }
}
```

### 7.3 Idempotency for disbursements

Always supply a unique `idempotencyKey` per disbursement (e.g. `claim-payout-{claimId}`). If your server retries after a timeout, the original response is returned — the payout will not be sent twice.

---

## 8. Stored Payment Methods

Stored payment methods allow recurring charges without the customer re-entering details each time.

- **Card tokens** are created automatically during the 3DS card enrollment flow.
- **Mobile wallet tokens** must be registered explicitly.

### 6.1 Register a mobile wallet

```
POST /stored-payment-methods/mobile-wallet
```

| Field | Type | Required | Description |
|---|---|---|---|
| `walletRail` | `MPESA` \| `ECOCASH` | Yes | |
| `mobileNumber` | string | Yes | In `266XXXXXXXX` format |
| `customerId` | string | No | Your internal customer reference |

### 6.2 List stored payment methods

```
GET /stored-payment-methods
```

### 6.3 Deactivate a stored payment method

```
DELETE /stored-payment-methods/:id
```

---

## 7. Card Payments (3DS)

Card payments require 3DS authentication and are handled through the Golink Transact payment page (`/pay/:shortCode`). Direct card API submission is supported for PCI-compliant integrations only — contact the Golink team.

**For most integrations:** create a payment link (`POST /admin/payment-links`) and redirect the customer to `https://transact.golink.co.ls/pay/:shortCode`. The payment page handles 3DS, card entry, and result display.

---

## 8. Marketplace Splits

Split a single collection across multiple merchants — for example, an operator share and a platform fee.

Add an optional `splits` array to `POST /payments`:

```json
{
  "amountMinor": 100000,
  "splits": [
    { "merchantId": "operator-uuid", "amountMinor": 95000, "description": "Operator share" },
    { "merchantId": "platform-uuid", "amountMinor": 5000, "description": "Platform fee" }
  ]
}
```

**Rules:**
- Split amounts must sum exactly to `amountMinor`.
- Each `merchantId` must be an active merchant on the platform.
- Omit `splits` entirely to settle the full amount to the calling merchant.

On payment success, Golink automatically creates a `CREDIT` payment instruction (status `PENDING`) for each split recipient. These instructions are settled to the recipient's bank or wallet in the next payout run.

---

## 9. Subscriptions (Recurring Payments)

### 9.1 Create a subscription

```
POST /subscriptions
```

| Field | Type | Required | Description |
|---|---|---|---|
| `storedPaymentMethodId` | string | Yes | Token to charge each cycle |
| `amountMinor` | integer | Yes | Amount per cycle in minor units |
| `currency` | string | Yes | e.g. `LSL` |
| `interval` | `DAILY` \| `WEEKLY` \| `MONTHLY` | Yes | Billing frequency |
| `startAt` | ISO 8601 datetime | No | First charge date. Defaults to now. |
| `maxAttempts` | integer | No | Consecutive failures before EXHAUSTED. Default: 3. |
| `description` | string | No | Shown on each payment |
| `sourceReference` | string | No | Your internal reference (e.g. student enrollment ID) |
| `payer` | object | No | Override payer info for each payment record |
| `metadata` | object | No | Stored with each generated payment |

**Card subscriptions:** Golink uses iVeri MIT (Merchant-Initiated Transaction) — no customer action required per cycle. The card token is charged automatically.

**Mobile money subscriptions:** Golink triggers a USSD push to the customer's phone each billing cycle. The customer must approve on their handset. True mandate-based direct debit (no customer action) is on the roadmap.

### 9.2 Manage subscriptions

| Endpoint | Description |
|---|---|
| `GET /subscriptions` | List all subscriptions |
| `GET /subscriptions/:id` | Get subscription + last 5 payments |
| `POST /subscriptions/:id/pause` | Pause — no charges until resumed |
| `POST /subscriptions/:id/resume` | Resume a paused subscription |
| `POST /subscriptions/:id/cancel` | Cancel permanently |

**Subscription statuses:** `ACTIVE`, `PAUSED`, `CANCELLED`, `EXHAUSTED`

---

## 10. Webhooks

### 10.1 Register an endpoint

```
POST /webhooks
{
  "url": "https://your-app.com/api/golink/webhook",
  "events": ["payment.succeeded", "payment.failed", "payment.refunded"]
}
```

Use `"*"` to subscribe to all events. **Available events:**

| Event | When fired |
|---|---|
| `payment.created` | Payment instruction created |
| `payment.succeeded` | Payment completed successfully |
| `payment.failed` | Payment rejected by PSP |
| `payment.cancelled` | Payment cancelled |
| `payment.refunded` | Refund completed successfully |

The response includes a `secret` field — **store it securely, it is shown only once.**

### 10.2 Manage endpoints

| Endpoint | Description |
|---|---|
| `GET /webhooks` | List active endpoints (secret omitted) |
| `DELETE /webhooks/:id` | Deactivate an endpoint |

### 10.3 Delivery

Each event is delivered as `POST` to your URL with:

```
Content-Type: application/json
X-Golink-Signature: sha256=<hmac-sha256(body, secret)>
X-Golink-Event: payment.succeeded
X-Golink-Delivery: <eventId>
```

**Verifying signatures (Node.js example):**

```js
const crypto = require('crypto');

function verifySignature(rawBody, secret, signatureHeader) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}
```

**Always verify the signature before processing an event.**

### 10.4 Retry policy

If your endpoint returns a non-2xx response or times out (10s), Golink retries with exponential backoff:

| Attempt | Delay |
|---|---|
| 2nd | +1 minute |
| 3rd | +5 minutes |
| 4th | +30 minutes |
| 5th | +2 hours |

After 5 failed attempts the event is marked permanently failed.

### 10.5 Webhook payload structure

```json
{
  "id": "evt_<paymentId>_payment_succeeded",
  "type": "payment.succeeded",
  "created": "2026-06-26T10:00:00.000Z",
  "data": {
    "paymentId": "uuid",
    "merchantId": "uuid",
    "status": "SUCCEEDED",
    "direction": "DEBIT",
    "rail": "MPESA",
    "amountMinor": 95000,
    "currency": "LSL",
    "sourceReference": "enrollment-42",
    "description": "January bus fee",
    "metadata": { "studentId": "child-42" },
    "splits": [
      { "merchantId": "operator-uuid", "amountMinor": 90250, "description": "Operator share", "status": "SETTLED" },
      { "merchantId": "platform-uuid", "amountMinor": 4750, "description": "Platform fee", "status": "SETTLED" }
    ]
  }
}
```

---

## 11. Error Handling

All errors follow the standard HTTP status codes with a JSON body:

```json
{
  "statusCode": 422,
  "message": "No active PSP config for rail MPESA",
  "error": "Unprocessable Entity"
}
```

| Status | When |
|---|---|
| `400` | Validation error — check `message` for field details |
| `401` | Missing or invalid `X-Api-Key` |
| `404` | Resource not found or belongs to a different merchant |
| `409` | Conflict — e.g. duplicate idempotency key with different params |
| `422` | Business rule violation — see `message` |
| `500` | Internal error — contact support with the request ID |

**Common PSP errors (card):**

| Reason | Recommended action |
|---|---|
| Insufficient funds | Ask payer to top up and retry |
| Card declined / Do Not Honour | Ask payer to contact their bank |
| Expired card | Ask payer to update card details |
| 3DS authentication failed | Ask payer to retry; may be browser issue |
| Timeout | Retry with same `idempotencyKey` |

---

## 12. Rate Limits

- **100 requests/minute** per API key (soft limit — contact us for higher limits)
- No per-transaction limits on amount
- Minimum transaction amount: LSL 0.01 (1 lisente)

---

## 13. Sub-Merchant Onboarding

Each operator on your platform must be registered as a merchant on Golink Transact before they can receive payments or splits.

**Required information per operator:**

| Field | Description |
|---|---|
| Legal entity name | Registered business name |
| Registration number | Company/business registration |
| Tax number | Where applicable |
| Primary contact | Name, email, phone |
| Settlement account | Bank account or mobile wallet for payouts |
| Business category | e.g. Transport, Education |

Onboarding is currently handled by the Golink team. A self-service operator onboarding flow is on the roadmap. Contact `integrations@golink.co.ls` to initiate.

---

## 14. Security

- All communication over **HTTPS/TLS 1.2+**
- API keys are **bcrypt-hashed** at rest — we cannot recover a lost key; generate a new one
- Webhook secrets are shown **once** at creation; store in a secrets manager
- Card data is **never stored in plain text** — PANs are AES-256-GCM encrypted at rest
- PCI scope: Golink Transact handles card data entry and 3DS. Integrators using the hosted payment page are **out of PCI scope** for card data.

---

## 15. Support and SLA

| Channel | Details |
|---|---|
| Technical integration support | `integrations@golink.co.ls` |
| Production incidents | `support@golink.co.ls` |
| Uptime target | 99.5% monthly |
| API versioning | Breaking changes are versioned (`/api/v2/...`); 90-day deprecation notice |

---

## 16. Capability Matrix — Tsela Response

The following completes Section 6 of the Tsela integration request dated 2026-06-26.

| # | Capability | Phase | Supported | Endpoint(s) | Notes |
|---|---|---|---|---|---|
| 1 | Collect via M-PESA | MVP | **Yes** | `POST /payments` `rail: MPESA` | Async USSD push. Final status via webhook. |
| 2 | Collect via EcoCash | MVP | **Yes** | `POST /payments` `rail: ECOCASH` | Async USSD push. Final status via webhook. |
| 3 | Collect via card | MVP | **Yes** | Hosted payment page `/pay/:shortCode` | Full 3DS2 flow. Direct card API for PCI-compliant integrations only. |
| 4 | Collect via bank / EFT | Nice-to-have | **Partial** | `POST /payments` `rail: EFT` | Schema and batch file structure built; SFTP submission to Nedbank CPS in progress. Not production-ready. |
| 5 | Recurring / scheduled monthly debit | MVP | **Yes** | `POST /subscriptions` | Card: automatic MIT (no customer action). Mobile money: USSD push per cycle. Mandate-based direct debit roadmap. |
| 6 | Split payment / marketplace settlement | MVP | **Yes** | `splits` array on `POST /payments` | Operator share + platform fee split in a single API call. Credit instructions created automatically on success. |
| 7 | Real-time payment status query | MVP | **Yes** | `GET /payments/:id` | Includes execution detail and split status. |
| 8 | Webhooks for payment events | MVP | **Yes** | `POST /webhooks` | Events: created, succeeded, failed, cancelled, refunded. HMAC-SHA256 signature. 5-attempt retry with backoff. |
| 9 | Refunds / reversals | MVP | **Partial** | `POST /payments/:id/refund` | Card refunds: fully supported (iVeri credit). Mobile money reversals: roadmap. |
| 10 | Payout / settlement to operators | Phase 2 | **Roadmap** | — | CREDIT instructions are created per split; automated disbursement to operator bank/wallet scheduled for Phase 2. |
| 11 | Disbursement to third parties (driver payroll) | Phase 2 | **Roadmap** | — | Will use same CREDIT instruction model. |
| 12 | Stored-value / wallet balances | Phase 2 | **Roadmap** | — | Platform architecture supports balance tracking; product not yet built. |
| 13 | Sub-merchant onboarding & KYC | MVP | **Partial** | Manual via Golink team | Merchant record + API key provisioned within 1 business day. Self-service portal on roadmap. |
| 14 | Reporting / reconciliation / statements | MVP | **Partial** | `GET /admin/payments` (admin) | Paginated payment list available. CSV export and formal statements on roadmap. |
| 15 | Idempotency keys | MVP | **Yes** | `idempotencyKey` on `POST /payments` | Scoped per merchant. Permanent storage — no expiry. |
| 16 | Sandbox environment + test instruments | MVP | **Yes** | `https://sandbox.transact.golink.co.ls/api` | **Live.** Fully isolated environment (separate DB, containers, TLS cert). Test card PANs and M-PESA sandbox available. Contact `integrations@golink.co.ls` for access. |
