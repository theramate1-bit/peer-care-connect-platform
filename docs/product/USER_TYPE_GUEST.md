# User type: Guest

**Feature-by-feature docs (this repo, `src/` + `theramate-ios-client/`):** [Guest features index](../features/guest/README.md)

**Definition:** A person who books (or is messaged) without a registered account. They have a `users` row with `user_role = 'guest'` created via `upsert_guest_user`. Sessions use `client_id` = that guest user id and `is_guest_booking = true`. No auth identity; they access booking details via token or email link.

---

## 1. Marketplace – flow selection and entry

- **Who is a guest:** Anyone on the marketplace who is **not** logged in (`!user`). No auth required to browse or start a booking.
- **Clinic booking:** When a guest starts checkout, the app uses **[src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx)** with **`guestMode`** (or equivalent props), not a separate top-level `GuestBookingFlow` file in this repo layout.
- **Mobile request:** Native and web flows share the same RPCs; guests supply identity fields before `create_mobile_booking_request`. See [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md).
- **Eligibility:** Guests see the same practitioner list as clients; eligibility is driven by practitioner **`therapist_type`** + product **`service_type`** (see hybrid doc above), not by guest vs client.

**Relevant files:** [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx) (`?guest=1`), [src/pages/discovery/TherapistSearch.tsx](../../src/pages/discovery/TherapistSearch.tsx)

---

## 2. ClientBooking page

- **Not used by guests.** The ClientBooking page (e.g. `/client/booking` or similar) is for **authenticated clients** only. It only renders **BookingFlow** and **MobileBookingRequestFlow**; there is no GuestBookingFlow on this page because the page is behind auth. Guests use the **public Marketplace** and get GuestBookingFlow when they choose clinic booking.

**Relevant file:** [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx)

---

## 3. Practitioner eligibility (historic `booking-flow-type.ts`)

- **No guest-specific logic.** This module defines **practitioner** eligibility (`canBookClinic`, `canRequestMobile`, etc.). Whether the booker is a guest or client does not change which flows are available for a given practitioner; it only changes **which component** is used for clinic booking (GuestBookingFlow vs BookingFlow) on the Marketplace.

**Relevant:** [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md), [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx), native `theramate-ios-client/app/(tabs)/explore/[id].tsx`.

---

## 4. Geo-search

- **Same as clients.** Guests can use location search and filters the same way. Distance and “within radius” are computed from practitioner data (clinic or base); there is no separate guest geo logic. Both guests and clients may pass `clientLocation` (e.g. from geo search) into **MobileBookingRequestFlow** when requesting a mobile session.

**Relevant:** Search `src/` for location/geo usage; [src/lib/marketplacePractitioners.ts](../../src/lib/marketplacePractitioners.ts).

---

## 5. GuestBookingFlow (clinic) – creation and data

- **Purpose:** Clinic booking for **unauthenticated** users. Only used when `!user` on Marketplace.
- **Steps:** Service/duration → Guest info (first name, last name, email, phone) + policy acceptance → Optional pre-assessment → Payment. Session is created **before** payment with status `pending_payment` and short expiry (e.g. 5 minutes).
- **Guest user:** `upsert_guest_user(p_email, p_first_name, p_last_name, p_phone)` returns the guest `users` row (or creates it). That id is used as `p_client_id`.
- **Session creation:** `create_booking_with_validation` is called with `p_client_id: guestUser.id`, `p_is_guest_booking: true`, `p_status: 'pending_payment'`, `p_expires_at`, and clinic-only params (`p_appointment_type: 'clinic'`, `p_visit_address: null`). The RPC must persist `is_guest_booking` on `client_sessions`.
- **Pre-assessment:** Same rule as clients: first-time (unrecognised email) → form required; returning (email has completed form) → can skip. `PreAssessmentService.checkFormRequirement(sessionId, guestUser.id)` and email-based recognition.
- **Payment:** After payment, webhook sets `status = 'confirmed'` and generates `guest_view_token`; confirmation email includes token-based “View booking” link.

**Relevant file:** [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx) (`guestMode` / guest RPC path inside same component tree as authenticated booking)

---

## 6. MobileBookingRequestFlow – guest path

- **When:** Guest (no `user`) chooses “Request mobile session” or equivalent on Marketplace. Same modal as for clients; guest fills **guestData** (first name, last name, email, phone) and address.
- **Guest user:** Before calling `create_mobile_booking_request`, the flow calls `upsert_guest_user` with guestData and uses the returned id as `p_client_id`.
- **Request creation:** `create_mobile_booking_request(p_client_id: clientId, ...)` with address, lat/lon, pre-assessment payload, etc. Backend does not distinguish guest vs client for the request itself; the `client_id` points to the guest user row.
- **Pre-assessment:** Email-based; same first-time vs returning logic. Optional marketing consent is stored on the guest user row (`marketing_consent_source: 'guest_mobile_booking_request'`).
- **Post-request:** Guest is directed to payment/checkout or “wait for practitioner to accept”; no in-app inbox. When practitioner accepts, session is created and confirmation email can include token link for viewing.

**Relevant:** Native `theramate-ios-client/lib/api/mobileRequests.ts`; search `src/` for web mobile-request UI.

---

## 7. Profile / Onboarding

- **Not applicable.** Guests have no profile or onboarding in the app. They may later **sign up** with the same email; see “Account conversion” below. Practitioner Profile and Onboarding are for practitioners only.

---

## 8. View booking / My Sessions

