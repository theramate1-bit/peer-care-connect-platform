# Email System - Required Fixes 🚨

**Date:** February 2025  
**Based on:** Supabase MCP Analysis

---

## 🔴 **CRITICAL ISSUES FOUND**

### **1. RESEND API RATE LIMITING** ⚠️ **HIGHEST PRIORITY**

**Problem:**
- Resend free tier allows only **2 requests per second**
- Stripe webhook sends **4 emails simultaneously** (booking_confirmation_client, booking_confirmation_practitioner, payment_confirmation_client, payment_received_practitioner)
- Result: **2 emails fail** with rate limit errors

**Evidence:**
```
Last 30 days: 14 sent, 2 failed (both rate limited)
Error: "Too many requests. You can only make 2 requests per second."
```

**Fix Required:**
Add rate limiting/throttling to `send-email` function to space out email sends.

**Solution:** Update `send-email/index.ts` to add delays between sends when called from webhook.

---

### **2. MISSING SAME-DAY BOOKING TRIGGER** ❌ **CRITICAL**

**Problem:**
- `trigger_send_same_day_booking_pending_email` **does NOT exist**
- Migration `20250202000000_add_same_day_booking_email_triggers.sql` may not have been applied

**Impact:**
- Practitioners never receive same-day booking notifications
- Same-day booking workflow broken

**Fix Required:**
Apply migration or create trigger manually.

---

### **3. MISSING DATABASE SETTINGS** ❌ **CRITICAL**

**Problem:**
- No `app.settings.*` configured in database
- Database triggers/functions cannot call edge function

**Missing:**
- `app.settings.edge_function_url`
- `app.settings.service_role_key`
- `app.settings.site_url`

**Impact:**
- Welcome emails may fail
- Same-day booking emails will fail
- Expired booking emails will fail

**Fix Required:**
```sql
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://aikqnvltuwwgifuocvto.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
ALTER DATABASE postgres SET app.settings.site_url = 'https://theramate.co.uk';
```

---

### **4. SESSION REMINDERS NOT PROCESSING** ❌ **CRITICAL**

**Problem:**
- **19 pending reminders** found (oldest from Dec 2025!)
- `process-reminders` cron job likely not scheduled
- Reminders never sent

**Impact:**
- Users never receive session reminders (24h, 2h, 1h before)

**Fix Required:**
Schedule cron job in Supabase Dashboard:
- Function: `process-reminders`
- Schedule: `*/15 * * * *` (every 15 minutes)
- Status: Active

---

## ✅ **WHAT'S WORKING**

1. ✅ `send-email` Edge Function deployed (version 36)
2. ✅ `process-reminders` Edge Function deployed (version 25)
3. ✅ `pg_net` extension enabled
4. ✅ Welcome email trigger exists and enabled
5. ✅ Email logs table working
6. ✅ Stripe webhook working (200 responses)
7. ✅ Some emails successfully sending

---

## 🔧 **IMMEDIATE FIXES**

### **Fix 1: Add Rate Limiting to send-email Function**

**File:** `supabase/functions/send-email/index.ts`

**Add delay between email sends when called from webhook:**
```typescript
// Add at top of file
let lastEmailSendTime = 0;
const MIN_EMAIL_INTERVAL_MS = 500; // 500ms = 2 emails/second max

// In serve() function, before sending email:
const now = Date.now();
const timeSinceLastSend = now - lastEmailSendTime;
if (timeSinceLastSend < MIN_EMAIL_INTERVAL_MS) {
  await delay(MIN_EMAIL_INTERVAL_MS - timeSinceLastSend);
}
lastEmailSendTime = Date.now();
```

### **Fix 2: Apply Missing Migration**

**Check if applied:**
```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE name = '20250202000000_add_same_day_booking_email_triggers';
```

**If not applied, run migration via Supabase Dashboard or MCP.**

### **Fix 3: Configure Database Settings**

**Get service role key from:** Supabase Dashboard → Settings → API → service_role key

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

### **Fix 4: Schedule Cron Job**

**Steps:**
1. Supabase Dashboard → Edge Functions → Cron Jobs
2. Click "Add Cron Job"
3. Function: `process-reminders`
4. Schedule: `*/15 * * * *`
5. Enabled: Yes
6. Save

---

## 📊 **EMAIL STATUS SUMMARY**

| Email Type | Status | Issue |
|------------|--------|-------|
| Stripe webhook emails | ⚠️ Partial | Rate limiting |
| Same-day booking emails | ❌ Broken | Missing trigger + DB settings |
| Session reminders | ❌ Broken | Cron not scheduled |
| Welcome emails | ⚠️ Unknown | Needs DB settings |

---

## 🎯 **PRIORITY ORDER**

1. **Fix rate limiting** (affects all webhook emails)
2. **Configure DB settings** (affects all DB-triggered emails)
3. **Apply migration** (fixes same-day booking emails)
4. **Schedule cron job** (fixes session reminders)

---

**Next Steps:** Apply fixes in priority order and verify each fix works.
