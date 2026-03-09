# Booking Follow-Up Flow and Email System Documentation

## Complete Post-Payment Flow

### 1. Payment Completion (Stripe)

- Client completes payment via Stripe Checkout
- Stripe automatically processes payment and transfers funds via Connect
- Client is redirected to `/booking-success?session_id=CHECKOUT_SESSION_ID`

### 2. Webhook Processing (Primary Path)

**File**: `supabase/functions/stripe-webhook/index.ts`

When Stripe sends `checkout.session.completed` webhook:

1. ✅ Updates `client_sessions`:
   - `status` → `'confirmed'`
   - `payment_status` → `'completed'`
   - `expires_at` → `null`

2. ✅ Updates `payments` table:
   - `payment_status` → `'succeeded'`

3. ✅ Creates in-app notifications:
   - Client notification: "Booking confirmed"
   - Practitioner notification: "New booking confirmed"

4. ✅ Sends emails via `send-email` Edge Function:
   - Booking confirmation to client
   - Booking confirmation to practitioner
   - Payment confirmation to client
   - Payment received to practitioner

5. ✅ Creates conversation between client and practitioner:
   - Uses `get_or_create_conversation` RPC function (idempotent)
   - Sends automated welcome message to conversation

6. ✅ Schedules session reminders:
   - 24 hours before session
   - 2 hours before session
   - 1 hour before session
   - Only schedules future reminders

7. ✅ Stripe Connect automatically transfers funds:
   - Platform keeps `application_fee_amount`
   - Remainder goes to practitioner's Connect account

### 3. BookingSuccess Page (Fallback Path)

**File**: `src/pages/BookingSuccess.tsx`

When client lands on success page:

1. ✅ Verifies payment by querying `payments` table
2. ✅ Checks if webhook already processed (status = 'confirmed')
3. ✅ If NOT processed yet:
   - Updates session status to 'confirmed'
   - Sends booking confirmation emails (fallback) - includes reminder scheduling
   - Sends payment confirmation emails (fallback)
   - Creates conversation between client and practitioner
4. ✅ If already processed:
   - Just ensures conversation exists (idempotent check)
   - Displays booking details
5. ✅ Shows success message with booking information

## Email System Architecture

### Email Delivery Flow

```
NotificationSystem → send-email Edge Function → Resend API → Recipient
```

### Components

1. **NotificationSystem Class** (`src/lib/notification-system.ts`)
   - High-level API for sending notifications
   - Handles email types, data preparation, and scheduling
   - Methods:
     - `sendBookingConfirmation(sessionId)`
     - `sendPaymentConfirmation(paymentId)`
     - `scheduleSessionReminders(sessionId)`
     - `sendCancellationNotification(sessionId, cancelledBy)`
     - `sendReschedulingNotification(...)`

2. **send-email Edge Function** (`supabase/functions/send-email/index.ts`)
   - Receives email requests from NotificationSystem or webhook
   - Uses Resend API to send emails
   - Handles email templates and formatting
   - Supports multiple email types

3. **Resend API**
   - Third-party email service
   - Handles actual email delivery
   - Requires `RESEND_API_KEY` environment variable

### Email Types Sent After Payment

1. **Booking Confirmation - Client**
   - Contains: Session details, practitioner info, calendar invite (.ics), cancellation policy, booking links
   - Sent when: Payment succeeds (webhook or BookingSuccess fallback)

2. **Booking Confirmation - Practitioner**
   - Contains: Client info, session details, payment status, booking links
   - Sent when: Payment succeeds (webhook or BookingSuccess fallback)

3. **Payment Confirmation - Client**
   - Contains: Payment amount, receipt info, session details
   - Sent when: Payment is processed (webhook or BookingSuccess fallback)

4. **Payment Received - Practitioner**
   - Contains: Payment breakdown, platform fee, earnings amount
   - Sent when: Payment is processed (webhook or BookingSuccess fallback)

## Conversation Creation

**File**: `src/pages/BookingSuccess.tsx` (initiateConversation function)

After successful payment:

1. Creates conversation between client and practitioner (if doesn't exist)
2. Sends automated welcome message:
   - "Your [session_type] session on [date] at [time] has been confirmed. Feel free to message your practitioner with any questions!"
3. Uses `MessagingManager.getOrCreateConversation()`
4. Conversation is accessible via `/messages?conversation=CONVERSATION_ID`

## Reminder Scheduling

**File**: `src/lib/notification-system.ts` (scheduleSessionReminders function)

When booking is confirmed:

1. Calculates reminder times:
   - 24 hours before session
   - 2 hours before session
   - 1 hour before session
2. Creates reminder records in `reminders` table
3. Reminders are processed by `processPendingReminders()` function
4. Each reminder sends:
   - In-app notification
   - Email reminder (if user hasn't opted out)
   - Includes cancellation policy summary

## Email Content Features

### Booking Confirmation Emails Include:

- ✅ Session details (date, time, duration, type)
- ✅ Practitioner/client information
- ✅ Calendar invite (.ics file download)
- ✅ Cancellation policy summary
- ✅ Links to:
  - View booking details
  - Message practitioner
  - Directions to location
- ✅ Session price and payment status

### Payment Confirmation Emails Include:

- ✅ Payment amount and currency
- ✅ Session details
- ✅ Receipt information
- ✅ Links to booking management

## Error Handling

- ✅ Email failures don't block booking flow (non-critical)
- ✅ Webhook failures are handled by BookingSuccess fallback
- ✅ Idempotency checks prevent duplicate emails
- ✅ Graceful degradation if email service unavailable

## Idempotency & Duplicate Prevention

- ✅ **Conversations**: `get_or_create_conversation` RPC function is idempotent - returns existing conversation if already exists
- ✅ **Reminders**: Reminder inserts check for future dates only, preventing duplicates for same session
- ✅ **Status Updates**: BookingSuccess checks if status is 'confirmed' before processing (prevents duplicate work)
- ✅ **Notifications**: RPC function `create_notification` handles duplicates gracefully

## Configuration

### Required Environment Variables:

- `RESEND_API_KEY`: Resend API key for email delivery
- `APP_URL`: Base URL for generating links in emails

### Email Templates:

- Templates are defined in `send-email/index.ts`
- Each email type has subject and HTML template
- Supports dynamic data injection

## Flow Diagram

```
┌─────────────────┐
│  Client Pays    │
│  via Stripe     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Checkout │
│  Completes      │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Webhook        │  │ BookingSuccess  │
│  (Primary)      │  │  (Fallback)     │
└────────┬────────┘  └────────┬────────┘
         │                     │
         ├─────────────────────┤
         │                     │
         ▼                     ▼
┌─────────────────────────────────┐
│  Update Session Status          │
│  Create Notifications           │
│  Send Emails                    │
│  Create Conversation            │
│  Schedule Reminders              │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Client &       │
│  Practitioner   │
│  Notified       │
└─────────────────┘
```

## Key Files

- `supabase/functions/stripe-webhook/index.ts` - Webhook handler
- `src/pages/BookingSuccess.tsx` - Success page with fallback logic
- `src/lib/notification-system.ts` - Notification system API
- `supabase/functions/send-email/index.ts` - Email sending Edge Function
- `src/lib/messaging.ts` - Messaging/conversation management

