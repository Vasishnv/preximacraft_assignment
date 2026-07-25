# Subscription Billing Platform

A full-stack subscription billing platform built with Next.js, Express, PostgreSQL (Prisma ORM), and Razorpay (test mode) — built as a take-home assignment for Prexima.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express (ESM)
- **Database:** PostgreSQL (hosted on Neon), Prisma ORM 7
- **Payments:** Razorpay (test mode)
- **Auth:** JWT (jsonwebtoken + bcrypt)
- **Email:** Mailtrap (sandbox email testing)
- **PDF Generation:** pdfkit

## Features Implemented

- User signup/login with JWT-based auth
- Pricing page with plans pulled from the database
- Razorpay checkout flow (order creation → payment → signature verification)
- Subscription lifecycle: active, cancelled (access until period end), expired
- Upgrade/downgrade between plans
- Invoice generation on every successful payment, with downloadable PDF
- Email notification on successful subscription (via Mailtrap sandbox)
- Dashboard: current plan, payment history, invoice history with download

## Setup Instructions

### Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```
DATABASE_URL=your_neon_postgres_url
JWT_SECRET=your_random_secret
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx
MAILTRAP_TOKEN=xxxx
PORT=3001
```

```bash
npx prisma db push
npx prisma generate
node src/index.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Known Limitations / Scope Cuts

Given the one-day timeframe, the following were deliberately deprioritized:

- **Webhook end-to-end testing was not completed.** The webhook handler (signature verification, idempotency via a `WebhookEvent` table keyed on Razorpay's unique event ID, and payment-status reconciliation) is fully implemented in code — see `backend/src/controllers/webhook.controller.js`. However, local testing required tunneling via ngrok, and a Windows networking/firewall permission issue blocked the tunnel from completing in the time available, so it was not verified against live Razorpay webhook deliveries. The `/api/checkout/verify` endpoint (frontend-triggered, signature-verified) currently serves as the tested confirmation path, and shares the same idempotent `handlePaymentSuccess` logic that the webhook handler calls — so the webhook would only need the tunnel/registration step completed to go live, no code changes required.
- **No proration on upgrade/downgrade.** Switching plans swaps the plan on the existing subscription immediately rather than calculating a prorated charge for the remainder of the billing period.
- **No real payment retry/dunning logic** for failed renewal payments (out of scope for a single billing cycle test setup).
- **UI/UX is functional but not polished.** Layout, spacing, and visual hierarchy were kept minimal throughout in order to prioritize correctness of the underlying billing logic (checkout, webhooks, idempotency) within the one-day window. Given more time, the next pass would focus on a more considered visual design system, loading/empty/error states beyond a bare "Loading..." string, and responsive layout testing beyond desktop width.

### Bugs encountered and fixed during development

Documented here deliberately, as a record of the debugging process rather than something to hide:

- **"Most Popular" badge rendering issue.** Initially used `plan.name` as the React list `key` prop instead of `plan.id`, which is not guaranteed unique and is not the correct convention for list keys — this caused inconsistent re-renders. Compounded by the badge being clipped by the card's default `overflow` behavior. Fixed by keying on `plan.id` and adjusting the badge's positioning/z-index with `overflow-visible` on the card.
- **`localStorage is not defined` crash on initial render.** Next.js renders components server-side on first pass (even for `"use client"` components), and `localStorage` does not exist in that Node.js environment. Reading it directly inside a `useState` initializer (e.g. `useState(localStorage.getItem("token"))`) crashed on server render. Fixed by initializing state to `null` and moving all `localStorage` reads into `useEffect`, which only runs client-side after mount.
- **Auth middleware property-name mismatch (`req.userid` vs `req.userId`).** A casing inconsistency between where the middleware set the decoded user ID and where downstream route handlers read it caused silent `401`s with no thrown error — the request technically succeeded through JWT verification, but the property was never actually being read correctly downstream. Not caught by any crash or stack trace; found by adding temporary debug logging at each stage of the auth flow. Fixed by standardizing on `req.userId` everywhere.
- **Prisma 7 datasource configuration.** Prisma 7 removed the ability to set the database connection URL inside `schema.prisma`; it now must live in `prisma.config.js`. This is a recent breaking change not yet reflected in most tutorials/Stack Overflow answers at the time of writing, and cost some early setup time before the correct config shape (`datasource: { url }`, not `datasources: { db: { url } }`) was identified.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for data model, design decisions, and the payment/webhook flow.
