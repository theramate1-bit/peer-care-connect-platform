# Mobile & Hybrid Practitioner Booking – UX & Email Gaps Analysis

**Scope:** Client and guest booking with **mobile** and **hybrid** practitioners: UX flow, data collected (especially address/location), and emails sent.

---

## 1. Summary of Current Behaviour

### 1.1 Entry points and flows

| Entry point                      | Who can book      | Flow used                                                                              | Mobile/hybrid handling                                                                           |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Direct booking** `/book/:slug` | Anyone            | `BookingFlow` / `GuestBookingFlow` (clinic) **or** `MobileBookingRequestFlow` (mobile) | ✅ Uses `canBookClinic` / `canRequestMobile`. Hybrid gets choice; mobile-only opens mobile flow. |
| **Marketplace**                  | Logged-in / guest | `BookingFlow` / `GuestBookingFlow`                                                     | ⚠️ No therapist_type–based branching; no “Book at clinic” vs “Request mobile” for hybrid.        |
| **Profile / other**              | Varies            | Same as above via `booking-flow-type`                                                  | Depends on whether entry point passes therapist_type and offers both CTAs.                       |

### 1.2 What each flow collects

- **BookingFlow (authenticated clinic):** Service, date/time, policy, optional intake. **No address/location.**
- **GuestBookingFlow (guest clinic):** Service, date/time, guest name/email/phone, policy, pre-assessment. `bookingData.location` exists but is **never shown in UI or sent to the backend.**
- **MobileBookingRequestFlow:** Service, date/time, **client address** (required), lat/lon, notes, guest/client details. Uses `create_mobile_booking_request` with `p_client_address` and coords.

### 1.3 Data model

- **`client_sessions`** (Supabase types): **No** `session_location`, `client_address`, or `visit_address`. Standard bookings do not store where the session takes place.
- **Mobile path:** `create_mobile_booking_request` RPC takes `p_client_address`, `p_client_latitude`, `p_client_longitude`. That data lives in the mobile-request path (and any tables it writes to), not in `client_sessions` as a generic column.
- **create_booking_with_validation** (standard guest/booking): **No** address or location parameters.

---

## 2. UX Gaps

### 2.1 No address collected in standard booking flows

- **Gap:** For **mobile** and **hybrid** practitioners, if a client or guest books via **GuestBookingFlow** or **BookingFlow** (e.g. marketplace “Book” that doesn’t use mobile flow), **no visit address is collected**.
- **Risk:** Practitioner is mobile/hybrid but gets a booking with no “where to go”; client may assume therapist will come to them.
- **Cause:** Standard flows don’t branch on `therapist_type` and don’t have an address step; `GuestBookingFlow.bookingData.location` is unused.

**Recommendation:**

- For **marketplace (and any shared “Book” CTA):** If practitioner is mobile or hybrid, either (a) route to a flow that collects visit address (e.g. reuse/adapt MobileBookingRequestFlow), or (b) show explicit “Book at clinic” vs “Request mobile visit” and only use GuestBookingFlow/BookingFlow for clinic.
- For **hybrid:** Always show the two options and pass therapist_type/products so the correct flow (clinic vs mobile) is used.

### 2.2 “Location” in guest booking is misleading for mobile

- **Gap:** In **GuestBookingFlow** step 1, the “Location” card shows `practitioner.location`. For mobile practitioners that is the **practitioner’s base address** (not “we come to you”), so it’s ambiguous. For clinic, it’s the clinic address.
- **Risk:** Clients think they must go to that address, or are confused about whether the therapist travels.

**Recommendation:**

- If `therapist_type === 'mobile'`: show copy like “This practitioner travels to you. You’ll be asked for your address in the next steps,” and ensure the flow actually collects address (e.g. use mobile flow).
- If hybrid, show both options (clinic address vs “I’ll travel to you”) and make the chosen flow clear.

### 2.3 Marketplace may not differentiate mobile/hybrid

- **Gap:** Marketplace listing and “Book” CTA may not use `therapist_type` or `canBookClinic` / `canRequestMobile`. So clients might not see “Travels to you” or “Clinic & mobile” and may not get the choice or the right flow.
- **Recommendation:** In marketplace practitioner cards/list: show therapist type (e.g. “Clinic”, “Travels to you”, “Clinic & mobile”). When user clicks “Book”, resolve flow type (clinic vs mobile) and open the correct flow or show the choice for hybrid.

### 2.4 Hybrid: clarity of “where” the session is

