# Mobile Native Completion Checklist (No Web Shortcuts)

Purpose: remove all web shortcut dependencies so the mobile app is fully usable natively.

Scope: `theramate-ios-client` (client + practitioner surfaces).

**Doc note (2026-04):** P2 **Payments and checkout** (allowlisted in-app WebView for Stripe Checkout, Customer Portal, signed URLs, notifications) is **shipped** — see bullets under “P2 - Client/account” below and `MOBILE_NATIVE_COMPLETION_SPRINT_PLAN.md` (“Completed — native-first in-app WebView”). **P0 / P1 and P2 account-privacy-help items remain open** until checkboxes below are cleared.
**Verification note (2026-04-21):** Checklist items were re-audited against current `theramate-ios-client` practitioner files. Clients/projects and care-plan/clinical fallback rows were updated to match current native behavior and hosted WebView usage for signed documents.

---

## Definition of Done

- No user-critical flow depends on `account-web`, `billing/web`, `stripe-connect/web`, or **uncontrolled** `APP_CONFIG.WEB_URL` hand-offs (Safari/Chrome) for money, subscriptions, or signed documents.
- **Money and signed URLs:** Stripe Checkout / Customer Portal, Supabase signed export and attachment URLs, and same-origin web-app URLs from notifications use the **allowlisted in-app WebView** stack (`app/hosted-web.tsx`, `lib/openHostedWeb.ts`, `lib/hostedWebViewAllowlist.ts`, `components/web/ControlledHostedWebView.tsx`). Intentional exceptions: `mailto:`, OAuth in `lib/supabase.ts`, help-centre external links, diagnostics.
- All primary actions (book, pay, exchange, schedule, analytics, profile/account management) complete in native UI **or** controlled in-app WebView where Stripe/hosted pages are required.
- Web links are optional support-only references, not required to complete core tasks.

**Related:** `lib/notificationNavigation.ts` maps `web_path` / absolute app URLs to native routes when possible (`tryMapWebUrlToRoute` from `lib/notificationUrlOpen.ts`); otherwise taps open in-app, not Safari.

---

## P0 - Blockers (must be native first)

### Practitioner payments and Stripe

- [x] Replace web billing/tools flow in `app/(practitioner)/billing/index.tsx` with native operational screens for:
  - payout timeline/details
  - connect status + required actions
  - in-app navigation to Stripe Connect embedded onboarding
- [x] Remove direct web handoff from `app/(practitioner)/billing/index.tsx` (`/practice/billing` shortcut removed; native billing screen is default).
- [x] `app/(practitioner)/billing/web.tsx` is not present in the current tree (2026-04-21 audit).
- [x] Complete native Connect management in `app/(practitioner)/stripe-connect/index.tsx` + `embedded.tsx` (legacy `stripe-connect/web` wrapper not present in current tree).
- [x] Product decision: invoice/tax document centre is out-of-scope for this phase.

### Practitioner exchange finalization parity

- [x] Replace remaining web "View on web" exchange actions in `app/(practitioner)/exchange/index.tsx` with full native request detail + actions. **Done:** `app/(practitioner)/exchange/[id].tsx` + list links; no web hand-off.
- [x] Ensure all exchange statuses and edge states are visible/actionable natively (no web fallback required). **Done:** detail shows pending / accepted / declined / cancelled / expired labels; actions where applicable; notifications deep-link to `exchange/<id>` when UUID present.

### Practitioner schedule tooling parity

- [x] Native equivalents for schedule/scheduler/calendar web shortcuts previously referenced in:
  - `app/(practitioner)/services/index.tsx`
  - `app/(practitioner)/(ptabs)/schedule/index.tsx`
  - `app/(practitioner)/availability/index.tsx`
- [x] Remove operational dependence on `/practice/schedule`, `/practice/scheduler`, `/practice/calendar` web pages.
  - `app/(practitioner)/calendar-sync.tsx` now provides in-app calendar tools only. Google Calendar sync is intentionally disabled in mobile flow.

---

## P1 - Core productivity gaps

### Practitioner analytics and reports

- [x] Replace web analytics deep links in:
  - `app/(practitioner)/analytics/index.tsx`
  - `app/(practitioner)/analytics/reports.tsx` (report exports open signed URLs via in-app hosted WebView)
- [ ] Native report generation/download flow for advanced reports (no dependence on external browser for generated export URLs).

### Practitioner clients and projects

- [x] Replace web clients links in:
  - `app/(practitioner)/clients/index.tsx`
  - `app/(practitioner)/clients/[clientId].tsx`
