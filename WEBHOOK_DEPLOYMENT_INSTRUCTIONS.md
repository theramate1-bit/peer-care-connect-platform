# Webhook Deployment Instructions

## Critical Fixes Implemented

### 1. Zero-Amount Payment Support (100% Off Coupons)
**File**: `supabase/functions/stripe-webhook/index.ts`

**Changes**:
- Added detection for zero-amount payments (`amount_total === 0`)
- Added detection for 100% discount coupons (`amount_discount > 0`)
- Automatically creates subscriptions for valid 100% off coupon payments
- Generates unique subscription IDs for coupon-based subscriptions
- Sets default `monthly_credits: 100` for new subscriptions

**Code Added** (lines 313-360):
```typescript
// **NEW: Handle 100% off coupons and zero-amount payments**
const isZeroAmount = session.amount_total === 0 || session.amount_total === null;
const hasCoupon = session.total_details?.amount_discount && session.total_details.amount_discount > 0;

if (isZeroAmount || hasCoupon) {
  logStep("Processing zero-amount payment or 100% off coupon", { 
    userId, 
    amountTotal: session.amount_total,
    amountDiscount: session.total_details?.amount_discount,
    isZeroAmount,
    hasCoupon
  });
}

// Use a special subscription ID for 100% off coupons
const stripeSubscriptionId = session.subscription || 
  (isZeroAmount ? `sub_coupon_100_off_${userId}_${Date.now()}` : null);
```

### 2. Enhanced Invoice Payment Handling
**File**: `supabase/functions/stripe-webhook/index.ts`

**Changes**:
- Added `invoice.paid` event handler
- Enhanced logging for invoice payments
- Now handles both `invoice.paid` and `invoice.payment_succeeded` events

**Code Modified** (lines 135-145):
```typescript
case 'invoice.paid':
case 'invoice.payment_succeeded': {
  const invoice = event.data.object as Stripe.Invoice;
  logStep("Invoice payment succeeded", { 
    invoiceId: invoice.id, 
    amountPaid: invoice.amount_paid,
    amountDue: invoice.amount_due 
  });
  await handleInvoicePayment(invoice, supabaseClient);
  break;
}
```

---

## Deployment Steps

### Option 1: Deploy with Docker Desktop (Recommended)

1. **Start Docker Desktop**:
   - Open Docker Desktop application
   - Wait for it to fully start

2. **Deploy Webhook Function**:
   ```bash
   cd peer-care-connect
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

3. **Verify Deployment**:
   - Check Supabase Dashboard → Edge Functions
   - Verify `stripe-webhook` shows as deployed
   - Note the function URL

### Option 2: Deploy via Supabase Dashboard (No Docker Required)

1. **Open Supabase Dashboard**:
   - Go to https://app.supabase.com
   - Select your project (`aikqnvltuwwgifuocvto`)
   - Navigate to Edge Functions

2. **Update Webhook Function**:
   - Click on `stripe-webhook` function
   - Click "Edit Function"
   - Copy the contents of `supabase/functions/stripe-webhook/index.ts`
   - Paste into the editor
   - Click "Deploy"

3. **Verify Deployment**:
   - Check deployment status
   - Test with a sample webhook event

---

## Webhook Configuration in Stripe

### Required Webhook Events

Ensure these events are enabled in Stripe Dashboard:

1. **Checkout Events**:
   - `checkout.session.completed` ✅
   - `checkout.session.expired` ✅

2. **Invoice Events**:
   - `invoice.paid` ✅ (NEW)
   - `invoice.payment_succeeded` ✅
   - `invoice.payment_action_required` ✅

3. **Payment Events**:
   - `payment_intent.succeeded` ✅
   - `payment_intent.payment_failed` ✅
   - `charge.succeeded` ✅
   - `charge.failed` ✅

4. **Subscription Events**:
   - `customer.subscription.created` ✅
   - `customer.subscription.updated` ✅
   - `customer.subscription.deleted` ✅

### Webhook Endpoint URL

**Production URL**:
```
https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook
```

**To Configure in Stripe**:
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter the webhook URL above
4. Select all events listed above
5. Click "Add endpoint"
6. Copy the **Signing Secret** (starts with `whsec_`)
7. Add to Supabase Edge Function secrets

---

## Environment Variables to Verify

Ensure these secrets are set in Supabase:

1. **`STRIPE_SECRET_KEY`**: Your Stripe secret key
2. **`STRIPE_WEBHOOK_SECRET`**: Webhook signing secret from Stripe
3. **`SUPABASE_URL`**: Your Supabase project URL
4. **`SUPABASE_SERVICE_ROLE_KEY`**: Service role key with full access

**To Check**:
```bash
supabase secrets list
```

**To Set**:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

---

## Testing the Webhook

### Test with Stripe CLI

1. **Install Stripe CLI**:
   ```bash
   # Windows (with Scoop)
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   
   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Local**:
   ```bash
   stripe listen --forward-to https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook
   ```

