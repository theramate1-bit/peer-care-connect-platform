# Edge Functions Reference

**Audience:** Junior developers

Supabase Edge Functions run serverless Deno code. This document lists all functions, their purpose, callers, and links to source code. Schema is verified via Supabase MCP.

---

## Quick Reference

| Function                                                                    | Purpose                                                | Called by                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| [stripe-webhooks](#stripe-webhooks)                                         | Stripe event handling (payment, booking confirm, etc.) | Stripe (webhook)                                                 |
| [send-email](#send-email)                                                   | Send transactional emails via Resend                   | stripe-webhooks, send-booking-notification, notify-guest-message |
| [send-booking-notification](#send-booking-notification)                     | Cancellation, rescheduling emails                      | Frontend (RescheduleService, etc.)                               |
| [notify-guest-message](#notify-guest-message)                               | Email when practitioner messages guest                 | Frontend (messaging.ts)                                          |
| [mobile-payment](#mobile-payment) / [mobile-payment-v2](#mobile-payment-v2) | Mobile request payment flow                            | Frontend (MobileBookingRequestFlow)                              |
| [stripe-payment](#stripe-payment)                                           | Clinic booking payment                                 | Frontend (BookingFlow)                                           |
| [verify-checkout](#verify-checkout)                                         | Verify checkout session                                | Frontend                                                         |
| [customer-portal](#customer-portal)                                         | Stripe Customer Portal redirect                        | Frontend                                                         |
| [location-proxy](#location-proxy)                                           | Geocoding proxy (e.g. address → lat/lon)               | Frontend                                                         |
| [auth-gateway](#auth-gateway)                                               | Auth validation / gateway                              | Frontend                                                         |
| [google-calendar-sync](#google-calendar-sync)                               | Sync with Google Calendar                              | Cron or manual                                                   |
| [soap-notes](#soap-notes)                                                   | SOAP note AI processing                                | Frontend                                                         |
| [ai-soap-transcribe](#ai-soap-transcribe)                                   | AI transcription for notes                             | Frontend                                                         |
| [transcribe-file](#transcribe-file)                                         | File transcription                                     | Frontend                                                         |
| [cleanup-recordings](#cleanup-recordings)                                   | Clean up old recordings                                | Cron                                                             |
| [ensure-qualifications-bucket](#ensure-qualifications-bucket)               | Ensure storage bucket exists                           | Setup / admin                                                    |

---

## Function Details

### stripe-webhooks

**Purpose:** Receives Stripe webhooks. On `payment_intent.succeeded` with `metadata.session_id`, confirms booking and sends confirmation emails. Also handles subscription events, etc.

**Code:** [supabase/functions/stripe-webhooks/index.ts](../../supabase/functions/stripe-webhooks/index.ts)

**Key logic:**

- Validates Stripe signature
- On payment success: updates `client_sessions` status, calls `sendBookingConfirmationEmails` (invokes send-email)
- Uses `getBookingEmailLocationData` for clinic vs visit in emails

**Called by:** Stripe Dashboard → Webhook URL

---

### send-email

**Purpose:** Sends transactional emails via Resend. Single entry point for all email types.

**Code:** [supabase/functions/send-email/index.ts](../../supabase/functions/send-email/index.ts)

**Email types (examples):**

- `booking_confirmation_client`, `booking_confirmation_practitioner`
- `cancellation`, `rescheduling`
- `mobile_request_accepted_client`, `mobile_request_declined_client`, `mobile_request_expired_client`
- `message_notification_guest`
- `booking_request_practitioner`
- Many others (see `EmailRequest` interface in code)

**Called by:** stripe-webhooks, send-booking-notification, notify-guest-message, mobile-payment, etc.

---

### send-booking-notification

**Purpose:** Sends cancellation or rescheduling emails with consistent location data. Fetches session + practitioner, uses `getBookingEmailLocationData`, then invokes send-email.

**Code:** [supabase/functions/send-booking-notification/index.ts](../../supabase/functions/send-booking-notification/index.ts)

**Body:** `{ sessionId, emailType: 'cancellation' | 'rescheduling', cancellationReason?, refundAmount?, originalDate?, originalTime?, newDate?, newTime? }`

**Called by:** Frontend (RescheduleService, cancel flows)

---

### notify-guest-message

**Purpose:** When a practitioner sends a message to a **guest** (user_role = 'guest'), sends email notification. Recipient gets link to `/login` (must sign up to reply). Skips if recipient is not a guest.

**Code:** [supabase/functions/notify-guest-message/index.ts](../../supabase/functions/notify-guest-message/index.ts)

**Body:** `{ conversationId, messageId, messagePreview? }` + `Authorization: Bearer <user_jwt>`

**Called by:** [peer-care-connect/src/lib/messaging.ts](../../peer-care-connect/src/lib/messaging.ts) – `sendGuestMessageNotification` → NotificationSystem

---

### mobile-payment / mobile-payment-v2

**Purpose:** Handles mobile booking request payment flow. Creates/captures PaymentIntent, creates `mobile_booking_requests`, sends practitioner notification email. On accept, creates session.

**Code:** [supabase/functions/mobile-payment/index.ts](../../supabase/functions/mobile-payment/index.ts)  
**Code (v2):** [supabase/functions/mobile-payment-v2/index.ts](../../supabase/functions/mobile-payment-v2/index.ts)

**Called by:** [peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx](../../peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx)

---

### stripe-payment

**Purpose:** Creates Stripe PaymentIntent for clinic bookings. Used by BookingFlow / GuestBookingFlow.

**Code:** [supabase/functions/stripe-payment/index.ts](../../supabase/functions/stripe-payment/index.ts)

**Called by:** [peer-care-connect/src/services/bookingService.ts](../../peer-care-connect/src/services/bookingService.ts) (or equivalent)

---

### verify-checkout

**Purpose:** Verifies a checkout session after redirect. Validates payment and updates booking state.

**Code:** [supabase/functions/verify-checkout/index.ts](../../supabase/functions/verify-checkout/index.ts)

---

### customer-portal

**Purpose:** Redirects users to Stripe Customer Portal (manage payment methods, subscriptions).

**Code:** [supabase/functions/customer-portal/index.ts](../../supabase/functions/customer-portal/index.ts)

---

### location-proxy

**Purpose:** Geocoding proxy. Converts address to lat/lon (avoids exposing API keys to client).

**Code:** [supabase/functions/location-proxy/index.ts](../../supabase/functions/location-proxy/index.ts)

**Called by:** Frontend when validating mobile request address against practitioner radius

---

### auth-gateway

**Purpose:** Auth validation / gateway for protected endpoints.

**Code:** [supabase/functions/auth-gateway/index.ts](../../supabase/functions/auth-gateway/index.ts)

---

### google-calendar-sync

**Purpose:** Syncs practitioner availability/events with Google Calendar.

**Code:** [supabase/functions/google-calendar-sync/index.ts](../../supabase/functions/google-calendar-sync/index.ts)

---

### soap-notes

**Purpose:** AI-assisted SOAP note generation or processing.

**Code:** [supabase/functions/soap-notes/index.ts](../../supabase/functions/soap-notes/index.ts)

---

### ai-soap-transcribe

**Purpose:** AI transcription for treatment notes (e.g. voice to text).

**Code:** [supabase/functions/ai-soap-transcribe/index.ts](../../supabase/functions/ai-soap-transcribe/index.ts)

---

### transcribe-file

**Purpose:** Transcribes uploaded audio/video files.

**Code:** [supabase/functions/transcribe-file/index.ts](../../supabase/functions/transcribe-file/index.ts)

---

### cleanup-recordings

**Purpose:** Cleans up old session recordings (scheduled/cron).

**Code:** [supabase/functions/cleanup-recordings/index.ts](../../supabase/functions/cleanup-recordings/index.ts)

---

### ensure-qualifications-bucket

**Purpose:** Ensures the qualifications storage bucket exists. Used during setup.

**Code:** [supabase/functions/ensure-qualifications-bucket/index.ts](../../supabase/functions/ensure-qualifications-bucket/index.ts)

---

## Shared Modules

| Module                          | Location                                                                                                    | Purpose                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `_shared/booking-email-data.ts` | [supabase/functions/\_shared/booking-email-data.ts](../../supabase/functions/_shared/booking-email-data.ts) | `getBookingEmailLocationData` – clinic vs visit for emails |
| `_shared/cors.ts`               | [supabase/functions/\_shared/cors.ts](../../supabase/functions/_shared/cors.ts)                             | CORS headers                                               |
| `_shared/csrf.ts`               | [supabase/functions/\_shared/csrf.ts](../../supabase/functions/_shared/csrf.ts)                             | CSRF validation                                            |
| `_shared/rate-limit.ts`         | [supabase/functions/\_shared/rate-limit.ts](../../supabase/functions/_shared/rate-limit.ts)                 | Rate limiting                                              |
| `_shared/security-headers.ts`   | [supabase/functions/\_shared/security-headers.ts](../../supabase/functions/_shared/security-headers.ts)     | Security headers                                           |
| `_shared/validation.ts`         | [supabase/functions/\_shared/validation.ts](../../supabase/functions/_shared/validation.ts)                 | Request validation                                         |

---

## Related Docs

- [Database Schema](./database-schema.md)
- [Clinic, Mobile & Hybrid Flows](../features/clinic-mobile-hybrid-flows.md)
- [Email Audit & Triggers](../product/EMAIL_AUDIT_AND_TRIGGERS.md)

---

**Last Updated:** 2026-03-15 | Schema verified via Supabase MCP
