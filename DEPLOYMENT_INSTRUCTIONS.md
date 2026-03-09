# Email System Deployment Instructions 🚀

**Status:** Ready for Production Deployment  
**Last Updated:** February 2025

---

## ⚡ **QUICK START (5 Minutes)**

### **Step 1: Deploy Edge Functions**

**Via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions
2. Deploy each function:
   - `send-email` (update existing)
   - `email-health-check` (new)
   - `retry-failed-emails` (new)
   - `process-reminders` (update existing)

**Via CLI:**
```bash
cd peer-care-connect
supabase functions deploy send-email
supabase functions deploy email-health-check
supabase functions deploy retry-failed-emails
supabase functions deploy process-reminders
```

---

### **Step 2: Configure Service Role Key**

**Get Service Role Key:**
1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/api
2. Copy the `service_role` key (starts with `eyJ...`)

**Set in Database:**
```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

**Verify:**
```sql
SELECT name, setting FROM pg_settings WHERE name = 'app.settings.service_role_key';
```

---

### **Step 3: Schedule Cron Job**

**Via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions/cron
2. Click "Add Cron Job"
3. Configure:
   - **Function:** `process-reminders`
   - **Schedule:** `*/15 * * * *` (every 15 minutes)
   - **Enabled:** ✅ Yes
4. Save

**Verify:**
- Wait 15 minutes
- Check reminders: `SELECT status, COUNT(*) FROM reminders GROUP BY status;`
- Should see reminders changing from `pending` to `sent`

---

### **Step 4: Verify Deployment**

**Health Check:**
```bash
curl https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/email-health-check \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "health": {
    "status": "healthy",
    "metrics": {
      "recent_failures_24h": 0,
      "rate_limit_errors_24h": 0,
      "pending_reminders": 0,
      "expired_reminders": 0,
      "config_configured": true
    }
  }
}
```

---

## ✅ **VERIFICATION CHECKLIST**

After deployment, verify:

- [ ] `send-email` function deployed
- [ ] `email-health-check` function deployed
- [ ] `retry-failed-emails` function deployed
- [ ] `process-reminders` function deployed
- [ ] Service role key configured
- [ ] Cron job scheduled
- [ ] Health check returns `healthy`
- [ ] Test email sent successfully
- [ ] All email types working

---

## 🔍 **TESTING**

### **Test Email Sending**

```bash
curl -X POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "welcome_practitioner",
    "recipientEmail": "test@example.com",
    "recipientName": "Test User",
    "data": {}
  }'
```

### **Test Health Check**

```bash
curl https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/email-health-check \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### **Test Retry Failed Emails**

```bash
curl -X POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/retry-failed-emails \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"hours_back": 24, "max_retries": 3}'
```

---

## 📊 **MONITORING**

### **Daily Checks**

```sql
-- Email success rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*) AS success_rate_pct
FROM email_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Failed emails
SELECT email_type, COUNT(*) 
FROM email_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type;

-- Pending reminders
SELECT COUNT(*) 
FROM reminders
WHERE status = 'pending'
  AND reminder_time < NOW() + INTERVAL '24 hours';
```

### **Health Check Endpoint**

Monitor: `https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/email-health-check`

**Alert if:**
- Status = `critical` for > 10 minutes
- Status = `warning` for > 1 hour
- Failed emails > 10 in 24h

---

## 🚨 **TROUBLESHOOTING**

### **Emails Not Sending**

1. Check health: `SELECT public.check_email_system_health();`
2. Check failed emails: `SELECT * FROM email_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;`
3. Retry failed: `SELECT * FROM public.retry_failed_emails(24, 3);`

### **Rate Limiting**

1. Check rate limit table: `SELECT * FROM email_rate_limit;`
2. Check recent sends: `SELECT COUNT(*), DATE_TRUNC('second', created_at) FROM email_logs WHERE created_at > NOW() - INTERVAL '1 minute' GROUP BY DATE_TRUNC('second', created_at);`

### **Reminders Not Processing**

1. Check cron: `SELECT * FROM cron.job WHERE jobname = 'process_reminders';`
2. Manually trigger: `curl -X POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/process-reminders -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"`

---

## 📚 **DOCUMENTATION**

- **Complete System:** `PRODUCTION_EMAIL_SYSTEM_COMPLETE.md`
- **Diagnosis:** `EMAIL_SYSTEM_DIAGNOSIS_COMPLETE.md`
- **Status:** `EMAIL_SYSTEM_STATUS.md`

---

**Deployment Status:** ✅ **READY**  
**Next Review:** After 24 hours of production use
