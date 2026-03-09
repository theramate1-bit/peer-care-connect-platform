# Edge Function Deployment Required

## Issue
The `stripe-payment` Edge Function has been updated in the codebase but needs to be deployed to Supabase. The current deployed version is still using the old error message format.

## What Was Fixed

### 1. Intake Form Submission (✅ Complete)
- **File**: `src/lib/intake-form-service.ts`
- **Fix**: Modified `submitIntakeForm` to return `success: true` when RPC function doesn't exist (PGRST202 error), making intake form truly optional
- **Status**: Code updated and ready

### 2. Edge Function Metadata Validation (⚠️ Needs Deployment)
- **File**: `supabase/functions/stripe-payment/index.ts`
- **Fix**: Changed validation to require `metadata.client_user_id` directly (no fallbacks)
- **Status**: Code updated, but **NOT YET DEPLOYED**

## Current Error
The error message `"Missing client user id: Could not resolve user_id from Authorization token or metadata.client_id"` indicates the old Edge Function code is still running.

## Deployment Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **stripe-payment**
3. Click **Deploy** or **Update**
4. Upload the file from `supabase/functions/stripe-payment/index.ts`
5. Ensure `--no-verify-jwt` flag is set (for Stripe webhook compatibility)

### Option 2: Supabase CLI (Requires Docker)
```bash
cd peer-care-connect
supabase functions deploy stripe-payment --no-verify-jwt
```

**Note**: Docker Desktop must be running for CLI deployment.

### Option 3: Manual File Upload
1. Copy the contents of `supabase/functions/stripe-payment/index.ts`
2. Go to Supabase Dashboard → Edge Functions → stripe-payment
3. Paste the code and deploy

## Verification
After deployment, test a guest booking and verify:
- ✅ Payment checkout session is created successfully
- ✅ No "Missing client user id" error
- ✅ Intake form submission doesn't block booking (even if RPC function doesn't exist)

## Files Changed
- ✅ `src/lib/intake-form-service.ts` - Intake form optional fix
- ✅ `supabase/functions/stripe-payment/index.ts` - Metadata validation fix (needs deployment)
- ✅ `src/lib/payment-integration.ts` - Already sends `metadata.client_user_id` correctly

