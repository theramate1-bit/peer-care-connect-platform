# Guest Edge Cases – Brainstorm & Tracking

**Date:** March 2025  
**Status:** 📋 Tracking  
**Scope:** All guest flows – mobile requests, clinic bookings, sessions, messaging, reviews

---

## Overview

This document captures edge cases, failure modes, and UX gaps for guest users across the platform. Guests are users who book or interact without creating an account first (or before they create one).

---

## 🔴 Identity & Authentication

### 1. Same email, different names
**Current state:** Guest books as "Jane Smith"; later registers with "Jane Doe".  
**Impact:** Name inconsistency; unclear which is canonical for display/records.  
**Status:** ✅ Fixed.  
**Recommendation:** `convert_guest_to_client_or_create_profile` prefers registration name (`p_first_name`, `p_last_name`) when non-empty; guest name used only as fallback. Sessions and profile use the new account name after conversion.

### 2. Guest books but already has account
**Current state:** Logged-out user books as guest with same email as existing account.  
**Impact:** Two users rows (guest + full); sessions may orphan or duplicate.  
**Status:** ✅ GuestBookingFlow checks `check_email_registered` on email blur; shows "Sign in to book with your account" banner.  
**Recommendation:** Pre-booking: "This email has an account. Sign in to book?" or post-booking merge.

### 3. Email case sensitivity
**Current state:** Guest uses `Jane@Gmail.com` vs `jane@gmail.com` for registration.  
**Impact:** Linking may fail if comparisons are case-sensitive.  
**Status:** ✅ Most RPCs use `LOWER()`; verify everywhere.  
**Recommendation:** Audit all email comparisons; normalize to lowercase.

---

## 🟠 Mobile Request Flow

### 4. Guest cancels without email in URL
**Current state:** Guest lands on `/guest/mobile-requests` without `?email=...` (e.g. from bookmark).  
**Impact:** Previously saw "Use the request link from your email" with no self-service.  
**Status:** ✅ Fixed. MobileRequestStatus shows "Enter the email address you used when making the request" form; submit updates URL and loads requests.

### 5. Guest cancel with email typo
**Current state:** Guest enters `jane@gnail.com` instead of `jane@gmail.com`.  
**Impact:** Cannot cancel; request stays pending until expiry; payment held.  
**Status:** ✅ `cancel_guest_mobile_request_by_email` returns clear error.  
**Recommendation:** Consider magic-link cancel (one-click from email) to avoid typing.

### 6. Expired request, guest clicks stale link
**Current state:** Guest clicks "View Mobile Requests" from old email; request expired.  
**Impact:** May see empty or confusing state.  
**Status:** ⚠️ Depends on UI messaging.  
**Recommendation:** Clear "This request has expired" with refund/link info.

### 7. Guest opens multiple tabs
**Current state:** Same guest has `/guest/mobile-requests?email=...` in two tabs.  
**Impact:** Possible duplicate actions (e.g. cancel twice); race conditions.  
**Status:** ⚠️ No explicit handling.  
**Recommendation:** Idempotent cancel; optimistic UI with rollback.

---

## 🟠 Session Viewing & Cancellation

### 8. Guest cancelling a clinic session
**Current state:** Guest has clinic session (no account). Practitioner can cancel.  
**Impact:** Guest has no self-serve cancel path.  
**Status:** ✅ GuestBookingView shows "Cancel booking" when session is confirmed and in future. `guest-cancel-session` edge function handles verification, refund, and cancellation email.  
**Recommendation:** Add cancel link in session emails (token/email-based) for guests.

### 9. Token vs email inconsistency
**Current state:** Some emails use `?token=...`, others `?email=...` for `/booking/view/:id`.  
**Impact:** Token links fail if `guest_view_token` missing (older sessions).  
**Status:** ✅ Email fallback added for `/booking/view`.  
**Recommendation:** Ensure all session emails use email-based URL when token unavailable.

