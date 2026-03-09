# Email Sending Checklist

**Date:** February 2025  
**Purpose:** Verify which emails are being sent and identify missing triggers/templates

---

## 📋 Complete Email Inventory (28 Types)

### ✅ **Booking & Payment Emails** (4 types)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `booking_confirmation_client` | ✅ Yes | ✅ `stripe-webhook/index.ts` + `BookingSuccess.tsx` | ✅ **WORKING** |
| `booking_confirmation_practitioner` | ✅ Yes | ✅ `stripe-webhook/index.ts` + `BookingSuccess.tsx` | ✅ **WORKING** |
| `payment_confirmation_client` | ✅ Yes | ✅ `stripe-webhook/index.ts` + `BookingSuccess.tsx` | ✅ **WORKING** |
| `payment_received_practitioner` | ✅ Yes | ✅ `stripe-webhook/index.ts` + `BookingSuccess.tsx` | ✅ **WORKING** |

**Triggers:**
- Primary: Stripe webhook (`checkout.session.completed`)
- Fallback: `BookingSuccess.tsx` page load
- Also: `NotificationSystem.sendBookingConfirmation()`

---

### ✅ **Session Reminders** (3 types)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `session_reminder_24h` | ✅ Yes | ✅ `process-reminders/index.ts` (cron) | ✅ **WORKING** |
| `session_reminder_2h` | ✅ Yes | ⚠️ **NOT TRIGGERED** | ❌ **NOT SENT** |
| `session_reminder_1h` | ✅ Yes | ✅ `process-reminders/index.ts` (cron) | ✅ **WORKING** |

**Issues:**
- ⚠️ `session_reminder_2h` template exists but code schedules `session_reminder_1h` instead
- Code in `notification-system.ts` only schedules 24h and 1h reminders

**Triggers:**
- Scheduled via `reminder_schedules` table
- Processed by `process-reminders` cron job

---

### ✅ **Session Changes** (3 types)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `cancellation` | ✅ Yes | ✅ `MyBookings.tsx` + `SessionDetailView.tsx` | ✅ **WORKING** |
| `practitioner_cancellation` | ✅ Yes | ✅ `MyBookings.tsx` + `SessionDetailView.tsx` | ✅ **WORKING** |
| `rescheduling` | ✅ Yes | ✅ `MyBookings.tsx` + `SessionDetailView.tsx` | ✅ **WORKING** |

**Triggers:**
- User cancels/reschedules booking
- `NotificationSystem.sendCancellationNotification()`
- `NotificationSystem.sendReschedulingNotification()`

---

### ✅ **Peer Treatment Exchange** (7 types)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `peer_booking_confirmed_client` | ✅ Yes | ✅ `NotificationSystem.sendPeerBookingNotifications()` | ✅ **WORKING** |
| `peer_booking_confirmed_practitioner` | ✅ Yes | ✅ `NotificationSystem.sendPeerBookingNotifications()` | ✅ **WORKING** |
| `peer_credits_deducted` | ✅ Yes | ✅ `NotificationSystem.sendPeerBookingNotifications()` | ✅ **WORKING** |
| `peer_credits_earned` | ✅ Yes | ⚠️ **NOT USED** (removed from code) | ⚠️ **NOT SENT** |
| `peer_booking_cancelled_refunded` | ✅ Yes | ✅ `NotificationSystem.sendPeerCancellationNotification()` | ✅ **WORKING** |
| `peer_request_received` | ✅ Yes | ✅ `exchange-notifications.ts` | ✅ **WORKING** |
| `peer_request_accepted` | ✅ Yes | ✅ `exchange-notifications.ts` | ✅ **WORKING** |
| `peer_request_declined` | ✅ Yes | ✅ `exchange-notifications.ts` | ✅ **WORKING** |

