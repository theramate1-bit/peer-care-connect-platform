# Dashboard & Treatment Exchange Flow

**Date:** 2026-03-15

---

## 0. State When Practitioner Has NOT Accepted or Declined

```
                    ┌──────────────────────────────────────────────────┐
                    │ DATABASE (source of truth)                        │
                    │ treatment_exchange_requests.status = 'pending'    │
                    │ slot_holds.status = 'released' (10min TTL)        │
                    │ notifications: static inserts, never updated      │
                    └──────────────────────────────────────────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         │                                │                                │
         ▼                                ▼                                ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ TODAY'S         │            │ NEW BOOKINGS    │            │ EXCHANGE        │
│ SCHEDULE        │            │ SIDEBAR         │            │ REQUESTS PAGE   │
├─────────────────┤            ├─────────────────┤            ├─────────────────┤
│ Source:         │            │ Source:         │            │ Source:         │
│ treatment_      │            │ notifications   │            │ treatment_      │
│ exchange_       │            │ table           │            │ exchange_       │
│ requests        │            │                 │            │ requests        │
│                 │            │                 │            │                 │
│ Filter: date    │            │ Filter: none    │            │ Filter: none    │
│ = TODAY only    │            │ (all undismissed)│            │ (all received)  │
│                 │            │                 │            │                 │
│ If request is   │            │ Always shows    │            │ Always shows    │
│ tomorrow →      │            │ (notification   │            │ (direct query)   │
│ HIDDEN here     │            │ exists)         │            │                 │
└─────────────────┘            └─────────────────┘            └─────────────────┘
         │                                │                                │
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                              INCONSISTENCY: Same pending request
                              visible in 2 of 3 places, invisible in 1
                              (depending on session_date vs today)
```

---

## 1. Treatment Exchange: Send Request Flow

```
[Requester] sendExchangeRequest()
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Validate (IDs, credits, blocked time, eligibility)               │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. SlotHoldingService.holdSlot(recipientId, date, time, 10 min)      │
│    → INSERT slot_holds (status=active, expires 10 min)              │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. INSERT treatment_exchange_requests (status=pending, expires 24h)│
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. link_slot_hold_to_request RPC                                    │
│    → UPDATE slot_holds SET request_id = new_request.id               │
└─────────────────────────────────────────────────────────────────────┘
        │
        ├──────────────────────────────────────────────────────────────►
        │                                                               │
        ▼                                                               ▼
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│ 5a. sendExchangeRequestNotification │     │ 5b. sendSlotHeldNotification        │
│     → INSERT notifications           │     │     → INSERT notifications           │
│     (source_type=                    │     │     (source_type=slot_hold,         │
│      treatment_exchange_request)     │     │      title="Slot Reserved")         │
│     (title="New Treatment Exchange   │     │                                     │
│      Request")                       │     │                                     │
└─────────────────────────────────────┘     └─────────────────────────────────────┘
        │                                                               │
        └───────────────────────────────┬───────────────────────────────┘
                                        │
                                        ▼
                        [Both notifications → recipient_id = Massage M]
```

---

## 2. Dashboard Data Sources (Two Parallel Pipelines)

### Pipeline A: Today's Schedule & Main Content

```
[TherapistDashboard mount / refresh]
        │
        ▼
fetchDashboardData()
        │
        ├──► get_practitioner_dashboard_data RPC
        │         │
        │         └──► client_sessions, stats, upcoming_sessions
        │
        ├──► treatment_exchange_requests (received, recipient_id=user)
        │         │
        │         └──► receivedExchangeRequestSessions (SessionData)
        │
        ├──► treatment_exchange_requests (sent, requester_id=user)
        │         │
        │         └──► sentExchangeRequestSessions (SessionData)
        │
        ├──► slot_holds (status=active, linked to user's sent requests)
        │         │
        │         └──► slotHoldSessions (SessionData)
        │
        ├──► client_sessions (peer bookings as therapist)
        ├──► client_sessions (reciprocal as client)
        │
        └──► MERGE → upcomingSessions
                    │
                    └──► setOptimisticSessions(upcomingSessions)
                                │
                                ▼
                    todaySessions = filter(optimisticSessions, session_date === today)
                                │
                                ▼
                    [Today's Schedule card] + [This Week sidebar]
```

