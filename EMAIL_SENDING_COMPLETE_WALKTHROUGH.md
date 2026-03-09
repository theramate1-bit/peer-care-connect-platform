# Complete Email Sending System Walkthrough 🔍

**Date:** February 2025  
**Purpose:** Identify why some emails are not being sent

---

## 📋 **Email Sending Flow Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    EMAIL TRIGGER POINTS                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Stripe Webhook (checkout.session.completed)             │
│ 2. Database Triggers (INSERT on client_sessions)          │
│ 3. Database Functions (approve/decline/expire bookings)    │
│ 4. Frontend NotificationSystem (cancellations, etc.)      │
│ 5. Cron Job (process-reminders)                            │
│ 6. Welcome Email Trigger (user_role update)                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              send-email Edge Function                       │
│  - Validates emailType, recipientEmail                     │
│  - Generates template (EmailDesign.buildEmail)             │
│  - Sends via Resend API                                    │
│  - Logs to email_logs table                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 **1. STRIPE WEBHOOK PATH** (Primary Booking Emails)

### **Trigger:** `stripe-webhook/index.ts` → `checkout.session.completed` event

### **Emails Sent:**
1. ✅ `booking_confirmation_client`
2. ✅ `booking_confirmation_practitioner`
3. ✅ `payment_confirmation_client`
4. ✅ `payment_received_practitioner`

### **Flow:**
```typescript
// File: supabase/functions/stripe-webhook/index.ts
// Lines: 560-760

1. Webhook receives checkout.session.completed
2. Extracts session data from Stripe metadata
3. Calls send-email Edge Function 4 times:
   - booking_confirmation_client (line 600)
   - booking_confirmation_practitioner (line 643)
   - payment_confirmation_client (line 691)
   - payment_received_practitioner (line 734)
```

### **Potential Issues:**
- ❓ **Missing Authorization Header?** 
  - ✅ **FIXED:** Uses `SUPABASE_SERVICE_ROLE_KEY` (line 602, 645, 693, 736)
- ❓ **Email addresses missing?**
  - Checks: `clientEmail` (line 565-568), `practitionerEmail` (line 572)
  - ⚠️ **ISSUE:** If `clientEmail` is null/undefined, email won't send (line 575)
- ❓ **Error handling?**
  - ✅ **GOOD:** Errors logged but don't block webhook (lines 628-637)

### **Verification Steps:**
```sql
-- Check recent webhook events
SELECT * FROM stripe_webhook_events 
WHERE event_type = 'checkout.session.completed' 
ORDER BY created_at DESC LIMIT 10;

-- Check if emails were logged
SELECT * FROM email_logs 
WHERE email_type IN (
  'booking_confirmation_client',
  'booking_confirmation_practitioner',
  'payment_confirmation_client',
  'payment_received_practitioner'
)
ORDER BY sent_at DESC LIMIT 20;
```

---

## 🔍 **2. DATABASE TRIGGER PATH** (Same-Day Booking Emails)

### **Trigger:** `trigger_send_same_day_booking_pending_email` on `client_sessions` INSERT

### **Emails Sent:**
1. ✅ `same_day_booking_pending_practitioner`

### **Flow:**
```sql
-- File: supabase/migrations/20250202000000_add_same_day_booking_email_triggers.sql
-- Lines: 250-300

1. INSERT into client_sessions with requires_approval=true, status='pending_approval'
2. Trigger fires AFTER INSERT
3. Calls send_same_day_booking_pending_email() function
4. Function calls send-email Edge Function via net.http_post()
```

### **Potential Issues:**
- ❓ **pg_net extension enabled?**
  - ✅ **CHECK:** Migration creates extension (line 5 in welcome_email_trigger.sql)
  - ⚠️ **VERIFY:** `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- ❓ **Edge function URL configured?**
  - Uses: `current_setting('app.settings.edge_function_url', true)` or default
  - ⚠️ **ISSUE:** If setting not configured, uses hardcoded URL
- ❓ **Authorization token?**
  - Uses: `current_setting('app.settings.service_role_key', true)` or anon_key
  - ⚠️ **ISSUE:** If setting not configured, uses anon_key (may fail)

### **Verification Steps:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_same_day_booking_pending_email';

-- Check recent same-day bookings
SELECT id, requires_approval, status, created_at 
FROM client_sessions 
WHERE requires_approval = true 
ORDER BY created_at DESC LIMIT 10;

-- Check if emails were sent
SELECT * FROM email_logs 
WHERE email_type = 'same_day_booking_pending_practitioner'
ORDER BY sent_at DESC LIMIT 10;
```