**Note:** `peer_credits_earned` template exists but was intentionally removed from code (practitioners don't earn credits from peer bookings).

---

### ✅ **Reviews & Messages** (3 types)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `review_request_client` | ✅ Yes | ✅ `NotificationSystem.sendReviewRequest()` | ✅ **WORKING** |
| `message_received_guest` | ✅ Yes | ✅ `NotificationSystem.sendMessageNotification()` | ✅ **WORKING** |
| `message_received_practitioner` | ✅ Yes | ✅ `NotificationSystem.sendMessageNotification()` | ✅ **WORKING** |

---

### ✅ **Mobile Service Requests** (3 types)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `mobile_request_accepted_client` | ✅ Yes | ✅ Mobile booking flow | ✅ **WORKING** |
| `mobile_request_declined_client` | ✅ Yes | ✅ Mobile booking flow | ✅ **WORKING** |
| `mobile_request_expired_client` | ✅ Yes | ✅ Mobile booking flow | ✅ **WORKING** |

---

### ✅ **Treatment Exchange Requests** (1 type)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `treatment_exchange_request_practitioner` | ✅ Yes | ✅ `exchange-notifications.ts` | ✅ **WORKING** |

---

### ✅ **Booking Requests** (1 type)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `booking_request_practitioner` | ✅ Yes | ✅ Booking request flow | ✅ **WORKING** |

---

### ✅ **Welcome Emails** (2 types)

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `welcome_practitioner` | ✅ Yes | ✅ Database trigger (`trigger_send_welcome_email`) | ✅ **WORKING** |
| `welcome_client` | ✅ Yes | ✅ Database trigger (`trigger_send_welcome_email`) | ✅ **WORKING** |

**Trigger:** `users` table - when `user_role` changes from `NULL` to a value

---

### ❌ **Same-Day Booking Emails** (4 types) - **MISSING TEMPLATES**

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `same_day_booking_pending_practitioner` | ❌ **NO** | ❌ **NO** | ❌ **NOT IMPLEMENTED** |
| `same_day_booking_approved_client` | ❌ **NO** | ⚠️ **YES** (in migration) | ❌ **WILL FAIL** |
| `same_day_booking_declined_client` | ❌ **NO** | ❌ **NO** | ❌ **NOT IMPLEMENTED** |
| `same_day_booking_expired_client` | ❌ **NO** | ❌ **NO** | ❌ **NOT IMPLEMENTED** |

**Issues:**
- ⚠️ Migration `20250131000000_add_same_day_booking_approval.sql` tries to send `same_day_booking_approved_client` but template doesn't exist
- ❌ No email sent when same-day booking is created (practitioner should be notified)
- ❌ No email sent when same-day booking is declined (client should be notified)
- ❌ No email sent when same-day booking expires (both should be notified)

**Location:** `supabase/migrations/20250131000000_add_same_day_booking_approval.sql`

---

### ❌ **Booking Expired Emails** (2 types) - **MISSING TEMPLATES**

| Email Type | Template Exists | Trigger Exists | Status |
|------------|----------------|----------------|--------|
| `booking_expired` | ❌ **NO** | ⚠️ **NOTIFICATION ONLY** | ❌ **NOT SENT** |
| `booking_expired_practitioner` | ❌ **NO** | ⚠️ **NOTIFICATION ONLY** | ❌ **NOT SENT** |

**Issues:**
- ⚠️ Migration creates notifications but doesn't send emails
- ❌ `expire_pending_same_day_bookings()` function only creates notifications, no emails

**Location:** `supabase/migrations/20250131000000_add_same_day_booking_approval.sql` line 383-412

---

## 🚨 **Critical Issues Summary**

### **Missing Email Templates** (6 types)
1. ❌ `same_day_booking_pending_practitioner` - No template, no trigger
2. ❌ `same_day_booking_approved_client` - No template (trigger exists but will fail)
3. ❌ `same_day_booking_declined_client` - No template, no trigger
4. ❌ `same_day_booking_expired_client` - No template, no trigger
5. ❌ `booking_expired` - No template (notification only)
6. ❌ `booking_expired_practitioner` - No template (notification only)

### **Missing Triggers** (2 types)
1. ❌ `same_day_booking_pending_practitioner` - Should be sent when same-day booking is created
2. ❌ `same_day_booking_declined_client` - Should be sent when practitioner declines

### **Incorrect Implementation** (1 type)
1. ⚠️ `session_reminder_2h` - Template exists but not scheduled (code uses 1h instead)

---

## 📊 **Statistics**

- **Total Email Types:** 28
- **Templates Implemented:** 22 ✅
- **Templates Missing:** 6 ❌
- **Triggers Working:** 22 ✅
- **Triggers Missing:** 2 ❌
- **Fully Working:** 20 ✅
- **Needs Fix:** 8 ⚠️❌

---

## 🔧 **Required Actions**

### **Priority 1: Critical (Will Cause Errors)**
1. ❌ Add template for `same_day_booking_approved_client` (migration tries to send it)
2. ❌ Add trigger to send `same_day_booking_pending_practitioner` when booking created
3. ❌ Add template + trigger for `same_day_booking_declined_client`

### **Priority 2: Important (Missing Functionality)**
4. ❌ Add templates for `booking_expired` and `booking_expired_practitioner`
5. ❌ Update `expire_pending_same_day_bookings()` to send emails, not just notifications
6. ❌ Add template + trigger for `same_day_booking_expired_client`

### **Priority 3: Enhancement**
7. ⚠️ Fix `session_reminder_2h` scheduling (currently not used)

---

## 📝 **Notes**

- All email types are defined in `EmailRequest` interface
- Templates use `EmailDesign.buildEmail()` for consistent styling
- React email templates exist but are not used (using inline HTML instead)
- Welcome emails are triggered via database trigger (not frontend code)
- Same-day booking emails need to be implemented in `send-email/index.ts` switch statement
