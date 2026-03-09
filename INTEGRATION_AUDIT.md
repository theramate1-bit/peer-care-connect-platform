# 🔍 Integration Audit: Stripe ↔ Supabase ↔ Application Code

**Date:** 2025-10-09  
**Status:** 🔴 CRITICAL ISSUES FOUND  
**Priority:** HIGH

---

## 📋 Executive Summary

This audit identifies **critical inconsistencies** between Stripe MCP, Supabase MCP, and our application code that could cause:
- Payment failures
- Data corruption
- Subscription mismatches
- Revenue loss
- User experience issues

---

## 🚨 CRITICAL ISSUES

### 1. **Multiple Subscription Table Schema Conflict** 
**Severity:** 🔴 CRITICAL  
**Impact:** Data fragmentation, conflicting subscription states

**Problem:**
We have **FOUR different subscription table structures** in the database:

```sql
-- Table 1: subscriptions (current, simple)
CREATE TABLE subscriptions (
  user_id UUID,
  plan TEXT,                      -- 'practitioner', 'pro', 'starter'
  billing_cycle TEXT,             -- 'monthly', 'yearly'
  status TEXT,                    -- 'active', 'cancelled'
  stripe_subscription_id TEXT,
  ...
)

-- Table 2: practitioner_subscriptions (complex, with plan references)
CREATE TABLE practitioner_subscriptions (
  practitioner_id UUID,
  plan_id UUID REFERENCES practitioner_subscription_plans(id),
  stripe_subscription_id TEXT,
  status TEXT,
  ...
)

-- Table 3: practitioner_subscription_plans (new structure)
CREATE TABLE practitioner_subscription_plans (
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  plan_name TEXT,
  plan_tier TEXT,                 -- 'professional', 'premium'
  monthly_fee DECIMAL,
  marketplace_fee_percentage DECIMAL,
  ...
)

-- Table 4: subscribers (legacy)
CREATE TABLE subscribers (
  user_id UUID,
  subscribed BOOLEAN,
  subscription_tier TEXT,
  ...
)
```

**Code References:**
- `SubscriptionContext.tsx` queries `subscriptions` table
- Migration `20250116_comprehensive_pricing.sql` creates `practitioner_subscriptions`
- Code nowhere uses `practitioner_subscriptions` or `practitioner_subscription_plans`

**Consequence:**
```javascript
// Webhook writes to old `subscriptions` table
await supabase.from('subscriptions').upsert({...});

// But new migrations created `practitioner_subscriptions`
// → Data never reaches new tables
// → Application can't see subscriptions from new structure
```

**Solution:**
1. Choose ONE subscription table structure (recommend: `subscriptions` - simpler, already used)
2. Drop or mark unused tables as deprecated
3. Migrate any existing data from `practitioner_subscriptions` to `subscriptions`
4. Update all code to use the canonical table

---

### 2. **Plan Naming Mismatch**
**Severity:** 🟠 HIGH  
**Impact:** Payment redirects may fail

**Frontend (SubscriptionSelection.tsx):**
```typescript
const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'practitioner',          // Plan 1
    price: 30,
  },
  {
    id: 'pro',                    // Plan 2
    price: 50,
  }
];
```

**Edge Function (create-checkout/index.ts):**
```typescript
const planPricing = {
  starter: { monthly: 0, yearly: 0 },
  practitioner: { monthly: 3000, yearly: 3000 },
  pro: { monthly: 5000, yearly: 5000 },
  clinic: { monthly: 5000, yearly: 5000 }, // Legacy fallback
};
```

**Database Migration (20250116_comprehensive_pricing.sql):**
```sql
INSERT INTO practitioner_subscription_plans 
  (plan_tier, plan_name, monthly_fee)
VALUES
  ('professional', 'Professional Practitioner Plan', 79.99),  -- £79.99!
  ('premium', 'Premium Practitioner Plan', 199.99);           -- £199.99!
```

**Inconsistency:**
- Frontend: `'practitioner'` = £30, `'pro'` = £50
- Database migration: `'professional'` = £79.99, `'premium'` = £199.99
- Edge Function: `'practitioner'` = £30, `'pro'` = £50
- **THREE DIFFERENT PRICING STRUCTURES!**

**Consequence:**
```
User selects "Pro Plan - £50/month" on frontend
  ↓
Backend charges £50 (3000 pence) correctly
  ↓
Database has £199.99 price in practitioner_subscription_plans
  ↓
Analytics/reports show wrong revenue
```

