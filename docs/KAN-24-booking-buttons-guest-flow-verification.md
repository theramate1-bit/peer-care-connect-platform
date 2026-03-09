# KAN-24: Booking Buttons & Guest Flow Verification

**Story:** Check the buttons work; if client doesn't have an account what happens? If they create an account, does the session show up on their account?

## 1. Button behaviour

- **Marketplace (logged out):**
  - **Book** / **Book Clinic** on a practitioner card: opens **GuestBookingFlow** (guest can enter name, email, phone, select service/time, complete pre-assessment, then pay via Stripe). Same `showBookingFlow` + `selectedPractitioner` state; `user` is falsy so the modal renders `GuestBookingFlow`.
  - **Request Mobile**: not shown when logged out (`showMobileRequestFlow && selectedPractitioner && user`). Guests must sign in to request mobile; by design.
- **Marketplace (logged in):**
  - **Book** / **Book Clinic**: opens **BookingFlow** (logged-in client flow).
  - **Request Mobile**: opens **MobileBookingRequestFlow** (only when `user` is present).

**Conclusion:** Buttons behave as intended; guest path uses GuestBookingFlow, logged-in path uses BookingFlow / MobileBookingRequestFlow.

## 2. No account (guest) path

- Guest clicks Book → **GuestBookingFlow** opens.
- Guest enters contact info; app calls `upsert_guest_user(p_email, p_first_name, p_last_name, p_phone)` which creates or updates a row in `public.users` with `user_role = 'guest'` and returns that user’s `id`.
- Booking is created via `create_booking_with_validation` with **`p_client_id: guestUser.id`**, so `client_sessions.client_id` is set to the guest user’s id and `client_email` is set to the guest’s email.
- Session is therefore associated with a “guest” user row from the moment of booking; guest has no auth account but has a `users` row and sessions linked to it.

**Conclusion:** When the client doesn’t have an account, they book as a guest; the session is stored with a guest `users` row and appears under that identity in the DB.

## 3. Guest later creates an account – does the session show up?

- When a guest later **signs up** (same email), Supabase Auth creates a new auth user with a new `id`. The `handle_new_user` trigger creates/updates a `public.users` row with that auth `id`. So we have (or may have) two `users` rows for the same email: the original guest row (id = guest id) and the new auth-backed row (id = auth user id).
- On successful auth, **AuthCallback** runs and calls:
  - `MessagingManager.linkGuestSessionsToUser(user.email, user.id)`  
  which runs the RPC **`link_guest_sessions_to_user(p_email, p_user_id)`**.
- That RPC does:
  - `UPDATE client_sessions SET client_id = p_user_id WHERE client_email = p_email AND (client_id IS NULL OR client_id != p_user_id)`.
- So all sessions with that `client_email` (including those currently tied to the old guest user id) are updated to `client_id = new auth user id`. The client’s “My Sessions” (or equivalent) is keyed by the logged-in user id, so those sessions will show up.

**Conclusion:** Yes. If they create an account with the same email, the session shows up on their account because `link_guest_sessions_to_user` is run in AuthCallback and reassigns those sessions to the new user id.

## 4. Code / UX changes for KAN-24

- **GuestBookingFlow (step 2 – contact info):** Added a short note: *“If you create an account later using this email, this booking will appear under My Sessions.”* so guests know that creating an account will link the booking.
- No change to button logic, guest RPC, or link RPC; behaviour was already correct; verification and UX copy were added.

## 5. References

- **Marketplace:** `src/pages/Marketplace.tsx` (booking/mobile modals, `user` check).
- **Guest booking:** `src/components/marketplace/GuestBookingFlow.tsx` (`upsert_guest_user`, `create_booking_with_validation` with `p_client_id: guestUser.id`).
- **Linking on signup:** `src/components/auth/AuthCallback.tsx` (calls `linkGuestSessionsToUser`); `src/lib/messaging.ts` (`linkGuestSessionsToUser`); `supabase/migrations/20250126_guest_messaging.sql` (`link_guest_sessions_to_user`).
- **Guest user upsert:** `supabase/migrations/20251202_fix_guest_upsert_rls.sql` (`upsert_guest_user`).
