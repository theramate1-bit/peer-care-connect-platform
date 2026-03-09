# 🔴 CRITICAL: Webhook 401 Errors Preventing Payment Processing

## Problem Summary

A guest payment was successfully processed by Stripe (`pi_3SPWNAFk77knaVva0EAaqbKl` - £1.00) but:
1. ❌ **The webhook never processed it** - Multiple 401 Unauthorized errors from `stripe-webhook` Edge Function
2. ❌ **No email was sent** - Because webhook never processed the payment
3. ❌ **Session status remains `pending_payment`** - Never updated to `confirmed`
4. ❌ **No payment record created** - Payment was never recorded in database

## Root Cause

**Supabase Edge Functions is rejecting Stripe webhook requests with 401 Unauthorized** before they reach our handler code. This happens because:

1. **Stripe webhooks don't send Supabase auth headers** - They only send `stripe-signature` header
2. **Edge Function may be configured to require JWT verification** - Even though `config.toml` has `verify_jwt = false`
3. **Function needs to be redeployed with `--no-verify-jwt` flag** to ensure the setting is applied

## Evidence from Investigation

### Supabase Logs Show:
```
POST | 401 | https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook
```

### Database Check:
- All sessions for `rayman196823@gmail.com` are still `pending_payment`
- No payment record found for payment intent `pi_3SPWNAFk77knaVva0EAaqbKl`
- No emails sent (no webhook processing = no email triggers)

### Stripe Payment:
- ✅ Payment succeeded: `pi_3SPWNAFk77knaVva0EAaqbKl` (£1.00)
- ✅ Application fee collected: £0.04
- ❌ Webhook never called successfully

## Fix Required

### Step 1: Redeploy Webhook Function Without JWT Verification

**Option A: Using Supabase CLI (Recommended)**
```bash
cd peer-care-connect
supabase functions deploy stripe-webhook --no-verify-jwt
```

**Option B: Using Supabase Dashboard**
1. Go to https://app.supabase.com/project/aikqnvltuwwgifuocvto/functions
2. Click on `stripe-webhook` function
3. Go to Settings → Function Settings
4. **Disable "Verify JWT"** toggle
5. Save and redeploy

### Step 2: Verify Webhook Secret Environment Variable

1. Go to Supabase Dashboard → Edge Functions → stripe-webhook → Settings
2. Verify `STRIPE_WEBHOOK_SECRET` environment variable is set
3. If missing, get it from Stripe Dashboard → Webhooks → Your endpoint → "Signing secret"

### Step 3: Verify Stripe Webhook Endpoint Configuration

1. Go to Stripe Dashboard → Webhooks: https://dashboard.stripe.com/webhooks
2. Find your webhook endpoint: `https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook`
3. Verify it's enabled and has these events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `charge.succeeded`

### Step 4: Test Webhook

After redeploying, test with a small payment to verify:
1. Webhook receives events (check Supabase logs - should be 200 not 401)
2. Session status updates to `confirmed`
3. Payment record created
4. Emails sent

## Manual Fix for Missed Payment

Since `pi_3SPWNAFk77knaVva0EAaqbKl` was already paid but not processed, we need to manually process it:

### Option A: Manually Process via Database (Quick Fix)

1. Find the session that matches this payment:
   ```sql
   SELECT * FROM client_sessions 
   WHERE client_email = 'rayman196823@gmail.com' 
   AND status = 'pending_payment' 
   AND created_at >= '2025-01-04'
   ORDER BY created_at DESC;
   ```

2. Update the session status:
   ```sql
   UPDATE client_sessions 
   SET 
     status = 'confirmed',
     payment_status = 'completed',
     stripe_payment_intent_id = 'pi_3SPWNAFk77knaVva0EAaqbKl',
     updated_at = NOW()
   WHERE id = '<session_id_from_step_1>';
   ```

3. Create payment record:
   ```sql
   INSERT INTO payments (
     user_id,
     therapist_id,
     session_id,
     stripe_payment_intent_id,
     checkout_session_id,
     amount,
     currency,
     payment_type,
     payment_status,
     metadata
   ) VALUES (
     '<client_user_id>',
     '<practitioner_id>',
     '<session_id>',
     'pi_3SPWNAFk77knaVva0EAaqbKl',
     NULL,
     100, -- £1.00 in pence
     'gbp',
     'session_payment',
     'succeeded',
     '{"manual_fix": true, "original_payment_intent": "pi_3SPWNAFk77knaVva0EAaqbKl"}'::jsonb
   );
   ```

### Option B: Trigger Webhook Manually (Better - Sends Emails)

Create a script to manually trigger the webhook processing for this payment intent. This will:
- Update session status
- Create payment record
- Send confirmation emails
- Create notifications
- Schedule reminders

## Prevention

After fixing, ensure:
1. ✅ Webhook function is deployed with `--no-verify-jwt`
2. ✅ `STRIPE_WEBHOOK_SECRET` is set correctly
3. ✅ Stripe webhook endpoint is configured correctly
4. ✅ Monitor webhook logs for 401 errors

## Next Steps

1. **IMMEDIATE**: Redeploy webhook function without JWT verification
2. **IMMEDIATE**: Verify `STRIPE_WEBHOOK_SECRET` environment variable
3. **IMMEDIATE**: Manually process the missed payment `pi_3SPWNAFk77knaVva0EAaqbKl`
4. **TEST**: Make a test payment to verify webhook works
5. **MONITOR**: Watch logs for any future 401 errors