**Solution:**
1. Remove `practitioner_subscription_plans` inserts from migration
2. Standardize on frontend plan structure
3. Update database to match:
   - 'practitioner' = £30
   - 'pro' = £50

---

### 3. **Webhook Subscription Update Logic Gap**
**Severity:** 🟠 HIGH  
**Impact:** Subscriptions not updated properly

**Webhook (stripe-webhook/index.ts):**
```typescript
case 'checkout.session.completed': {
  if (session.metadata?.type === 'session_payment') {
    // Handles marketplace session payments ✅
    await handleSessionPayment(session, supabaseClient);
  } else {
    // Handles subscription payments ✅
    await handleSubscriptionPayment(session, supabaseClient);
  }
}

case 'customer.subscription.updated': {
  // ✅ Handles recurring subscription changes
  await handleSubscriptionUpdate(subscription, supabaseClient);
}
```

**Missing Handler:**
```typescript
case 'checkout.session.expired': // ❌ NOT HANDLED
  // User abandons payment
  // No cleanup of pending subscription

case 'invoice.payment_failed': // ⚠️ PARTIALLY HANDLED
  // Recurring payment fails
  // Should update subscription status to 'past_due'
```

**Consequence:**
```
User starts subscription payment → Abandons
  ↓
Checkout session expires
  ↓
No webhook handler
  ↓
Subscription stuck in 'pending' state in our database
```

**Solution:**
Add handlers for:
```typescript
case 'checkout.session.expired':
  // Mark subscription as 'abandoned'

case 'invoice.payment_failed':
  // Update subscription status to 'past_due'
  // Send notification to user
```

---

### 4. **Subscription Status Logic Inconsistency**
**Severity:** 🟠 HIGH  
**Impact:** Clients and practitioners treated differently

**SubscriptionContext.tsx - Current Logic:**
```typescript
// For clients:
if (profile?.user_role === 'client') {
  setSubscribed(true);              // ✅ Always subscribed
  setSubscriptionTier('free');      // ✅ Free tier
}

// For practitioners without subscription:
else if (profile?.user_role !== 'client' && 
         profile?.onboarding_status === 'completed' && 
         profile?.profile_completed === true) {
  setSubscribed(true);              // ✅ Auto-subscribe
  setSubscriptionTier('practitioner'); // ⚠️ Default to 'practitioner'?
}
```

**Issue:**
```
Practitioner completes onboarding WITHOUT payment
  ↓
Code auto-subscribes them to 'practitioner' tier
  ↓
They get full platform access without paying
  ↓
Revenue loss!
```

**Expected Flow:**
```
Practitioner completes onboarding
  ↓
Must select and pay for subscription
  ↓
Webhook confirms payment
  ↓
THEN set subscribed = true
```

**Solution:**
Remove auto-subscription for practitioners:
```typescript
// REMOVE THIS BLOCK:
else if (profile?.user_role !== 'client' && 
         profile?.onboarding_status === 'completed' && 
         profile?.profile_completed === true) {
  setSubscribed(true);  // ❌ Don't do this!
  ...
}

// KEEP ONLY:
else {
  console.log('❌ Practitioner needs valid subscription');
  setSubscribed(false);
  setSubscriptionTier(null);
}
```

---

### 5. **Pricing Currency Mismatch**
**Severity:** 🟢 MEDIUM  
**Impact:** Potential calculation errors

**Frontend displays:**
```typescript
price: 30,  // Displays as "£30"
```

**Edge Function processes:**
```typescript
planPricing = {
  practitioner: { monthly: 3000 },  // 3000 pence = £30
  pro: { monthly: 5000 },           // 5000 pence = £50
}
```

**Stripe expects:**
```javascript
amount: 3000,  // Smallest currency unit (pence for GBP)
currency: 'gbp'
```

**Status:** ✅ **CORRECT** - This is working as expected. Frontend shows pounds, backend uses pence.

**Verification Needed:**
- Ensure all payment displays show correct currency symbol
- Check that refunds use correct amount (pence vs pounds)

---

## 📊 DATABASE SCHEMA RECOMMENDATIONS

### Current State:
```
subscriptions (ACTIVE - used by code)
practitioner_subscriptions (UNUSED - created but not referenced)
practitioner_subscription_plans (UNUSED - created but not referenced)
subscribers (LEGACY - not used)
```

