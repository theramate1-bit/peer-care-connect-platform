# Email System Diagnosis Results 🔍

**Date:** February 2025  
**Project:** aikqnvltuwwgifuocvto  
**Method:** Supabase MCP Analysis

---

## ✅ **What's Working**

1. **pg_net Extension:** ✅ Enabled (version 0.14.0)
2. **Welcome Email Trigger:** ✅ Enabled (`trigger_send_welcome_email` on `users` table)
3. **Email Logs Table:** ✅ Exists and logging emails
4. **Stripe Webhook:** ✅ Working (200 responses in logs)
5. **Recent Emails Sent:** ✅ Some emails are successfully sending

---

## 🚨 **Critical Issues Found**

### **1. RESEND API RATE LIMITING** ⚠️ **CRITICAL**

**Problem:** Many emails are failing with rate limit errors:
```
"Too many requests. You can only make 2 requests per second."
```

**Affected Emails:**
- `payment_confirmation_client` (multiple failures)
- `peer_booking_confirmed_practitioner` (multiple failures)

**Root Cause:** 
- Stripe webhook sends 4 emails simultaneously (booking_confirmation_client, booking_confirmation_practitioner, payment_confirmation_client, payment_received_practitioner)
- Resend free tier allows only 2 requests/second
- No rate limiting/throttling in place

**Impact:** ⚠️ **HIGH** - Emails fail silently when rate limited

**Fix Required:**
1. Add rate limiting/throttling to `send-email` function
2. Queue emails instead of sending immediately
3. Upgrade Resend plan OR implement exponential backoff

---

### **2. Missing Same-Day Booking Trigger** ❌ **CRITICAL**

**Problem:** `trigger_send_same_day_booking_pending_email` does NOT exist

**Expected:** Trigger should fire when same-day booking is created

**Impact:** ⚠️ **HIGH** - Practitioners never receive same-day booking notifications

**Fix Required:**
- Migration `20250202000000_add_same_day_booking_email_triggers.sql` may not have been applied
- Need to verify migration was run and trigger was created

---

### **3. Missing Database Settings** ❌ **CRITICAL**

**Problem:** No `app.settings.*` configured in database

**Missing Settings:**
- `app.settings.edge_function_url`
- `app.settings.service_role_key`
- `app.settings.site_url`

**Impact:** ⚠️ **HIGH** - Database triggers/functions cannot call edge function

**Affected:**
- Welcome emails (may fail)
- Same-day booking emails (will fail)
- Expired booking emails (will fail)

**Fix Required:**
```sql
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://aikqnvltuwwgifuocvto.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
ALTER DATABASE postgres SET app.settings.site_url = 'https://theramate.co.uk';
```

---

### **4. Session Reminders Not Processing** ⚠️ **HIGH**

**Problem:** 19 pending reminders found, none being processed

**Pending Reminders:**
- Oldest: 2025-12-30 (expired!)
- Newest: 2026-02-22
- All status: `pending`

**Root Cause:** 
- `process-reminders` cron job likely not scheduled
- OR cron job not running
- OR function not deployed

**Impact:** ⚠️ **HIGH** - Users never receive session reminders

**Fix Required:**
1. Verify `process-reminders` function is deployed
2. Schedule cron job in Supabase Dashboard
3. Run frequency: Every 15 minutes

---

### **5. No Same-Day Bookings Found** ⚠️ **MEDIUM**

**Problem:** No same-day bookings in database

**Possible Reasons:**
- No same-day bookings created yet (not an issue)
- OR trigger not working (can't test)

**Action:** Monitor when first same-day booking is created

---

## 📊 **Email Statistics (Last 7 Days)**

| Email Type | Total | Sent | Failed | Rate Limited |
|------------|-------|------|--------|--------------|
| `booking_confirmation_client` | 1 | 1 | 0 | 0 |
| `booking_confirmation_practitioner` | 1 | 1 | 0 | 0 |
| `payment_confirmation_client` | 1 | 1 | 0 | 0 |
| `payment_received_practitioner` | 1 | 1 | 0 | 0 |

**Note:** Recent emails (last 7 days) show success, but older logs show rate limiting failures.

---

## 🔧 **Immediate Action Items**

### **Priority 1: Fix Rate Limiting** 🔴

**Option A: Add Rate Limiting to send-email Function**
```typescript
// Add queue system or delay between sends
// Implement exponential backoff for rate limit errors
```

**Option B: Upgrade Resend Plan**
- Free tier: 2 requests/second
- Pro tier: Higher limits

**Option C: Batch Email Sends**
- Queue emails and send in batches
- Use background job processor

### **Priority 2: Apply Missing Migration** 🔴

**Check if migration was applied:**
```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%same_day_booking_email_triggers%';
```

**If not applied, run:**
```sql
-- Apply migration manually or via Supabase Dashboard
```

### **Priority 3: Configure Database Settings** 🔴

**Run these SQL commands:**
```sql
-- Get service role key from Supabase Dashboard → Settings → API
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://aikqnvltuwwgifuocvto.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
ALTER DATABASE postgres SET app.settings.site_url = 'https://theramate.co.uk';
```

**Verify:**
```sql
SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';
```

### **Priority 4: Schedule Cron Job** 🟡

**Steps:**
1. Supabase Dashboard → Edge Functions → Cron Jobs
2. Add new cron job:
   - Function: `process-reminders`
   - Schedule: `*/15 * * * *` (every 15 minutes)
   - Enabled: Yes

**Verify:**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-reminders';
```

---

## 📋 **Email Type Status**

| Email Type | Trigger Path | Status | Issue |
|------------|--------------|--------|-------|
| `booking_confirmation_client` | Stripe Webhook | ✅ Working | Rate limit risk |
| `booking_confirmation_practitioner` | Stripe Webhook | ✅ Working | Rate limit risk |
| `payment_confirmation_client` | Stripe Webhook | ⚠️ Partial | Rate limiting |
| `payment_received_practitioner` | Stripe Webhook | ✅ Working | Rate limit risk |
| `same_day_booking_pending_practitioner` | DB Trigger | ❌ Missing | Trigger not created |
| `same_day_booking_approved_client` | DB Function | ⚠️ Unknown | Needs DB settings |
| `same_day_booking_declined_client` | DB Function | ⚠️ Unknown | Needs DB settings |
| `same_day_booking_expired_client` | DB Function | ⚠️ Unknown | Needs DB settings |
| `booking_expired` | DB Function | ⚠️ Unknown | Needs DB settings |
| `booking_expired_practitioner` | DB Function | ⚠️ Unknown | Needs DB settings |
| `session_reminder_24h` | Cron Job | ❌ Not Running | Cron not scheduled |
| `session_reminder_2h` | Cron Job | ❌ Not Running | Cron not scheduled |
| `session_reminder_1h` | Cron Job | ❌ Not Running | Cron not scheduled |
| `welcome_practitioner` | DB Trigger | ⚠️ Unknown | Needs DB settings |
| `welcome_client` | DB Trigger | ⚠️ Unknown | Needs DB settings |

---

## 🎯 **Next Steps**

1. ✅ **Fix rate limiting** - Add throttling/queuing to send-email function
2. ✅ **Apply migration** - Ensure same-day booking trigger is created
3. ✅ **Configure DB settings** - Set app.settings.* values
4. ✅ **Schedule cron job** - Enable process-reminders
5. ✅ **Monitor email_logs** - Track success/failure rates
6. ✅ **Test each email type** - Verify all paths work

---

**Last Updated:** February 2025
