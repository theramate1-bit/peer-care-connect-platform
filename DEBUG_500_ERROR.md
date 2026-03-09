# Debugging 500 Error in Stripe Connect Account Creation

## Issue
User is getting a 500 error when trying to create a Stripe Connect account during practitioner onboarding.

## Error Location
- **Component**: `PaymentSetupStep.tsx:99`
- **Edge Function**: `stripe-payment` → `handleCreateConnectAccount`
- **Error**: `FunctionsHttpError: Edge Function returned a non-2xx status code`

## What We've Done

### 1. Enhanced Error Logging ✅
- Added detailed error logging in `handleCreateConnectAccount` catch block
- Now logs: message, type, code, statusCode, decline_code, param, request_id
- Frontend now parses and displays detailed error messages

### 2. Verified Embedded Flow ✅
- **PaymentSetupStep.tsx**: Uses `EmbeddedStripeOnboarding` component (fully embedded)
- **No Account Links**: Code returns `onboardingUrl: null` (no redirects)
- **Account Creation**: Only creates Custom accounts (no Express fallback)

## Next Steps to Debug

1. **Check Browser Console**: Look for detailed error messages after the fix
2. **Check Supabase Logs**: View Edge Function logs for detailed error information
3. **Test Account Creation**: Try creating an account and check what specific error Stripe returns

## Possible Causes

1. **Stripe API Error**: Accounts v2 or v1 Custom creation failing
2. **Database Error**: Foreign key constraint or insert error
3. **Authentication Error**: User not properly authenticated
4. **Missing User Record**: User doesn't exist in `public.users` table

## How to Check

After deploying the updated Edge Function, the error message should now include:
- Specific Stripe error code
- Error type
- Detailed message
- Request ID (for Stripe support)

Check the browser console for the full error details.

