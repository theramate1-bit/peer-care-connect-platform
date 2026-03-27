# Guest vs Client Audit – Gaps and Backlog

This document lists **inconsistencies** between guest and client handling identified in the audit, with priorities and backlog-ready items. Detail is in the [Guest vs Client System Logic Table](GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md).

---

## Priority definitions

- **P0**: Wrong data or broken flows (e.g. diary shows guest as client; view link requires login when it should not).
- **P1**: Confusing or inconsistent UX; behavior works but is inconsistent or misleading.
- **P2**: Cleanup, documentation, or hardening (e.g. duplicate user handling, RPC verification).

---

## Backlog items

### 1. Practitioner diary: use `is_guest_booking` for Guest vs Client label

| Field                 | Value                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Area**              | Practitioner diary                                                                                                                                                                                                             |
| **Current behavior**  | BookingCalendar infers guest via `!session.client_id \|\| (session.client_name && !session.client)`. Guest bookings set `client_id` to the guest user id, so the join returns a user and the heuristic marks them as "Client". |
| **Expected behavior** | Sessions with `is_guest_booking === true` display as "Guest" / "Guest Session"; others as "Client" / "Client Session" (and peer as "Treatment Exchange").                                                                      |
| **Location**          | [BookingCalendar.tsx](peer-care-connect/src/components/BookingCalendar.tsx) (therapist branch, mapping of sessions to BookingEvent).                                                                                           |
| **Priority**          | **P0**                                                                                                                                                                                                                         |

**Backlog item**

- **Title:** Use `is_guest_booking` in practitioner diary to label Guest vs Client.
- **Acceptance criteria:**
  - When building diary events from `client_sessions`, if `session.is_guest_booking === true`, set `bookingType = 'guest'` and title/type show "Guest" / "Guest Session".
  - Peer bookings unchanged (`is_peer_booking` → Treatment Exchange).
  - All other sessions with a client show as "Client" / "Client Session".
  - No reliance on `!session.client_id` or `!session.client` for guest detection when `is_guest_booking` is available.

---

### 2. Ensure `create_booking_with_validation` sets `is_guest_booking`

| Field                 | Value                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Area**              | Booking creation                                                                                                                                                                                                                                                                                                                              |
| **Current behavior**  | GuestBookingFlow passes `p_is_guest_booking: true`. The column exists on `client_sessions`. The migration [20250306100000](peer-care-connect/supabase/migrations/20250306100000_add_is_guest_booking_to_client_sessions.sql) instructs updating the RPC in Supabase; it is unclear if the RPC INSERT in the repo includes `is_guest_booking`. |
| **Expected behavior** | RPC `create_booking_with_validation` INSERT sets `is_guest_booking = COALESCE(p_is_guest_booking, false)`.                                                                                                                                                                                                                                    |
| **Location**          | Supabase RPC `create_booking_with_validation` (and any migration in repo that defines it).                                                                                                                                                                                                                                                    |
| **Priority**          | **P0** (required for diary fix above)                                                                                                                                                                                                                                                                                                         |

**Backlog item**

- **Title:** Verify and fix `create_booking_with_validation` to set `is_guest_booking` from parameter.
- **Acceptance criteria:**
  - RPC accepts `p_is_guest_booking` (or equivalent) and writes it to `client_sessions.is_guest_booking`.
  - A migration in the repo (or documented Supabase change) reflects this.
  - New guest bookings have `is_guest_booking = true` in the database.

---

### 3. Authenticated booking flow: status and confirmation consistency

