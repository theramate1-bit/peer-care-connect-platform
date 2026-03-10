# Mobile Practitioner Daily Operations - Edge Cases

**Date:** March 2025  
**Status:** 🔍 Analysis for testing and hardening  
**Scope:** Mobile and hybrid therapists' day-to-day operations

---

## 🎯 Overview

This document identifies edge cases, failure modes, and gaps in the mobile practitioner workflow—from receiving booking requests through completing sessions and handling exceptions.

---

## 🔴 CRITICAL – Double Booking & Conflict Detection

### 1. **Conflict check when accepting mobile requests (verified via Supabase MCP)**

**Current state (verified):** `accept_mobile_booking_request` **does** perform conflict checks before creating a session:
- Conflict vs `client_sessions` (scheduled, confirmed, in_progress) with 30‑minute travel buffer
- Conflict vs `pending_payment` holds (temporarily held slots)
- Block check vs `calendar_events` (block, unavailable)
- Expiry check: rejects if `expires_at <= NOW()`

**Status:** Fixed (March 2025). Slot-generation now uses 30‑min buffer for mobile→mobile when therapist is mobile/hybrid, aligning with `accept_mobile_booking_request`. Travel time between distant addresses remains fixed (not distance-based).

---

### 2. **Multiple pending requests for the same slot**

**Current state:** Multiple clients can request the same date/time.

**Edge case:** Client A and Client B both request Tuesday 2:00 PM. Practitioner accepts A, then B. Both sessions are created for the same slot.

**Impact:** Double booking; no system-level prevention.

**Recommendation:** When accepting request #2, re-check conflicts including request #1’s newly created session; or show a warning if the practitioner already accepted another request for that slot.

---

### 3. **Travel time between mobile visits**

**Current state:** Slot generation uses fixed buffers (15 min default, 30 min mobile→clinic for hybrid). No distance-based travel time.

**Edge case:** Hybrid practitioner:
- 10:00–11:00 Mobile at Client A (25 km away)
- 11:00–12:00 Mobile at Client B (20 km from A)

15‑minute buffer is insufficient; actual drive may be 30–45 minutes.

**Impact:** Late arrival at Client B; poor experience.

**Recommendation:** Add distance-based buffers for back-to-back mobile appointments (e.g., 15 min base + travel time estimate) or let practitioners set a minimum gap between mobile visits.

---

## 🟠 HIGH PRIORITY – Request Lifecycle

### 4. **Request expiry vs. practitioner acceptance**

**Current state:** Requests expire 48 hours after creation. `expire-mobile-requests` Edge Function runs every 15 minutes.

**Edge case:** Practitioner accepts at 47h58m. Between their click and the RPC:
- Cron runs and expires the request
- Status changes to `expired`, hold is released
- Accept RPC then fails (“request expired” or similar)

**Impact:** Practitioner believes they accepted; client believes it’s booked; in reality both fail.

**Recommendation:** Use optimistic locking or “accept if still pending and not expired” semantics; show a clear “Request expired” state if the cron wins.

---

### 5. **Client cancels while practitioner accepts**

**Current state:** Client and practitioner can act on the same request concurrently.

**Edge case:** Client cancels and practitioner accepts at nearly the same time:
- Client release-payment + update status to `cancelled`
- Practitioner capture-payment + accept
- One of them sees a confusing or inconsistent result (e.g., “request cancelled” vs “request accepted”).

**Impact:** Possible race; payment and status may be inconsistent.

**Recommendation:** Add optimistic locking or conditional update (e.g., accept only if `status = 'pending'`) and handle conflicts with clear messaging.

---

### 6. **Payment authorization fails after request creation**

**Current state:** Practitioner sees “Waiting for client payment authorization” until `payment_status = 'held'`.

**Edge case:** Client completes Stripe form, but 3DS fails or card is declined. Request remains `pending` with `payment_status = 'pending'`. Practitioner never sees “held” and cannot accept/decline.

**Impact:** Request stuck; no clear flow for “payment failed”.

**Recommendation:** Listen for payment failures; set a status such as `payment_failed` and notify both client and practitioner; or surface a “Payment failed – ask client to retry” state.

---

### 7. **Expired request still shown as actionable**

**Current state:** `MobileRequestManagement` hides expired requests (`getEffectiveStatus === 'expired'`). `isExpiredPending` uses `expires_at <= Date.now()`.

**Edge case:** Practitioner has tab open for hours. A request expires; UI still shows “Accept” / “Decline” until a refresh.

**Impact:** Practitioner tries to accept an already-expired request; confusing failure.

**Status:** ✅ Fixed – on each 15s tick, `loadRequests()` refetches; server-side cron expiry is picked up without manual refresh.

---

## 🟠 HIGH PRIORITY – Same-Day & Timing

### 8. **Same-day mobile booking with no travel buffer**

**Current state:** Mobile flow does not enforce a minimum advance booking like the clinic 2‑hour rule.

