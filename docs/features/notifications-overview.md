# Notifications – Feature Overview

**Audience:** Junior developers

**Notifications** are in-app alerts shown to users (practitioners and clients) for booking events, messages, treatment exchange, and other actions. They appear in a dropdown, on a notifications page, and in the practitioner dashboard's "New Bookings" sidebar.

---

## What are Notifications?

Notifications are rows in the `notifications` table:

- **Recipient** – `recipient_id` (user who sees it)
- **Content** – `title`, `body`/`message`
- **Type** – `type` (enum), `source_type` (e.g. `treatment_exchange_request`, `slot_hold`)
- **Read state** – `read_at` (canonical); legacy `read` boolean kept in sync
- **Dismiss** – `dismissed_at` (soft delete; rows are never hard-deleted by users)

---

## User Sequence: Notification Created & Consumed

```mermaid
sequenceDiagram
    participant System
    participant DB
    participant Realtime
    participant Practitioner
    participant UI

    System->>DB: INSERT notifications (recipient_id, type, source_type, payload)
    DB->>Realtime: Postgres change broadcast
    Realtime->>UI: New notification event
    UI->>UI: Fetch or merge; update dropdown count

    Practitioner->>UI: Open notification dropdown
    UI->>DB: SELECT * FROM notifications WHERE recipient_id=... AND dismissed_at IS NULL
    DB-->>UI: Rows
    UI->>Practitioner: Show list

    Practitioner->>UI: Click notification
    UI->>UI: handleNotificationNavigation(payload)
    UI->>Practitioner: Navigate to exchange-requests / mobile-requests / session / etc.

    Practitioner->>UI: Click "Mark read" or "Dismiss"
    UI->>DB: UPDATE read_at / dismissed_at
    DB-->>UI: Success
    UI->>Practitioner: Update UI
```

---

## Where Notifications Appear

| Surface                      | Location                   | Content                                                        |
| ---------------------------- | -------------------------- | -------------------------------------------------------------- |
| **Notification dropdown**    | Header/nav                 | Recent, undismissed; mark read, dismiss                        |
| **Notifications page**       | `/notifications`           | Full list; mark all read, dismiss                              |
| **Dashboard "New Bookings"** | TherapistDashboard sidebar | Action-required notifications (exchange, mobile request, etc.) |

---

## Notification Types & Sources

| `type` (enum)                          | `source_type` examples                                  | When created                                      |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `booking_request`                      | -                                                       | New booking request (same-day approval, etc.)     |
| `booking_confirmed`                    | `treatment_exchange_request`, `mutual_exchange_session` | Treatment exchange accepted, reciprocal booked    |
| `session_reminder`                     | -                                                       | Reminder before session (if enabled)              |
| `session_cancelled`                    | -                                                       | Session cancelled                                 |
| `exchange_reciprocal_booking_reminder` | -                                                       | Accept exchange but haven't booked reciprocal yet |
| `exchange_request`                     | `treatment_exchange_request`                            | New treatment exchange request received           |
| `exchange_slot_held`                   | `slot_hold`                                             | Slot held for you (treatment exchange)            |

**Important:** The frontend should not rely on `type` alone. Use `source_type`, `payload`, and title/body context to route and classify notifications.

---

## Read & Dismiss Behaviour

1. **Read:** `read_at` is the source of truth. `mark_notifications_read(p_ids)` sets both `read_at` and `read`.
2. **Dismiss:** Update `dismissed_at` (soft). Never DELETE. All fetches exclude `dismissed_at IS NOT NULL`.

**See:** [NOTIFICATIONS_AUDIT_AND_FIXES](../product/NOTIFICATIONS_AUDIT_AND_FIXES.md).

---

## Action-Required vs Terminal

- **Action-required:** e.g. `booking_request`, `exchange_request`, `treatment_exchange_request`, `exchange_slot_held` – user should Accept/Decline or take action
- **Terminal:** e.g. `session_reminder`, `session_cancelled`, `booking_declined`, `exchange_request_expired` – informational only

The dashboard uses these to decide which cards get Accept/Decline buttons.

---

## Routing From Notifications

Clicking a notification navigates based on:

- `source_type`, `source_id`, `payload`
- Exchange → `/practice/exchange-requests` or ExchangeAcceptanceModal
- Session → `/practice/sessions/:id` or client sessions
- Mobile request → `/practice/mobile-requests?requestId=...`

**See:** `notification-utils.ts` – `handleNotificationNavigation`, `formatNotificationPreview`.

### Mobile app (Theramate Expo / `theramate-ios-client`)

On native, use **`resolveNotificationNavigation`** (`lib/notificationNavigation.ts`) and **`openNotificationAbsoluteUrl`** (`lib/notificationUrlOpen.ts`):

- Prefer **`payload.route`** or derived **`{ kind: "route", path }`** for in-app screens.
- For **`web_path` / `href` / `url`**, the resolver first maps known **`APP_CONFIG.WEB_URL`** URLs to native routes via **`tryMapWebUrlToRoute`**; otherwise **`kind: "url"`** is opened **in-app** (allowlisted WebView for Stripe, Supabase signed URLs, or same-origin web pages)—not Safari.

**See:** `app/notifications.tsx`, `hooks/usePushNotifications.ts`, `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` (P2).

---

## Real-time

The `notifications` table is in the Realtime broadcast set. New rows appear in the dropdown without refresh when subscribed.

---

## Related Docs

- [NOTIFICATIONS_AUDIT_AND_FIXES](../product/NOTIFICATIONS_AUDIT_AND_FIXES.md)
- [DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW](../product/DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW.md)
- [Database Schema](../architecture/database-schema.md) – `notifications`
- [Dashboard Overview](./dashboard-overview.md)

---

**Last Updated:** 2026-04-10
