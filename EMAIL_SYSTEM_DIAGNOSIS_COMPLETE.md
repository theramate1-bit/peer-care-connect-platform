# Email System Complete Diagnosis ✅

**Date:** February 2025  
**Method:** Supabase MCP Analysis  
**Project:** aikqnvltuwwgifuocvto

---

## 📊 **EXECUTIVE SUMMARY**

### **Status:** ⚠️ **PARTIALLY WORKING** - Critical Issues Found

**Working:**
- ✅ Stripe webhook emails (with rate limit issues)
- ✅ Email logging system
- ✅ Edge functions deployed

**Broken:**
- ❌ Same-day booking emails (missing trigger)
- ❌ Session reminders (cron not scheduled)
- ❌ Database-triggered emails (missing settings)

---

## 🔍 **DETAILED FINDINGS**

### **1. RESEND API RATE LIMITING** 🔴 **CRITICAL**

**Evidence:**
- Last 30 days: **14 sent, 2 failed** (both rate limited)
- Error: `"Too many requests. You can only make 2 requests per second."`
- Affected: `payment_confirmation_client`, `peer_booking_confirmed_practitioner`

**Root Cause:**
- Stripe webhook sends **4 emails simultaneously**
- Resend free tier: **2 requests/second max**
- No throttling/queuing implemented

**Impact:** ⚠️ **HIGH** - 50% of webhook emails fail when sent in batches

**Fix:** Add rate limiting to `send-email` function (see Fix 1 below)

---

### **2. MISSING SAME-DAY BOOKING TRIGGER** 🔴 **CRITICAL**

**Evidence:**
- Query result: `trigger_send_same_day_booking_pending_email` **DOES NOT EXIST**
- Migration `20250202000000_add_same_day_booking_email_triggers.sql` **NOT APPLIED**

**Applied Migrations Found:**
- ✅ `add_same_day_booking_approval` (20260303162844)
- ✅ `add_welcome_email_trigger` (20260303152456)
- ❌ `20250202000000_add_same_day_booking_email_triggers` **MISSING**

**Impact:** ⚠️ **HIGH** - Practitioners never notified of same-day bookings

**Fix:** Apply migration via MCP or Supabase Dashboard (see Fix 2 below)

---

### **3. MISSING DATABASE SETTINGS** 🔴 **CRITICAL**

**Evidence:**
- Query result: **0 rows** for `app.settings.*`
- Database triggers/functions use `current_setting('app.settings.edge_function_url')`
- Falls back to hardcoded URLs (may not work)

**Impact:** ⚠️ **HIGH** - All database-triggered emails may fail:
- Welcome emails
- Same-day booking emails  
- Expired booking emails

**Fix:** Configure database settings (see Fix 3 below)

---

### **4. SESSION REMINDERS NOT PROCESSING** 🔴 **CRITICAL**

**Evidence:**
- **19 pending reminders** found
- Oldest: 2025-12-30 (expired!)
- Newest: 2026-02-22
- All status: `pending` (never processed)

**Root Cause:**
- `process-reminders` function exists and is deployed ✅
- Cron job likely **NOT SCHEDULED** ❌

**Impact:** ⚠️ **HIGH** - Users never receive session reminders

**Fix:** Schedule cron job (see Fix 4 below)

---

### **5. EMAIL STATISTICS (Last 7 Days)**

| Email Type | Total | Sent | Failed | Rate Limited |
|------------|-------|------|--------|--------------|
| `booking_confirmation_client` | 1 | 1 | 0 | 0 |
| `booking_confirmation_practitioner` | 1 | 1 | 0 | 0 |
| `payment_confirmation_client` | 1 | 1 | 0 | 0 |
| `payment_received_practitioner` | 1 | 1 | 0 | 0 |

**Note:** Recent emails show success, but older logs show rate limiting failures.

---

## ✅ **WHAT'S WORKING**

1. ✅ `send-email` Edge Function deployed (version 36)
2. ✅ `process-reminders` Edge Function deployed (version 25)
3. ✅ `pg_net` extension enabled (version 0.14.0)
4. ✅ Welcome email trigger exists (`trigger_send_welcome_email`)
5. ✅ Email logs table working
6. ✅ Stripe webhook working (200 responses in logs)
7. ✅ Functions exist: `approve_same_day_booking`, `decline_same_day_booking`, `expire_pending_same_day_bookings`

---

## 🔧 **REQUIRED FIXES**

### **Fix 1: Add Rate Limiting to send-email Function** 🔴

**File:** `supabase/functions/send-email/index.ts`

**Add after line 138 (after Resend initialization):**

