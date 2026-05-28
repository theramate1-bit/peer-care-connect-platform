# Feature-by-feature gaps index

Purpose: one place to see what is still missing across core features, based on the current docs/indexes.

Sources reviewed:

- `docs/README.md`
- `docs/contributing/junior-dev-feature-index.md`
- `docs/product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md`
- `docs/product/PRACTITIONER_MOBILE_REMAINING.md`
- `docs/features/mobile-hybrid-practitioner-booking-gaps.md`

Last reviewed: 2026-05-26

---

## A) Missing docs in the main docs index

Status: `Resolved` (2026-04-21)

Added docs:

- `docs/features/payment-system.md`
- `docs/features/credit-system.md`
- `docs/features/treatment-notes.md`

Index sync completed in:

- `docs/README.md`
- `docs/contributing/junior-dev-feature-index.md`

---

## B) Feature-by-feature implementation gaps (mobile-first parity)

Scope note: this section tracks product/engineering parity backlog, not documentation debt.

Legend:

- `Open` = not done
- `Partial` = partly done, still has web dependency or incomplete scope
- `Needs sync` = conflicting docs; status should be reconciled

### 1) Billing + Stripe Connect (Practitioner)

- Status: `Resolved (priority scope)` — core native operational parity shipped
- Notes:
  - Native billing and Stripe Connect operational flow is in-app
  - Legacy `/practice/billing` and web wrapper dependence removed
  - Invoice/tax document centre explicitly deferred by product scope
- Source: `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P0)

### 2) Schedule / Scheduler / Calendar parity

- Status: `Resolved (priority scope)` — native schedule parity active
- Notes:
  - Scheduler and calendar web shortcuts removed from practitioner flow
  - Inbuilt calendar-only policy active; Google sync intentionally disabled
  - If external calendar sync is reintroduced, treat as a separate feature scope
- Source: `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P0)

### 3) Analytics & reports

- Status: `Partial`
- Missing:
  - Replace remaining web analytics deep links
  - Full native advanced report generation/download without external-browser dependency
- Source: `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P1), `PRACTITIONER_MOBILE_REMAINING.md`

### 4) Clients, projects, care plans, clinical

- Status: `Needs sync`
- Missing / conflict:
  - Checklist marks clients/projects and care-plan/clinical web fallbacks as open.
  - Practitioner-remaining doc marks projects and several clinical file capabilities as done.
- Action needed:
  - Reconcile `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` vs `PRACTITIONER_MOBILE_REMAINING.md` item-by-item.
- Sources:
  - `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P1)
  - `PRACTITIONER_MOBILE_REMAINING.md` (sections 1 and 5)

### 5) Account + subscription (client/practitioner profile areas)

- Status: `Partial` (2026-05-26)
- Done:
  - Help centre FAQ — `HelpCentreContent.tsx`, `help-centre.tsx`
  - Platform subscribe — `platformSubscriptionCheckout.ts`, `pricing.tsx`, `subscription-success.tsx`
  - Payment methods list + portal WebView — `payment-methods.tsx`
  - Marketing shells — `how-it-works`, `contact`, `pricing`
  - Privacy/legal in-app — `PrivacySecurityContent.tsx`, cookie policy route
- Still open:
  - Plan change UX without extra web hops (portal WebView remains)
  - Privacy export/delete account flows
  - Analytics report export without WebView (W2-4)
- Source: `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P2), [WEB_APP_FEATURE_PARITY.md](./WEB_APP_FEATURE_PARITY.md)

### 6) Booking mode clarity (mobile/hybrid), address/location, and messaging of location

- Status: `Resolved` (P0 + P1-1 email-on-accept)
- Done (2026-05-25):
  - App `booking-flow-type` parity with web
  - Guest + client mobile session handoff (migrations applied on Supabase `aikqnvltuwwgifuocvto`)
  - `expires_at` on app mobile request UIs; client RPC returns `guest_view_token`
  - Guest backfill for legacy mobile sessions missing tokens
- Done (2026-05-25): Resend on accept via `send-booking-notification` (`emailType: mobile_accept`) — client `mobile_request_accepted_client` + practitioner `booking_confirmation_practitioner` with visit address
- Done (2026-05-26): Web `FindBooking` + `GuestBookingView` in `src/`; Resend on **decline** via `queue_mobile_request_client_email` + `emailType: mobile_decline`
- Source: [WEB_APP_FEATURE_PARITY.md](./WEB_APP_FEATURE_PARITY.md), `docs/features/mobile-hybrid-practitioner-booking-gaps.md`

### 7) Cleanup and guardrails

- Status: `Open`
- Missing:
  - Remove legacy wrapper routes after parity:
    - `app/account-web.tsx`
    - `app/(practitioner)/billing/web.tsx`
    - `app/(practitioner)/stripe-connect/web.tsx`
  - Remove/downgrade required actions that route to `/account-web`
  - Add CI/lint guard to block new required `/account-web` dependencies
  - Full QA pass: primary actions complete without external web handoff
- Source: `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P3)

---

## C) Suggested immediate next steps (CTO/PM — 2026-05-25)

1. **QA sign-off:** Guest mobile accept → View session (app + web); signed-in client with `guest_view_token`; hybrid booking rules on device.
2. **Deploy** `send-booking-notification` edge function after pulling `mobile_accept` changes.
3. **P2 account:** QA platform subscribe + portal; analytics export in-app (see section 5).
4. Reconcile `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` vs `PRACTITIONER_MOBILE_REMAINING.md`.
5. Run `npm run test:readiness` before store build (see [APP_RELEASE_READINESS.md](./APP_RELEASE_READINESS.md)).
6. Track waves and sign-offs in [APP_RELEASE_BACKLOG_CTO_PM.md](./APP_RELEASE_BACKLOG_CTO_PM.md).
