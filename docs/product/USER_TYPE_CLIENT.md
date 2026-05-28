# User type: Client

**Feature-by-feature docs (this repo, `src/` + `theramate-ios-client/`):** [Client features index](../features/client/README.md)

**Definition:** A registered user with auth. They have a `users` row tied to `auth.uid()` and can log in. Sessions use `client_id` = that user id and `is_guest_booking = false` (or not set). They can use the client dashboard, “My Sessions,” in-app messaging, and full booking flows without token links.

---

## 1. Marketplace – flow selection and entry

- **Who is a client:** Anyone on the marketplace who **is** logged in (`user` present). They may have arrived via `/marketplace` or other routes.
- **Clinic booking:** When a client clicks “Book” (or “Book at clinic” for a hybrid), the app opens **BookingFlow** (authenticated), not GuestBookingFlow. Logic: `user ? <BookingFlow /> : <GuestBookingFlow />`.
- **Mobile request:** Same **MobileBookingRequestFlow** is used for both guests and clients. For clients, the flow uses `user` and `userProfile`; `clientId = user.id`, no guestData or `upsert_guest_user`.
- **Eligibility:** Clients see the same practitioner list and filters as guests; practitioner eligibility follows **`users.therapist_type`** + product `service_type` (see [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md); web: [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx)).

**Relevant files:** [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx), [src/pages/discovery/TherapistSearch.tsx](../../src/pages/discovery/TherapistSearch.tsx)

---

## 2. ClientBooking page

- **Client-only.** This page is for authenticated clients (e.g. `/client/booking` or similar). It lists practitioners and allows booking; it **only** renders **BookingFlow** and **MobileBookingRequestFlow** (no GuestBookingFlow). URL params (e.g. `?practitioner=...&mode=mobile`) can preselect practitioner and open clinic or mobile flow.
- **Use case:** Clients who prefer a dedicated “book a session” experience without going through the main marketplace; same flows, different entry point.

**Relevant file:** [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx)

---

## 3. Practitioner eligibility (historic `booking-flow-type.ts`)

- **No client-specific logic.** Eligibility is driven by practitioner **`therapist_type`** and product **`service_type`**. Whether the booker is a guest or client affects which **wrapper** opens for payment/session creation, not which practitioners appear in the list.

**Relevant:** [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md), [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx), native `theramate-ios-client/app/(tabs)/explore/[id].tsx` (`canBookClinic` / `canRequestMobile`).

---

## 4. Geo-search

- **Same as guests.** Clients can use location search and filters; distance and “within radius” are computed from practitioner data. Both may pass `clientLocation` into **MobileBookingRequestFlow**. Client may have saved address or profile location in other parts of the app; geo-search itself does not differentiate guest vs client.

**Relevant:** Search `src/` for geo / location filters; [src/lib/marketplacePractitioners.ts](../../src/lib/marketplacePractitioners.ts) for list data.

---

## 5. BookingFlow (authenticated) – clinic booking

- **Purpose:** Clinic booking for **authenticated** users. Only used when `user` is present (Marketplace or ClientBooking).
- **Identity:** Uses `user.id` as `p_client_id` and `userProfile` for name, email, phone. No guest user creation.
- **Session creation:** `create_booking_with_validation` is called with `p_client_id: user.id`, `p_is_guest_booking: false` (or omitted), and clinic params. Status should align with guest flow where applicable (e.g. `pending_payment` until payment; webhook sets `confirmed`).
- **Pre-assessment:** Same rule as guests: first-time vs returning by email; `PreAssessmentService.checkFormRequirement(sessionId, user.id)`.
- **Post-booking:** Client can be redirected to BookingSuccess and then to “My Sessions” or dashboard; no token needed for viewing.

**Relevant file:** [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx)

---

## 6. MobileBookingRequestFlow – client path

- **When:** Client (logged in) chooses “Request mobile session” (or equivalent). Flow uses `user` and `userProfile`; no guest form.
- **Identity:** `clientId = user.id`, `clientEmail = userProfile.email || user.email`, `clientName` from profile. No `upsert_guest_user`.
- **Request creation:** `create_mobile_booking_request(p_client_id: user.id, ...)` with address, lat/lon, pre-assessment payload, etc. Same RPC as for guests; backend distinguishes by `client_id` pointing to an auth-backed user.
- **Pre-assessment:** Email-based; same first-time vs returning logic.
- **Post-request:** Client can see request status in app (e.g. MobileRequestStatus, client dashboard). When practitioner accepts, session appears in “My Sessions”; client can view, reschedule, or cancel in-app.

**Relevant:** Native `theramate-ios-client/lib/api/mobileRequests.ts`; search `src/` for web mobile-request UI.

---

## 7. Profile / Onboarding

