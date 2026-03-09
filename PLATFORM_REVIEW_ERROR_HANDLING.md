# Platform Review Error Handling

## Issue
Stripe requires a one-time platform review before accounts with `requirement_collection: 'application'` can be created in live mode.

**Error Message:**
```
Please review the responsibilities of collecting requirements for connected accounts 
at https://dashboard.stripe.com/settings/connect/platform-profile.
```

## Solution Implemented

### Frontend Error Detection
Updated `PaymentSetupStep.tsx` to:
1. ✅ Detect platform review error in `v2Error` and `customError` fields
2. ✅ Show user-friendly error message with actionable link
3. ✅ Provide "Open Review Page" button in toast notification
4. ✅ Display clear instructions to complete review and refresh

### Error Flow
1. User clicks "Set Up Payment Account"
2. Edge Function attempts to create account with `requirement_collection: 'application'`
3. Stripe returns platform review error
4. Frontend detects error and shows:
   - Clear error message: "Platform Setup Required"
   - Description with instructions
   - Action button to open review page
   - Instructions to refresh after completion

## Action Required

### One-Time Setup (Stripe Dashboard)
1. Go to: https://dashboard.stripe.com/settings/connect/platform-profile
2. Review and accept responsibilities for collecting requirements
3. This enables `requirement_collection: 'application'` for all future accounts
4. After completion, refresh the onboarding page and try again

## Code Changes

**File**: `src/components/onboarding/PaymentSetupStep.tsx`

**Added**:
- Detection of platform review error in `v2Error` and `customError`
- User-friendly error message with link
- Action button in toast notification
- Early return to prevent generic error display

## Expected Behavior After Review

Once platform review is completed:
1. ✅ Account creation will succeed
2. ✅ Accounts will have `requirement_collection: 'application'`
3. ✅ `disable_stripe_user_authentication` will work
4. ✅ Embedded component will render inline (no popup)
5. ✅ Smooth onboarding experience for all new practitioners

## Status

- ✅ Error detection implemented
- ✅ User-friendly messaging added
- ✅ Action button provided
- ⚠️ Waiting for platform review completion in Stripe Dashboard



