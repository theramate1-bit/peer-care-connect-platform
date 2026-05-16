# Guest — identity & session model

## Definition

A **guest** is someone who books or is contacted **without** a normal Supabase Auth session tied to that booking identity. They still get a row in `public.users` with `user_role = 'guest'` so FKs and messaging work.

## Data rules

| Concept         | Implementation                                                                                                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest user row  | `users.user_role = 'guest'`; for marketplace/manual flows this repo often uses **`ensure_guest_user_for_booking(email, name)`** (see migrations). Legacy docs mention `upsert_guest_user`; behaviour is the same class of operation (find-or-create by email). |
| Session ↔ guest | `client_sessions.client_id` → that guest’s `users.id`                                                                                                                                                                                                          |
| Explicit flag   | **`client_sessions.is_guest_booking = true`** — use this for UI labels (Guest vs Client). Do not infer guest only from missing auth.                                                                                                                           |

## Key RPCs / DB (repo `supabase/`)

- **`ensure_guest_user_for_booking`** — anon-capable find-or-create guest by email; used from web and native manual/guest booking flows.
- **`get_session_by_guest_token`** — read session details for magic-link views when `guest_view_token` matches (`anon` can execute where granted).
- **`get_or_create_guest_conversation`** — practitioner messaging to an email may create/link a guest user (see [06-messaging-and-notifications.md](./06-messaging-and-notifications.md)).

## Code references

| Layer           | Files                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration / SQL | `supabase/migrations/20260416120000_cash_bookings_v1_gap_closure.sql` (`ensure_guest_user_for_booking`), `20260306_get_or_create_guest_conversation.sql`, `20260306_guest_booking_view_token.sql` |
