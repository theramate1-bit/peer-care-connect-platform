# 🔧 Integration Fixes - Implementation Guide

**Status:** 📋 Ready to Implement  
**Priority:** Based on Audit Findings  
**Estimated Time:** 4-6 hours

---

## 🚨 CRITICAL FIX #1: Remove Practitioner Auto-Subscription

**Issue:** Practitioners get free access without paying.  
**File:** `peer-care-connect/src/contexts/SubscriptionContext.tsx`  
**Lines:** 143-151

### Current Code (WRONG):
```typescript
else if (profile?.user_role !== 'client' && 
         profile?.onboarding_status === 'completed' && 
         profile?.profile_completed === true) {
  // Practitioners who have completed onboarding - auto-subscribe
  console.log('✅ Practitioner with completed onboarding - auto-subscribing');
  setSubscribed(true);              // ❌ DON'T DO THIS!
  setSubscriptionTier('practitioner');
  setSubscriptionEnd(null);
}
```

### Fixed Code (CORRECT):
```typescript
// REMOVED - Practitioners must have valid paid subscription
// Only allow subscription if they have active Stripe subscription
else {
  console.log('❌ Practitioner needs valid paid subscription');
  setSubscribed(false);
  setSubscriptionTier(null);
  setSubscriptionEnd(null);
}
```

**Why:** Practitioners should ONLY get `subscribed: true` after successful payment confirmed by Stripe webhook.

---

## 🔴 CRITICAL FIX #2: Add Subscription Pre-Check

**Issue:** Users can create multiple subscriptions.  
**File:** `peer-care-connect/supabase/functions/create-checkout/index.ts`  
**Line:** After line 96 (after user authentication)

### Add This Code:
```typescript
// Check if user already has an active subscription
const supabaseService = createClient(supabaseUrl, supabaseServiceKey, { 
  auth: { persistSession: false } 
});

const { data: existingSubscription, error: subCheckError } = await supabaseService
  .from('subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['active', 'trialing'])
  .maybeSingle();

if (existingSubscription) {
  logStep('ERROR: User already has active subscription', { 
    subscriptionId: existingSubscription.id,
    plan: existingSubscription.plan 
  });
  return new Response(JSON.stringify({ 
    error: 'You already have an active subscription. Please manage your existing subscription instead of creating a new one.'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 400,
  });
}

logStep('✅ No existing subscription found, proceeding with checkout');
```

---

## 🟠 HIGH PRIORITY FIX #3: Add Missing Webhook Handlers

**Issue:** Abandoned checkouts not cleaned up.  
**File:** `peer-care-connect/supabase/functions/stripe-webhook/index.ts`  
**Line:** After line 140 (in main switch statement)

### Add These Handlers:
```typescript
case 'checkout.session.expired': {
  const session = event.data.object as Stripe.Checkout.Session;
  logStep("Checkout session expired", { sessionId: session.id });
  
  // Clean up any pending subscription records
  if (session.metadata?.user_id && session.metadata?.plan) {
    const { error } = await supabaseClient
      .from('subscriptions')
      .delete()
      .eq('user_id', session.metadata.user_id)
      .eq('status', 'pending');
    
    if (error) {
      logStep("Failed to clean up expired session", { error: error.message });
    } else {
      logStep("Successfully cleaned up expired session");
    }
  }
  break;
}

case 'invoice.payment_action_required': {
  const invoice = event.data.object as Stripe.Invoice;
  logStep("Payment action required", { invoiceId: invoice.id });
  
  // Notify user that additional authentication is needed
  const customerId = invoice.customer as string;
  const { data: customer } = await supabaseClient
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (customer) {
    // Create notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: customer.id,
        type: 'payment_action_required',
        title: 'Payment Action Required',
        message: 'Your payment requires additional authentication. Please check your email and complete the verification.',
        metadata: {
          invoice_id: invoice.id,
          hosted_invoice_url: invoice.hosted_invoice_url
        }
      });
    
    logStep("Notification created for payment action required", { userId: customer.id });
  }
  break;
}
```

---

## 🟢 MEDIUM PRIORITY FIX #4: Add Payment Verification on Return

**Issue:** No verification after Stripe redirect.  
**File:** `peer-care-connect/src/pages/Dashboard.tsx` (or wherever dashboard redirects)  
**Location:** In component's `useEffect`

### Add This Code:
```typescript
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) return;
      
      try {
        console.log('🔍 Verifying Stripe checkout session:', sessionId);
        
        // Call Edge Function to verify session
        const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
          body: { session_id: sessionId }
        });
        
        if (error) {
          console.error('❌ Session verification failed:', error);
          toast.error('We could not verify your payment. Please contact support if you were charged.');
          return;
        }
        
        if (data.success) {
          console.log('✅ Payment verified successfully');
          toast.success('Payment successful! Your subscription is now active.');
          
          // Refresh subscription status
          await checkSubscription();
          
          // Clean up URL
          setSearchParams({});
        } else {
          toast.error('Payment verification failed. Please check your subscription status.');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      }
    };
    
    verifyPayment();
  }, [searchParams]);
  
  // ... rest of dashboard code
};
```