### 10. Sessions created before `guest_view_token` existed
**Current state:** Older sessions have no `guest_view_token`.  
**Impact:** Token-based links always fail.  
**Status:** ✅ Email-based `/booking/view` should work.  
**Recommendation:** Backfill token for old sessions if needed; prefer email for robustness.

---

## 🟠 Payment & Checkout

### 11. Guest abandons checkout, returns later
**Current state:** Guest starts booking, leaves, returns after hold expiry.  
**Impact:** Slot released; "session not found" or conflict.  
**Status:** ✅ Fixed. BookingExpirationTimer + handleBookingExpired: "Time no longer available" banner + toast "Please select a new time slot and try again." BookingSuccess loadError shows "Find my booking" when session can't be loaded.  
**Recommendation:** —

### 12. Stripe succeeds but DB update fails
**Current state:** Payment completes; webhook or DB update fails.  
**Impact:** Guest charged but no confirmed session.  
**Status:** ✅ Runbook added: [STRIPE_RECONCILIATION.md](./STRIPE_RECONCILIATION.md)  
**Recommendation:** Monitor; alert on inconsistent state; follow runbook for manual fix.

### 13. Guest pays with different email than booking
**Current state:** Books as `jane@work.com`, Stripe Checkout allows changing email; user pays as `jane@personal.com`.  
**Impact:** Session keeps `client_email` from booking form (work). Confirmation email goes to work. Stripe receipt goes to personal. "Find my booking" uses session `client_email` = work, so lookup with personal won't find it.  
**Status:** ✅ Mitigated. GuestBookingFlow step 2 shows "Use this same email when paying to receive your confirmation."  
**Recommendation:** —

---

## 🟡 Reviews & Post-Session

### 14. Guest review flow
**Current state:** Review email links to `/review?session_id=...&email=...`.  
**Impact:** Must work without login.  
**Status:** ✅ `GuestReview` uses `get_session_by_email_and_id`.  
**Recommendation:** Verify all review links use email for guests.

### 15. Guest registers before completing review
**Current state:** Guest receives review email, registers, then clicks link.  
**Impact:** May land on guest flow while logged in.  
**Status:** ✅ Fixed. GuestReview redirects logged-in users to `/reviews/submit/:sessionId`.

---

## 🟡 Messaging

### 16. Guest gets message before any session exists
**Current state:** Practitioner messages guest who hasn't booked.  
**Impact:** No session context; conversation may not exist.  
**Status:** ✅ `get_or_create_guest_conversation` exists.  
**Recommendation:** Verify outreach-before-booking flow.

### 17. Guest replies via email (future)
**Current state:** No inbound email-to-message pipeline.  
**Impact:** Guest must use web app to reply.  
**Status:** ❌ Not implemented.  
**Recommendation:** Future: consider reply-by-email if demand exists.

---

## 🟡 Booking Success & Post-Payment

### 18. Guest never receives confirmation email
**Current state:** Email bounces, wrong address, or spam.  
**Impact:** No link to view booking; guest confused.  
**Status:** ✅ Fixed. `/booking/find` page allows email + date lookup via `get_guest_sessions_by_email_and_date` RPC.

### 19. Guest closes Stripe tab before redirect
**Current state:** Guest completes payment, closes tab before redirect to success page.  
**Impact:** May not see confirmation; relies on email.  
**Status:** ⚠️ Email is fallback.  
**Recommendation:** Email contains full booking details; consider "Resend confirmation" in future.

### 20. Duplicate booking on double-click
**Current state:** Guest double-clicks "Pay" or retries after timeout.  
**Impact:** Possible duplicate charge.  
**Status:** ✅ Fixed. Idempotency keys in `payment-integration.ts`, `treatment-exchange.ts`, and booking flows no longer use `Date.now()`.

---

## 🟢 Lower Priority

