# Architecture

## 1. Overview

This document describes the system design of the Subscription Billing Platform: a full-stack application that lets users browse pricing plans, subscribe via Razorpay, and manage their subscription lifecycle (upgrade, downgrade, cancel), with automatic invoice generation and email notifications on successful payment.

The system is built as two independently deployable services:

- **Frontend** — Next.js (React), responsible for UI and client-side session state.
- **Backend** — Node.js/Express REST API, responsible for business logic, persistence, and all interaction with the payment gateway.

They communicate exclusively over HTTP, with the backend as the sole owner of the database and the sole holder of payment-gateway secrets. The frontend never talks to Razorpay's server-side APIs or holds any secret key — only the publishable key ID needed to open the client-side checkout widget.

```
┌─────────────┐        HTTPS/JSON        ┌──────────────┐        ┌─────────────┐
│   Next.js   │ ───────────────────────► │   Express    │ ─────► │   Postgres  │
│  (Frontend) │ ◄─────────────────────── │   (Backend)  │        │   (Neon)    │
└─────────────┘                          └──────┬───────┘        └─────────────┘
                                                 │
                                    ┌────────────┼─────────────┐
                                    ▼            ▼             ▼
                               Razorpay API   Mailtrap      pdfkit
                               (orders,       (email)       (invoice
                                webhooks)                    PDFs)
```

## 2. Design Principles

Three principles shaped every schema and API decision in this system:

1. **The backend is the only trusted source for anything involving money.** Prices, amounts, and payment outcomes are never accepted as client input — they are always read from the database or verified cryptographically against the payment gateway. This is the single most important rule in the codebase; it is revisited explicitly in Section 5.

2. **Records that represent an *attempt* are separated from records that represent *confirmed state*.** A `Payment` row is created the moment a checkout is initiated — before any money has moved — because an abandoned or failed attempt is still something the system needs to be able to see and reason about. A `Subscription` row, by contrast, is created *only* after a payment is confirmed successful, so that every row in that table means exactly one thing: "this user has (or had) real, paid access." Mixing these two concerns into one table or one status field was considered and rejected early in the design process, because it would force every downstream query to re-derive "is this actually active" from a mix of status and timestamp logic, rather than reading a single authoritative field.

3. **Every code path that could plausibly run twice for the same real-world event is written to be idempotent, not merely "unlikely to be called twice."** This applies to webhook delivery (Razorpay may retry), and to the fact that both the frontend confirmation call and the server-to-server webhook are designed to independently attempt to finalize the same payment. Idempotency is enforced with database constraints and explicit status checks — not with client-side guards or timing assumptions, both of which are unreliable under retries and concurrent requests. See Section 6.

## 3. Data Model

Six tables, described here with their purpose and the reasoning behind each relational choice.

### 3.1 User
The authentication identity. Stores `email` (unique), a bcrypt `passwordHash` (raw passwords are never persisted), and `name`.

### 3.2 Plan
The product catalog — Basic, Pro, Enterprise, etc. Deliberately has **no** foreign key to `User`: a plan is a definition that exists independently of who has purchased it. Holds `price` (`Decimal`, not `Float` — floating-point arithmetic is unsuitable for currency due to rounding error), `billingInterval` (enum: `MONTHLY` / `YEARLY`), a `features` string array for display, and `isPopular` / `isActive` flags so a plan can be retired without deleting historical records that reference it.

### 3.3 Subscription
One row per user's subscription. Created only once a payment has been confirmed successful (Section 2, principle 2). Fields of note:

- `status` — enum `ACTIVE` / `CANCELLED` / `EXPIRED`. An explicit field, not derived at read-time from date comparisons, so that "what is the current state" is always a single, unambiguous column read rather than logic that has to be replicated correctly in every query site.
- `cancelAtPeriodEnd` — boolean, set the moment a user cancels. A cancellation does not revoke access immediately; the user's plan remains usable until `currentPeriodEnd`. This mirrors standard SaaS billing behavior (the user has already paid for the current period) and is a deliberately separate concern from `status`.
- `currentPeriodStart` / `currentPeriodEnd` — the active billing window.

### 3.4 Payment
One row per billing attempt — created at the moment a Razorpay order is initiated, with `status: CREATED`, before the user has even seen the payment widget. Updated to `SUCCESS` or `FAILED` once the outcome is known.

