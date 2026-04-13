# Mobile Native Completion Checklist (No Web Shortcuts)

Purpose: remove all web shortcut dependencies so the mobile app is fully usable natively.

Scope: `theramate-ios-client` (client + practitioner surfaces).

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

- [ ] Replace web billing/tools flow in `app/(practitioner)/billing/index.tsx` with native screens for:
  - invoices/documents history
  - payout timeline/details
  - connect status + required actions
- [ ] Remove dependence on `app/(practitioner)/billing/web.tsx`.
- [ ] Remove dependence on `app/(practitioner)/stripe-connect/web.tsx` by completing native Connect management in `app/(practitioner)/stripe-connect/index.tsx` + `embedded.tsx`.

### Practitioner exchange finalization parity

- [ ] Replace remaining web "View on web" exchange actions in `app/(practitioner)/exchange/index.tsx` with full native request detail + actions.
- [ ] Ensure all exchange statuses and edge states are visible/actionable natively (no web fallback required).

### Practitioner schedule tooling parity

- [ ] Native equivalents for schedule/scheduler/calendar web shortcuts currently referenced in:
  - `app/(practitioner)/services/index.tsx`
  - `app/(practitioner)/(ptabs)/schedule/index.tsx`
  - `app/(practitioner)/availability/index.tsx`
- [ ] Remove operational dependence on `/practice/schedule`, `/practice/scheduler`, `/practice/calendar` web pages.

---

## P1 - Core productivity gaps

### Practitioner analytics and reports

- [ ] Replace web analytics deep links in:
  - `app/(practitioner)/analytics/index.tsx`
  - `app/(practitioner)/analytics/reports.tsx` (report export signed URLs open in-app via `app/hosted-web.tsx` + `lib/openHostedWeb.ts`; deep links to web analytics may remain)
- [ ] Native report generation/download flow for advanced reports (no dependence on external browser for generated export URLs).

### Practitioner clients and projects

- [ ] Replace web clients links in:
  - `app/(practitioner)/clients/index.tsx`
  - `app/(practitioner)/clients/[clientId].tsx`
- [ ] Replace web projects links in:
  - `app/(practitioner)/projects/index.tsx`
  - `app/(practitioner)/projects/[id].tsx`
- [ ] Confirm all CRUD/edit states are native-complete (no web handoff needed).

### Practitioner care plan and clinical fallbacks

- [ ] Remove web fallback links from:
  - `app/(practitioner)/treatment-plans/index.tsx`
  - `app/(practitioner)/treatment-plans/new.tsx`
  - `app/(practitioner)/treatment-plans/[planId].tsx` (plan attachment signed URLs open in-app hosted WebView, not Safari)
  - `app/(practitioner)/clinical-notes/[sessionId].tsx` (clinical attachment signed URLs: same)
  - `app/(practitioner)/clinical-files/index.tsx`

---

## P2 - Client/account web dependencies

### Payments and checkout (no Safari handoff for money flows)

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

- [ ] Remove unused web wrapper routes after parity (paths may not exist in this monorepo—track in the repo that owns them):
  - `app/account-web.tsx`
  - `app/(practitioner)/billing/web.tsx`
  - `app/(practitioner)/stripe-connect/web.tsx`
- [ ] Remove or downgrade all required action buttons that currently route to web (`pathname: "/account-web"`).
- [ ] Add lint/check rule: fail CI if new required flow adds `pathname: "/account-web"` without product exception.
- [ ] QA pass: every screen reachable from tabs can complete its primary action without opening web.

---

## Current web-shortcut hotspots (for tracking)

High-volume files still using `account-web`:

- `app/(practitioner)/exchange/index.tsx`
- `app/(practitioner)/analytics/index.tsx`
- `app/(practitioner)/services/index.tsx`
- `app/(practitioner)/(ptabs)/schedule/index.tsx`
- `app/(practitioner)/credits/index.tsx`
- `app/(practitioner)/mobile-requests/index.tsx`
- `app/(practitioner)/marketplace/index.tsx`

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
