# Practitioner Dashboard Edge Cases

**Date:** March 2025  
**Status:** 🔍 Discovery & Tracking  
**Scope:** TherapistDashboard, PracticeManagementHub, PracticeSchedule, SessionDetailView, Credits, Treatment Exchange, Mobile Requests

---

## Overview

Edge cases, failure modes, and gaps in the practitioner dashboard workflow—from dashboard home through practice management, session lifecycle, treatment exchange, and billing.

---

## ✅ Fixed (March 2025)

### 3. **Wrong "total clients" in PracticeManagementHub**
**Was:** Fetched all users with `user_role=eq.client`; "Total clients" reflected all platform clients.  
**Now:** Derives unique client count from `client_sessions` where `therapist_id = practitioner.id`; excludes peer bookings. "Active clients" = unique clients with at least one completed session.

### 4. **Revenue vs refunds**
**Was:** `monthlyRevenue` summed completed session prices without excluding refunded sessions.  
**Now:** Excludes sessions where `payment_status = 'refunded'` from monthly revenue.

### 9. **Guest sessions missing client info**
**Was:** Empty `client_name` showed blank in diary.  
**Now:** Fallback to `"Guest"` when `is_guest_booking` and `client_name` is empty; Guest badge already present.

---

## 🔴 CRITICAL – Data & Access

### 1. **Subscription lapses mid-session** ✅ Fixed
**Scenario:** Practitioner has dashboard open; subscription expires (past_due, card declined). User continues working.

**Status:** SubscriptionContext subscribes to realtime changes on `subscriptions` table (filter: user_id). When Stripe webhook updates status to past_due/cancelled/unpaid, refetch runs immediately and SimpleProtectedRoute re-evaluates; user is redirected on next render. Migration `20260310140000_enable_realtime_subscriptions.sql` adds subscriptions to supabase_realtime.

### 2. **Stale dashboard after logout on another device** ✅ Mitigated
**Scenario:** User logs out on phone. Dashboard still open on desktop.

**Status:** AuthErrorHandler.performSilentLogout now accepts showSessionExpiredMessage; when handleAuthError triggers logout (session refresh failed), redirects to `/login?error=session_expired`. Login page shows "Your session has expired. Please sign in again." Profile fetch and other auth-error paths use handleAuthError.

### 3. **Wrong "total clients" in PracticeManagementHub** ✅ Fixed
~~**Current:** `PracticeManagementHub` fetches clients with `user_role=eq.client` without scoping to this practitioner's clients. **Impact:** "Total clients" reflects all platform clients.~~

### 4. **Revenue vs refunds** ✅ Fixed
**Scenario:** Practitioner completes session → revenue counted → later refund issued.

~~**Question:** Does `monthlyRevenue` include or exclude refunds?~~ PracticeManagementHub now excludes `payment_status = 'refunded'`.

---

## 🟠 HIGH – Session Lifecycle & Today's Schedule

### 5. **Check-in before start time** ⚠️ Verified – no time gating
**Scenario:** Practitioner checks in 15 minutes early.

**Current:** `canStartSession` only validates payment and status (scheduled/confirmed). No check that current time ≥ `start_time`. Timer starts immediately on Start click. Intentional flexibility (practitioner may start early if client ready).

### 6. **Check-out without notes** ⚠️ Verified – notes optional
**Scenario:** Practitioner completes session but dismisses notes prompt without adding notes.

**Current:** Session completes first (DB update); notes modal opens with "Skip" and closable dialog. User can complete without adding notes. No reminder/banner for missing notes later.

### 7. **Double booking visible on dashboard** ✅ Mitigated
**Scenario:** Double booking due to race condition or migration. Both sessions appear on "Today's schedule".

**Status:** TherapistDashboard detects overlapping sessions in today's schedule and shows an amber "Schedule conflict detected" banner with "View Full Schedule" button.

### 8. **Session status desync** ✅ Mitigated
**Scenario:** Client cancels while practitioner has SessionDetailView open. Or practitioner checks in on Device A while Device B still shows "scheduled".

**Status:** SessionDetailView subscribes to postgres_changes on client_sessions (filter: id). When session is updated (e.g. client cancels), fetchSessionDetails runs to refresh. Dashboard uses useRealtimeSubscription for client_sessions. Websocket drop: no explicit polling; user can refresh. Real-time covers the common case.

