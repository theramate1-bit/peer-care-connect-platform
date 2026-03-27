# Guest vs Client Rules (Development)

Concise rules for how **guests** and **registered clients** behave across the platform. Use this when implementing or changing flows that touch booking, messaging, email, or user identity.

For full detail and current gaps, see the [Guest vs Client System Logic Table](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md) and [Audit Backlog](../product/GUEST_VS_CLIENT_AUDIT_BACKLOG.md).

For touchpoint-by-touchpoint behaviour by user type, see: [USER_TYPE_GUEST.md](../product/USER_TYPE_GUEST.md) and [USER_TYPE_CLIENT.md](../product/USER_TYPE_CLIENT.md).

---

## Definitions

- **Guest**: A person who books (or is messaged) without a registered account. They have a `users` row with `user_role = 'guest'` and no auth identity. Created via `upsert_guest_user`; sessions use `client_id` = that guest user id and `is_guest_booking = true`.
- **Client**: A registered user with auth. They have a `users` row tied to `auth.uid()` and can log in. Sessions use `client_id` = that user id and `is_guest_booking = false` (or not set).

---

## Rules by area

### Booking creation

- **Guest**: Session is created with `p_client_id: guestUser.id` (from `upsert_guest_user`), `p_is_guest_booking: true`, `p_status: 'pending_payment'`, and `p_expires_at`. The RPC `create_booking_with_validation` must persist `is_guest_booking` on `client_sessions`.
- **Client**: Session is created with `client_id` = authenticated user id. Use the same status/expiry rules as guest where applicable (e.g. `pending_payment` until payment completes).
- **Consistency**: Do not show unpaid sessions as "confirmed" in practitioner views. Use `expire_pending_payment_bookings()` (or equivalent) so expired slots are not treated as confirmed.

### Practitioner diary and dashboard

- **Labelling**: Use `session.is_guest_booking === true` to show "Guest" / "Guest Session". Use `session.is_peer_booking` for "Treatment Exchange". All other sessions with a client are "Client" / "Client Session". Do not infer guest from `!session.client_id` or missing join to `users` when `is_guest_booking` is available.
- **Visibility**: Exclude `pending_payment` and `expired` from practitioner calendar/dashboard so unconfirmed bookings do not appear as confirmed.

### View booking details

- **Guest**: "View Booking Details" in the confirmation email uses a token-based URL: `/booking/view/:sessionId?token=...`. Validated via RPC `get_session_by_guest_token`. No login required.
- **Client**: Same link can be used if `guest_view_token` is set (e.g. after payment). Client can also use the app when logged in to see their bookings.

### Email workflows

- **Booking confirmation**: One template (`booking_confirmation_client`) for the booker; include `bookingUrl` (token link) when `guest_view_token` is set. Practitioner gets `booking_confirmation_practitioner`.
- **Practitioner → guest message**: Sent only when the recipient is a guest (`user_role === 'guest'`). Use Edge Function `notify-guest-message` and template `message_notification_guest`. Link in email is `/login` (guest must sign up to reply).

### Forms (Pre-assessment / GP)

- **Required**: First-time users (unrecognised email) must complete the form. Use `email_has_completed_pre_assessment` (or equivalent) to decide. Returning users (email already has a completed form) can skip.
- **Storage**: Forms are stored in `pre_assessment_forms` with `client_email` and `client_id`; reuse and recognition are by email.

### Account conversion (guest → client)

- **When**: On successful auth (e.g. after signup or login), AuthCallback runs and calls `linkGuestSessionsToUser` and `linkGuestConversationsToUser`.
- **Session linking**: RPC `link_guest_sessions_to_user(p_email, p_user_id)` updates `client_sessions.client_id` to the new user id for all sessions with that `client_email`, so "My Sessions" shows prior guest bookings.
- **Conversation linking**: RPC `link_guest_conversations_to_user(p_email, p_user_id)` links conversations so the new user sees prior guest messages.
- **Duplicate users**: The same email may have an old guest `users` row and a new auth-backed row. Linking moves sessions/conversations to the new id. Prefer documenting or implementing a rule to merge or deactivate the old guest row to avoid duplicate identities.

---

## Source of truth

- **Logic Table**: [docs/product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md) – row-per-capability, guest vs client behavior, consistency notes.
- **Backlog**: [docs/product/GUEST_VS_CLIENT_AUDIT_BACKLOG.md](../product/GUEST_VS_CLIENT_AUDIT_BACKLOG.md) – identified gaps and backlog items with acceptance criteria.

When in doubt, check the Logic Table for the capability you are changing and follow the rules above.