---

## 🔍 **3. DATABASE FUNCTION PATH** (Approval/Decline/Expire Emails)

### **Functions:**
1. `approve_same_day_booking()` → `same_day_booking_approved_client`
2. `decline_same_day_booking()` → `same_day_booking_declined_client`
3. `expire_pending_same_day_bookings()` → `same_day_booking_expired_client` + `booking_expired_practitioner`

### **Flow:**
```sql
-- File: supabase/migrations/20250202000000_add_same_day_booking_email_triggers.sql

1. Function called (approve/decline/expire)
2. Updates session status
3. Calls send-email Edge Function via net.http_post()
4. Wrapped in EXCEPTION handler (errors logged but don't fail)
```

### **Potential Issues:**
- ❓ **Same as Database Trigger Path** (pg_net, URL, auth token)
- ❓ **Function called correctly?**
  - ⚠️ **CHECK:** Frontend must call RPC functions correctly
- ❓ **Exception handling?**
  - ✅ **GOOD:** Uses `EXCEPTION WHEN OTHERS` with `RAISE WARNING`

### **Verification Steps:**
```sql
-- Check function exists
SELECT proname FROM pg_proc 
WHERE proname IN (
  'approve_same_day_booking',
  'decline_same_day_booking',
  'expire_pending_same_day_bookings'
);

-- Check recent approvals/declines
SELECT id, status, requires_approval, updated_at 
FROM client_sessions 
WHERE status IN ('confirmed', 'declined', 'expired')
AND requires_approval = true
ORDER BY updated_at DESC LIMIT 10;
```

---

## 🔍 **4. FRONTEND NOTIFICATION SYSTEM PATH**

### **Trigger:** `NotificationSystem.sendBookingConfirmation()` and other methods

### **Emails Sent:**
- `booking_confirmation_client` (fallback)
- `booking_confirmation_practitioner` (fallback)
- `cancellation`
- `practitioner_cancellation`
- `rescheduling`
- `session_reminder_24h`, `session_reminder_2h`, `session_reminder_1h`
- `review_request_client`
- `message_received_guest`
- Peer booking emails
- Mobile request emails

### **Flow:**
```typescript
// File: src/lib/notification-system.ts
// Lines: 93-131

1. Frontend calls NotificationSystem method
2. Method calls supabase.functions.invoke('send-email')
3. Uses client-side Supabase client (anon key)
```

### **Potential Issues:**
- ❓ **Authorization?**
  - ⚠️ **ISSUE:** Uses client-side Supabase client (anon key)
  - ⚠️ **FIX NEEDED:** Should use service role key or RLS must allow
- ❓ **Error handling?**
  - ✅ **GOOD:** Errors logged but don't throw (line 113, 120)
- ❓ **Called correctly?**
  - ⚠️ **CHECK:** Verify methods are called from correct places

### **Verification Steps:**
```typescript
// Check browser console for:
// [Email Sent] booking_confirmation_client to email@example.com
// [Email Error] booking_confirmation_client to email@example.com: ...
// [Email Failed] booking_confirmation_client to email@example.com: ...
```

---

## 🔍 **5. CRON JOB PATH** (Session Reminders)

### **Trigger:** `process-reminders` Edge Function (scheduled cron job)

### **Emails Sent:**
- `session_reminder_24h`
- `session_reminder_2h`
- `session_reminder_1h`

### **Flow:**
```typescript
// File: supabase/functions/process-reminders/index.ts
// Lines: 51-239

1. Cron job triggers process-reminders function
2. Queries reminders table for pending reminders due now
3. For each reminder, calls send-email Edge Function
4. Marks reminder as 'sent' or 'failed'
```

### **Potential Issues:**
- ❓ **Cron job scheduled?**
  - ⚠️ **CRITICAL:** Must be scheduled in Supabase Dashboard
  - ⚠️ **CHECK:** Settings → Edge Functions → Cron Jobs
- ❓ **Reminders created?**
  - ✅ **CHECK:** `NotificationSystem.scheduleSessionReminders()` creates reminders
  - ⚠️ **VERIFY:** Check reminders table has entries