### 9. **Guest sessions missing client info** ✅ Fixed
**Scenario:** Guest booking; `client_name` / `client_email` may be null or incomplete.  
**Now:** Fallback to "Guest" when `is_guest_booking` and `client_name` empty; Guest badge in diary.

---

## 🟠 HIGH – Treatment Exchange & Credits

### 10. **Exchange request accepted elsewhere** ✅ Mitigated
**Scenario:** Practitioner accepts exchange request on mobile. Desktop still has diary card with Accept/Decline.

**Current:** When `exchangeRequestStatuses[requestId]` is `accepted` or `declined`, buttons are disabled and "Request accepted/declined" shown. Accepted requests also drop out of diary on next fetch (session exists). Safeguard uses notification-linked status when available.

### 11. **Credit balance race** ✅ Mitigated (verified via Supabase MCP)
**Scenario:** Practitioner spends credits for peer treatment. Before UI updates, they open another peer booking tab.

**Status:** `process_peer_booking_credits` uses `FOR UPDATE` to lock the client credits row, validates `v_client_balance < v_credit_cost` before deducting, and returns error if insufficient. Prevents overspend; modal also re-checks balance before accept.

### 12. **Reciprocal booking never completed** ✅ Mitigated
**Scenario:** Practitioner A accepts B's exchange request; B should book reciprocal session with A. B never books. A's dashboard shows "Action needed".

**Status:** In-app reminder notification created when accept succeeds but reciprocal isn't booked (accept-only or partial success). See [TREATMENT_EXCHANGE_EDGE_CASES.md](./TREATMENT_EXCHANGE_EDGE_CASES.md) #10.

---

## 🟠 HIGH – Mobile Requests & Same-Day

### 13. **Same-day approval not surfaced** ✅ Fixed
**Scenario:** Client books same-day clinic session. Practitioner has dashboard open but approval modal is buried or not shown.

**Status:** When there are pending same-day bookings, TherapistDashboard shows a prominent amber card "Same-day bookings need your approval" above Today's Schedule with SameDayBookingApproval inline.

### 14. **Mobile vs clinic unified in "Today"** ✅ Fixed
**Scenario:** Hybrid practitioner: 2 clinic sessions + 1 pending mobile request for today.

**Status:** TherapistDashboard fetches pending mobile requests for mobile/hybrid practitioners and maps them to SessionData with is_mobile_request. Today's Schedule shows them with 📍 icon, "Mobile request" label, and "Review request" button. Sorted by date/time with other sessions.

---

## 🟡 MEDIUM – Stats & Analytics

### 15. **Empty stats display** ✅ Fixed
**Scenario:** New practitioner, zero sessions, zero clients.

**Now:** PracticeManagementHub shows "0" for counts; `Number.isFinite` check for average rating (shows "—" if NaN); "No reviews yet" when rating is 0.

### 16. **Timezone vs date boundaries** ⚠️ Known limitation
**Scenario:** Practitioner in GMT completes session at 23:50. Session date is "today" in DB but "tomorrow" in some timezones.

**Status:** Stats use `date_trunc('month', CURRENT_DATE)` in RPCs (server/UTC) and `new Date()` in client (browser local). `session_date` is a DATE column (no TZ). Practitioner far from UTC may see sessions under wrong month at boundaries. No practitioner-timezone column; would require backend TZ support to fix.

### 17. **Rating before completion** ✅ Fixed
**Scenario:** Feedback submitted before session marked completed (edge case or race).

**Status:** PracticeManagementHub fetches feedback only for `completedSessionIds`. PracticeAnalyticsDashboard now filters feedback to completed sessions before computing averageRating. ReviewSystem blocks submission unless `session.status === 'completed'`.

---

## 🟡 MEDIUM – Profile & Onboarding

### 18. **Profile CTA dismissed but still incomplete** ✅ Fixed (Profile page)
**Scenario:** Practitioner dismisses "Complete your profile" CTA. Still has 0 products or no availability.

**Now:** ProfileCompletionWidget shows compact "Show checklist" card when dismissed; restores full CTA on click. See [PRACTITIONER_PROFILE_EDGE_CASES.md](./PRACTITIONER_PROFILE_EDGE_CASES.md) #4.

### 19. **Stripe Connect not set up**
**Scenario:** Practitioner completes sessions but has no Stripe Connect. Payments cannot be processed.

