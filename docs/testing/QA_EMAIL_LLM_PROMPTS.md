# QA Email / Guest / Location – LLM Tester Prompts

Short prompts for an AI tester to execute steps from [QA_EMAIL_GUEST_LOCATION_CHECKLIST.md](QA_EMAIL_GUEST_LOCATION_CHECKLIST.md). Use the section numbers when reporting results.

---

## Section 2 – Booking confirmation

**2.1**  
Book as a guest using guest@test.com, complete payment, then check the inbox for `booking_confirmation_client`. Confirm the email includes practitioner name, service, date/time, location, a "View Booking Details" link, and Add to calendar. Open the View Booking link in an incognito window and confirm it works without login.

**2.2**  
After any completed booking, confirm the practitioner receives `booking_confirmation_practitioner` with client name, client email, service, time, location, and a session/dashboard link.

---

## Section 3 – Location logic

**3.1**  
Using a clinic practitioner (or a clinic booking with a hybrid practitioner), complete a booking and confirm the client email shows the clinic address and a clickable Google Maps / directions link.

**3.2**  
Using a mobile practitioner (or mobile booking), confirm the client email shows "Your address" or the visit address and does **not** show a "Get Directions" link to a clinic. Confirm the practitioner email shows "Visit address" and a directions link to the client.

**3.3**  
With a hybrid practitioner, create one clinic booking and one mobile booking. Confirm the clinic booking email uses clinic address + directions and the mobile booking email uses client/visit address without clinic directions.

---

## Section 4 – Guest messaging

**4**  
As a practitioner, send a message to a guest (no account). Confirm the guest receives `message_notification_guest` with a message preview, practitioner name, and a "View and reply" (or equivalent) link. Confirm the reply/view flow works and does not require login for the basic view where designed.

---

## Section 5 – Guest booking link

**5**  
From a guest booking confirmation email, open the "View Booking Details" link in a private/incognito window. Confirm the booking page loads, shows booking details, and does **not** redirect to login. If it redirects to login, report as fail.

---

## Section 8 – Cancellation

**8**  
Cancel a confirmed booking (as practitioner). Confirm the client receives a `cancellation` email with session info, cancellation reason, and refund details if applicable. Confirm the booking status is updated to cancelled.

---

## Section 9 – Reschedule

**9**  
Reschedule a session. Confirm the client receives a `rescheduling` email with original date/time, new date/time, and practitioner info.

---

## Section 10 – Payment email

**10**  
After a successful booking payment, confirm that **only** the booking confirmation emails (client + practitioner) are sent. Confirm that `payment_received_practitioner` is **not** sent.

---

## Section 13 – Edge cases

**13 (expired)**  
Start a guest booking and do not complete payment. Wait for the booking window to expire (or force expiry). Confirm no booking confirmation email is sent.

**13 (duplicate email)**  
Complete two separate guest bookings with the same email. Confirm both bookings exist and each has its own confirmation and View Booking link.

---

## Section 14 – Security

**14**  
Confirm that the View Booking Details link uses a secure token in the URL (e.g. `?token=...`) and that the token is validated server-side. Confirm that accessing the view URL with an invalid or missing token does not expose booking data.

---

## Smoke script (no browser)

Run the automated smoke script (requires env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`):

```bash
node test-scripts/qa-email-guest-location-smoke.js
```

It checks: send-email with clinic payload, send-email with mobile payload, send-booking-notification (cancellation), and get_session_by_guest_token. Report script exit code and any failed steps.