- ❓ **Authorization?**
  - ✅ **GOOD:** Uses `SUPABASE_SERVICE_ROLE_KEY` (line 213)

### **Verification Steps:**
```sql
-- Check reminders table
SELECT * FROM reminders 
WHERE status = 'pending' 
ORDER BY reminder_time ASC LIMIT 20;

-- Check sent reminders
SELECT * FROM reminders 
WHERE status = 'sent' 
ORDER BY sent_at DESC LIMIT 20;

-- Check failed reminders
SELECT * FROM reminders 
WHERE status = 'failed' 
ORDER BY created_at DESC LIMIT 20;
```

---

## 🔍 **6. WELCOME EMAIL TRIGGER PATH**

### **Trigger:** `trigger_send_welcome_email` on `users` table UPDATE

### **Emails Sent:**
- `welcome_practitioner`
- `welcome_client`

### **Flow:**
```sql
-- File: supabase/migrations/20250130000000_add_welcome_email_trigger.sql
-- Lines: 100-111

1. UPDATE users SET user_role = '...' (first time)
2. Trigger fires AFTER UPDATE
3. Calls send_welcome_email() function
4. Function calls send-email Edge Function via net.http_post()
```

### **Potential Issues:**
- ❓ **Same as Database Trigger Path** (pg_net, URL, auth token)
- ❓ **Trigger condition?**
  - ✅ **CHECK:** Only fires when `user_role` changes from NULL to a value
  - ⚠️ **ISSUE:** If user_role already set, won't fire

### **Verification Steps:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_welcome_email';

-- Check recent user role updates
SELECT id, email, user_role, updated_at 
FROM users 
WHERE user_role IS NOT NULL 
ORDER BY updated_at DESC LIMIT 10;

-- Check welcome emails sent
SELECT * FROM email_logs 
WHERE email_type IN ('welcome_practitioner', 'welcome_client')
ORDER BY sent_at DESC LIMIT 10;
```

---

## 🚨 **COMMON FAILURE POINTS**

### **1. Missing Configuration**

#### **Required Environment Variables:**
```bash
RESEND_API_KEY          # ⚠️ CRITICAL - Without this, NO emails send
RESEND_FROM_EMAIL       # Optional - defaults to 'Theramate <noreply@theramate.co.uk>'
SITE_URL                # Optional - defaults to 'https://theramate.co.uk'
SUPABASE_SERVICE_ROLE_KEY # Required for database triggers/functions
```

#### **Required Database Settings:**
```sql
-- Check if settings exist
SELECT name, setting FROM pg_settings 
WHERE name LIKE 'app.settings.%';

-- If missing, set them:
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://your-project.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
ALTER DATABASE postgres SET app.settings.site_url = 'https://theramate.co.uk';
```

### **2. pg_net Extension Not Enabled**

```sql
-- Check if enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Enable if missing
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### **3. Edge Function Not Deployed**

- ⚠️ **CHECK:** Supabase Dashboard → Edge Functions → `send-email`
- ⚠️ **VERIFY:** Function is deployed and active
- ⚠️ **TEST:** Use "Invoke Function" button in dashboard

### **4. Email Logs Table Missing**

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'email_logs';

-- If missing, create it:
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  resend_email_id TEXT,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **5. Authorization Issues**

#### **Database Functions/Triggers:**
- Must use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Check `app.settings.service_role_key` is set

#### **Frontend Calls:**
- Uses client-side Supabase client (anon key)
- ⚠️ **ISSUE:** May fail if RLS blocks or function requires auth
- ✅ **FIX:** Use service role key or ensure RLS allows

---

## 🔧 **DIAGNOSTIC QUERIES**

### **Check All Email Logs:**
```sql
-- Recent emails sent
SELECT 
  email_type,
  recipient_email,
  status,
  sent_at,
  error_message,
  resend_email_id
FROM email_logs
ORDER BY sent_at DESC
LIMIT 50;
```

### **Check Failed Emails:**
```sql
-- Failed emails
SELECT 
  email_type,
  recipient_email,
  error_message,
  sent_at
FROM email_logs
WHERE status = 'failed' OR error_message IS NOT NULL
ORDER BY sent_at DESC
LIMIT 20;
```

