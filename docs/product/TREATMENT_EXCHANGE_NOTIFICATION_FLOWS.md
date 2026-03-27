# Treatment Exchange Notification Flows

**Date:** 2026-03-14  
**Status:** Audited, fixes applied, gaps documented  
**Related:** CREDITS_AND_TREATMENT_EXCHANGE_AUDIT.md, NOTIFICATIONS_AUDIT_AND_FIXES.md

---

## Summary

Treatment exchange requests surface in multiple UI locations: the dashboard "New Bookings" feed, the header notification dropdown (RealTimeNotifications), and the dedicated Exchange Requests page. The request table (`treatment_exchange_requests`) uses statuses `pending`, `accepted`, `declined`, `expired`, `cancelled`—**never** `confirmed`. "Confirmed" applies only to sessions (`mutual_exchange_sessions`). A display bug caused pending exchange requests to be labeled "Confirmed" in the feed; this was a UI label mismatch, not a backend status write.

---

## Root Cause (Fixed)

### The Bug

`formatBookingNotificationPreview()` in `notification-utils.ts` appended `· Confirmed` to the date/time line whenever:

- `type === "booking_confirmed"` or
- `title?.toLowerCase().includes("confirmed")`

Exchange notifications share the same feed as clinic/mobile confirmations. Some exchange types (e.g. `exchange_session_confirmed`) legitimately show "Confirmed"; others (`treatment_exchange_request`, `exchange_request_received`, `exchange_slot_held`) are **pending** and must not.

Because `isConfirmed` was too broad, pending exchange requests could display "16 Mar · 09:00 · Confirmed" alongside a "Review" CTA—contradictory and misleading.

### The Fix

`formatBookingNotificationPreview` now treats these as **pending exchange** (no "Confirmed"):

- `treatment_exchange_request`
- `exchange_request`
- `exchange_request_received`
- `exchange_slot_held`
- `source_type === "treatment_exchange_request"`
- `source_type === "slot_hold"`

"Confirmed" is shown only when the notification represents an actual confirmed session (`booking_confirmed`, `exchange_session_confirmed`, or title containing "confirmed") **and** it is not a pending exchange request.

---

## Data Sources and Ownership

| Concept            | Table / Source                       | Status Values                                            | Who Owns "Confirmed" |
| ------------------ | ------------------------------------ | -------------------------------------------------------- | -------------------- |
| Exchange request   | `treatment_exchange_requests`        | pending, accepted, declined, expired, cancelled          | No                   |
| Confirmed session  | `mutual_exchange_sessions`           | scheduled, completed, cancelled, etc.                    | Yes (session status) |
| Notification label | `formatBookingNotificationPreview()` | Derived from notification `type`, `source_type`, payload | UI only              |

---

## Scenario Matrix

| #   | Scenario                             | Actor     | Action                          | Expected UI                                                           | Risk if Wrong                   |
| --- | ------------------------------------ | --------- | ------------------------------- | --------------------------------------------------------------------- | ------------------------------- |
| 1   | Send exchange request                | Requester | Sends request                   | Request appears in "Sent"; recipient gets notification                | —                               |
| 2   | Receive exchange request             | Recipient | Sees in New Bookings            | **Exchange** badge, date/time, **no** "Confirmed", **Review** visible | User ignores thinking it's done |
| 3   | Accept exchange request              | Recipient | Clicks Accept                   | Request leaves pending; session created; confirmation notification    | —                               |
| 4   | Decline exchange request             | Recipient | Clicks Decline                  | Request marked declined; no "Confirmed"                               | —                               |
| 5   | Request expires                      | System    | Cron/job runs                   | Status reflects expired; notification type may change                 | —                               |
| 6   | Click notification (dashboard feed)  | Either    | Clicks item in New Bookings     | Navigates to correct page; item highlighted/scrolled into view        | —                               |
| 7   | Click notification (header dropdown) | Either    | Clicks in RealTimeNotifications | Same as #6: correct destination, item visible                         | —                               |

---

## Open Gaps

### 1. RealTimeNotifications Click Behavior (Header Dropdown) — Resolved

**Resolved:** Header dropdown uses `handleNotificationNavigation` (same as dashboard feed). Both call `markAsRead` before navigating.

### 2. Notification Lifecycle on Status Change — Resolved

**Implemented:** Accept/Decline: `markRequestNotificationsAsRead` soft-dismisses related notifications. Expire: `reconcile_pending_exchange_requests` dismisses notifications for expired requests; scheduled via cron every 5 min (migration `20260314230000`).

### 3. "Client" vs Named Display

**Observed:** Items show "Client Clinic" vs "Ray Dhillon Mobile."

**Question:** Is "Client" an intentional anonymous fallback, or does it indicate missing data (name, location)?

