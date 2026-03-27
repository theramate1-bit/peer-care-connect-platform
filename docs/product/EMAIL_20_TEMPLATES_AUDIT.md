# Email Templates Audit – 20 Templates (Production Ready)

Audit of all email templates in `supabase/functions/send-email/index.ts` for production URLs, placeholder links, contents, and rendering. Informed by Supabase MCP (email_logs) and Resend MCP.

**Date:** 2025-03-14  
**Status:** Audited and fixed  
**Last MCP sync:** 2026-03-14

### Fixes applied (2026-03-14)

| #   | Issue                                                                                            | Fix                                                                                        | Verified                           |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| 1   | Resend 429 rate limit – peer_booking_confirmed_practitioner (4), payment_confirmation_client (3) | Added retry-on-429 in send-email (up to 3 attempts, honor Retry-After)                     | Deployed, test-email-end-to-end ✅ |
| 2   | Frontend `window.location.origin` → localhost in emails when dev                                 | NotificationSystem uses `getEmailBaseUrl()` = `VITE_SITE_URL \|\| https://theramate.co.uk` | Build ✅                           |
| 3   | Rescheduling fallback `/bookings` → correct route                                                | Updated to `/client/sessions` in send-email                                                | In code                            |
| 4   | welcome_client / welcome_practitioner (pending, no template)                                     | Added templates to send-email; trigger `send_welcome_email` on users calls via pg_net      | Deployed, tested ✅                |
| 5   | Random placeholders (N/A, TBC, "Provided in app", etc.)                                          | Replaced with user-friendly fallbacks (see Placeholder Standards)                          | Deployed, tested ✅                |
| 6   | Gaps: payment_received fallbacks; practitioner sessionId empty URL; rescheduling missing CTAs    | See Gaps & Consistency Audit                                                               | In code                            |

---

## Supabase & Resend Setup (MCP-verified)

### Supabase (project: aikqnvltuwwgifuocvto) – MCP-verified

**`email_logs` schema:**

| Column            | Type        | Purpose                        |
| ----------------- | ----------- | ------------------------------ |
| id                | uuid        | PK                             |
| user_id           | uuid        | Optional                       |
| email_type        | varchar     | Template type                  |
| recipient_email   | varchar     | To address                     |
| recipient_name    | text        | Display name                   |
| subject           | text        | Email subject                  |
| resend_email_id   | text        | Resend API id                  |
| status            | varchar     | sent / failed / pending        |
| sent_at           | timestamp   | When sent                      |
| delivered_at      | timestamp   | Delivery (if tracked)          |
| opened_at         | timestamp   | Open (if tracked)              |
| clicked_at        | timestamp   | Click (if tracked)             |
| error_message     | text        | On failure                     |
| metadata          | jsonb       | template_data, resend_response |
| maileroo_email_id | text        | Legacy                         |
| retry_count       | integer     | Retries                        |
| last_retry_at     | timestamptz | Last retry                     |

**Sent / failed counts (live from MCP):**

| email_type                          | sent | failed | pending                               |
| ----------------------------------- | ---- | ------ | ------------------------------------- |
| booking_confirmation_client         | 18   | 0      | 0                                     |
| booking_confirmation_practitioner   | 16   | 0      | 0                                     |
| payment_confirmation_client         | 11   | 3      | 0                                     |
| payment_received_practitioner       | 14   | 0      | 0                                     |
| booking_request_practitioner        | 7    | 0      | 0                                     |
| mobile_request_accepted_client      | 2    | 0      | 0                                     |
| mobile_request_declined_client      | 1    | 0      | 0                                     |
| cancellation                        | 1    | 0      | 0                                     |
| peer_booking_confirmed_client       | 4    | 0      | 0                                     |
| peer_booking_confirmed_practitioner | 0    | 4      | 0                                     |
| peer_credits_deducted               | 4    | 0      | 0                                     |
| peer_credits_earned                 | 3    | 0      | 0                                     |
| peer_booking_cancelled_refunded     | 8    | 0      | 0                                     |
| welcome_client                      | 2    | 0      | 2 (legacy insert; templates now live) |
| welcome_practitioner                | 2    | 0      | 4 (legacy insert; templates now live) |