- [x] Replace web projects links in:
  - `app/(practitioner)/projects/index.tsx`
  - `app/(practitioner)/projects/[id].tsx`
- [x] Confirm all CRUD/edit states are native-complete (no web handoff needed) for current clients/projects flows. See `PRACTITIONER_MOBILE_REMAINING.md` section 5.

### Practitioner care plan and clinical fallbacks

- [x] Remove web fallback links from:
  - `app/(practitioner)/treatment-plans/index.tsx`
  - `app/(practitioner)/treatment-plans/new.tsx`
  - `app/(practitioner)/treatment-plans/[planId].tsx` (signed URLs intentionally open in allowlisted in-app hosted WebView)
  - `app/(practitioner)/clinical-notes/[sessionId].tsx` (signed URLs intentionally open in allowlisted in-app hosted WebView)
  - `app/(practitioner)/clinical-files/index.tsx`
  - Status reconciled with `PRACTITIONER_MOBILE_REMAINING.md` sections 1 and 5.

---

## P2 - Client/account web dependencies

### Payments and checkout (no Safari handoff for money flows) — **done (2026-04)**

These paths use **allowlisted in-app WebView** (`app/hosted-web.tsx`, `components/web/ControlledHostedWebView.tsx`, `lib/hostedWebViewAllowlist.ts`, `lib/openHostedWeb.ts`) instead of `Linking.openURL` for Stripe Checkout / portal / signed storage URLs:

- `app/booking/index.tsx` — PaymentSheet first; hosted Checkout in WebView when needed
- `app/booking/mobile-request.tsx` + `app/mobile-booking/pending.tsx` — mobile checkout reopen
- `app/stripe-customer-portal.tsx` — Customer Portal in WebView
- `app/(tabs)/messages/[id].tsx` — message attachment signed URLs
- Push + in-app notifications: `lib/notificationUrlOpen.ts`, `app/notifications.tsx`, `hooks/usePushNotifications.ts` (maps known web URLs to native routes where possible; otherwise in-app viewer)

### Account and subscription

- [ ] Native subscription + billing management to replace web dependence in:
  - `app/settings/subscription.tsx`
  - `app/(tabs)/profile/payment-methods.tsx`
  - `app/(tabs)/profile/index.tsx` (Subscription row)
  - `app/(practitioner)/(ptabs)/profile/index.tsx` (Subscription row)

### Privacy/help/marketing content

- [ ] Native privacy tools to replace `account-web` dependence in:
  - `app/settings/privacy.tsx`
  - `components/profile/PrivacySecurityContent.tsx`
- [ ] Native help center knowledge base/FAQ to replace web dependence in:
  - `app/(tabs)/profile/help-centre.tsx`
- [ ] Optional native content pages to remove web dependence in:
  - `app/how-it-works.tsx`
  - `app/contact.tsx`
  - `app/pricing.tsx`

---

## P3 - Cleanup and enforcement

- [x] Remove unused web wrapper routes after parity (2026-04-21 audit): `app/account-web.tsx`, `app/(practitioner)/billing/web.tsx`, and `app/(practitioner)/stripe-connect/web.tsx` are not present in this monorepo.
- [x] Remove or downgrade all required action buttons that currently route to web (`pathname: "/account-web"`). No direct matches found in current `theramate-ios-client` tree.
- [ ] Add lint/check rule: fail CI if new required flow adds `pathname: "/account-web"` without product exception.
- [ ] QA pass: every screen reachable from tabs can complete its primary action without opening web.

---

## Current web-shortcut hotspots (for tracking)

Current high-volume hosted-web shortcuts (2026-04-21 audit + implementation pass):

- None in practitioner schedule/services/calendar surfaces (`services`, `schedule`, `availability`, `calendar-sync`).

Calendar policy note:

- Google Calendar sync is disabled in the mobile practitioner flow for now.
- Practitioner schedule relies on inbuilt `calendar_events` + availability + blocked-time tooling.

Client/account hotspots:

- `app/settings/subscription.tsx`
- `app/settings/privacy.tsx`
- `app/(tabs)/profile/help-centre.tsx`
- `app/(tabs)/profile/payment-methods.tsx`
- `components/profile/PrivacySecurityContent.tsx`

---

## Suggested implementation order

See also **`MOBILE_NATIVE_COMPLETION_SPRINT_PLAN.md`** for sprint-sized chunks.

1. Billing + Stripe Connect native parity
2. Schedule/scheduler/calendar native parity
3. Exchange request detail parity
4. Analytics/reports parity
5. Clients/projects/care plans remaining web fallbacks
6. Client account/privacy/help native alternatives
7. Remove wrappers + enforce no-new-shortcuts policy