**Questions:**
- Is Stripe Connect CTA always visible until connected?
- Are payouts blocked with clear messaging?

### 20. **Onboarding redirect loop**
**Scenario:** Practitioner completes onboarding; `profile_completed` not set. Redirected to onboarding again from dashboard.

**Questions:**
- Is completion logic consistent with dashboard routing?
- Can user loop between onboarding and dashboard?

---

## 🟡 MEDIUM – Notifications & UI

### 21. **Notification links to deleted resource** ✅ Mitigated
**Scenario:** "Session cancelled" notification links to `/practice/sessions/:id`. Session was soft-deleted or anonymized.

**Status:** SessionDetailView shows "Session Not Found" card with message that it may have been cancelled or deleted. Practitioners see "View Schedule" button; all users see "Go Back".

### 22. **Stale exchange notification** ✅ Fixed
**Scenario:** Practitioner declines exchange request; notification still shows "Respond to request".

**Status:** TherapistDashboard `handleDeclineExchangeRequest` immediately sets `exchangeRequestStatuses[requestId] = 'declined'` so UI updates before refetch. Accept/Decline buttons are hidden for declined requests. See [TREATMENT_EXCHANGE_EDGE_CASES.md](./TREATMENT_EXCHANGE_EDGE_CASES.md) #9.

### 23. **Notification count desync** ✅ Mitigated
**Scenario:** Practitioner reads notification in-app. Unread count doesn't update.

**Status:** markNotificationAsRead optimistically decrements unreadNotificationCount. Notifications table has realtime; when read_at is updated, fetchNotifications runs and recomputes count from fresh data. Both optimistic update and realtime refetch.

---

## 🟢 LOWER – UX & Resilience

### 24. **Slow initial load**
**Scenario:** Dashboard fetches stats, sessions, credits, exchange statuses, Stripe status, profile activation.

**Questions:**
- Is there single loading state or progressive loading?
- If one fetch fails (e.g. credits), does rest of dashboard still render?

### 25. **Back navigation stale data** ✅ Fixed
**Was:** Practitioner views session in SessionDetailView, makes changes, navigates back; dashboard could show stale data.

**Now:** TherapistDashboard and PracticeClientManagement include `location.pathname` in their main fetch useEffect deps. When user navigates back (pathname changes), data is refetched.

### 26. **Multiple tabs** ✅ Mitigated
**Scenario:** Same practitioner has dashboard open in two tabs. They check in on Tab A.

**Status:** TherapistDashboard and SessionCheckIn use useRealtimeSubscription for client_sessions. Tab A check-in → postgres_changes UPDATE → Tab B receives event and updates UI; Start button disabled when status is in_progress. Double check-in prevented by status check (scheduled/confirmed → in_progress only).

### 27. **Role change mid-session**
**Scenario:** Admin changes user from practitioner to client (or vice versa).

**Questions:**
- Does dashboard routing respect new role immediately?
- What happens to in-flight API calls or cached practitioner data?

---

## 📋 Summary Table

| # | Edge Case | Severity | Area | Status |
|---|-----------|----------|------|--------|
| 1 | Subscription lapse mid-session | 🔴 Critical | Access | ✅ Fixed |
| 2 | Stale dashboard after logout | 🔴 Critical | Auth | ✅ Mitigated |
| 3 | Wrong total clients count | 🔴 Critical | PracticeManagementHub | ✅ Fixed |
| 4 | Revenue vs refunds | 🔴 Critical | Stats | ✅ Fixed |
| 5 | Early check-in | 🟠 High | Session lifecycle | ⚠️ Verified (no gate) |
| 6 | Check-out without notes | 🟠 High | Session lifecycle | ⚠️ Verified (optional) |
| 7 | Double booking visible | 🟠 High | Calendar/schedule | ✅ Mitigated |
| 8 | Session status desync | 🟠 High | Real-time | ✅ Mitigated |
| 9 | Guest sessions missing client info | 🟠 High | Data display | ✅ Fixed |
| 10 | Exchange accepted elsewhere | 🟠 High | Treatment exchange | ✅ Mitigated |
| 11 | Credit balance race | 🟠 High | Credits | ✅ Mitigated |
| 12 | Reciprocal booking never completed | 🟠 High | Treatment exchange | ✅ Mitigated |
| 13 | Same-day approval not surfaced | 🟠 High | Same-day booking | ✅ Fixed |
| 14 | Mobile vs clinic unified in "Today" | 🟠 High | Hybrid practitioner | ✅ Fixed |
| 15 | Empty stats display | 🟡 Medium | Stats | ✅ Fixed |
| 16 | Timezone boundaries | 🟡 Medium | Stats | ⚠️ Known limitation |
| 17 | Rating before completion | 🟡 Medium | Feedback | ✅ Fixed |
| 18 | Profile CTA dismissed, still incomplete | 🟡 Medium | Profile | ✅ Fixed |
| 19 | Stripe Connect not set up | 🟡 Medium | Payments | |
| 20 | Onboarding redirect loop | 🟡 Medium | Onboarding | |
| 21 | Notification → deleted resource | 🟡 Medium | Notifications | ✅ Mitigated |
| 22 | Stale exchange notification | 🟡 Medium | Notifications | ✅ Fixed |
| 23 | Notification count desync | 🟡 Medium | Notifications | ✅ Mitigated |
| 24 | Slow / partial load | 🟢 Low | Performance | |
| 25 | Back navigation stale data | 🟢 Low | Navigation | ✅ Fixed |
| 26 | Multiple tabs | 🟢 Low | Concurrency | ✅ Mitigated |
| 27 | Role change mid-session | 🟢 Low | Admin | |