**Alerts (addressed):**

- ~~**peer_booking_confirmed_practitioner / payment_confirmation_client**: All 7 failures were Resend 429 rate limit. **Fixed:** Added retry-on-429 (up to 3 attempts, honor Retry-After) in send-email.~~
- **welcome_client / welcome_practitioner**: **Fixed.** Added templates to send-email. Trigger `send_welcome_email` on `users` calls via pg_net. `app_config` has `edge_function_url` and `site_url` set (MCP-verified).

### Resend – MCP-verified

- **Audiences:** General (id: `f44f7238-e861-4bbf-bfd0-dfcfc8d712f2`, created 2025-10-24)
- **From address:** `RESEND_FROM_EMAIL` (Edge Function secret) or fallback `Theramate <onboarding@resend.dev>`
- **Delivery:** Via `api.resend.com`; `email_logs.resend_email_id` / `metadata.resend_response.id` stores Resend email ID

---

## URL Source – Frontend vs Backend

| Source                                                                                         | URL builder                                    | Risk                                     |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| **Backend** (stripe-webhooks, send-booking-notification, mobile-payment, notify-guest-message) | `SITE_URL` or `APP_URL` (Edge Function secret) | OK when SITE_URL set                     |
| **Frontend** (NotificationSystem in peer-care-connect)                                         | `window.location.origin`                       | **localhost when app runs on localhost** |

**Example from email_logs metadata:**

- `mobile_request_accepted_client` had `requestUrl: "http://localhost:5173/guest/mobile-requests?email=..."` when sent from local dev.
- `booking_request_practitioner` had `requestUrl: "https://theramate.co.uk/practice/mobile-requests"` (from mobile-payment Edge Function).

**Fixed:** NotificationSystem now uses `getEmailBaseUrl()` = `import.meta.env.VITE_SITE_URL || 'https://theramate.co.uk'` instead of `window.location.origin` for all email/SMS link URLs. Set `VITE_SITE_URL` in production build if different from theramate.co.uk.

---

## Summary