**Edge case:** Client requests a mobile session for 30 minutes from now. Practitioner is 20 km away with no time to travel.

**Impact:** Practitioner either declines (client frustration) or tries to attend and is late.

**Recommendation:** Enforce a minimum advance (e.g., 2 hours) for mobile requests, or a configurable setting per practitioner.

---

### 9. **Request for a past date/time**

**Current state:** `create_mobile_booking_request` does not clearly validate that `requested_date` + `requested_start_time` is in the future.

**Edge case:** Client (or bug) submits a request for yesterday. Request is created; practitioner sees it; accepting creates a session in the past.

**Impact:** Invalid sessions; bad data; confusing practitioner dashboard.

**Recommendation:** Reject requests where `requested_date` + `requested_start_time` is in the past.

---

## 🟡 MEDIUM PRIORITY – Hybrid Practitioner & Calendar

### 10. **Mobile vs. clinic not unified in calendar**

**Current state:** Mobile requests appear in `MobileRequestManagement`; clinic sessions in `client_sessions`. Hybrid practitioners may see them separately.

**Edge case:** Hybrid practitioner blocks 2–4 PM in clinic calendar but does not realize a mobile request for 3 PM is pending. Accepting creates an overlap with the block.

**Impact:** Overbooking; blocked time not respected for mobile requests.

**Recommendation:** When accepting mobile requests, validate against `calendar_events` (blocks/unavailable) in addition to `client_sessions`.

---

### 11. **Visibility of mobile vs. clinic on dashboard**

**Current state:** Mobile requests and clinic sessions may live in different views.

**Edge case:** Practitioner plans their day from the main calendar and overlooks pending mobile requests, leading to last‑minute decisions or missed responses.

**Impact:** Poor planning; late responses; possible no‑shows.

**Recommendation:** Unified daily view: pending mobile requests and clinic sessions together, with clear labels (e.g., clinic vs. mobile).

---

## 🟡 MEDIUM PRIORITY – No-Show & Refunds

### 12. **No-show with payment already captured**

**Current state:** Practitioner can mark “Client Did Not Attend”. Payment was captured at acceptance. No automatic refund for no-shows.

**Edge case:** Practitioner travels to client; client is not home. Practitioner marks no-show. Client is charged; no refund unless manually processed.

**Impact:** Unfair for client; manual refund work; potential disputes.

**Recommendation:** Define no-show policy (e.g., full refund vs. partial) and automate refund when no-show is recorded; alternatively, allow practitioner to trigger a no-show refund flow.

---

### 13. **Practitioner no-show (does not attend)**

**Current state:** No explicit flow for “practitioner did not attend” (illness, traffic, etc.).

**Edge case:** Practitioner cannot make it (e.g., car breakdown). Client waits; no way to mark “practitioner no-show” or trigger reschedule/refund.

**Impact:** Client stranded; no formal handling.

**Recommendation:** Add practitioner-initiated cancellation with optional refund; and/or “Running late” with ETA and client notification.

---

## 🟡 MEDIUM PRIORITY – Guest & Identity

### 14. **Guest cancels with email typo**

**Current state:** Guests cancel via `cancel_guest_mobile_request_by_email` using their email.

**Edge case:** Guest enters `jane@gnail.com` instead of `jane@gmail.com`. They cannot cancel because email does not match. Request stays pending until expiry.

**Impact:** Practitioner sees a request they cannot act on; guest cannot cancel; payment held until expiry.

**Recommendation:** Consider request-ID + email confirmation link for guest cancellation; or show a “request not found” message when email does not match.

---

### 15. **Multiple pending requests from same guest**

**Current state:** Same guest can create multiple requests (e.g., different times).

**Edge case:** Guest submits Request A (Mon 2 PM) and Request B (Tue 2 PM). Practitioner accepts A. Guest intended B. Guest cancels A; B is still pending. Flow is confusing.

**Impact:** Confusion about which request is accepted; possible wrong session.

**Status:** ✅ Fixed – MobileRequestStatus CardDescription shows product name + date/time (e.g. "Deep Tissue · Tue 12 Mar at 14:00") so each request is clearly distinguishable.

---

## 🟢 LOWER PRIORITY – UX & Resilience

### 16. **Address change after acceptance**

**Current state:** Client address is fixed at request creation. No in-app flow to change it after acceptance.

**Edge case:** Client moves before session; practitioner goes to old address.

**Impact:** Wasted travel; client no-show through no fault of their own.

**Status:** ✅ Fixed – SessionDetailView shows "Edit visit address" for mobile sessions (confirmed/scheduled) when session is >24h away. Both client and practitioner can update via `update_session_visit_address` RPC. 24h cutoff enforced server-side.

---

### 17. **Resend notification while request is expiring**

**Current state:** Practitioner can “Resend request notification” for pending requests.

**Edge case:** Practitioner resends at 47h59m. Email reaches client; client sees “48 hours to respond” but request expires in 1 minute.

**Impact:** Client tries to respond and finds request expired.