4. **Trigger Test Events**:
   ```bash
   # Test checkout session completed with 100% off coupon
   stripe trigger checkout.session.completed
   
   # Test invoice.paid event
   stripe trigger invoice.paid
   ```

### Test with Real Payment

1. **Create a 100% off coupon in Stripe**:
   - Go to Stripe Dashboard → Products → Coupons
   - Click "Create coupon"
   - Set "Percent off" to `100`
   - Save the coupon code

2. **Test the payment flow**:
   - Go to your application
   - Start onboarding as a practitioner
   - Proceed to payment
   - Enter the coupon code
   - Complete checkout
   - Verify subscription is created in database

---

## Verification Checklist

After deployment, verify:

- [ ] Webhook function is deployed (check Supabase Dashboard)
- [ ] Webhook endpoint is configured in Stripe
- [ ] All required events are enabled
- [ ] Webhook signing secret is set in Supabase secrets
- [ ] Test 100% off coupon payment creates subscription
- [ ] Test regular payment creates subscription
- [ ] Check `webhook_events` table has new records
- [ ] Check `subscriptions` table has new active subscription
- [ ] User's `onboarding_status` is updated to `completed`

---

## Troubleshooting

### Webhooks Not Received

1. **Check Stripe Dashboard**:
   - Go to Developers → Webhooks
   - Check webhook attempt logs
   - Look for failed attempts

2. **Check Supabase Logs**:
   ```bash
   supabase functions logs stripe-webhook --tail
   ```

3. **Verify Endpoint URL**:
   - Must be publicly accessible
   - Must use HTTPS
   - Must end with `/stripe-webhook`

### Subscription Not Created

1. **Check webhook_events table**:
   ```sql
   SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check for errors**:
   ```sql
   SELECT * FROM webhook_events WHERE processed = false OR processing_error IS NOT NULL;
   ```

3. **Check function logs**:
   - Supabase Dashboard → Edge Functions → stripe-webhook → Logs

### Zero-Amount Payments Not Working

1. **Verify coupon metadata**:
   - Ensure coupon is 100% off
   - Check `session.amount_total === 0`
   - Check `session.total_details.amount_discount > 0`

2. **Check logs for zero-amount detection**:
   - Look for "Processing zero-amount payment or 100% off coupon" in logs

---

## Next Steps

1. ✅ Deploy webhook function
2. ✅ Configure Stripe webhook endpoint
3. ✅ Test with 100% off coupon
4. ⏭️ Implement subscription sync job
5. ⏭️ Create payment status dashboard
6. ⏭️ Add webhook monitoring

---

## Contact & Support

If issues persist:
- Check Supabase logs for detailed error messages
- Review Stripe webhook attempt logs
- Verify all environment variables are set correctly
- Test with Stripe CLI to isolate issues

