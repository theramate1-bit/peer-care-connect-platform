# Open Edge Cases – Master List

**Date:** March 2025  
**Status:** 📋 Tracking  
**Source:** Docs, codebase audit, prior conversations

---

## Overview

Edge cases that are not yet fixed or fully addressed. Grouped by priority. See suggested next focus at the end.

---

## 🔴 High / Critical

### Payment & Checkout

- **Stripe succeeds, DB update fails** – Charge succeeds but DB write fails; guest charged with no confirmed session → **Runbook:** [STRIPE_RECONCILIATION.md](./STRIPE_RECONCILIATION.md)
- **Subscription lapses mid-session** – ✅ Fixed: SubscriptionContext subscribes to realtime on `subscriptions` table; status changes (webhook) trigger immediate refetch. See [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md) #1.
- **Different email at checkout vs booking** – ✅ Mitigated: GuestBookingFlow shows "Use this same email when paying to receive your confirmation."
- **Duplicate payment on double-click** – ✅ Fixed: `payment-integration.ts` and `treatment-exchange.ts` idempotency keys no longer use `Date.now()`

### Guest

- **Guest mobile requests without email in URL** – Lands on `/guest/mobile-requests` with no `?email=`; no way to enter email (case #4 in GUEST_EDGE_CASES) → **✅ FIXED:** MobileRequestStatus has "Enter your email to view requests" form
- **Never receives confirmation email** – ~~No "Find my booking" fallback~~ → **✅ FIXED:** `/booking/find` page (email + date lookup)

### Mobile

- **Blocked time not enforced for mobile accepts** – ✅ Verified via Supabase MCP: `accept_mobile_booking_request` checks `calendar_events` (block, unavailable) before creating session

---

## 🟠 Medium

### Reschedule & Cancellation

- **24-hour reschedule rule** – Strict 24-hour notice; ✅ When blocked, "Message Practitioner" button opens conversation for urgent requests
- **Both cancel at the same time** – ✅ Fixed: conditional update (`WHERE status IN ('scheduled','confirmed')`) prevents double refund; second caller gets "Already cancelled"

### UX & Data

- **Slot refresh after expiry** – ✅ UnifiedBookingModal: `handleBack` now refreshes slots when returning to step 1
- **Stripe redirect** – ✅ BookingSuccess: When session can't be loaded (expired, delayed webhook), shows "Find my booking" and "Contact support" instead of generic error
- **Stale practitioner data on cards** – ✅ Marketplace: refetches practitioner when booking modal opens

### Guest

- **Same email, different names** – ✅ Fixed: `convert_guest_to_client_or_create_profile` prefers registration name when converting
- **Review after registering** – ✅ GuestReview: redirects logged-in users to `/reviews/submit/:sessionId`

---

## 🟡 Lower Priority

### Guest

- **Guest shares booking link** – ✅ Mitigated: warning banner on GuestBookingView
- **GDPR / data deletion for guests** – ✅ Documented: [GUEST_DATA_DELETION.md](./GUEST_DATA_DELETION.md)

### Mobile

- **Address change after acceptance** – No flow for changing address after mobile request is accepted
- **Resend notification near expiry** – ✅ Verified: MobileRequestManagement disables Resend when <1h until expiry

### General

- **Offline / low connectivity** – ✅ Mitigated: clearer network-error messaging; dialog stays open for retry
- **Multiple devices** – Starting booking on one device and continuing on another; no cross-device flow

---

## 📝 TODOs / Technical Debt (from codebase)

- ClientManagement: add client, filter functionality
- BusinessAnalytics, Billing: export functionality
- OfferServices: update status, schedule functionality
- Calendar Settings: working hours validation (start < end); google-calendar-sync function verify; OAuth popup feedback
- Messaging: send retry; guest session context (see [PRACTITIONER_FLOWS_EDGE_CASES.md](./PRACTITIONER_FLOWS_EDGE_CASES.md))
- PractitionerPricingDashboard: view plans
- RealtimeContext: credits subscriptions disabled

---

## 🎯 Suggested Next Focus

### Completed
1. **Find my booking** – ✅ Done: `/booking/find` page + `get_guest_sessions_by_email_and_date` RPC
2. **Stripe success, DB fail** – ✅ Runbook added: [STRIPE_RECONCILIATION.md](./STRIPE_RECONCILIATION.md)
3. **PracticeClientManagement slots** – ✅ Done: CalendarTimeSelector for real availability
4. **Guest mobile requests without email** – ✅ Already fixed (MobileRequestStatus form)
5. **Treatment notes RLS blocks finalize** – ✅ Done: Migration allows draft→completed; see [SESSION_NOTE_TAKING_EDGE_CASES.md](./SESSION_NOTE_TAKING_EDGE_CASES.md)
6. **Practitioner profile edge cases** – ✅ Done: beforeunload; unstable_usePrompt (in-app nav); #billing hash; ClientProfile photo parity; address validation; partial-save error labels; marketplace visibility refetch; qualification upload atomicity (storage cleanup on insert failure); CTA dismissed → "Show checklist" restore; marketplace hint when products/availability missing; see [PRACTITIONER_PROFILE_EDGE_CASES.md](./PRACTITIONER_PROFILE_EDGE_CASES.md)

### Next to Tackle
1. ~~**Guest shares booking link**~~ – ✅ Mitigated: warning banner on GuestBookingView
2. ~~**GDPR / data deletion for guests**~~ – ✅ Documented: [GUEST_DATA_DELETION.md](./GUEST_DATA_DELETION.md)
3. ~~**Offline / low connectivity**~~ – ✅ MobileRequestManagement: clearer network-error messaging, dialog stays open for retry
4. ~~**Same email, different names**~~ – ✅ Fixed: convert_guest_to_client prefers registration name
5. ~~**Slot refresh after expiry**~~ – ✅ Fixed: GuestBookingFlow/BookingFlow remount CalendarTimeSelector on expiry
6. ~~**Location filter strings**~~ – ✅ Fixed: trim, filter empty, sort in Marketplace, ClientBooking, Credits
7. ~~**Review edge cases**~~ – ✅ Fixed: email-typo messaging; reviews table alignment; client_id filter; duplicate handling; completed-sessions-only for rating. See [REVIEW_EDGE_CASES.md](./REVIEW_EDGE_CASES.md).

---

## Related Docs

- [PRACTITIONER_FLOWS_EDGE_CASES.md](./PRACTITIONER_FLOWS_EDGE_CASES.md) – Calendar, Services, Messaging, CPD
- [REVIEW_EDGE_CASES.md](./REVIEW_EDGE_CASES.md)
- [SUPABASE_SCHEMA_EDGE_CASES.md](./SUPABASE_SCHEMA_EDGE_CASES.md)
- [BOOKING_MODAL_EDGE_CASES.md](./BOOKING_MODAL_EDGE_CASES.md)
- [GUEST_EDGE_CASES.md](./GUEST_EDGE_CASES.md)
- [MOBILE_PRACTITIONER_EDGE_CASES.md](./MOBILE_PRACTITIONER_EDGE_CASES.md)
- [MARKETPLACE_BOOKING_EDGE_CASES.md](./MARKETPLACE_BOOKING_EDGE_CASES.md)
- [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md)
- [SESSION_NOTE_TAKING_EDGE_CASES.md](./SESSION_NOTE_TAKING_EDGE_CASES.md)
- [PRACTITIONER_PROFILE_EDGE_CASES.md](./PRACTITIONER_PROFILE_EDGE_CASES.md)
- [STRIPE_RECONCILIATION.md](./STRIPE_RECONCILIATION.md)