### Recommended Action:

**KEEP:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  plan TEXT NOT NULL,                    -- 'practitioner', 'pro'
  billing_cycle TEXT NOT NULL,           -- 'monthly', 'yearly'
  status TEXT NOT NULL,                  -- 'active', 'cancelled', 'past_due'
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                        -- One subscription per user
);
```

**DROP (or mark deprecated):**
```sql
DROP TABLE IF EXISTS practitioner_subscriptions CASCADE;
DROP TABLE IF EXISTS practitioner_subscription_plans CASCADE;
DROP TABLE IF EXISTS subscribers CASCADE;
```

**ADD (for clarity):**
```sql
-- Add plan metadata directly in subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_metadata JSONB DEFAULT '{
  "marketplace_fee_percentage": 3.0,
  "features": []
}'::jsonb;

-- Function to get marketplace fee
CREATE OR REPLACE FUNCTION get_marketplace_fee(plan_id TEXT)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE plan_id
    WHEN 'practitioner' THEN 3.00
    WHEN 'pro' THEN 1.00
    ELSE 5.00
  END;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 WEBHOOK HANDLING AUDIT

### Webhooks Currently Handled:
✅ `checkout.session.completed` - Subscription & session payments  
✅ `payment_intent.succeeded` - Payment confirmed  
✅ `payment_intent.payment_failed` - Payment failed  
✅ `charge.succeeded` - Charge successful  
✅ `charge.failed` - Charge failed  
✅ `invoice.payment_succeeded` - Recurring payment  
✅ `customer.subscription.created` - New subscription  
✅ `customer.subscription.updated` - Subscription change  
✅ `customer.subscription.deleted` - Cancellation  

### Missing Webhook Handlers:
❌ `checkout.session.expired` - Session abandoned  
❌ `customer.subscription.trial_will_end` - Trial ending  
❌ `customer.subscription.paused` - Subscription paused  
❌ `invoice.payment_action_required` - Additional auth needed  
❌ `customer.updated` - Customer details changed  

### Recommendations:
Add handlers for critical missing events, especially:
1. `checkout.session.expired` - Clean up abandoned payments
2. `invoice.payment_action_required` - Notify user of auth requirement

---

## 💳 EDGE FUNCTION AUTHENTICATION AUDIT

### create-checkout/index.ts:
```typescript
✅ Checks Authorization header
✅ Uses supabaseClient.auth.getUser(token)
✅ Validates user.email exists
✅ Logs user authentication

⚠️ Issue: No check for existing active subscription
   → User could create multiple subscriptions
```

**Recommendation:**
```typescript
// Add before creating checkout:
const { data: existing } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .single();

if (existing) {
  return new Response(JSON.stringify({ 
    error: 'You already have an active subscription'
  }), { status: 400 });
}
```

### stripe-webhook/index.ts:
```typescript
✅ Verifies webhook signature
✅ Uses service role key for database writes
✅ Logs all webhook events to database

✅ Security: Good implementation
```

---

## 🎯 PAYMENT FLOW GAPS

### Current Flow:
```
1. User clicks "Subscribe" on frontend
   ↓
2. SubscriptionSelection.tsx calls createCheckout(plan, billing)
   ↓
3. SubscriptionContext.createCheckout() invokes Edge Function
   ↓
4. Edge Function creates Stripe checkout session
   ↓
5. User redirected to Stripe
   ↓
6. User completes payment
   ↓
7. Stripe webhook → handleSubscriptionPayment()
   ↓
8. Database updated with subscription
```

### Gap 1: **No subscription pre-check**
```javascript
// User with existing subscription can start new checkout
// Should check:
if (await hasActiveSubscription(user.id)) {
  toast.error('You already have an active subscription');
  return;
}
```

### Gap 2: **No loading state persistence**
```javascript
// User closes tab during Stripe redirect
// Returns to app → no indication of pending payment
// Should save:
localStorage.setItem('pending_checkout', {
  sessionId: stripeSessionId,
  timestamp: Date.now()
});
```

### Gap 3: **No session verification on return**
```javascript
// User returns from Stripe
// Redirect: /dashboard?session_id={CHECKOUT_SESSION_ID}
// But code doesn't verify the session completed successfully

// Should add to Dashboard.tsx:
useEffect(() => {
  const sessionId = searchParams.get('session_id');
  if (sessionId) {
    verifyCheckoutSession(sessionId);
  }
}, []);
```

