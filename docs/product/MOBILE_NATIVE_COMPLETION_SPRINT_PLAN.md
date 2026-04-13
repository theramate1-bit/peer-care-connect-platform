# Mobile Native Completion Sprint Plan

Goal: execute `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` to remove required web shortcuts and make mobile fully usable end-to-end.

## Completed — native-first in-app WebView (2026-04)

The following landed in `theramate-ios-client` and is documented in `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P2 “Payments and checkout”):

- **Shared stack:** `app/hosted-web.tsx`, `components/web/ControlledHostedWebView.tsx`, `lib/hostedWebViewAllowlist.ts`, `lib/openHostedWeb.ts`, `lib/pendingHostedWebSession.ts`
- **Client:** clinic booking checkout fallback, mobile request + pending reopen, Stripe Customer Portal, message attachment signed URLs, notification absolute URLs (`lib/notificationUrlOpen.ts` + `resolveNotificationNavigation` / `tryMapWebUrlToRoute`)
- **Practitioner:** analytics report export URLs, treatment plan and clinical note attachment opens
- **UX:** `app/(practitioner)/billing/index.tsx` — redundant “Billing overview” CTA replaced with “Practice profile”

Remaining checklist items (P0 schedule/exchange wrappers, P1 analytics index deep links, P2 account/help content, P3 CI) still apply.

## Planning assumptions

- Team: 1-2 mobile engineers + backend support as needed.
- Sprint length: 1 week.
- Estimates are implementation + test + polish (not release review).
- Labels:
  - `S` = 0.5-1 day
  - `M` = 1-2 days
  - `L` = 3-5 days
  - `XL` = 1+ week (usually backend/UI complexity)

---

## Sprint 1 - Remove biggest native blockers

### 1) Billing + Stripe Connect parity

- **Scope**
  - Replace required web actions in `app/(practitioner)/billing/index.tsx`
  - Expand native management in `app/(practitioner)/stripe-connect/index.tsx` + `embedded.tsx`
  - Keep web-only links as temporary fallback but no primary CTA
- **Estimate**: `L`
- **Dependencies**: Stripe/Supabase endpoints for payout docs, requirement states
- **Acceptance**
  - Practitioner can complete setup and see payout/account statuses natively
  - Primary billing actions stay in native app

### 2) Schedule/scheduler/calendar parity

- **Scope**
  - Replace web shortcut dependence in:
    - `app/(practitioner)/services/index.tsx`
    - `app/(practitioner)/(ptabs)/schedule/index.tsx`
    - `app/(practitioner)/availability/index.tsx`
- **Estimate**: `XL`
- **Dependencies**: rules model parity with web scheduler
- **Acceptance**
  - All day/week/month planning and slot rule configuration are native

### 3) Exchange detail parity

- **Scope**
  - Finish remaining web-only detail affordances in `app/(practitioner)/exchange/index.tsx`
- **Estimate**: `M`
- **Dependencies**: existing exchange RPC coverage
- **Acceptance**
  - No required `View on web` step to accept/decline/book reciprocal sessions

---

## Sprint 2 - Practitioner productivity parity

### 4) Analytics + reports parity

- **Scope**
  - `app/(practitioner)/analytics/index.tsx`
  - `app/(practitioner)/analytics/reports.tsx`
  - Native advanced report generation/download UX
- **Estimate**: `L`
- **Dependencies**: report backend contracts
- **Acceptance**
  - Advanced reporting paths complete natively

### 5) Clients/projects/care plans fallback removal

- **Scope**
  - Remove required web dependencies from:
    - `app/(practitioner)/clients/index.tsx`
    - `app/(practitioner)/clients/[clientId].tsx`
    - `app/(practitioner)/projects/index.tsx`
    - `app/(practitioner)/projects/[id].tsx`
    - `app/(practitioner)/treatment-plans/*`
    - `app/(practitioner)/clinical-notes/[sessionId].tsx`
    - `app/(practitioner)/clinical-files/index.tsx`
- **Estimate**: `XL`
- **Dependencies**: some backend parity checks
- **Acceptance**
  - Practitioner can complete these workflows with no mandatory web handoff

---

## Sprint 3 - Client/account parity + cleanup

### 6) Client account/privacy/help native alternatives

- **Scope**
  - Replace required web dependency in:
    - `app/settings/subscription.tsx`
    - `app/(tabs)/profile/payment-methods.tsx`
    - `app/settings/privacy.tsx`
    - `components/profile/PrivacySecurityContent.tsx`
    - `app/(tabs)/profile/help-centre.tsx`
- **Estimate**: `L`
- **Dependencies**: account APIs and content strategy
- **Acceptance**
  - Core account/privacy/help flows complete in native app

### 7) Decommission web wrappers + enforcement

- **Scope**
  - Remove wrappers when no longer required:
    - `app/account-web.tsx`
    - `app/(practitioner)/billing/web.tsx`
    - `app/(practitioner)/stripe-connect/web.tsx`
  - Add CI/lint guard against new required web shortcut introductions
- **Estimate**: `M`
- **Acceptance**
  - New required flows cannot regress back to web shortcuts

---

## Backlog item template (ready for tickets)

Use this for each checklist item:

- **Title**: `<area> native parity`
- **Files**: `<explicit file list>`
- **Problem**: `<why current web shortcut blocks full usability>`
- **Native UX**: `<screens, states, actions>`
- **API contract**: `<RPCs/functions/tables needed>`
- **Acceptance criteria**:
  - user can complete primary action natively
  - no required web redirect
  - loading/empty/error states present
  - analytics + tracking events updated
- **QA**:
  - happy path
  - no-data path
  - auth/session-expired path
  - network failure path

---

## Exit criteria for “completely usable”

- 0 required web shortcuts in practitioner and client critical paths
- 0 primary CTA buttons that route to `account-web` for core flows
- all critical journeys tested on iOS simulator + device
- checklist in `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` fully checked