---

## Supabase MCP Verification (March 2025)

**Critical RPCs:**
- `process_peer_booking_credits`: Uses `FOR UPDATE` lock, validates balance before deduct; returns `success: false` with error message if insufficient. Prevents credit overspend race.
- `get_pending_same_day_bookings`: Exists; `p_practitioner_id uuid`. Returns rows where status = 'pending_approval' and not expired.
- `create_notification`: Accepts p_type text (includes exchange_reciprocal_booking_reminder enum value).
- `subscriptions.status_check`: `active`, `cancelled`, `past_due`, `unpaid`. Stripe webhook maps trialing/incomplete→active, canceled→cancelled.
- `subscriptions` table: Added to supabase_realtime publication (migration 20260310140000) for subscription lapse detection.

**`client_sessions` schema:**
- `payment_status` (varchar): exists; values in DB include `completed`, `released`; migrations allow `refunded`.
- `refund_amount`, `refund_percentage` (numeric): exist.
- `client_id` (uuid, nullable): exists; guest bookings may use upserted guest user UUID.
- `is_guest_booking` (boolean, NOT NULL): exists.
- `client_name` (varchar, NOT NULL): exists; can be empty string when guest.
- `status` enum: `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `pending_payment`, `pending_approval`, `declined`, `expired`.

**RPCs:**
- `get_practitioner_dashboard_data`: `monthly_revenue` filters `payment_status = 'completed'` (excludes refunded); `upcoming_sessions` includes `client_name`, `client_email`, `is_guest_booking`.
- `expire_pending_payment_bookings`: exists; called before dashboard fetch.

**PracticeManagementHub fixes (verified):**
- Total/active clients: derived from `client_sessions.therapist_id`; `client_id` used for distinct count; peer bookings excluded.
- Revenue: `payment_status !== 'refunded'` filter aligned with schema (refunded sessions excluded).
- Guest display: `client_name` NOT NULL but can be `''`; fallback to `"Guest"` when `is_guest_booking` and empty.

---

## Implementation Notes (March 2025)

- **PracticeManagementHub:** Removed realtime subscription to all clients (`user_role=eq.client`); stats derived from practitioner's sessions only. Added `ClientProgressTracker` import for Clients tab.
- **Revenue:** `payment_status !== 'refunded'` filter added to monthly revenue calculation.
- **Guest display:** `client_name || (is_guest_booking ? 'Guest' : '')` in both fallback and RPC session mappings.
- **Exchange Accept/Decline (#10):** When `exchangeRequestStatuses[requestId]` is `accepted` or `declined`, diary cards show "Request accepted/declined" and disable buttons.
- **Empty stats (#15):** Average rating uses `Number.isFinite` (shows "—" if NaN); "No reviews yet" when rating is 0.

---

## Related Docs

- [BOOKING_MODAL_EDGE_CASES.md](./BOOKING_MODAL_EDGE_CASES.md)
- [MOBILE_PRACTITIONER_EDGE_CASES.md](./MOBILE_PRACTITIONER_EDGE_CASES.md)
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
