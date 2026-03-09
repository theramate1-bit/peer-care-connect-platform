# Stripe Embedded Onboarding Debug Guide

## Issue
User sees the payment setup screen instead of the embedded Stripe Connect component. The account creation is failing with a 500 error.

## Flow Analysis

### Expected Flow:
1. User clicks "Set Up Payment Account" button
2. `handleStartStripeConnect()` is called
3. Edge Function `stripe-payment` creates Stripe Connect account
4. Response contains `stripe_account_id`
5. Frontend sets `stripeAccountId` and `onboardingState = 'embedded'`
6. `EmbeddedStripeOnboarding` component renders

### Current Issue:
- Step 3 is failing with 500 error
- State resets to `'initial'`
- User sees setup screen again (not embedded component)

## Debugging Steps

### 1. Check Browser Console
Look for:
- `Stripe Connect creation error:` - This will show the actual error
- `Stripe error code:` - Stripe-specific error code
- Network tab: Check the actual response from `/functions/v1/stripe-payment`

### 2. Check Edge Function Logs
In Supabase Dashboard → Edge Functions → stripe-payment → Logs:
- Look for `[CREATE-CONNECT]` log entries
- Check for error details with `JSON.stringify`

### 3. Common Causes

#### A. User Not in `public.users` Table
**Error:** `User profile not found. Please complete your profile first.`
**Fix:** Ensure user exists in `public.users` before creating Connect account

#### B. Stripe API Error
**Possible errors:**
- Custom account creation failing (requires platform setup)
- Accounts v2 API not enabled
- Invalid `controller` configuration

**Check logs for:**
- `[CREATE-CONNECT] Accounts v2 failed:`
- `[CREATE-CONNECT] Custom account creation failed:`
- `[CREATE-CONNECT] Both v2 and v1 account creation failed:`

#### C. Database Insert Error
**Error:** Foreign key constraint or duplicate key
**Check:** `[CREATE-CONNECT] Database error:`

## Verification Checklist

- [ ] User exists in `public.users` table
- [ ] Stripe API keys are configured correctly
- [ ] Edge Function logs show detailed error
- [ ] Browser console shows detailed error message
- [ ] Network tab shows actual HTTP response

## Next Steps

1. **Try creating account again** - The improved error handling will show the actual error
2. **Check browser console** - Look for the detailed error message (now shows for 10 seconds)
3. **Check Supabase logs** - Full error details are logged with `JSON.stringify`

## Files Modified

- `peer-care-connect/src/components/onboarding/PaymentSetupStep.tsx` - Enhanced error handling
- `peer-care-connect/supabase/functions/stripe-payment/index.ts` - Better error logging and Express fallback