- **Gap:** For hybrid, if the user picks “Book at clinic,” the session location is the practitioner’s clinic. If they pick “Request mobile,” the location is the client’s address. Confirmation and emails should state which it is.
- **Recommendation:** Store and display “Session at [clinic address]” vs “Session at your address: [client address]” in UI and in all confirmation/reminder emails.

---

## 3. Email Gaps

### 3.1 Session location in emails

- **send-email** supports `sessionLocation` and `directionsUrl` in the payload. Templates use them as follows:
  - **booking_confirmation_client:** shows “Location: {sessionLocation}” and “Get Directions” (directionsUrl) when provided.
  - **booking_confirmation_practitioner:** **does not** include session location or client address in the template. So for mobile, the practitioner email does **not** say where to go.
  - **session_reminder_24h / 1h:** use sessionLocation and directionsUrl when provided.

- **Gap 1 – Practitioner confirmation:** For mobile (and hybrid mobile) bookings, the practitioner never receives the **client’s address** (or “Session at client’s address”) in the booking confirmation email. They only get client name, email, date, time, etc.

**Recommendation:**

- Add to **booking_confirmation_practitioner** template: when it’s a mobile (or at-home) session, show a clear “Session location / Visit address” line (client address). Optionally add a “Get directions” link (e.g. directionsUrl to client address).
- Ensure whoever calls `send-email` for booking confirmation (e.g. Stripe webhook or post-payment handler) passes `sessionLocation` (and optionally `directionsUrl`) for mobile bookings, derived from the mobile request or session record that holds client address.

- **Gap 2 – Client confirmation:** If the caller doesn’t pass `sessionLocation` (e.g. for standard bookings we don’t have it; for mobile we might not map it into the email payload), the client confirmation won’t show location/directions. For **clinic** bookings, sessionLocation should be the clinic address so the client knows where to go. For **mobile** bookings, sessionLocation could be “Your address: [address]” so the client sees what we have on file.

**Recommendation:**

- For **clinic** (and hybrid clinic): pass practitioner’s clinic address as `sessionLocation` and a maps link as `directionsUrl`.
- For **mobile**: pass client’s visit address as `sessionLocation` and a directions link for the practitioner; in the client email, pass the same or “Your address” so the client can confirm it.

### 3.2 Who invokes send-email and what they pass

- Booking confirmation emails are triggered after payment (e.g. Stripe webhook or similar). The exact caller in this repo was not fully traced, but:
  - **client_sessions** has no `session_location` column, so standard booking path has nowhere to read “session location” from unless it’s joined from elsewhere (e.g. practitioner’s clinic or a mobile_booking_requests table).
  - For **mobile**, the client address is in the mobile request; the post-payment flow that creates/updates the session and calls `send-email` must look up that request and pass client address as `sessionLocation` (and build directionsUrl) into both client and practitioner emails.

**Recommendation:**

- In the post-payment / webhook handler that invokes `send-email` for `booking_confirmation_client` and `booking_confirmation_practitioner`:
  - Resolve session type (clinic vs mobile), e.g. from session metadata or linked mobile_booking_request.
  - For **clinic:** set `sessionLocation` (and `directionsUrl`) from practitioner’s clinic address.
  - For **mobile:** set `sessionLocation` (and `directionsUrl`) from the stored client visit address.
- Extend practitioner template to show this location (see above).

### 3.3 In-app notifications

- **SessionNotifications** (e.g. “Booking confirmed”) messages do **not** include location or address. For mobile, it would help if the in-app message to the practitioner included “Visit address: …”.

**Recommendation:**

- For mobile bookings, include the visit address (or “At client’s address”) in the relevant in-app notification text for the practitioner.

---

## 4. Details Practitioners Need (Mobile/Hybrid)

For a **mobile** or **hybrid (mobile)** booking, the practitioner needs:

| Detail                   | Collected today                     | Where         | In practitioner email?          |
| ------------------------ | ----------------------------------- | ------------- | ------------------------------- |
| Client name              | ✅                                  | All flows     | ✅                              |
| Client email             | ✅                                  | All flows     | ✅                              |
| Client phone             | ✅                                  | Guest/mobile  | ⚠️ Check template               |
| **Visit address**        | ✅ Only in MobileBookingRequestFlow | RPC + context | ❌ Not in confirmation template |
| Date & time              | ✅                                  | All flows     | ✅                              |
| Service / session type   | ✅                                  | All flows     | ✅                              |
| Notes / special requests | Optional in mobile flow             | Mobile flow   | ⚠️ Check template               |

