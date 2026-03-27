# Treatment Exchange: Reciprocal Booking Deadline — Specification

**Version:** 1.0  
**Date:** 2026-03-18  
**Status:** Implemented

---

## 1. Purpose

Prevent the "accept-then-never-book" scenario: recipient accepts an exchange request but never books their return session, leaving the requester's slot committed with no reciprocity.

---

## 2. Definitions

| Term                   | Definition                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **Reciprocal booking** | The recipient books their return session (recipient receives treatment from requester).    |
| **Deadline**           | `reciprocal_booking_deadline` = `accepted_at` + 7 days.                                    |
| **Expired**            | Request status set to `expired`; mutual session (if any) cancelled; both parties notified. |

---

## 3. Behaviour

### 3.1 On Accept

When the recipient accepts an exchange request:

1. `treatment_exchange_requests.status` → `accepted`
2. `accepted_at` set to current timestamp
3. `reciprocal_booking_deadline` set to `accepted_at + 7 days`
4. Mutual session and initial client session created (recipient provides, requester receives)
5. Recipient sees "Book your return session" until they complete reciprocal booking

### 3.2 When Recipient Books Return (Before Deadline)

1. Recipient completes reciprocal booking via `bookReciprocalExchange`
2. `mutual_exchange_sessions.practitioner_b_booked` → `true`
3. Credits deducted (both sessions booked)
4. Exchange complete; no expiry applies.

### 3.3 When Deadline Passes (Recipient Never Books)

A daily cron job runs `expire_accepted_exchange_without_reciprocal()` at 02:00 UTC.

**Case A — Broken accept** (no mutual session):

- Request `status` → `expired`
- Requester notified: "The treatment exchange request for [date] at [time] could not be completed. You can send a new request."

**Case B — Mutual session exists, reciprocal not booked**:

- `mutual_exchange_sessions.status` → `cancelled`
- Related `client_sessions` (requester's initial session) → `cancelled`
- Request `status` → `expired`
- Requester notified: "The recipient did not book their return session within 7 days. Your request for [date] at [time] has expired. You can send a new request."
- Recipient notified: "You did not book your return session within 7 days. The exchange request for [date] at [time] has expired."

**Credits:** No refund needed; credits are not deducted until both have booked.

---

## 4. Acceptance Criteria

| ID  | Criterion                                                                          | Verifiable                                       |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| AC1 | On accept, `reciprocal_booking_deadline` is set to `accepted_at + 7 days`          | DB column populated                              |
| AC2 | If recipient never books within 7 days, request expires                            | RPC updates status; both notified                |
| AC3 | If recipient books within 7 days, exchange completes; no expiry                    | `practitioner_b_booked = true`; credits deducted |
| AC4 | Broken accepts (accepted but no mutual session) are expired and requester notified | RPC Case A                                       |
| AC5 | Cancelled mutual session and requester's client_session when Case B runs           | DB updates                                       |
| AC6 | Cron runs daily at 02:00 UTC                                                       | Supabase cron job                                |

---

## 5. Edge Cases

| Edge case                                     | Expected behaviour                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Recipient books at day 6                      | Exchange completes; no expiry                                                             |
| Recipient books at day 8                      | Deadline already passed; cron may have run. If not yet run, cron will expire on next run. |
| Timezone of deadline                          | Uses server UTC; 7 calendar days from `accepted_at`                                       |
| Multiple accepted requests                    | Each has its own deadline; processed independently                                        |
| Recipient starts booking but doesn't complete | Treated as "never booked"; expiry applies at deadline                                     |
| Requester cancels before deadline             | Handled by `cancelExchangeSession`; no reciprocal expiry                                  |

---

## 6. Notifications

| Recipient          | Notification type             | Title                              |
| ------------------ | ----------------------------- | ---------------------------------- |
| Requester (Case A) | `exchange_reciprocal_expired` | Exchange Request Expired           |
| Requester (Case B) | `exchange_reciprocal_expired` | Reciprocal Booking Deadline Passed |
| Recipient (Case B) | `exchange_reciprocal_expired` | Reciprocal Booking Expired         |

---

## 7. Database

### Schema

- `treatment_exchange_requests.reciprocal_booking_deadline` — `timestamptz`, nullable
- Set on accept; backfilled for existing accepted requests using `accepted_at + 7 days`

### RPC

- `expire_accepted_exchange_without_reciprocal()` — returns `(expired_broken, expired_no_reciprocal)`

---

## 8. Enhancements (Implemented 2026-03-18)

| Enhancement           | Implementation                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reminder at day 5     | RPC `send_exchange_reciprocal_reminders()` runs daily at 10:00 UTC. Sends "You have 2 days left to book your return session" when deadline is 1.5–2.5 days away. |
| Configurable deadline | `app_config.exchange_reciprocal_deadline_days` (5, 7, or 14). Client fetches on accept. Default 7.                                                               |
| Extend deadline       | RPCs `request_exchange_extension` (recipient) and `approve_exchange_extension` (requester). UI: "Request extension" / "Approve +3 days" in New Bookings.         |
