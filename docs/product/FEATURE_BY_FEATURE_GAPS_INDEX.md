# Feature-by-feature gaps index

Purpose: one place to see what is still missing across core features, based on the current docs/indexes.

Sources reviewed:

- `docs/README.md`
- `docs/contributing/junior-dev-feature-index.md`
- `docs/product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md`
- `docs/product/PRACTITIONER_MOBILE_REMAINING.md`
- `docs/features/mobile-hybrid-practitioner-booking-gaps.md`

Last reviewed: 2026-04-21

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

- Status: `Open/Partial`
- Missing:
  - Native subscription + billing management replacing web dependency in:
    - `app/settings/subscription.tsx`
    - `app/(tabs)/profile/payment-methods.tsx`
    - profile subscription rows
  - Native privacy tooling replacing account-web dependence
  - Native help-centre knowledge base/FAQ parity
  - Optional native content pages (`how-it-works`, `contact`, `pricing`)
- Source: `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P2)

### 6) Booking mode clarity (mobile/hybrid), address/location, and messaging of location

- Status: `Partial`
- Missing:
  - Ensure all booking entry points consistently branch by practitioner type
  - Ensure location/address handling is explicit and consistent for clinic vs mobile sessions
  - Keep practitioner/client confirmations and in-app notifications aligned with selected session location
- Source: `docs/features/mobile-hybrid-practitioner-booking-gaps.md` (gap analysis + recommendations)

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

## C) Suggested immediate next steps

1. Keep docs/index links in sync as features evolve (resolved in this pass).
2. Reconcile status conflicts between checklist and practitioner-remaining docs.
3. Prioritize P0 blockers first:
   - Billing/Connect parity
   - Schedule/scheduler/calendar parity
4. Keep this index updated weekly as the single feature-gap snapshot.