**Recommendation:** Document when to show "Client" vs practitioner/client name, and when to show "Clinic" vs "Mobile."

---

## Notification Types (Exchange)

| Type                         | Source   | Badge    | "Confirmed"? | Review? |
| ---------------------------- | -------- | -------- | ------------ | ------- |
| `treatment_exchange_request` | Exchange | Exchange | No           | Yes     |
| `exchange_request_received`  | Exchange | Exchange | No           | Yes     |
| `exchange_request`           | Exchange | Exchange | No           | Yes     |
| `exchange_slot_held`         | Exchange | Exchange | No           | Yes     |
| `exchange_request_accepted`  | Exchange | Exchange | No\*         | No      |
| `exchange_request_declined`  | Exchange | —        | No           | No      |
| `exchange_session_confirmed` | Exchange | Exchange | Yes          | No      |
| `booking_confirmed` (clinic) | Booking  | Clinic   | Yes          | No      |
| `booking_confirmed` (mobile) | Mobile   | Mobile   | Yes          | No      |

\*Accepted requests create sessions; the confirmation may be `exchange_session_confirmed`.

---

## Acceptance Criteria

- [x] Pending exchange requests **never** show "Confirmed" in any feed
- [x] "Confirmed" appears only for actually confirmed sessions (clinic, mobile, exchange_session_confirmed)
- [x] Clicking a notification (feed or header) navigates to the correct page (both use `handleNotificationNavigation`)
- [x] The target item is visible (highlighted and/or scrolled into view)
- [x] Exchange Requests page scrolls the focused request into view when arriving via `?request=`
- [x] Notification lifecycle on accept/decline/expire is defined and implemented

---

## Code References

| Component              | Path                            | Responsibility                                                                                       |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| New Bookings feed      | `TherapistDashboard.tsx`        | Renders `bookingNotifications` + `confirmedMobileSessions`, uses `formatBookingNotificationPreview`  |
| Preview / label logic  | `notification-utils.ts`         | `formatBookingNotificationPreview`, `resolveNotificationDestination`, `handleNotificationNavigation` |
| Exchange Requests page | `practice/ExchangeRequests.tsx` | Displays requests, uses `?request=` for focus, scroll-into-view                                      |
| Exchange notifications | `exchange-notifications.ts`     | Creates in-app notifications for request, accept, decline, slot held, session confirmed              |

---

## Database Alignment (Supabase MCP – 2026-03-14)

### notification_type enum

The `notifications.type` column uses enum `notification_type`. Previously it had only 5 values; exchange types fell back to `booking_confirmed` via `create_notification` exception handler, causing pending requests to display "Confirmed."

**Migrations applied:**

- `20260314220000_add_exchange_notification_types_to_enum.sql` — adds exchange notification types to enum
- `20260314230000_dismiss_notifications_on_exchange_expire.sql` — reconciles expired requests, dismisses related notifications, schedules reconcile cron (every 5 min)

| Value                                  | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| `booking_request`                      | Mobile booking request              |
| `booking_confirmed`                    | Clinic/mobile session confirmed     |
| `session_reminder`                     | Session reminder                    |
| `session_cancelled`                    | Session cancelled                   |
| `exchange_reciprocal_booking_reminder` | Reciprocal booking reminder         |
| `treatment_exchange_request`           | New exchange request (pending)      |
| `exchange_request_received`            | Exchange request received (pending) |
| `exchange_request`                     | Generic exchange request (pending)  |
| `exchange_request_accepted`            | Request accepted                    |
| `exchange_request_declined`            | Request declined                    |
| `exchange_request_expired`             | Request expired                     |
| `exchange_slot_held`                   | Slot held for exchange (pending)    |
| `exchange_slot_released`               | Slot released                       |
| `exchange_session_confirmed`           | Exchange session confirmed          |

**Verified via Supabase MCP:** `execute_sql` on `pg_enum` for `notification_type` returns all 14 values.

**Legacy rows:** Existing notifications with `type=booking_confirmed` and `source_type=treatment_exchange_request` will remain. The frontend `formatBookingNotificationPreview` treats them as pending exchange via `source_type`, so they no longer show "Confirmed." New notifications will store the correct `type` and no longer rely on the fallback.

### treatment_exchange_requests status

**Verified:** CHECK constraint allows only `pending`, `accepted`, `declined`, `expired`, `cancelled`. No `confirmed`—matches doc.

---

## Related Docs

- **CREDITS_AND_TREATMENT_EXCHANGE_AUDIT.md** — Backend flows, slot holds, credits, RPCs
- **NOTIFICATIONS_AUDIT_AND_FIXES.md** — Read state, dismiss, type drift, client-side classification