### Pipeline B: New Bookings Sidebar

```
[TherapistDashboard mount / refresh]
        │
        ▼
fetchNotifications()
        │
        ▼
SELECT * FROM notifications
  WHERE recipient_id = user.id
    AND dismissed_at IS NULL
  ORDER BY created_at DESC LIMIT 50
        │
        ▼
parseNotificationRows() → normalized notifications
        │
        ▼
setNotifications(normalized)
        │
        ▼
bookingNotifications = notifications.filter(isNewBookingNotification)
        │
        ▼
confirmedMobileSessions = from confirmedMobileSessionsList (separate fetch)
        │
        ▼
allBookingItems = deduped(bookingNotifications) + confirmedMobileSessions
        │
        ▼
[New Bookings card] → map over allBookingItems
        │
        ├──► formatBookingNotificationPreview(n) → who, when, badge
        ├──► requiresReviewAction(n)
        ├──► isExchangeRequest(n)
        └──► Click → handleNotificationNavigation(n)
```

---

## 3. The Disconnect (Where False Info Can Arise)

```
                    ┌─────────────────────────────────────────────────┐
                    │ treatment_exchange_requests (source of truth)    │
                    │ - status: pending | accepted | declined | etc    │
                    │ - expires_at                                     │
                    └─────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     │                     ▼
        ┌───────────────────────┐        │         ┌───────────────────────┐
        │ Pipeline A             │        │         │ Pipeline B             │
        │ (Today's Schedule)     │        │         │ (New Bookings)         │
        │                        │        │         │                        │
        │ Reads directly from    │        │         │ Reads from             │
        │ treatment_exchange_   │        │         │ notifications table    │
        │ requests               │        │         │ (INSERT at send time)  │
        │                        │        │         │                        │
        │ Always current         │        │         │ Can be stale:          │
        └───────────────────────┘        │         │ - slot_hold released   │
                    │                    │         │   but "Slot Reserved"   │
                    │                    │         │   still in notifications│
                    │                    │         │ - 2 rows per request    │
                    │                    │         │   (New Request +        │
                    │                    │         │   Slot Reserved)       │
                    │                    │         └───────────────────────┘
                    │                    │
                    ▼                    ▼
```

---

## 4. Exchange Request Display: Two Places

| Location             | Data Source                 | Renders                                                  |
| -------------------- | --------------------------- | -------------------------------------------------------- |
| **Today's Schedule** | treatment_exchange_requests | Accept / Decline buttons, requester name, status from DB |
| **New Bookings**     | notifications               | Card with who, when, badge from notification payload     |

---

## 5. Real-time Subscriptions

```
treatment_exchange_requests (filter: recipient_id=user)
        │
        ▼
postgres_changes → fetchDashboardData()
        │
        └──► Updates Pipeline A (Today's Schedule) only
              Does NOT refresh fetchNotifications()
```

```
client_sessions (filter: therapist_id=user)
        │
        ▼
postgres_changes → fetchDashboardData()
```

**Note:** New Bookings (Pipeline B) is NOT refreshed when treatment_exchange_requests change. It only refreshes when fetchNotifications() is called (e.g. on mount, after Accept/Decline).

---