### Create New Edge Function: `verify-checkout-session`
**File:** `peer-care-connect/supabase/functions/verify-checkout-session/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      return new Response(JSON.stringify({ 
        success: true,
        subscription_id: session.subscription,
        customer_id: session.customer
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false,
        payment_status: session.payment_status
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

---

## 🗑️ FIX #5: Clean Up Unused Database Tables

**Issue:** Multiple conflicting subscription table structures.  
**File:** Create new migration

### Migration File: `peer-care-connect/supabase/migrations/20250110000002_cleanup_unused_tables.sql`

```sql
-- Mark unused tables as deprecated
COMMENT ON TABLE practitioner_subscriptions IS 'DEPRECATED 2025-01-10: Use subscriptions table instead. This table was created but never used in production code.';
COMMENT ON TABLE practitioner_subscription_plans IS 'DEPRECATED 2025-01-10: Plan data now stored in application code and subscriptions.plan_metadata.';
COMMENT ON TABLE subscribers IS 'DEPRECATED 2025-01-10: Replaced by subscriptions table.';

-- Optional: If you want to completely remove them (BE CAREFUL!)
-- Only uncomment after verifying no data exists or data has been migrated
-- DROP TABLE IF EXISTS practitioner_subscriptions CASCADE;
-- DROP TABLE IF EXISTS practitioner_subscription_plans CASCADE;
-- DROP TABLE IF EXISTS subscribers CASCADE;

-- Add plan_metadata to subscriptions table if it doesn't exist
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_metadata JSONB DEFAULT '{}';

-- Update existing records with marketplace fee percentage
UPDATE subscriptions
SET plan_metadata = jsonb_build_object(
  'marketplace_fee_percentage', 
  CASE plan
    WHEN 'practitioner' THEN 3.0
    WHEN 'pro' THEN 1.0
    WHEN 'starter' THEN 0.0
    ELSE 5.0
  END
)
WHERE plan_metadata = '{}' OR plan_metadata IS NULL;

-- Create helper function for marketplace fees
CREATE OR REPLACE FUNCTION get_marketplace_fee_percentage(subscription_plan TEXT)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE subscription_plan
    WHEN 'starter' THEN 0.00
    WHEN 'practitioner' THEN 3.00
    WHEN 'pro' THEN 1.00
    ELSE 5.00  -- Default/fallback
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_marketplace_fee_percentage IS 'Returns the marketplace fee percentage for a given subscription plan';

-- Create view for active subscriptions with metadata
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  s.*,
  u.email,
  u.full_name,
  get_marketplace_fee_percentage(s.plan) as marketplace_fee_percentage
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE s.status IN ('active', 'trialing');