### **Check Email Types Not Sent:**
```sql
-- Email types that should exist but haven't been sent recently
SELECT DISTINCT email_type
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
ORDER BY email_type;
```

### **Check Database Trigger Status:**
```sql
-- All triggers that might send emails
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname LIKE '%email%' OR tgname LIKE '%welcome%' OR tgname LIKE '%same_day%';
```

### **Check Function Status:**
```sql
-- Functions that send emails
SELECT 
  proname AS function_name,
  prosrc LIKE '%send-email%' AS calls_send_email,
  prosrc LIKE '%net.http_post%' AS uses_http_post
FROM pg_proc
WHERE proname LIKE '%email%' 
   OR proname LIKE '%welcome%'
   OR proname LIKE '%same_day%'
   OR proname LIKE '%booking%';
```

---

## ✅ **ACTION ITEMS**

### **Immediate Checks:**

1. **Verify RESEND_API_KEY is set:**
   ```bash
   # In Supabase Dashboard → Settings → Edge Functions → Secrets
   # Check RESEND_API_KEY exists and is valid
   ```

2. **Check Edge Function Logs:**
   ```
   Supabase Dashboard → Edge Functions → send-email → Logs
   Look for errors, missing API key, etc.
   ```

3. **Verify Database Settings:**
   ```sql
   SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';
   ```

4. **Check pg_net Extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

5. **Review Email Logs:**
   ```sql
   SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 20;
   ```

### **Fix Missing Configurations:**

1. **Set Database Settings:**
   ```sql
   -- Get your project URL and service role key from Supabase Dashboard
   ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://YOUR_PROJECT.supabase.co/functions/v1';
   ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
   ALTER DATABASE postgres SET app.settings.site_url = 'https://theramate.co.uk';
   ```

2. **Enable pg_net Extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

3. **Schedule Cron Job:**
   ```
   Supabase Dashboard → Edge Functions → Cron Jobs
   Add: process-reminders (runs every 15 minutes)
   ```

---

## 📊 **EMAIL TYPE STATUS CHECKLIST**

| Email Type | Trigger Path | Status | Notes |
|------------|--------------|--------|-------|
| `booking_confirmation_client` | Stripe Webhook | ✅ | Primary path |
| `booking_confirmation_practitioner` | Stripe Webhook | ✅ | Primary path |
| `payment_confirmation_client` | Stripe Webhook | ✅ | Primary path |
| `payment_received_practitioner` | Stripe Webhook | ✅ | Primary path |
| `same_day_booking_pending_practitioner` | DB Trigger | ⚠️ | Requires pg_net + config |
| `same_day_booking_approved_client` | DB Function | ⚠️ | Requires pg_net + config |
| `same_day_booking_declined_client` | DB Function | ⚠️ | Requires pg_net + config |
| `same_day_booking_expired_client` | DB Function | ⚠️ | Requires pg_net + config |
| `booking_expired` | DB Function | ⚠️ | Requires pg_net + config |
| `booking_expired_practitioner` | DB Function | ⚠️ | Requires pg_net + config |
| `session_reminder_24h` | Cron Job | ⚠️ | Requires cron scheduled |
| `session_reminder_2h` | Cron Job | ⚠️ | Requires cron scheduled |
| `session_reminder_1h` | Cron Job | ⚠️ | Requires cron scheduled |
| `welcome_practitioner` | DB Trigger | ⚠️ | Requires pg_net + config |
| `welcome_client` | DB Trigger | ⚠️ | Requires pg_net + config |
| `cancellation` | Frontend | ⚠️ | Requires auth |
| `practitioner_cancellation` | Frontend | ⚠️ | Requires auth |
| `rescheduling` | Frontend | ⚠️ | Requires auth |
| `review_request_client` | Frontend | ⚠️ | Requires auth |
| `message_received_guest` | Frontend | ⚠️ | Requires auth |
| Peer booking emails | Frontend | ⚠️ | Requires auth |
| Mobile request emails | Frontend | ⚠️ | Requires auth |

---

## 🎯 **NEXT STEPS**

1. **Run all diagnostic queries above**
2. **Check Supabase Dashboard logs for errors**
3. **Verify all configurations are set**
4. **Test each email type individually**
5. **Fix any missing configurations**
6. **Monitor email_logs table for failures**

---

**Last Updated:** February 2025