So the main missing piece in **emails** is **visit address** in the practitioner confirmation. The **UX** gap is that if they don’t use the mobile flow (e.g. wrong entry point), we never collect visit address at all.

---

## 5. Recommendations (prioritised)

1. **Practitioner confirmation email (mobile):** Add “Session location / Visit address” (and optionally “Get directions”) to the booking_confirmation_practitioner template; ensure the email payload includes `sessionLocation` (and `directionsUrl`) for mobile bookings from the stored client address.
2. **Post-payment email payload:** In the code that invokes `send-email` after payment, resolve clinic vs mobile; for clinic pass clinic address; for mobile pass client visit address; use for both client and practitioner emails.
3. **Marketplace & “Book” CTA:** Use `therapist_type` and `canBookClinic` / `canRequestMobile` so that (a) mobile-only practitioners open the mobile flow, (b) hybrid practitioners get “Book at clinic” vs “Request mobile” and the correct flow for each, and (c) standard GuestBookingFlow/BookingFlow are only used for clinic bookings (or add an address step when practitioner is mobile).
4. **GuestBookingFlow:** Either remove the unused `bookingData.location` or use it: when the practitioner is mobile/hybrid, add a “Visit address” step and pass it into booking creation (and extend backend to accept/store it for standard sessions if needed).
5. **Clinic address in client email:** For clinic (and hybrid clinic) bookings, always pass practitioner’s clinic address and directions link in client confirmation so “where to go” is clear.
6. **In-app notifications:** For mobile bookings, include visit address in the practitioner-facing booking notification.

---

## 6. File reference

- **Flows:** `BookingFlow.tsx`, `GuestBookingFlow.tsx`, `MobileBookingRequestFlow.tsx` (marketplace); `DirectBooking.tsx` (direct).
- **Flow type:** `lib/booking-flow-type.ts` (`canBookClinic`, `canRequestMobile`, `defaultBookingFlowType`).
- **Booking creation:** `create_booking_with_validation` (no address); `create_mobile_booking_request` (has `p_client_address`).
- **Emails:** `supabase/functions/send-email/index.ts` (templates and `sessionLocation` / `directionsUrl` usage).
- **Session data:** `client_sessions` (no session_location in current types); mobile request data in RPC/localStorage/context.
- **Notifications:** `lib/session-notifications.ts`.

---

## 7. Implementation status (post-fix)

- **Practitioner confirmation email:** Template updated to show "Session location / Visit address" and "Get Directions" when `sessionLocation` and `directionsUrl` are provided (`send-email/index.ts`).
- **Post-payment email trigger:** `stripe-webhooks` now sends booking confirmation emails on `payment_intent.succeeded` when `metadata.session_id` is set. It loads session + practitioner, sets `sessionLocation` and `directionsUrl` from practitioner `location` (clinic address), and calls `send-email` for both `booking_confirmation_client` and `booking_confirmation_practitioner` with `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY`. Mobile client address is not yet in `client_sessions`; when added (e.g. column or linked mobile request), the same flow can pass it for mobile sessions.
- **Marketplace / Book CTA:** DirectBooking (`/book/:slug`) already uses `canBookClinic` / `canRequestMobile` and shows "Book at clinic" vs "Request mobile" for hybrid; mobile-only uses mobile flow. No separate marketplace listing page found in repo.
- **In-app notifications:** `SessionNotificationTrigger` supports optional `sessionLocation`; `booking_created` message appends "Visit address: {sessionLocation}" when provided. Callers (e.g. mobile flow completion) can pass it when available.
- **Tests:** Unit tests for `canBookClinic`, `canRequestMobile`, `defaultBookingFlowType` in `src/lib/booking-flow-type.test.ts` (run: `npx jest src/lib/booking-flow-type.test.ts`).

### Production verification checklist

- **Resend:** In Resend dashboard, ensure API key is created and the "From" domain is verified. Set `RESEND_API_KEY` in Supabase Edge Function secrets for `send-email`.
- **Supabase:** For `stripe-webhooks`, ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set (so it can invoke `send-email`). For `send-email`, ensure `RESEND_API_KEY` is set.
- **Stripe:** Webhook endpoint should point to `https://<project-ref>.supabase.co/functions/v1/stripe-webhooks` and include `payment_intent.succeeded` (and other required events).
- **Optional:** Use Supabase MCP `list_edge_functions` with your `project_id` to confirm `send-email` and `stripe-webhooks` are deployed; use Resend dashboard or CLI to send a test email.

---

_Last updated: March 2025_
