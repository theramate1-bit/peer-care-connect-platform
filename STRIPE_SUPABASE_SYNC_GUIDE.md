# 🔗 Complete Stripe-Supabase Synchronization Guide

## 🎯 Overview
This guide will help you achieve 100% synchronization between Stripe and Supabase for your Theramate platform.

## ✅ What's Already Implemented
- ✅ Complete webhook handler with all event types
- ✅ Payment database schema with all required tables
- ✅ StripePaymentForm component
- ✅ Edge functions for payment processing
- ✅ Frontend integration with Stripe

## 🔧 Required Configuration Steps

### **Step 1: Configure Supabase Environment Variables**

1. **Go to Supabase Dashboard**:
   - Navigate to your project: https://supabase.com/dashboard
   - Go to **Settings** → **Environment Variables**

2. **Add Required Variables**:
   ```
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

3. **Get Your Stripe Keys**:
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your **Secret key** and **Publishable key**
   - Save them securely

### **Step 2: Set Up Stripe Webhook Endpoint**

1. **Go to Stripe Dashboard**:
   - Navigate to https://dashboard.stripe.com/webhooks
   - Click **Add endpoint**

2. **Configure Webhook**:
   - **Endpoint URL**: `https://tsvzwxvpfflvkkvvaqss.supabase.co/functions/v1/stripe-webhook`
   - **Description**: "Theramate Payment Processing"
   - **Events to send**:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.succeeded`
     - `charge.failed`
     - `invoice.payment_succeeded`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Get Webhook Secret**:
   - After creating the endpoint, click on it
   - Click **Click to reveal** next to "Signing secret"
   - Copy the `whsec_...` secret
   - Add it to your Supabase environment variables

### **Step 3: Deploy Database Migration**

1. **Apply the Payment System Migration**:
   ```bash
   # Navigate to your project directory
   cd peer-care-connect
   
   # Apply the migration
   supabase db push
   ```

2. **Verify Tables Created**:
   - Go to Supabase Dashboard → **Table Editor**
   - Verify these tables exist:
     - `customers`
     - `payments`
     - `subscriptions`
     - `platform_revenue`
     - `webhook_events`

### **Step 4: Deploy Edge Functions**

1. **Deploy All Functions**:
   ```bash
   # Deploy webhook handler
   supabase functions deploy stripe-webhook
   
   # Deploy payment functions
   supabase functions deploy stripe-payment
   supabase functions deploy create-checkout
   supabase functions deploy create-session-payment
   supabase functions deploy customer-portal
   supabase functions deploy check-subscription
   ```

2. **Verify Functions**:
   - Go to Supabase Dashboard → **Edge Functions**
   - Ensure all functions are deployed and active

### **Step 5: Test the Integration**

1. **Test Webhook Endpoint**:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login to Stripe
   stripe login
   
   # Test webhook
   stripe listen --forward-to https://tsvzwxvpfflvkkvvaqss.supabase.co/functions/v1/stripe-webhook
   ```

2. **Trigger Test Events**:
   ```bash
   # Test payment success
   stripe trigger checkout.session.completed
   
   # Test payment failure
   stripe trigger payment_intent.payment_failed
   ```

3. **Verify in Database**:
   - Check `webhook_events` table for logged events
   - Check `payments` table for payment records
   - Check `customers` table for customer records

## 🔍 Verification Checklist

### **Database Schema** ✅
- [ ] `customers` table created
- [ ] `payments` table created
- [ ] `subscriptions` table created
- [ ] `platform_revenue` table created
- [ ] `webhook_events` table created
- [ ] RLS policies applied
- [ ] Indexes created

### **Edge Functions** ✅
- [ ] `stripe-webhook` deployed
- [ ] `stripe-payment` deployed
- [ ] `create-checkout` deployed
- [ ] `create-session-payment` deployed
- [ ] `customer-portal` deployed
- [ ] `check-subscription` deployed

### **Environment Variables** ✅
- [ ] `STRIPE_SECRET_KEY` configured
- [ ] `STRIPE_WEBHOOK_SECRET` configured
- [ ] `STRIPE_PUBLISHABLE_KEY` configured

### **Stripe Configuration** ✅
- [ ] Webhook endpoint created
- [ ] Webhook events configured
- [ ] Webhook secret obtained
- [ ] Test events working

### **Frontend Integration** ✅
- [ ] StripePaymentForm component created
- [ ] Payment flow integrated
- [ ] Error handling implemented
- [ ] Success callbacks working

## 🚀 Production Deployment

### **Before Going Live**:

1. **Switch to Live Keys**:
   - Replace test keys with live keys in Supabase
   - Update webhook endpoint to use live mode
   - Test with live Stripe account

2. **Security Review**:
   - Ensure RLS policies are properly configured
   - Verify webhook signature validation
   - Check error handling and logging

3. **Monitoring Setup**:
   - Set up Stripe webhook monitoring
   - Configure Supabase function logs
   - Set up payment failure alerts

## 🔧 Troubleshooting

### **Common Issues**:

1. **Webhook Not Receiving Events**:
   - Check webhook URL is correct
   - Verify webhook secret is configured
   - Check Stripe webhook logs

2. **Database Errors**:
   - Ensure migration was applied
   - Check RLS policies
   - Verify table permissions

3. **Payment Failures**:
   - Check Stripe logs
   - Verify payment intent creation
   - Check webhook event processing

### **Debug Commands**:

```bash
# Check function logs
supabase functions logs stripe-webhook --follow

# Test webhook locally
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Check database
supabase db reset
supabase db push
```

## 📊 Integration Status

After completing all steps, your integration should show:

- **Database Schema**: 100% ✅
- **Edge Functions**: 100% ✅
- **Webhook Events**: 100% ✅
- **Frontend Integration**: 100% ✅
- **Environment Variables**: 100% ✅
- **Overall Sync**: 100% ✅

## 🎉 Success!

Once all steps are completed, your Stripe and Supabase integration will be fully synchronized and ready for production use!

**Next Steps**:
- Test all payment flows
- Set up monitoring and alerts
- Deploy to production
- Monitor webhook delivery and processing

---

**Need Help?** Check the troubleshooting section or review the Stripe and Supabase documentation for additional support.