## 6. Flow When Practitioner Has NOT Yet Accepted or Declined

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATABASE (source of truth)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ treatment_exchange_requests: status=pending, expires_at=24h from create      │
│ slot_holds: status=released (10 min hold expired) or active                 │
│ notifications: 2 rows, never updated (New Request + Slot Reserved)           │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ Who reads what?
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────────────────┐
│ Today's     │ │ This Week   │ │ New Bookings sidebar                     │
│ Schedule    │ │ sidebar     │ │                                          │
├─────────────┤ ├─────────────┤ ├─────────────────────────────────────────┤
│ Reads:      │ │ Reads:      │ │ Reads: notifications table               │
│ treatment_  │ │ same as     │ │ (inserted at send, never updated)        │
│ exchange_   │ │ left        │ │                                          │
│ requests    │ │             │ │ Shows: who, when, badge from payload      │
│ directly    │ │             │ │ Click "Review" → navigates to             │
├─────────────┤ ├─────────────┤ │ /practice/exchange-requests?request=X    │
│ Filter:     │ │ Shows first │ │                                          │
│ session_date│ │ 5 of full   │ └─────────────────────────────────────────┘
│ === TODAY   │ │ list       │                    │
│ only        │ │             │                    │
└─────────────┘ └─────────────┘                    ▼
    │               │               ┌─────────────────────────────────────────┐
    │               │               │ ExchangeRequests page                    │
    │               │               │ Reads: TreatmentExchangeService         │
    │               │               │         .getExchangeRequests()           │
    │               │               │         → treatment_exchange_requests   │
    │               │               │         directly (fresh DB)              │
    │               │               └─────────────────────────────────────────┘
```

### Inconsistencies (no accept/decline yet)

| #   | Where                 | What shows                                                  | Source                      | Mismatch                                                                                 |
| --- | --------------------- | ----------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | **Today's Schedule**  | Only sessions where `session_date === TODAY`                | treatment_exchange_requests | Request for Mar 16 won't appear if today is Mar 15                                       |
| 2   | **This Week**         | First 5 from optimisticSessions (all dates)                 | treatment_exchange_requests | May or may not include the request depending on sort                                     |
| 3   | **New Bookings**      | All booking notifications (any date)                        | notifications               | Same request can appear; no date filter                                                  |
| 4   | **Slot hold**         | Accept flow looks for active slot hold                      | slot_holds                  | Hold expired in 10 min → Accept may fail or use fallback                                 |
| 5   | **Two entry points**  | Accept from Today's/This Week vs from ExchangeRequests page | Same acceptExchangeRequest  | Both work, but user may land on ExchangeRequests from "Review" and not see inline Accept |
| 6   | **notification.type** | DB stores type=booking_confirmed (enum fallback)            | notifications               | formatBookingNotificationPreview must infer "pending" from source_type/title, not type   |

### Two paths to Accept/Decline

```
Path A: Dashboard
  Today's Schedule OR This Week
    → session with status=pending_exchange
    → Click Accept → handleAcceptExchangeRequest(session) → modal → acceptExchangeRequest()

Path B: New Bookings → ExchangeRequests
  New Bookings card (from notifications)
    → Click → navigate(/practice/exchange-requests?request=X)
    → ExchangeRequests page loads getExchangeRequests()
    → Select request → Click Accept → modal → acceptExchangeRequest()
```

Both paths call the same `acceptExchangeRequest()` and `declineExchangeRequest()`.

---

## 7. Summary

- **Two data sources:** `treatment_exchange_requests` table vs `notifications` table
- **Today's Schedule** uses the DB directly but only shows TODAY's date
- **Slot hold** expires in 10 min; request expires in 24h

---

## 8. Fixes Implemented (2026-03-15)

### New Bookings: DB as source of truth for exchange items

**Before:** Exchange items in New Bookings came from `notifications` (static inserts, never updated). Stale "Slot Reserved" after hold expired; duplicate cards.

**After:**

- `pendingExchangeRequestsForSidebar` state populated from `treatment_exchange_requests` in `fetchDashboardData`
- Exchange items in New Bookings built from this state, not notifications
- Exchange notifications (`treatment_exchange_request`, `slot_hold`) excluded from sidebar
- Same date range as schedule: today → next 7 days

### Realtime alignment

- `postgres_changes` on `treatment_exchange_requests` already calls `fetchDashboardData`
- `fetchDashboardData` updates `pendingExchangeRequestsForSidebar`
- New Bookings sidebar updates when exchanges are created/accepted/declined
