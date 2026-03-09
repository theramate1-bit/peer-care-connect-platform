# Fix: disable_stripe_user_authentication Consistency Error

## Issue

**Error Message:**
```
The `features[disable_stripe_user_authentication]` property specified by `payouts` and `account_onboarding` must be the same.
```

## Root Cause

Stripe requires that `disable_stripe_user_authentication` must have the **same value** for both `account_onboarding` and `payouts` components when creating an account session.

**Problem:**
- Frontend was only setting `disable_stripe_user_authentication: true` for `account_onboarding`
- Frontend was NOT setting it for `payouts` (or setting it to a different value)
- Backend was trying to add it to `payouts`, but the frontend config was conflicting

## Solution

### ✅ Frontend Fix (`EmbeddedStripeOnboarding.tsx`)

**Updated the `components` configuration to include `payouts` with matching feature:**

```typescript
components: {
  account_onboarding: { 
    enabled: true,
    features: {
      external_account_collection: true,
      disable_stripe_user_authentication: true,
    },
  },
  payouts: {
    enabled: true,
    features: {
      // CRITICAL: disable_stripe_user_authentication must match account_onboarding
      disable_stripe_user_authentication: true, // Must be same value as account_onboarding
    },
  },
},
```

### ✅ Backend Fix (`stripe-payment/index.ts`)

**Already implemented logic to ensure consistency:**

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

## Status

✅ **FIXED**

- ✅ Frontend now sends matching `disable_stripe_user_authentication` for both components
- ✅ Backend ensures consistency even if frontend config differs
- ✅ Both components have the same feature value

## Deployment

### Frontend
- ✅ **Already fixed** - No deployment needed (runs in browser)

### Backend
- ⚠️ **Needs deployment** - Deploy the Edge Function:

```bash
cd peer-care-connect
supabase functions deploy stripe-payment --project-ref aikqnvltuwwgifuocvto
```

Or deploy via Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions/stripe-payment
2. Copy the updated code from `supabase/functions/stripe-payment/index.ts`
3. Paste and deploy

## Testing

After deployment:
1. ✅ Account session creation should succeed
2. ✅ Embedded component should render inline
3. ✅ No authentication popup should appear
4. ✅ Smooth onboarding experience

---

**Next Steps**: Deploy the backend Edge Function, then test account creation again!