- **Client profile:** Clients have a user profile (name, email, phone, etc.) in `users`. They can edit it from account/settings or profile pages. This is **not** practitioner onboarding; practitioner Profile and Onboarding are separate.
- **Role:** Client has `user_role = 'client'`. No product form or practice management; those are for practitioners.

**Relevant:** Client-facing profile/settings components (if any); `users` table and auth.

---

## 8. View booking / My Sessions

- **Dashboard and list:** Client uses `/client/sessions` (or similar) and dashboard to see upcoming and past sessions. No token required; access is via auth.
- **Session detail:** SessionDetailView (or equivalent) shows full session details, practitioner, location, documents, notes; client can reschedule, cancel, or message practitioner from the same view.
- **BookingSuccess:** “View bookings” for client points to `/client/sessions` (or dashboard), not the token-based guest view.
- **Token link:** If a client previously booked as a guest and then signed up, their sessions are linked to the new account; they can also use the app. Confirmation emails may still include a token link for consistency; both app and token link can work.

**Relevant:** Search `src/pages` / `src/components` for booking success and session detail; native client sessions under `theramate-ios-client/app/(tabs)/bookings/`.

---

## 9. Email and messaging

- **Confirmation email:** Same template as guests (`booking_confirmation_client`). When `guest_view_token` is set, email can include token link; client can also use the app without the link.
- **Practitioner → client message:** When the practitioner sends a message to a **registered** client (not guest), the client receives in-app messaging; no special “guest” email path. Conversation is in the app; client can reply from the inbox.
- **Guest vs client:** Recipient is identified by user role; `user_role === 'guest'` triggers guest email notification with /login link; otherwise normal in-app conversation.

**Relevant:** [src/components/messaging/RealTimeMessaging.tsx](../../src/components/messaging/RealTimeMessaging.tsx), [src/pages/messages/Messages.tsx](../../src/pages/messages/Messages.tsx); Edge Function `notify-guest-message` (guest branch only).

---

## 10. Pre-assessment / GP form

- **Same as guests.** First-time (unrecognised email) must complete; returning (email has completed form) can skip. Forms stored in `pre_assessment_forms` with `client_email` and `client_id` (client user id when authenticated). Recognition by email.

**Relevant:** Search repo for `pre_assessment` / `pre_assessment_service`.

---

## 11. Account conversion

- **Not applicable.** Client is already registered. If they previously had guest bookings with the same email, linking is done at signup/login in AuthCallback (see USER_TYPE_GUEST.md). Once linked, those sessions appear under the client account.

---

## 12. RescheduleService and cancel

- **In-app reschedule:** Client uses the app to reschedule; RescheduleService (or equivalent) is called with auth context. `therapistType` and `requestedAppointmentType` (from the session or practitioner) are used for buffer checks (e.g. 15 min clinic, 30 min clinic↔mobile or mobile↔mobile). Session and practitioner data are loaded from the backend; client does not pass practitioner type directly.
- **Cancel:** Client can cancel from SessionDetailView or session list; backend validates ownership via `client_id` and auth.

**Relevant:** [src/components/booking/RescheduleSessionButton.tsx](../../src/components/booking/RescheduleSessionButton.tsx); native session APIs under `theramate-ios-client/lib/api/`.

---

## Summary table (client at each touchpoint)

| Touchpoint                     | Client behavior                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Discovery / booking**        | Web: [`ClientBooking`](../../src/pages/client/ClientBooking.tsx) → [`BookingFlow`](../../src/components/booking/BookingFlow.tsx); native: explore + `app/booking`. |
| **Practitioner eligibility**   | Same as guest; not client-specific — see [clinic-mobile-hybrid-flows.md](../features/clinic-mobile-hybrid-flows.md).                                               |
| **Geo-search**                 | Same as guest; no special client logic                                                                                                                             |
| **Clinic booking (web)**       | Authenticated clinic booking; `client_id` = user id; `is_guest_booking` false/unset                                                                                |
| **Mobile request**             | Web/native mobile request checkout paths; `create_mobile_booking_request` + Stripe as wired                                                                        |
| **Profile**                    | Client profile (`users` row); not practitioner onboarding                                                                                                          |
| **View booking / My Sessions** | Logged-in sessions UI (search `src/` / native `app/` routes)                                                                                                       |
| **Email / messaging**          | Same confirmation template; in-app messaging for practitioner messages                                                                                             |
| **Pre-assessment**             | Email-based first-time vs returning; same as guest                                                                                                                 |
| **Account conversion**         | N/A (already client); may have had guest sessions linked on signup                                                                                                 |
| **Reschedule / cancel**        | In-app via RescheduleService and session actions; buffer rules by therapist type                                                                                   |

See also: [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md), [GUEST_VS_CLIENT_RULES.md](../development/GUEST_VS_CLIENT_RULES.md), [USER_TYPE_GUEST.md](USER_TYPE_GUEST.md).