- `razorpayOrderId` (unique, always present) vs. `razorpayPaymentId` (nullable, only populated on completion) — this split exists because Razorpay's own model distinguishes "an order was created" from "a payment was captured against it," and the system needs to be able to represent the in-between state (order created, payment pending/abandoned) rather than only the two end states.
- `userId` is stored directly on `Payment`, in addition to being reachable via `subscriptionId → Subscription → userId`. This is a deliberate denormalization: financial/audit records should remain directly traceable to a user even in edge cases where the originating subscription is later modified, and it mirrors how real payment processors (e.g., Stripe) model a charge as always carrying a direct customer reference, not only a reference via an intermediate object.
- `subscriptionId` is **nullable**. This is a direct consequence of principle 2: a `Payment` can and does exist before any `Subscription` does.
- `planId` is stored directly on `Payment` (separately from the plan being reachable later via `subscription → plan`). This preserves *intent* — which plan the user was attempting to buy — at a point in time when no subscription exists yet to hang that information off of.

### 3.5 Invoice
A record generated from exactly one successful `Payment` (`paymentId` is unique — a 1:1 relationship, enforced at the database level so the system cannot accidentally double-invoice a single payment). Carries a human-readable `invoiceNumber` (format: `INV-{year}-{paymentId, zero-padded}`) and its own `status` (`ISSUED` / `VOID`), which is intentionally a different piece of state from the payment's status — an invoice's lifecycle (e.g., voided due to a later refund) is conceptually distinct from whether the underlying payment succeeded.

### 3.6 WebhookEvent
A standalone audit log of every webhook delivery received from Razorpay, with no foreign key to any other table — its entire purpose is to answer one question: "have I already processed this exact event?" This is the system's idempotency guard, detailed in Section 6.

### 3.7 Entity-Relationship Summary

```
User ──1:N── Subscription ──N:1── Plan
 │                 │
 │                 └──1:N── Payment ──N:1── Plan
 │                              │
 └──────────1:N─────────────────┤
                                 └──1:1── Invoice

WebhookEvent (standalone — keyed only on Razorpay's eventId)
```

## 4. Payment and Subscription Lifecycle

### 4.1 Checkout initiation
1. An authenticated user selects a plan. The frontend sends only `{ planId }` to `POST /api/checkout/create-order` — never a price, and never a `userId` (identity comes from the verified JWT via middleware, not from client-supplied data; see Section 5).
2. The backend looks up the plan's price from the database, calls Razorpay's order-creation API, and writes a `Payment` row (`status: CREATED`) recording the order ID, the intended plan, and the amount.
3. The order ID, amount, currency, and the Razorpay publishable key are returned to the frontend, which uses them to open the Razorpay checkout widget.

### 4.2 Payment confirmation
4. On completion, Razorpay's client-side widget invokes a frontend callback with `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
5. The frontend forwards these to `POST /api/checkout/verify`. The backend independently recomputes the expected HMAC-SHA256 signature using the Razorpay secret key and compares it to the one supplied — this is what makes the confirmation trustworthy rather than a client-asserted claim (Section 5).
6. On a valid signature, a single shared function, `handlePaymentSuccess(paymentId, razorpayPaymentId)`, performs the entire "finalize this payment" sequence: mark `Payment` as `SUCCESS`, create the `Subscription`, back-link the `Payment` to it, generate an `Invoice`, and send a confirmation email.

### 4.3 Server-to-server confirmation (webhook)
7. Razorpay also delivers the same payment-captured event directly to the backend via webhook, independent of the user's browser session. This channel is architecturally the system's source of truth: unlike the frontend flow, it cannot be interrupted by the user closing a tab, and it cannot be forged from the client, since it arrives over a channel the browser never touches. The webhook handler verifies the request's signature, logs it in `WebhookEvent`, and — for new events — calls the *same* `handlePaymentSuccess` function used by `/verify`. Because that function is idempotent (Section 6), it is safe for both paths to reach it for the same payment.

**Implementation status:** the webhook handler, signature verification, and idempotency logic are fully implemented (`backend/src/controllers/webhook.controller.js`). End-to-end delivery testing against a live Razorpay webhook was not completed in the available time, due to a local tunneling tool (ngrok) being blocked by Windows Defender; see README for detail. The `/verify` path exercises the identical `handlePaymentSuccess` logic and was tested successfully.

### 4.4 Cancellation
Cancelling sets `cancelAtPeriodEnd = true` without changing `status` or revoking access — the user retains access through `currentPeriodEnd`, consistent with having already paid for that period. A scheduled job to flip `status` from `ACTIVE` to `EXPIRED` once `currentPeriodEnd` passes is the natural extension point here; it is not implemented in the current scope, since no billing period in the demo environment runs long enough to require it.