COMMENT ON VIEW active_subscriptions IS 'View of active subscriptions with user data and calculated marketplace fees';
```

---

## 🔍 FIX #6: Add Frontend Subscription Check

**Issue:** Frontend allows creating checkout even if user has subscription.  
**File:** `peer-care-connect/src/components/onboarding/SubscriptionSelection.tsx`  
**Line:** At the top of `handleSubscribe` function

### Add This Check:
```typescript
const handleSubscribe = async (plan: SubscriptionPlan) => {
  try {
    setSelectedPlan(plan.id);
    
    // Debug logs...
    console.log('🔵 SUBSCRIPTION SELECTION: Payment button clicked');
    
    // Critical: Check if user is authenticated before payment
    if (!user || !session) {
      console.error('❌ SUBSCRIPTION SELECTION: No user or session!');
      toast.error('Your session has expired. Please refresh the page and try again.');
      setSelectedPlan(null);
      return;
    }
    
    // NEW: Check if user already has active subscription
    const { data: existingSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();
    
    if (subError && subError.code !== 'PGRST116') {
      console.error('❌ Error checking subscription:', subError);
      toast.error('Could not verify subscription status. Please try again.');
      setSelectedPlan(null);
      return;
    }
    
    if (existingSubscription) {
      console.warn('⚠️ User already has active subscription:', existingSubscription);
      toast.error(`You already have an active ${existingSubscription.plan} subscription. Please manage your existing subscription instead.`);
      setSelectedPlan(null);
      return;
    }
    
    console.log('✅ No existing subscription found, proceeding with checkout');
    
    // ... rest of handleSubscribe ...
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 📊 FIX #7: Add Supabase Import

**Issue:** Missing `supabase` import in `SubscriptionSelection.tsx`  
**File:** `peer-care-connect/src/components/onboarding/SubscriptionSelection.tsx`  
**Line:** Add to imports at top of file

### Add This Import:
```typescript
import { supabase } from '@/integrations/supabase/client';
```

---

## 🧪 TESTING CHECKLIST

After implementing fixes:

### Test Fix #1 (Auto-subscription):
```bash
# Test that practitioner WITHOUT payment can't access
1. Create new practitioner account
2. Complete onboarding steps 1-4
3. Skip payment (close tab)
4. Try to access dashboard
Expected: Should show "Subscription required" message
```

### Test Fix #2 (Duplicate subscriptions):
```bash
# Test that user can't create duplicate subscription
1. Create practitioner account
2. Complete onboarding and payment
3. Try to start new subscription
Expected: Should see error "You already have an active subscription"
```

### Test Fix #3 (Webhook handlers):
```bash
# Test abandoned checkout cleanup
1. Start subscription checkout
2. Let session expire (24 hours or manually in Stripe)
Expected: Webhook should clean up any pending records
```

### Test Fix #4 (Payment verification):
```bash
# Test successful payment verification
1. Complete payment on Stripe
2. Get redirected back to app with ?session_id=xxx
Expected: Should see success message and subscription activated
```

### Test Fix #5 (Database cleanup):
```bash
# Run migration
npx supabase migration up

# Verify tables marked as deprecated
psql> \dt+ practitioner_subscriptions
# Should show DEPRECATED comment
```

### Test Fix #6 (Frontend check):
```bash
# Test with existing subscription
1. Login as user with active subscription
2. Try to access subscription selection page
Expected: Should be blocked or redirected
```

---

## 🚀 DEPLOYMENT CHECKLIST

1. **Code Changes:**
   - [ ] Update `SubscriptionContext.tsx` (Fix #1)
   - [ ] Update `create-checkout/index.ts` (Fix #2)
   - [ ] Update `stripe-webhook/index.ts` (Fix #3)
   - [ ] Add payment verification (Fix #4)
   - [ ] Update `SubscriptionSelection.tsx` (Fix #6)

2. **Database Changes:**
   - [ ] Run new migration (Fix #5)
   - [ ] Verify tables marked as deprecated
   - [ ] Test helper function `get_marketplace_fee_percentage()`

3. **New Functions:**
   - [ ] Deploy `verify-checkout-session` Edge Function
   - [ ] Test Edge Function locally first
   - [ ] Deploy to production

4. **Testing:**
   - [ ] Run all tests in checklist above
   - [ ] Test with Stripe test mode
   - [ ] Verify webhooks still work
   - [ ] Check all payment flows

5. **Monitoring:**
   - [ ] Watch Supabase logs for errors
   - [ ] Monitor Stripe webhook delivery
   - [ ] Check for subscription creation issues
   - [ ] Monitor revenue/MRR

---

## 📋 IMPLEMENTATION ORDER

**Day 1: Critical Fixes**
1. Implement Fix #1 (Auto-subscription) - 30 min
2. Implement Fix #2 (Duplicate check) - 45 min
3. Test both fixes - 30 min
4. **Deploy to production** - 15 min

**Day 2: High Priority**
5. Implement Fix #3 (Webhook handlers) - 1 hour
6. Implement Fix #4 (Payment verification) - 1.5 hours
7. Test both fixes - 45 min

**Day 3: Cleanup & Polish**
8. Implement Fix #5 (Database cleanup) - 30 min
9. Implement Fix #6 (Frontend check) - 30 min
10. Full end-to-end testing - 2 hours
11. **Deploy all remaining fixes** - 30 min

**Total Time:** ~9 hours across 3 days

---

## 🆘 ROLLBACK PLAN

If something goes wrong:

### For Fix #1 (Auto-subscription):
```typescript
// Emergency rollback: Re-add the removed code
// But add guard to prevent abuse
else if (profile?.user_role !== 'client' && 
         profile?.onboarding_status === 'completed' && 
         profile?.profile_completed === true &&
         process.env.NODE_ENV === 'development') {  // Only in dev
  setSubscribed(true);
  setSubscriptionTier('practitioner');
}
```

### For Database Changes:
```sql
-- If migration causes issues, you can comment out the tables
-- They will remain in database but won't interfere
-- Do NOT drop tables without backup!
```

### For Edge Functions:
```bash
# Redeploy previous version
supabase functions deploy stripe-webhook --no-verify-jwt

# Check logs
supabase functions logs stripe-webhook --follow
```

---

## 📞 SUPPORT

**If you encounter issues:**
1. Check logs: Supabase Dashboard → Functions → Logs
2. Check Stripe: Dashboard → Developers → Webhooks → Event log
3. Check database: Run queries in SQL editor to verify state
4. Contact: Supabase support, Stripe support

**Common Issues:**
- "Webhook not receiving events" → Check webhook URL and signing secret
- "Subscription not updating" → Check database RLS policies
- "Payment stuck in pending" → Check Stripe dashboard for payment status

---

**Fixes Documented By:** AI Assistant  
**Review Status:** Ready for Implementation  
**Last Updated:** 2025-10-09

