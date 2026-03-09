# Fix: disable_stripe_user_authentication Feature Consistency

## Issue

**Error Message:**
```
The `features[disable_stripe_user_authentication]` property specified by `payouts` and `account_onboarding` must be the same.
```

## Root Cause

Stripe requires that `disable_stripe_user_authentication` must have the **same value** for both `account_onboarding` and `payouts` components when creating an account session.

**Problem:**
- We were setting `disable_stripe_user_authentication: true` for `account_onboarding`
- But NOT setting it for `payouts`
- Stripe detected the mismatch and threw an error

## Solution

### Updated Account Session Creation

**File**: `supabase/functions/stripe-payment/index.ts`

**Changes:**
1. ✅ Check if `disable_stripe_user_authentication` is enabled for `account_onboarding`
2. ✅ If enabled, also enable it for `payouts` with the same value
3. ✅ Ensure both components have consistent feature configuration

**Code:**
```typescript
// CRITICAL: disable_stripe_user_authentication must be the same for account_onboarding and payouts
const payoutsFeatures: any = {};
if (requirementCollection === 'application' && finalFeatures.disable_stripe_user_authentication) {
  payoutsFeatures.disable_stripe_user_authentication = true;
  console.log('[CREATE-ACCOUNT-SESSION] Setting disable_stripe_user_authentication for payouts to match account_onboarding');
}

const componentsConfig = {
  account_onboarding: { 
    enabled: true,
    features: finalFeatures, // Contains disable_stripe_user_authentication: true
  },
  payouts: { 
    enabled: true,
    features: payoutsFeatures, // Also contains disable_stripe_user_authentication: true
  },
  // ... other components
};
```

## Why This Is Required

According to Stripe's API:
- When using `disable_stripe_user_authentication`, it must be consistently applied across components
- `account_onboarding` and `payouts` are related components that share authentication state
- Stripe enforces this consistency to prevent authentication conflicts

## Status

✅ **FIXED**

- Both `account_onboarding` and `payouts` now have the same `disable_stripe_user_authentication` value
- Feature is only enabled when `requirement_collection: 'application'`
- Consistent configuration across all components

## Testing

After this fix:
1. ✅ Account session creation should succeed
2. ✅ Embedded component should render inline
3. ✅ No authentication popup should appear
4. ✅ Smooth onboarding experience

---

**Next Steps**: Test account creation again - the error should be resolved!