- **Token-based view:** Guest uses the link from the confirmation email: `/booking/view/:sessionId?token=...`. Validated via RPC `get_session_by_guest_token(p_session_id, p_token)`. No login required.
- **Email fallback:** Some links may use `?email=...` and RPC `get_session_by_email_and_id` for backwards compatibility or reminder emails.
- **Actions:** GuestBookingView shows session details, practitioner, time, location; guest can cancel or (if supported) reschedule via the same token/email link. They do **not** have a “My Sessions” dashboard; everything is link-based.
- **BookingSuccess:** After payment, guest is shown success; “View bookings” for guest points to `/booking/view/:sessionId?email=...` (or token when available), not `/client/sessions`.

**Relevant:** Search `src/` for guest booking view / success routes; compare `supabase/functions` email templates.

---

## 9. Email and messaging

- **Confirmation email:** Same template as clients (`booking_confirmation_client`). When `guest_view_token` is set (after payment), the email includes `bookingUrl` with the token so the guest can view without logging in.
- **Practitioner → guest message:** When the practitioner sends a message to a guest, the system uses Edge Function `notify-guest-message` and template `message_notification_guest`. The recipient is identified by `user_role === 'guest'`. The link in the email is **/login** (guest must sign up to reply in-app).
- **Guest reply:** Guest has no in-app inbox; they cannot reply without creating an account. Linking on signup (see below) attaches prior conversations to the new account.

**Relevant:** Stripe webhooks (`supabase/functions`), [src/components/messaging/RealTimeMessaging.tsx](../../src/components/messaging/RealTimeMessaging.tsx), `notify-guest-message` Edge Function.

---

## 10. Pre-assessment / GP form

- **Required:** First-time (unrecognised email) must complete; use `email_has_completed_pre_assessment` (or equivalent). Returning (email already has completed form) can skip.
- **Storage:** Forms stored in `pre_assessment_forms` with `client_email` and `client_id` (guest user id when applicable). Recognition and reuse are by email; same rule for guests and clients.

**Relevant:** Search repo for `pre_assessment`.

---

## 11. Account conversion (guest → client)

- **When:** Guest signs up or logs in with the same email used for a guest booking. **AuthCallback** runs after successful auth.
- **Profile creation/merge:** If the new auth user has no profile, the app may call `convert_guest_to_client_or_create_profile` (or similar) to create a client profile or merge from the guest row.
- **Session linking:** `MessagingManager.linkGuestSessionsToUser(email, userId)` calls RPC `link_guest_sessions_to_user(p_email, p_user_id)`. All sessions with matching `client_email` get `client_id` updated to the new user id so “My Sessions” shows prior guest bookings.
- **Conversation linking:** `MessagingManager.linkGuestConversationsToUser(email, userId)` calls RPC `link_guest_conversations_to_user(p_email, p_user_id)` so the new user sees prior guest messages in their inbox.
- **Duplicate users:** The same email may have an old guest `users` row and a new auth-backed row. Linking moves sessions and conversations to the new id; the old guest row may remain (see backlog: duplicate user handling).

**Relevant:** Search `src/` for OAuth completion / guest conversation linking; [src/components/messaging/RealTimeMessaging.tsx](../../src/components/messaging/RealTimeMessaging.tsx).

---

## 12. RescheduleService and cancel

- **Guest:** No direct use of RescheduleService in-app by the guest. If the guest view page (`GuestBookingView`) offers “Reschedule” or “Cancel”, it typically uses session id + token (or email) to call backend endpoints or RPCs that validate the guest and perform the action. Buffer rules (e.g. clinic vs mobile) are applied on the server for the practitioner’s type; the guest does not pass `therapistType` themselves.
- **Client:** Uses the app and RescheduleService with auth; see USER_TYPE_CLIENT.md.

**Relevant:** Search `src/` for guest token view; `supabase/` RPCs that accept token/email for guest actions.

---

## Summary table (guest at each touchpoint)

| Touchpoint                   | Guest behavior                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Discovery / booking**      | Web: [`ClientBooking`](../../src/pages/client/ClientBooking.tsx) with `?guest=1` → [`BookingFlow`](../../src/components/booking/BookingFlow.tsx) (`guestMode`); native: explore + booking routes. |
| **Practitioner eligibility** | Rules are **not** guest-specific; see [clinic-mobile-hybrid-flows.md](../features/clinic-mobile-hybrid-flows.md) and `therapist_type` / product handling in web + native code.                    |
| **Geo-search**               | Same as client; no special guest logic                                                                                                                                                            |
| **Clinic booking (web)**     | Guest contact fields + `guestMode`; RPC `create_booking_with_validation` with `p_is_guest_booking` (confirm in `supabase/`).                                                                      |
| **Mobile request**           | Web: [`createMobileRequestAndOpenCheckout`](../../src/lib/clientMarketplaceBooking.ts) when wired for guests; native: mobile request flows + same RPCs.                                           |
| **Profile / Onboarding**     | N/A                                                                                                                                                                                               |
| **View booking**             | Token or email link → guest view route (search `src/` / app router); no full client dashboard                                                                                                     |
| **Email / messaging**        | Confirmation with token link; practitioner→guest message email with /login link                                                                                                                   |
| **Pre-assessment**           | Email-based first-time vs returning; same as client                                                                                                                                               |
| **Account conversion**       | Auth callback: `linkGuestSessionsToUser`, `linkGuestConversationsToUser` (and `convert_guest_to_client_or_create_profile` when applicable)                                                        |
| **Reschedule / cancel**      | Token/email flows if implemented; no in-app RescheduleService until the user becomes a client                                                                                                     |

See also: [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md), [GUEST_VS_CLIENT_RULES.md](../development/GUEST_VS_CLIENT_RULES.md), [USER_TYPE_CLIENT.md](USER_TYPE_CLIENT.md).