---

## 🔍 CODE-DATABASE MISMATCH SUMMARY

| Component | Expects | Database Has | Status |
|-----------|---------|--------------|--------|
| `SubscriptionContext` | `subscriptions` table | `subscriptions` ✅ | 🟢 OK |
| `SubscriptionSelection` | Plans: 'practitioner', 'pro' | Plans: 'practitioner', 'pro' ✅ | 🟢 OK |
| Edge Function | Pricing in pence | Expects pence ✅ | 🟢 OK |
| Webhook `handleSubscriptionPayment()` | `subscriptions` table | `subscriptions` ✅ | 🟢 OK |
| Migration `20250116` | `practitioner_subscriptions` | **UNUSED** ❌ | 🔴 CONFLICT |
| Pricing amounts | £30, £50 | Migration has £79.99, £199.99 ❌ | 🔴 CONFLICT |

---

## ✅ ACTION ITEMS

### Immediate (Do First):
1. ✅ **Remove or deprecate unused tables**
   ```sql
   -- Mark as deprecated
   COMMENT ON TABLE practitioner_subscriptions IS 'DEPRECATED - Use subscriptions table instead';
   COMMENT ON TABLE practitioner_subscription_plans IS 'DEPRECATED - Use subscriptions table instead';
   ```

2. 🔴 **Fix practitioner auto-subscription bug**
   - Remove auto-subscribe logic in `SubscriptionContext.tsx`
   - Ensure practitioners MUST pay for subscription

3. 🔴 **Add missing webhook handlers**
   - `checkout.session.expired`
   - `invoice.payment_action_required`

4. 🟠 **Add subscription pre-check**
   - Prevent users from creating duplicate subscriptions

### Short Term (Next Sprint):
5. 🟢 **Add payment verification on return**
   - Verify Stripe session on dashboard redirect
   - Show success/failure messages

6. 🟢 **Consolidate pricing constants**
   - Create single source of truth for pricing
   - Use environment variables or database config

7. 🟢 **Add comprehensive error handling**
   - Handle Stripe API failures gracefully
   - Retry failed webhook processing

### Long Term (Future):
8. 📊 **Add subscription analytics**
   - Track MRR (Monthly Recurring Revenue)
   - Churn rate
   - Upgrade/downgrade patterns

9. 🔐 **Implement subscription management UI**
   - Allow users to upgrade/downgrade
   - Cancel with confirmation
   - View invoices

10. 🧪 **Add integration tests**
    - Test full payment flow
    - Mock Stripe webhooks
    - Verify database state

---

## 📝 TESTING CHECKLIST

Before deploying subscription fixes:

### Frontend:
- [ ] Can select subscription plan
- [ ] Prices display correctly (£30, £50)
- [ ] Redirects to Stripe checkout
- [ ] Returns to app after payment
- [ ] Shows subscription status correctly

### Backend:
- [ ] Edge Function creates checkout session
- [ ] Webhook receives events
- [ ] Database updated correctly
- [ ] No duplicate subscriptions created
- [ ] Pricing calculations correct

### Edge Cases:
- [ ] User abandons payment → No orphaned records
- [ ] Payment fails → User notified
- [ ] Webhook arrives late → Still processes correctly
- [ ] User has no role → Doesn't crash
- [ ] Client tries to subscribe → Blocked (clients are free)

---

## 🎯 RECOMMENDED FIX ORDER

1. **Critical Security:** Fix auto-subscription bug (revenue protection)
2. **Data Integrity:** Remove/deprecate unused tables
3. **User Experience:** Add missing webhook handlers
4. **Reliability:** Add subscription pre-checks
5. **Polish:** Add payment verification and error handling

---

## 📞 SUPPORT INFORMATION

**If payments fail:**
1. Check Supabase logs for Edge Function errors
2. Check Stripe dashboard for webhook delivery status
3. Verify database has `subscriptions` table with correct RLS
4. Check user has proper authentication token

**Common Issues:**
- "User needs subscription" → Check `subscriptions` table for user_id
- "Payment not reflecting" → Check webhook was delivered
- "Can't create checkout" → Check authentication and Edge Function logs

---

**Audit Completed By:** AI Assistant  
**Review Status:** Needs Human Review  
**Next Review:** After implementing fixes