| #   | Template                            | Base URL           | Calendar             | Fixes Applied                                                                        |
| --- | ----------------------------------- | ------------------ | -------------------- | ------------------------------------------------------------------------------------ |
| 1   | booking_confirmation_client         | baseUrl (SITE_URL) | effectiveCalendarUrl | Add to Calendar only when URL exists                                                 |
| 2   | booking_confirmation_practitioner   | baseUrl            | N/A                  | OK                                                                                   |
| 3   | payment_confirmation_client         | baseUrl            | N/A                  | OK                                                                                   |
| 4   | payment_received_practitioner       | baseUrl            | N/A                  | CTAs → /practice/billing                                                             |
| 5   | session_reminder_24h                | baseUrl            | effectiveCalendarUrl | Client links: /client/sessions, Add to Calendar, Message Practitioner                |
| 5b  | session_reminder_2h                 | baseUrl            | effectiveCalendarUrl | Same as 1h; triggered by NotificationSystem                                          |
| 6   | session_reminder_1h                 | baseUrl            | effectiveCalendarUrl | Client links: /client/sessions, Add to Calendar, Message Practitioner                |
| 7   | cancellation                        | baseUrl            | N/A                  | OK (terms#cancellation exists)                                                       |
| 8   | rescheduling                        | baseUrl            | effectiveCalendarUrl | Confirm New Time, Add to Calendar, Get Directions (if mapsUrl), Message Practitioner |
| 9   | peer_booking_confirmed_client       | baseUrl            | effectiveCalendarUrl | Add to Calendar only when URL exists                                                 |
| 10  | peer_booking_confirmed_practitioner | baseUrl            | N/A                  | OK                                                                                   |
| 11  | peer_credits_deducted               | baseUrl            | N/A                  | OK                                                                                   |
| 12  | peer_credits_earned                 | baseUrl            | N/A                  | OK                                                                                   |
| 13  | peer_booking_cancelled_refunded     | baseUrl            | N/A                  | OK                                                                                   |
| 14  | message_notification_guest          | baseUrl            | N/A                  | viewMessageUrl \|\| baseUrl/login                                                    |
| 15  | booking_request_practitioner        | baseUrl            | N/A                  | requestUrl \|\| baseUrl/practice/mobile-requests                                     |
| 16  | mobile_request_accepted_client      | baseUrl            | N/A                  | requestUrl \|\| baseUrl/client/mobile-requests                                       |
| 17  | mobile_request_declined_client      | baseUrl            | N/A                  | requestUrl \|\| baseUrl/marketplace                                                  |
| 18  | mobile_request_expired_client       | baseUrl            | N/A                  | requestUrl \|\| baseUrl/marketplace                                                  |
| 19  | welcome_client                      | baseUrl            | N/A                  | bookingUrl \|\| baseUrl/marketplace                                                  |
| 20  | welcome_practitioner                | baseUrl            | N/A                  | bookingUrl \|\| baseUrl/dashboard                                                    |

**Note:** `session_reminder_2h` added; NotificationSystem sends it for 2-hour reminders. Valid types: 21.

---

## Callers (who invokes send-email)

| Email type                                                     | Caller                                          | Notes                                                            |
| -------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| booking_confirmation_client, booking_confirmation_practitioner | stripe-webhooks (sendBookingConfirmationEmails) | After payment succeeds                                           |
| booking_request_practitioner                                   | mobile-payment, mobile-payment-v2               | After mobile request payment; passes requestUrl with ?requestId= |
| message_notification_guest                                     | notify-guest-message                            | When practitioner messages guest                                 |
| cancellation, rescheduling                                     | send-booking-notification                       | Called from SessionDetailView, RescheduleService                 |
| payment_confirmation_client, payment_received_practitioner     | NotificationSystem (sendPaymentConfirmation)    | When payment completed                                           |
| session_reminder_24h, 2h, 1h                                   | NotificationSystem (processReminders)           | When reminders cron/job runs                                     |
| welcome_client, welcome_practitioner                           | DB trigger send_welcome_email (pg_net)          | On users insert/update                                           |
| peer*\*, mobile_request*\*                                     | NotificationSystem, various flows               | Per product configuration                                        |

---

## URL Sources

All templates use:

- **baseUrl** = `Deno.env.get('SITE_URL') || 'https://theramate.co.uk'`
- **effectiveCalendarUrl** = `data.calendarUrl` (if valid) or `generateCalendarUrl(data)` when session data exists
- No template uses localhost; no `#` fallbacks for CTA buttons

---

## Footer (All Templates)

- Help → `${baseUrl}/help`
- Contact → `mailto:support@theramate.co.uk`
- Therapists → `${baseUrl}/marketplace`
- Unsubscribe → `${baseUrl}/settings/privacy`
- Privacy → `${baseUrl}/privacy`
- Social: Instagram, Facebook, LinkedIn, X (verify these are real Theramate accounts)

---

## Routes Referenced (Verified)

| Route                     | Exists | Source                                                                      |
| ------------------------- | ------ | --------------------------------------------------------------------------- |
| /client/sessions          | Yes    | capture-all-screens                                                         |
| /practice/sessions/:id    | Yes    | capture-all-screens                                                         |
| /practice/scheduler       | Yes    | capture-all-screens                                                         |
| /messages                 | Yes    | capture-all-screens                                                         |
| /marketplace              | Yes    | capture-all-screens                                                         |
| /help                     | Yes    | capture-all-screens                                                         |
| /privacy                  | Yes    | capture-all-screens                                                         |
| /terms                    | Yes    | capture-all-screens                                                         |
| /settings/privacy         | Yes    | capture-all-screens                                                         |
| /practice/billing         | Yes    | payment_received_practitioner CTAs (was /payments, /settings/payouts – 404) |
| /credits                  | Yes    | capture-all-screens                                                         |
| /login                    | Yes    | capture-all-screens                                                         |
| /practice/mobile-requests | Yes    | capture-all-screens                                                         |
| /client/mobile-requests   | Yes    | capture-all-screens                                                         |
| /guest/mobile-requests    | Yes    | used for guest recipients (NotificationSystem)                              |
| /credits#peer-treatment   | Yes    | hash route for peer treatment section                                       |

---

## Content & Rendering (per template)

### 1. booking_confirmation_client

| Field             | Value                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Subject**       | `Booking received - pending practitioner approval` (when requiresApproval/paymentStatus=held/sessionStatus=pending_approval) else `Booking Confirmed - {sessionType} with {practitionerName}` |
| **Header**        | "Booking Received" or "Booking Confirmed!"                                                                                                                                                    |
| **Body**          | Greeting, approval-pending copy or confirmation copy, Session Details block (type, date, time, duration, price, location, practitioner)                                                       |
| **CTAs**          | View Booking Status / View Booking Details, Add to Calendar (if effectiveCalendarUrl), Get Directions (if mapsUrl), Message Practitioner                                                      |
| **Required data** | sessionType, sessionDate, sessionTime, sessionDuration, sessionPrice, practitionerName                                                                                                        |
| **URL source**    | bookingUrl, messageUrl, calendarUrl from caller (NotificationSystem → window.location.origin)                                                                                                 |
| **Conditional**   | Approval box when isApprovalPending; location only when sessionLocation                                                                                                                       |

### 2. booking_confirmation_practitioner

| Field             | Value                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| **Subject**       | `New Booking - {sessionType} with {clientName}`                                                     |
| **Body**          | Session Details (type, date, time, duration, price, client, client email, location), Payment Status |
| **CTAs**          | View Session, Get Directions (if mapsUrl), Message Client, Manage Availability                      |
| **Required data** | sessionType, sessionDate, sessionTime, sessionDuration, sessionPrice, clientName, clientEmail       |
| **Fallback**      | bookingUrl → `${baseUrl}/practice/sessions/${sessionId}`                                            |

### 3. payment_confirmation_client

| Field             | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| **Subject**       | `Payment confirmed for your {sessionType or 'session'}` |
| **Body**          | Payment ID, amount, session, date, time, practitioner   |
| **CTAs**          | View Session                                            |
| **Required data** | paymentId, paymentAmount, sessionType, practitionerName |

### 4. payment_received_practitioner

| Field       | Value                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| **Subject** | `Payment Received - £{practitionerAmount} from {clientName}`                          |
| **Body**    | Total session price, platform fee (0.5%), earnings, client, session, date, payment ID |
| **CTAs**    | View Transaction, Manage Payouts                                                      |
| **Routes**  | /practice/billing                                                                     |

### 5. session_reminder_24h

| Field             | Value                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Subject**       | `Reminder: Your session is tomorrow`                                                                       |
| **Body**          | Session details, preparation tips (arrive early, comfortable clothing, medical info, stay hydrated)        |
| **CTAs**          | View Details, Add to Calendar (if effectiveCalendarUrl), Get Directions (if mapsUrl), Message Practitioner |
| **Required data** | sessionType, sessionDate, sessionTime, sessionDuration, practitionerName                                   |

### 6. session_reminder_1h

| Field       | Value                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| **Subject** | `Reminder: Your session starts in 1 hour`                                                                  |
| **Body**    | Session details, last-minute reminders (leave now, ID, phone charged, traffic)                             |
| **CTAs**    | View Details, Add to Calendar (if effectiveCalendarUrl), Get Directions (if mapsUrl), Message Practitioner |

### 7. cancellation

| Field           | Value                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Subject**     | `Session Cancelled - {sessionType}`                                                                               |
| **Body**        | Cancellation details (session, date, time, practitioner, location, reason, refund if any)                         |
| **CTAs**        | View Booking (if bookingUrl), Book Another Session (/marketplace), View Cancellation Policy (/terms#cancellation) |
| **Refund copy** | Shown when refundAmount present                                                                                   |

### 8. rescheduling

| Field             | Value                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| **Subject**       | `Session Rescheduled - New Date/Time`                                                                           |
| **Body**          | Original date/time, new date/time, practitioner, location                                                       |
| **CTAs**          | Confirm New Time, Add to Calendar (if effectiveCalendarUrl), Get Directions (if mapsUrl), Message Practitioner  |
| **Required data** | sessionType, originalDate, originalTime, newDate, newTime, practitionerName, sessionDuration (for calendar URL) |

### 9. peer_booking_confirmed_client

| Field       | Value                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| **Subject** | `Peer Treatment Booking Confirmed - {sessionType}`                                                         |
| **Body**    | Session details, Credits Deducted block (paymentAmount credits)                                            |
| **CTAs**    | View My Bookings (bookingUrl or baseUrl/credits#peer-treatment), Add to Calendar (if effectiveCalendarUrl) |
| **Note**    | credits#peer-treatment – verify hash route exists                                                          |

### 10. peer_booking_confirmed_practitioner

| Field       | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| **Subject** | `New Peer Treatment Booking - {sessionType} with {clientName}` |
| **Body**    | Session details, Credits Earned block                          |
| **CTAs**    | View Session, View Credits (/credits#peer-treatment)           |

### 11. peer_credits_deducted

| Field       | Value                                                       |
| ----------- | ----------------------------------------------------------- |
| **Subject** | `{paymentAmount} Credits Deducted - Peer Treatment Booking` |
| **Body**    | Credits deducted, session, date, time, practitioner         |
| **CTAs**    | View Credit Balance (/credits)                              |

### 12. peer_credits_earned

| Field       | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| **Subject** | `+{paymentAmount} Credits Earned - Peer Treatment`                 |
| **Body**    | Credits earned, session, date, time, client                        |
| **CTAs**    | View Credit Balance, Book Peer Treatment (/credits#peer-treatment) |

### 13. peer_booking_cancelled_refunded

| Field       | Value                                                        |
| ----------- | ------------------------------------------------------------ |
| **Subject** | `Peer Treatment Cancelled - {refundAmount} Credits Refunded` |
| **Body**    | Cancelled session, credit refund block                       |
| **CTAs**    | View Credit Balance, Book Another Session                    |

### 14. message_notification_guest

| Field             | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| **Subject**       | `New message from {practitionerName or 'your practitioner'}`                  |
| **Body**          | Message preview (up to ~200 chars in caller), "Log in to read and reply" copy |
| **CTAs**          | View and reply (viewMessageUrl or baseUrl/login)                              |
| **Required data** | practitionerName, messagePreview (optional), viewMessageUrl (optional)        |

### 15. booking_request_practitioner

| Field           | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Subject**     | `New mobile booking request from {clientName or 'a client'}`                                           |
| **Body**        | Client, service, date, time, address                                                                   |
| **CTAs**        | Review Request (requestUrl or baseUrl/practice/mobile-requests)                                        |
| **Data fields** | clientName, serviceType, requestedDate, requestedTime, clientAddress, requestUrl                       |
| **URL source**  | requestUrl from mobile-payment Edge Function (SITE_URL) or NotificationSystem (window.location.origin) |

### 16. mobile_request_accepted_client

| Field          | Value                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Subject**    | `Your mobile booking request was accepted`                                                |
| **Body**       | Date/time, status, payment captured                                                       |
| **CTAs**       | View Request (requestUrl or baseUrl/client/mobile-requests)                               |
| **URL source** | requestUrl from NotificationSystem → **window.location.origin** (localhost risk when dev) |

### 17. mobile_request_declined_client

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| **Subject**    | `Your mobile booking request was declined`                  |
| **Body**       | Date, status, payment released, optional reason             |
| **CTAs**       | Find Another Slot (requestUrl or baseUrl/marketplace)       |
| **URL source** | requestUrl from NotificationSystem → window.location.origin |

### 18. mobile_request_expired_client

| Field       | Value                                                  |
| ----------- | ------------------------------------------------------ |
| **Subject** | `Your mobile booking request expired`                  |
| **Body**    | Status, payment released                               |
| **CTAs**    | Submit New Request (requestUrl or baseUrl/marketplace) |

### 19. welcome_client

| Field             | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| **Subject**       | `Welcome to TheraMate – Your account is ready!`                |
| **Body**          | Account ready, browse marketplace, book sessions               |
| **CTAs**          | Find a Therapist (bookingUrl or baseUrl/marketplace)           |
| **Trigger**       | `send_welcome_email` on `users` when user_role set to 'client' |
| **Required data** | bookingUrl (optional, from trigger)                            |

### 20. welcome_practitioner

| Field             | Value                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Subject**       | `Welcome to TheraMate – Your practitioner account is ready!`                                         |
| **Body**          | Account ready, set up profile, availability, receive bookings                                        |
| **CTAs**          | Go to Dashboard (bookingUrl or baseUrl/dashboard)                                                    |
| **Trigger**       | `send_welcome_email` on `users` when user_role set to sports_therapist, massage_therapist, osteopath |
| **Required data** | bookingUrl (optional, from trigger)                                                                  |

---

## Gaps & Consistency Audit

### Fixes applied

| Gap                                                                                                                                  | Fix                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **payment_received_practitioner** – no fallbacks; could show `undefined`                                                             | Added fallbacks for paymentAmount, platformFee, practitionerAmount, clientName, sessionType, sessionDate, paymentId; subject fallbacks                                    |
| **booking_confirmation_practitioner / peer_booking_confirmed_practitioner** – fallback `/practice/sessions/` (empty sessionId) → 404 | When sessionId missing, fallback to `/practice/schedule`                                                                                                                  |
| **rescheduling** – missing Get Directions, Message Practitioner (other client session emails have these)                             | Added Get Directions (if mapsUrl), Message Practitioner CTAs                                                                                                              |
| **Invalid Date / undefined in emails** – raw `new Date().toLocaleDateString()` and missing fallbacks                                 | Added `safeDate(d, fallback)` helper; replaced all date formatting; added fallbacks for sessionType, sessionTime, practitionerName, clientName, etc. across all templates |
| **messagePreview XSS risk** – user content in `message_notification_guest`                                                           | Added `escapeHtml()` and use for `messagePreview`                                                                                                                         |
| **booking_confirmation_client** – sessionType, sessionDate, sessionTime, duration, price, practitionerName                           | Fallbacks: Session, —, —, —, —, your practitioner                                                                                                                         |
| **session_reminder_24h / session_reminder_1h** – same fields                                                                         | Same fallbacks                                                                                                                                                            |
| **cancellation** – sessionType, sessionTime, practitionerName                                                                        | Fallbacks: Session, —, your practitioner                                                                                                                                  |
| **rescheduling** – sessionType, originalTime, newTime, practitionerName                                                              | Fallbacks: Session, —, —, your practitioner                                                                                                                               |
| **peer\_\*** templates\*\* – sessionType, sessionTime, duration, clientName, practitionerName                                        | Fallbacks: Peer session / Session, —, —, the client, your peer practitioner                                                                                               |
| **peer payment amounts** – paymentAmount, refundAmount                                                                               | Fallbacks: 0 (via \|\| or ??)                                                                                                                                             |
| **refundAmount / payment amounts** – could show raw pence or undefined                                                               | `formatPounds(v)` helper; cancellation/payment templates use it                                                                                                           |
| **cancellationReason** – user input, XSS risk                                                                                        | Escaped with `escapeHtml()`                                                                                                                                               |
| **sessionLocation, clientAddress** – user-provided, XSS risk                                                                         | Escaped with `escapeHtml()`                                                                                                                                               |
| **serviceType** – product names in booking_request_practitioner, XSS risk                                                            | Escaped with `escapeHtml()`                                                                                                                                               |
| **session_reminder_2h** – NotificationSystem sends it, template missing (400)                                                        | Added template and validEmailTypes entry                                                                                                                                  |
| **mobile-payment / mobile-payment-v2** – passed "Provided in app", "Mobile service"                                                  | Callers now pass undefined; template fallbacks apply                                                                                                                      |
| **booking_request_practitioner requestUrl** – no deep link to specific request                                                       | Added ?requestId= to URL; MobileRequestManagement uses it for focus                                                                                                       |
| **/payments, /settings/payouts** – routes don't exist (404)                                                                          | Updated to `/practice/billing`                                                                                                                                            |
| **booking_request_practitioner serviceType** – product names could contain HTML (XSS)                                                | escapeHtml(serviceType) when displaying custom service name                                                                                                               |
| **EmailRequest interface** – missing types and fields                                                                                | Added payment*confirmation_client, booking_request_practitioner, mobile_request*\*; added requestedDate, requestedTime, requestUrl, clientAddress, serviceType            |

### Consistency rules (documented)

| Concept                           | Standard                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Section headings**              | "Session Details" for session info; "Payment Breakdown" / "Transaction Details" for money; "Cancellation Details" for cancelled session |
| **Location labels**               | "Location" (clinic); "Your address" (mobile, client); "Visit address" / "Session location" (practitioner)                               |
| **Client session CTAs**           | "View Booking Details" (confirmation); "View Details" (reminders); "View Session" (payment); "Confirm New Time" (rescheduling)          |
| **Practitioner session CTAs**     | "View Session" (links to /practice/sessions/:id or /practice/schedule if no sessionId)                                                  |
| **Final instructional paragraph** | "Important" (client booking/peer); "Note" (peer practitioner); "Payout Schedule" (payment)                                              |

### Routes verified

| Route                    | Use                                                                         |
| ------------------------ | --------------------------------------------------------------------------- |
| `/dashboard`             | welcome_practitioner CTA; exists (line 176 AppContent)                      |
| `/practice/schedule`     | Practitioner fallback when sessionId missing; exists                        |
| `/practice/sessions/:id` | Practitioner session detail; exists                                         |
| `/practice/billing`      | payment_received_practitioner CTAs (was /payments, /settings/payouts – 404) |

---

## Placeholder Standards (fallbacks when data missing)

| Old placeholder     | New fallback                            | Templates                                                 |
| ------------------- | --------------------------------------- | --------------------------------------------------------- |
| `N/A`               | `—`                                     | payment_confirmation_client (Payment ID)                  |
| `TBC`               | `To be confirmed`                       | payment_confirmation_client, booking_request_practitioner |
| `Session`           | `your session` / `your booking`         | payment_confirmation_client                               |
| `Your practitioner` | `your practitioner` (lowercase in body) | payment_confirmation_client                               |
| `a client`          | `a new client`                          | booking_request_practitioner (subject)                    |
| `Client`            | `the client`                            | booking_request_practitioner                              |
| `Mobile service`    | `the requested service`                 | booking_request_practitioner                              |
| `Provided in app`   | `View in request for full address`      | booking_request_practitioner                              |
| blank date/time     | `See your request for details`          | mobile_request_accepted_client                            |

**Helpers added:**

- `safeDate(d, fallback)` – returns formatted date or fallback (default `—`) when invalid/missing
- `escapeHtml(s)` – escapes `&<>"'` for user content (e.g. messagePreview, cancellationReason)
- `formatPounds(v)` – formats amount as £X.XX; treats integers > 100 as pence (Stripe convention)

**Kept as-is (acceptable):**

- `recipientName \|\| 'there'` – standard greeting when name unknown
- `practitionerName \|\| 'Your practitioner'` – warm, personal
- `paymentStatus \|\| 'Pending confirmation'` – clear status

---

## Design System (shared)

- **Fonts:** Lato, DM Serif Text (Google Fonts)
- **Colors:** `#3c4804` (text), `#8e9b53` (accent), `#c8d6c0` (background), `#f0f4ef` (card)
- **Components:** `.header` (green), `.content` (white), `.session-details` / `.details` (light green, left border), `.cta-button` (pill, green)
- **Footer:** Dark `#1f1f1f`, links (Help, Contact, Therapists, Unsubscribe, Privacy), social pills (Instagram, Facebook, LinkedIn, X)

---

## Production Checklist

1. **Supabase Dashboard → Edge Functions → Secrets:** Set `SITE_URL` and `APP_URL` to `https://theramate.co.uk`
2. **RESEND_FROM_EMAIL (required for production):** Set to verified domain, e.g. `Theramate <notifications@theramate.co.uk>`. Without this, fallback is `onboarding@resend.dev` (Resend test domain, may have deliverability limits).
3. **Supabase Dashboard → Authentication → URL Configuration:** Set Site URL to production domain
4. **Social links:** Confirm Instagram/Facebook/LinkedIn/X URLs point to real Theramate accounts
5. **VITE_SITE_URL (optional):** For production build, set `VITE_SITE_URL=https://theramate.co.uk` if domain differs. Default is theramate.co.uk.
