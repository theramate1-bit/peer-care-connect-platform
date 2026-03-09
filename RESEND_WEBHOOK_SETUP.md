# Resend Webhook Setup for Booking Email Tracking ✅

## Why We Need Webhooks

For booking confirmations and critical emails, we need to track:
- ✅ **Email Delivery**: Did the email actually get delivered?
- ❌ **Bounces**: Invalid email addresses - need to notify users
- ⚠️ **Spam Complaints**: User marked as spam - need to investigate
- 📧 **Opens/Clicks**: Track engagement (optional but useful)

## Current Status

✅ **Webhook Handler Created**: `supabase/functions/resend-webhook/index.ts`
✅ **Database Ready**: `email_logs` table supports status tracking
⏳ **Webhook Not Yet Configured in Resend Dashboard**: Needs setup

---

## Setup Steps

### 1. Deploy the Webhook Handler

```bash
cd peer-care-connect/supabase
supabase functions deploy resend-webhook
```

This will create the endpoint:
```
https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/resend-webhook
```

### 2. Configure Webhook in Resend Dashboard

1. **Go to Resend Dashboard**: https://resend.com/webhooks
2. **Click "Add Webhook"**
3. **Enter Webhook URL**:
   ```
   https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/resend-webhook
   ```
4. **Select Events to Subscribe To**:
   - ✅ `email.sent` - Email was sent
   - ✅ `email.delivered` - Email was successfully delivered
   - ✅ `email.bounced` - Email bounced (invalid address)
   - ✅ `email.complained` - Recipient marked as spam
   - ✅ `email.delivery_delayed` - Delivery delayed
   - ✅ `email.opened` - Email was opened (optional)
   - ✅ `email.clicked` - Link was clicked (optional)

5. **Save the Webhook**

### 3. Get Webhook Secret (Optional but Recommended)

1. After creating the webhook, Resend will show a **Webhook Secret**
2. **Add to Supabase Secrets**:
   ```bash
   supabase secrets set RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
3. Update `resend-webhook/index.ts` to verify signatures (security best practice)

---

## How It Works

### Webhook Flow

```
1. Email sent via send-email function
   ↓
2. Email logged in email_logs with status='sent'
   ↓
3. Resend processes email
   ↓
4. Resend sends webhook event to resend-webhook function
   ↓
5. Webhook handler updates email_logs status:
   - 'delivered' - Email delivered successfully
   - 'bounced' - Email bounced (invalid address)
   - 'complained' - Marked as spam
   - 'sent' - Already sent (tracked)
```

### Status Tracking

The `email_logs` table tracks:
- `status`: pending → sent → delivered/bounced/complained
- `delivered_at`: When email was delivered
- `opened_at`: When email was opened (if tracking enabled)
- `clicked_at`: When link was clicked (if tracking enabled)
- `error_message`: Error details for bounces/complaints

---

## Booking-Specific Handling

### Bounced Booking Confirmations

When a booking confirmation email bounces:
- ✅ Email log status updated to 'bounced'
- ✅ Error message logged
- ⚠️ **TODO**: Send in-app notification to user about invalid email
- ⚠️ **TODO**: Flag booking for manual follow-up

### Spam Complaints

When a booking email is marked as spam:
- ✅ Email log status updated to 'complained'
- ⚠️ **TODO**: Investigate email content
- ⚠️ **TODO**: Consider suppression list
- ⚠️ **TODO**: Review email practices

---

## Testing

### Test Webhook Locally

1. Use ngrok or similar to expose local server:
   ```bash
   ngrok http 54321
   ```

2. Point Resend webhook to ngrok URL temporarily

3. Send a test email and verify webhook events are received

### Test in Production

1. Send a test booking confirmation email
2. Check `email_logs` table:
   ```sql
   SELECT * FROM email_logs 
   WHERE email_type LIKE 'booking_%' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. Verify status updates from 'sent' → 'delivered'

---

## Database Schema

The `email_logs` table already has all needed columns:

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  email_type VARCHAR(50),
  recipient_email VARCHAR(255),
  resend_email_id TEXT,
  status VARCHAR(20), -- pending, sent, delivered, bounced, complained
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  ...
);
```

---

## Security

### Webhook Signature Verification (Recommended)

Resend uses [Svix](https://docs.svix.com/) for webhook signatures. To verify:

1. Get webhook secret from Resend Dashboard
2. Add to Supabase secrets: `RESEND_WEBHOOK_SECRET`
3. Implement signature verification in webhook handler

**Current Status**: Webhook handler accepts all requests (for testing)
**Production**: Should add signature verification

---

## Monitoring

### Check Email Delivery Status

```sql
-- Emails sent but not yet delivered
SELECT * FROM email_logs 
WHERE status = 'sent' 
  AND delivered_at IS NULL 
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Bounced emails
SELECT * FROM email_logs 
WHERE status = 'bounced' 
ORDER BY created_at DESC;

-- Spam complaints
SELECT * FROM email_logs 
WHERE status = 'complained' 
ORDER BY created_at DESC;
```

### Booking Email Success Rate

```sql
-- Booking confirmation delivery rate
SELECT 
  email_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
  COUNT(*) FILTER (WHERE status = 'complained') as complained,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'delivered') / COUNT(*),
    2
  ) as delivery_rate_percent
FROM email_logs
WHERE email_type LIKE 'booking_%'
GROUP BY email_type;
```

---

## Next Steps

1. ✅ **Webhook Handler**: Created
2. ⏳ **Deploy Function**: `supabase functions deploy resend-webhook`
3. ⏳ **Configure in Resend**: Add webhook URL in Resend Dashboard
4. ⏳ **Add Webhook Secret**: Set `RESEND_WEBHOOK_SECRET` in Supabase
5. ⏳ **Add Signature Verification**: For production security
6. ⏳ **Handle Bounces**: Notify users when booking emails bounce
7. ⏳ **Monitor & Alert**: Set up alerts for high bounce rates

---

## Resources

- **Resend Webhook Docs**: https://resend.com/docs/dashboard/webhooks
- **Resend Events**: https://resend.com/docs/api-reference/webhooks/create-webhook
- **Svix Signature Verification**: https://docs.svix.com/receiving/verifying-payloads