### 21. Guest on multiple devices
**Current state:** Guest starts booking on phone, continues on desktop.  
**Impact:** Session ID/state may not carry over.  
**Status:** ❌ No cross-device flow.  
**Recommendation:** Email contains link; they can continue from any device.

### 22. Guest shares booking link
**Current state:** Link contains `?email=...`; anyone with link could view.  
**Impact:** Limited data exposure; still sensitive.  
**Status:** ✅ Mitigated.  
**Recommendation:** GuestBookingView shows "Don't share this link" warning banner.

### 23. GDPR / data deletion for guests
**Current state:** Guest requests deletion.  
**Impact:** Data across guest users, sessions, Stripe, etc.  
**Status:** ✅ Documented.  
**Recommendation:** [GUEST_DATA_DELETION.md](./GUEST_DATA_DELETION.md) – step-by-step procedure.

### 24. Guest and practitioner both cancel
**Current state:** Both initiate cancel at same time.  
**Impact:** Double refund or inconsistent state.  
**Status:** ✅ Fixed. `guest-cancel-session` and SessionDetailView use conditional update `WHERE status IN ('scheduled','confirmed')`; second caller gets "Already cancelled". Stripe prevents double refund.

---

## Summary Table

| # | Edge Case | Severity | Status |
|---|-----------|----------|--------|
| 1 | Same email, different names | Medium | ✅ Fixed |
| 2 | Guest when account exists | High | ✅ Fixed (check_email_registered) |
| 3 | Email case sensitivity | Medium | ✅ Mostly covered |
| 4 | Cancel without email in URL | Medium | ✅ Fixed (MobileRequestStatus form) |
| 5 | Cancel with email typo | Medium | ✅ Clear error |
| 6 | Expired request, stale link | Medium | ⚠️ UX |
| 7 | Multiple tabs | Low | ⚠️ Open |
| 8 | Guest cancel clinic session | Medium | ✅ Fixed (guest-cancel-session) |
| 9 | Token vs email URLs | Medium | ✅ Fixed |
| 10 | Old sessions, no token | Low | ✅ Fixed |
| 11 | Abandoned checkout | Medium | ✅ Fixed (expiry messaging + Find my booking) |
| 12 | Stripe success, DB fail | High | ✅ Runbook |
| 13 | Different pay vs book email | Medium | ✅ Mitigated (checkout email warning) |
| 14 | Guest review flow | Medium | ✅ Working |
| 15 | Review after register | Low | ✅ Fixed (redirect to SubmitReview) |
| 16 | Message before session | Medium | ✅ RPC exists |
| 17 | Reply by email | Low | ❌ Future |
| 18 | Never receives email | Medium | ✅ Fixed (Find my booking) |
| 19 | Closes before redirect | Medium | ⚠️ Email fallback |
| 20 | Duplicate payment | High | ✅ Fixed (idempotency) |
| 21 | Multiple devices | Low | ⚠️ Open |
| 22 | Shares link | Low | ✅ Mitigated |
| 23 | GDPR deletion | Low | ✅ Documented |
| 24 | Both cancel | Low | ✅ Fixed (conditional update) |

---

## Cross-References

- **Review edge cases:** [REVIEW_EDGE_CASES.md](./REVIEW_EDGE_CASES.md) (items 14, 15)
- **Mobile practitioner ops:** [MOBILE_PRACTITIONER_EDGE_CASES.md](./MOBILE_PRACTITIONER_EDGE_CASES.md) (items 14, 15)
- **Stripe reconciliation:** [STRIPE_RECONCILIATION.md](./STRIPE_RECONCILIATION.md) (item 12)
- **Open edge cases master list:** [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
- **Guest booking verification:** [KAN-24-booking-buttons-guest-flow-verification.md](../KAN-24-booking-buttons-guest-flow-verification.md)
- **Booking flow audit:** [BOOKING_FLOW_AUDIT_REPORT.md](../../BOOKING_FLOW_AUDIT_REPORT.md)

---

**Last Updated:** March 2025