```typescript
// Rate limiting: Resend free tier allows 2 requests/second
let lastEmailSendTime = 0;
const MIN_EMAIL_INTERVAL_MS = 500; // 500ms = 2 emails/second max

// Helper function for delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Before sending email (around line 190):
const now = Date.now();
const timeSinceLastSend = now - lastEmailSendTime;
if (timeSinceLastSend < MIN_EMAIL_INTERVAL_MS) {
  const waitTime = MIN_EMAIL_INTERVAL_MS - timeSinceLastSend;
  console.log(`⏳ Rate limiting: waiting ${waitTime}ms before sending email`);
  await delay(waitTime);
}
lastEmailSendTime = Date.now();
```

**Deploy:** After making changes, deploy the function

---

### **Fix 2: Apply Missing Migration** 🔴

**Migration:** `20250202000000_add_same_day_booking_email_triggers.sql`

**Status:** ❌ **NOT APPLIED**

**Action:** Apply via Supabase MCP:

```sql
-- Run the migration file contents via MCP execute_sql
-- OR apply via Supabase Dashboard → Database → Migrations
```

**Verify after applying:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_same_day_booking_pending_email';
```

---

### **Fix 3: Configure Database Settings** 🔴

**Get Service Role Key:**
- Supabase Dashboard → Settings → API → `service_role` key (secret)

**Then run:**
```sql
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://aikqnvltuwwgifuocvto.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
ALTER DATABASE postgres SET app.settings.site_url = 'https://theramate.co.uk';
```

**Verify:**
```sql
SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';
```

**Note:** These settings persist across database connections.

---

### **Fix 4: Schedule Cron Job** 🔴

**Steps:**
1. Supabase Dashboard → Edge Functions → Cron Jobs
2. Click "Add Cron Job" or "New Cron Job"
3. Configure:
   - **Function:** `process-reminders`
   - **Schedule:** `*/15 * * * *` (every 15 minutes)
   - **Enabled:** Yes
   - **Description:** "Process pending session reminders"
4. Save

**Verify:**
- Check cron job appears in list
- Wait 15 minutes and check reminders table for status changes
- Check edge function logs for `process-reminders` invocations

---

## 📋 **EMAIL TYPE STATUS**

| Email Type | Trigger | Status | Issue |
|------------|---------|--------|-------|
| `booking_confirmation_client` | Stripe Webhook | ⚠️ Partial | Rate limiting |
| `booking_confirmation_practitioner` | Stripe Webhook | ⚠️ Partial | Rate limiting |
| `payment_confirmation_client` | Stripe Webhook | ⚠️ Partial | Rate limiting |
| `payment_received_practitioner` | Stripe Webhook | ⚠️ Partial | Rate limiting |
| `same_day_booking_pending_practitioner` | DB Trigger | ❌ Broken | Trigger missing |
| `same_day_booking_approved_client` | DB Function | ⚠️ Unknown | Needs DB settings |
| `same_day_booking_declined_client` | DB Function | ⚠️ Unknown | Needs DB settings |
| `same_day_booking_expired_client` | DB Function | ⚠️ Unknown | Needs DB settings |
| `booking_expired` | DB Function | ⚠️ Unknown | Needs DB settings |
| `booking_expired_practitioner` | DB Function | ⚠️ Unknown | Needs DB settings |
| `session_reminder_24h` | Cron Job | ❌ Broken | Cron not scheduled |
| `session_reminder_2h` | Cron Job | ❌ Broken | Cron not scheduled |
| `session_reminder_1h` | Cron Job | ❌ Broken | Cron not scheduled |
| `welcome_practitioner` | DB Trigger | ⚠️ Unknown | Needs DB settings |
| `welcome_client` | DB Trigger | ⚠️ Unknown | Needs DB settings |

---

## 🎯 **ACTION PLAN**

### **Priority 1: Fix Rate Limiting** (15 minutes)
1. Add rate limiting code to `send-email/index.ts`
2. Deploy function
3. Test with webhook

### **Priority 2: Configure DB Settings** (5 minutes)
1. Get service role key from dashboard
2. Run ALTER DATABASE commands
3. Verify settings

### **Priority 3: Apply Migration** (5 minutes)
1. Apply `20250202000000_add_same_day_booking_email_triggers.sql`
2. Verify trigger created
3. Test same-day booking

### **Priority 4: Schedule Cron** (2 minutes)
1. Add cron job in dashboard
2. Wait 15 minutes
3. Verify reminders processed

---

## 📈 **MONITORING**

**After fixes, monitor:**

1. **Email Logs:**
   ```sql
   SELECT email_type, status, COUNT(*) 
   FROM email_logs 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY email_type, status;
   ```

2. **Failed Emails:**
   ```sql
   SELECT * FROM email_logs 
   WHERE status = 'failed' 
   ORDER BY created_at DESC LIMIT 20;
   ```

3. **Reminders:**
   ```sql
   SELECT status, COUNT(*) 
   FROM reminders 
   GROUP BY status;
   ```

4. **Edge Function Logs:**
   - Dashboard → Edge Functions → `send-email` → Logs
   - Dashboard → Edge Functions → `process-reminders` → Logs

---

**Last Updated:** February 2025  
**Next Review:** After fixes applied