**Status:** ✅ Fixed – Resend button is disabled when <1 hour until expiry; tooltip explains why.

---

### 18. **Offline / low connectivity**

**Current state:** Accept/Decline requires live API calls.

**Edge case:** Practitioner is in an area with poor signal; Accept times out; unclear whether it succeeded.

**Impact:** Possible double-accept or no-accept; confusion.

**Status:** ✅ Fixed – MobileRequestManagement catch blocks detect network/timeout errors and show "Connection issue. Check your network and try again." with note that dialog stays open for retry.

---

## 📋 Summary Table

| # | Edge Case | Severity | Has Fix? |
|---|-----------|----------|----------|
| 1 | No conflict check on accept | 🔴 Critical | ✅ Fixed (20260309100000) |
| 2 | Multiple requests same slot | 🔴 Critical | ✅ Fixed (conflict check blocks) |
| 3 | Travel time between mobile visits | 🔴 Critical | ✅ Fixed (30-min buffer, 20260309120000) |
| 4 | Expiry vs. acceptance race | 🟠 High | ✅ Fixed (expired check + advisory lock) |
| 5 | Client cancel vs. practitioner accept race | 🟠 High | ✅ Fixed (advisory lock) |
| 6 | Payment fails, request stuck | 🟠 High | ✅ Fixed (webhook + payment_failed UI) |
| 7 | Expired still actionable in stale UI | 🟠 High | ✅ Fixed (60s poll + expiry display) |
| 8 | Same-day, no travel buffer | 🟠 High | ✅ Fixed (2h minimum advance) |
| 9 | Past date/time allowed | 🟠 High | ✅ Fixed (validation on create) |
| 10 | Blocks not checked for mobile | 🟡 Medium | ✅ Fixed (calendar_events on accept) |
| 11 | Mobile/clinic not unified in view | 🟡 Medium | ✅ Fixed (mobile requests in dashboard Today) |
| 12 | No-show, no refund flow | 🟡 Medium | ✅ Fixed (SessionDetailView marks no-show, triggers refund) |
| 13 | Practitioner no-show | 🟡 Medium | ✅ Fixed (practitioner can cancel with refund) |
| 14 | Guest cancel with wrong email | 🟡 Medium | ✅ Fixed (cancel_guest_mobile_request_by_email) |
| 15 | Multiple guest requests confusion | 🟡 Medium | ✅ Fixed (date/time in CardDescription) |
| 16 | Address change after accept | 🟢 Low | ✅ Fixed |
| 17 | Resend near expiry | 🟢 Low | ✅ Fixed (disabled when <1h until expiry) |
| 18 | Offline accept | 🟢 Low | ✅ Fixed (clear network-error messaging; dialog stays open for retry) |

---

## 🛠️ Implementation Status (March 2025)

1. **Conflict check on accept** (1, 2, 10): ✅ Validates against `client_sessions` and `calendar_events`; 30-min buffer for mobile (travel time).
2. **Past date/time validation** (9): ✅ Rejects requests where `requested_date` + `requested_start_time` ≤ now.
3. **Minimum advance for mobile** (8): ✅ Enforces 2-hour minimum before first mobile slot.
4. **Expiry + acceptance handling** (4, 7): Conditional accept, clear “expired” UI, 60s polling.
5. **Payment failure handling** (6): ✅ Stripe webhook sets `payment_failed`; UI shows "Payment failed – ask client to retry".
6. **No-show refund policy** (12): ✅ Practitioner marks "Client Did Not Attend" → triggers Stripe refund, status `no_show`.
7. **Practitioner cancel** (13): ✅ Practitioner can cancel via SessionDetailView; RefundService handles refund.
8. **Guest cancel with wrong email** (14): ✅ `cancel_guest_mobile_request_by_email` returns clear error when email doesn't match.
9. **Travel time buffer** (3): ✅ 30-minute buffer between mobile sessions (20260309120000).
10. **create_session_from_mobile_request** (session creation): ✅ Now includes client_name, client_email from users.
11. **Mobile requests in dashboard** (MOBILE #11): ✅ TherapistDashboard fetches pending mobile requests for mobile/hybrid practitioners; shows in Today's Schedule with "Review request" → /practice/mobile-requests.
12. **Multiple guest requests UX** (MOBILE #15): ✅ MobileRequestStatus CardDescription shows product + date/time (e.g. "Deep Tissue · Tue 12 Mar at 14:00").
13. **Offline accept/decline** (MOBILE #18): ✅ Clear network-error messaging; dialog stays open for retry.
14. **Address change after acceptance** (MOBILE #16): ✅ SessionDetailView "Edit visit address" for mobile sessions; `update_session_visit_address` RPC; 24h cutoff.

---

## Related

- **Guest-specific edge cases** (sessions, messaging, payment): [GUEST_EDGE_CASES.md](./GUEST_EDGE_CASES.md)
- **Open edge cases master list:** [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)

---

**Last Updated:** March 2025
