# 🚀 DEPLOYMENT REQUIRED - stripe-payment Edge Function

## ✅ Status: Code is Fixed and Ready

**All fixes are complete:**
- ✅ Frontend: `EmbeddedStripeOnboarding.tsx` - includes `payouts` with matching `disable_stripe_user_authentication`
- ✅ Backend: `stripe-payment/index.ts` - ensures consistency between `account_onboarding` and `payouts`

## ⚠️ CRITICAL: Function Must Be Deployed

The error will persist until the Edge Function is deployed with the fix.

## 🎯 Quickest Deployment Method

### Option 1: Supabase Dashboard (No Docker Required) ⭐ RECOMMENDED

1. **Open the function editor:**
   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions/stripe-payment

2. **Copy the entire file:**
   - Open: `peer-care-connect/supabase/functions/stripe-payment/index.ts`
   - Select all (Ctrl+A) and copy (Ctrl+C)

3. **Paste and deploy:**
   - Paste into the Supabase Dashboard editor
   - Click "Deploy" button

4. **Verify deployment:**
   - Check that the version number increments
   - Test the embedded onboarding flow

### Option 2: Supabase CLI (Requires Docker)

1. **Start Docker Desktop**

2. **Deploy:**
   ```powershell
   cd "C:\Users\rayma\Desktop\New folder\peer-care-connect"
   supabase functions deploy stripe-payment --project-ref aikqnvltuwwgifuocvto
   ```

## 📋 What Was Fixed

### Backend (`stripe-payment/index.ts` lines 2006-2028)

The backend now ensures `disable_stripe_user_authentication` is consistent between `account_onboarding` and `payouts`:

```typescript
// CRITICAL: disable_stripe_user_authentication must be the same for account_onboarding and payouts
// Backend completely controls this feature to ensure consistency
const payoutsFeatures: any = {};

// Copy other frontend payouts features (excluding disable_stripe_user_authentication which we control)
const frontendPayoutsFeatures = components?.payouts?.features || {};
Object.keys(frontendPayoutsFeatures).forEach(key => {
  if (key !== 'disable_stripe_user_authentication') {
    payoutsFeatures[key] = frontendPayoutsFeatures[key];
  }
});

// Set disable_stripe_user_authentication for payouts to match account_onboarding (backend-controlled)
if (requirementCollection === 'application' && finalFeatures.disable_stripe_user_authentication) {
  payoutsFeatures.disable_stripe_user_authentication = true;
  console.log('[CREATE-ACCOUNT-SESSION] Setting disable_stripe_user_authentication for payouts to match account_onboarding');
} else {
  // Explicitly ensure it's NOT set if account doesn't support it
  delete payoutsFeatures.disable_stripe_user_authentication;
  if (frontendPayoutsFeatures.disable_stripe_user_authentication) {
    console.log('[CREATE-ACCOUNT-SESSION] Removed disable_stripe_user_authentication from payouts (account does not support it)');
  }
}
```

### Frontend (`EmbeddedStripeOnboarding.tsx`)

Added `payouts` component with matching feature:

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
      disable_stripe_user_authentication: true, // Must match account_onboarding
    },
  },
},
```

## ✅ After Deployment

1. **Refresh the onboarding page**
2. **Click "Set Up Payment Account"**
3. **The embedded component should render inline (no popup)**
4. **No more consistency error!**

## 🔍 Verification

After deployment, check the browser console - you should see:
- ✅ Account session created successfully
- ✅ Embedded component renders inline
- ❌ No more "disable_stripe_user_authentication must be the same" error