| Field                 | Value                                                                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Area**              | Booking creation / confirmation                                                                                                                                                                                |
| **Current behavior**  | Per [BOOKING_FLOW_AUDIT_REPORT.md](peer-care-connect/BOOKING_FLOW_AUDIT_REPORT.md), authenticated flow may create sessions with `status: 'scheduled'` before payment, while guest flow uses `pending_payment`. |
| **Expected behavior** | Both flows: session is not "confirmed" until payment succeeds; unconfirmed sessions should not appear as confirmed in practitioner views.                                                                      |
| **Location**          | [BookingFlow.tsx](peer-care-connect/src/components/marketplace/BookingFlow.tsx) (authenticated), create_booking_with_validation, stripe-webhooks.                                                              |
| **Priority**          | **P1**                                                                                                                                                                                                         |

**Backlog item**

- **Title:** Align authenticated booking status with guest flow (pending_payment until payment).
- **Acceptance criteria:**
  - Authenticated client booking creates session with `status: 'pending_payment'` (or equivalent) until payment completes.
  - Webhook updates session to confirmed after payment.
  - Practitioner diary/dashboard do not show unpaid sessions as confirmed.
  - Document any intentional differences in status progression for guest vs client.

---

### 4. Verify and document guest→client linking RPCs

| Field                 | Value                                                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Area**              | Account conversion                                                                                                                                                                                                      |
| **Current behavior**  | AuthCallback calls `linkGuestSessionsToUser` and `linkGuestConversationsToUser`; these call RPCs `link_guest_sessions_to_user` and `link_guest_conversations_to_user`. RPCs were not found in the workspace migrations. |
| **Expected behavior** | RPCs exist in the database; sessions with matching `client_email` get `client_id` updated to new user id; conversations are linked so the new user sees prior guest messages.                                           |
| **Location**          | Supabase migrations (or external DB), [AuthCallback.tsx](peer-care-connect/src/components/auth/AuthCallback.tsx), [messaging.ts](peer-care-connect/src/lib/messaging.ts).                                               |
| **Priority**          | **P2**                                                                                                                                                                                                                  |

**Backlog item**

- **Title:** Verify and document link_guest_sessions_to_user and link_guest_conversations_to_user.
- **Acceptance criteria:**
  - Confirm both RPCs exist and are deployed.
  - Document their behavior (e.g. in Logic Table or dev docs): which tables/columns are updated, by what key (email/user_id).
  - If missing, add migrations that define these RPCs and add to version control.

---

### 5. Duplicate user row handling when guest becomes client

| Field                 | Value                                                                                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Area**              | Account conversion                                                                                                                                                                                          |
| **Current behavior**  | Guest has a `users` row (guest id). On signup, auth creates a new user id and handle_new_user (or similar) creates another `users` row. Linking moves sessions to the new id; the old guest row may remain. |
| **Expected behavior** | No duplicate active users for the same email; either merge guest row into auth row or mark guest row as superseded so reporting and lookups are correct.                                                    |
| **Location**          | handle_new_user trigger, link_guest_sessions_to_user, users table.                                                                                                                                          |
| **Priority**          | **P2**                                                                                                                                                                                                      |

**Backlog item**

- **Title:** Define and implement handling of duplicate user rows when guest signs up.
- **Acceptance criteria:**
  - Product rule decided: merge guest into auth user, or mark guest row inactive/superseded, or leave as-is with clear documentation.
  - If merging or deactivating: implement in trigger or in link RPC; update any code that looks up user by email to respect the rule.
  - Document in [GUEST_VS_CLIENT_RULES.md](../development/GUEST_VS_CLIENT_RULES.md).

---

## Summary

| Priority | Count | Focus                                                                 |
| -------- | ----- | --------------------------------------------------------------------- |
| P0       | 2     | Diary label using `is_guest_booking`; RPC writing `is_guest_booking`. |
| P1       | 1     | Authenticated booking status vs guest consistency.                    |
| P2       | 2     | RPC verification/documentation; duplicate user handling.              |

After implementing P0 items, the practitioner diary will correctly show Guest vs Client. P1 and P2 improve consistency and maintainability.

See also: [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md), [GUEST_VS_CLIENT_RULES.md](../development/GUEST_VS_CLIENT_RULES.md).
