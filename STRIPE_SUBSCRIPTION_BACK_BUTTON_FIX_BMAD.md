# Stripe Subscription Back-Button Bypass Fix — BMAD Completion

## Summary

Entitlements are now **only** granted when Stripe confirms payment via webhook. The success URL no longer unlocks access; the client polls billing status until the DB shows active, then redirects. RLS and subscription checks use the DB as the single source of truth.

---

## Correct Model: Stripe = Source of Truth, Webhook Flips Access

- **Database:** `subscriptions` table holds billing state; app treats `status IN ('active','trialing')` as premium.
- **Checkout return:** Treated as “checkout complete (maybe)” — show spinner and re-check status; **never** “payment succeeded — unlock now.”
- **Webhook:** Only place that creates/updates subscription rows and sets status to active (signature-verified).

---

## Implementation Checklist (Completed)

### Backend / DB

- [x] **Only mark subscription active in webhook-driven updates**  
  Create-checkout does not write to `subscriptions`. Only `stripe-webhook` Edge Function (with signature verification) upserts subscription and sets status.
- [x] **RLS:** Subscriptions table — public **INSERT** removed; only service_role (webhook) can insert. SELECT/UPDATE remain for own row.
- [x] **RLS helper:** `has_active_subscription(p_user_id uuid)` added for use in premium table policies (optional defense-in-depth).
- [x] **Webhook:** `customer.subscription.deleted` now sets `status = 'cancelled'` (matches DB CHECK constraint).
- [x] **Premium checked server-side:** Route protection uses `SubscriptionContext` which reads from Supabase `subscriptions` (server-side DB), not client state.

### Frontend

- [x] **success_url does not unlock anything**  
  `create-checkout` success_url is `/subscription-success?session_id={CHECKOUT_SESSION_ID}` (no dashboard, no `payment_success=true`).
- [x] **success page polls status**  
  `SubscriptionSuccess` page polls `get-subscription` every 2s until `hasActiveSubscription === true`, then redirects to dashboard. No entitlement logic on this page.
- [x] **Cache-Control for billing:** `get-subscription` response includes `Cache-Control: no-store, no-cache, must-revalidate`.

### Subscription Context

- [x] **Only active/trialing grant access**  
  `SubscriptionContext` sets `subscribed = true` only for `status === 'active' || status === 'trialing'`. No longer treats `incomplete` or `past_due` as subscribed for access.

---

## Architecture (Minimal & Secure)

| Component | Role |
|-----------|------|
| **API:** `create-checkout` | Creates Stripe Checkout Session; does **not** update DB or entitlements. success_url → `/subscription-success?session_id=...`. |
| **API:** `stripe-webhook` | Verifies signature; on `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`/`payment_failed` updates `subscriptions` table. Only place that grants active/trialing. |
| **API:** `get-subscription` | Returns subscription + `hasActiveSubscription` (and `status`); used by success page poller and SubscriptionContext. Sends `Cache-Control: no-store`. |
| **Table:** `subscriptions` | Holds `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`, etc. RLS: no public INSERT. |
| **Client:** `/subscription-success` | Shows “Setting up your subscription…” and polls `get-subscription` until active, then redirects. Does not unlock anything. |
| **RLS:** `has_active_subscription(uuid)` | Helper for premium table policies: allow read/write only if user has active/trialing subscription (optional). |

---

## Pitfalls Avoided

- Storing “isPro” in user metadata and trusting it client-side.
- Setting user plan or subscription row immediately after creating Checkout Session.
- Skipping Stripe webhook signature verification.
- Only checking subscription at login (stale session bypass).
- Putting long-lived entitlement in JWT (role=pro forever).
- Letting success_url land on dashboard and treat `payment_success=true` as “unlock now.”

---

## Files Touched

- `supabase/functions/stripe-webhook/index.ts` — `customer.subscription.deleted` → `status: 'cancelled'`.
- `supabase/functions/create-checkout/index.ts` — success_url → `/subscription-success?session_id={CHECKOUT_SESSION_ID}`.
- `supabase/functions/get-subscription/index.ts` — `hasActiveSubscription` includes trialing; `Cache-Control: no-store`.
- `src/pages/SubscriptionSuccess.tsx` — New: poll-only success page, redirect when active.
- `src/components/AppContent.tsx` — Route for `/subscription-success`.
- `src/contexts/SubscriptionContext.tsx` — Only active/trialing set `subscribed = true`.
- `supabase/migrations/20260227200000_stripe_subscription_back_button_fix_rls.sql` — Drop public INSERT on `subscriptions`; add `has_active_subscription(uuid)`.

---

## Official documentation alignment

- **Stripe Billing quickstart:** “After a successful payment and redirect to the success page, **verify that the subscription status is active** and grant your customer access.” We do exactly that: success page does not grant access; we poll until the DB shows active, then redirect.
- **Stripe:** “Don’t rely on the redirect to the success_url alone for detecting payment… Malicious users could directly access the success_url without paying.” We never grant access from the success URL; we only poll the backend (DB) after the webhook has run.
- **Stripe:** “Listen to customer.subscription.created, customer.subscription.updated, and customer.subscription.deleted… Implementing your handler correctly keeps your application status in sync with Stripe.” Our webhook handles all of these; upgrade/downgrade/cancel are driven by these events.

## Upgrade / downgrade (no interference)

- **Initial subscribe:** User completes **Checkout** → redirect to `success_url` (= `/subscription-success`) → we poll `get-subscription` until active → redirect to dashboard. Only this flow uses the subscription-success page.
- **Upgrade / downgrade / cancel:** User uses **Customer Portal** (Manage subscription) → Stripe Billing Portal → Stripe sends `customer.subscription.updated` or `customer.subscription.deleted` → our webhook updates `subscriptions` → user returns to **return_url** = `/settings/subscription` (set in `customer-portal` Edge Function). The subscription-success page is not used for portal returns, so upgrade/downgrade logic is unchanged and continues to rely on the webhook + DB.

---

## Optional Next Steps (Defense in Depth)

- Add RLS on premium tables (e.g. practitioner-only data) using `has_active_subscription(auth.uid())` so DB refuses rows if subscription is inactive.
- Ensure any premium API routes (Edge Functions or backend) re-check `subscriptions.status` server-side before returning premium data.