### 4.5 Upgrade / downgrade
The current implementation swaps `planId` on the existing `Subscription` row directly, without prorating a charge for the remainder of the current period. This was a deliberate scope decision under time constraints — see README for the explicit trade-off.

## 5. Security Model

- **Password storage:** bcrypt, cost factor 10. Only the hash is persisted; raw passwords never reach the database or logs.
- **Authentication:** JWT, signed with a server-held secret, containing only the user's ID. Verified by a single shared Express middleware (`authenticate`) rather than being re-implemented per route — centralizing this logic means there is exactly one place a mistake could compromise route protection, instead of many places.
- **Authorization is route-scoped, not global.** Middleware is applied only to routes that require an authenticated user (e.g., checkout, subscription management). Public routes (signup, login, the pricing list) are intentionally left unprotected, since requiring authentication in order to log in is self-defeating.
- **Identity is derived from the verified token, never from request body content.** `req.userId`, set by the auth middleware after verifying the JWT signature, is the only source of "who is making this request" used anywhere in the codebase. No endpoint accepts a `userId` field from the client and trusts it.
- **All monetary amounts are read server-side.** The checkout endpoint looks up `plan.price` from the database; it never accepts an amount from the request body. This closes the most common billing-system vulnerability class: a client modifying a price or amount value in-flight before it reaches the server.
- **Payment confirmation requires cryptographic proof, not client assertion.** Both the `/verify` endpoint and the webhook handler independently recompute and check an HMAC signature using a secret the client never has access to, rather than trusting a "success" flag reported by the frontend.
- **Resource-level authorization on downloads.** The invoice PDF endpoint checks `invoice.userId === req.userId` before generating or returning a file, preventing one authenticated user from retrieving another user's invoice by guessing or incrementing an ID.

## 6. Idempotency Design

Two distinct situations can cause the same real-world payment event to be processed more than once by this system:

1. **Webhook redelivery.** Payment gateways retry webhook delivery on timeout or non-2xx responses; the same event can arrive at the endpoint multiple times.
2. **Dual confirmation paths.** Both the frontend-triggered `/verify` call and the server-to-server webhook are designed to independently reach `handlePaymentSuccess` for the same payment — this is intentional (Section 4.3), not a bug to be avoided, so the finalization logic itself must tolerate being invoked more than once for the same payment.

Both are handled with database-level guarantees rather than application-level assumptions:

- **At the transport layer:** `WebhookEvent.eventId` carries a unique constraint. The handler attempts an insert keyed on Razorpay's event ID *before* doing any processing; a unique-constraint violation is interpreted as "already seen," and the handler returns `200 OK` immediately without re-running any business logic.
- **At the business-logic layer:** `handlePaymentSuccess` begins by checking `payment.status === 'SUCCESS'` and returns early if so, before performing any writes. This guards the case where the guard above doesn't apply — for example, the frontend `/verify` path, which has no `WebhookEvent` row associated with it at all.

The deliberate choice here was to enforce idempotency at the two points where a duplicate would actually cause visible damage (a double-created `Subscription`, a double-issued `Invoice`, a duplicate email), rather than trying to prevent the *triggering* of the function twice in the first place — which would require coordinating state across two independent, timing-sensitive external callers (browser and webhook) and would be considerably more fragile.

## 7. Known Limitations and Scope Decisions

These were explicit trade-offs made to ship a complete, working core flow within a one-day timeframe, rather than oversights:

| Area | Current state | Rationale |
|---|---|---|
| Webhook live testing | Implemented, not end-to-end verified | Local tunneling blocked by environment (Windows Defender); logic is identical to the tested `/verify` path |
| Upgrade/downgrade | Immediate plan swap, no proration | Proration math and partial-period billing were out of scope for the available time |
| Failed-payment retry / dunning | Not implemented | No recurring billing cycle exists in the demo environment to require it |
| Subscription expiry | Requires a scheduled job to flip `CANCELLED` to `EXPIRED` after `currentPeriodEnd` | Not implemented; noted as the natural extension point in Section 4.4 |

## 8. Possible Next Steps

- Complete webhook delivery verification (unblock ngrok, or deploy to a public URL and register the live endpoint with Razorpay).
- Add a scheduled job (cron or a queue-based worker) to transition expired subscriptions and to handle renewal billing on a recurring cycle.
- Implement proration for mid-cycle plan changes.
- Add refund handling, which would also exercise the `Invoice.status = VOID` path currently defined but unused.
