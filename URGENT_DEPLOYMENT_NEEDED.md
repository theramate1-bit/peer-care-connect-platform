# Critical: Edge Function Deployment Required

## Current Status

**Error**: `Missing client user id: Could not resolve user_id from Authorization token or metadata.client_id`

**Root Cause**: Edge Function version 70 (deployed) is still using old code that checks `metadata.client_id` instead of `metadata.client_user_id`.

**Fix Status**: 
- ✅ Local code updated (`supabase/functions/stripe-payment/index.ts` lines 176-186)
- ❌ **NOT DEPLOYED** - Edge Function still on version 70

## Verification

### Client Code (✅ CORRECT)
**File**: `src/components/marketplace/GuestBookingFlow.tsx` line 570
```typescript
clientId: guestUser.id,  // ✅ Correctly passed
```

**File**: `src/lib/payment-integration.ts` line 323
```typescript
metadata: {
  client_user_id: request.clientId,  // ✅ Correct field name
  // ...
}
```

### Edge Function Code
**Local**: ✅ Updated to require `metadata.client_user_id` directly
**Deployed**: ❌ Still checking `metadata.client_id` as fallback

## Deployment Required

The MCP deployment failed. **Manual deployment required:**

### Option 1: Supabase Dashboard (Recommended)
1. Open Supabase Dashboard → Your Project → Edge Functions
2. Click on `stripe-payment`
3. Click "Edit" or "Update"
4. Copy the entire contents of `peer-care-connect/supabase/functions/stripe-payment/index.ts`
5. Paste into the editor
6. Click "Deploy" or "Save"

### Option 2: Supabase CLI
```bash
cd peer-care-connect
supabase functions deploy stripe-payment --no-verify-jwt
```

**Note**: Requires Docker Desktop to be running.

## What Will Change After Deployment

**Before (Current - Version 70)**:
- Checks `metadata.client_id` as fallback
- Error: `"Could not resolve user_id from Authorization token or metadata.client_id"`

**After (New Code)**:
- Requires `metadata.client_user_id` directly
- Error: `"metadata.client_user_id is required and must be a string"`

## Test After Deployment

1. Try a guest booking
2. Check browser console - should see new error format if validation fails
3. If `client_user_id` is correctly sent, payment should succeed

## Quick Fix Verification

To verify the fix is deployed, check the Edge Function logs after deployment. The error message should change from:
- ❌ Old: `"Could not resolve user_id from Authorization token or metadata.client_id"`
- ✅ New: `"metadata.client_user_id is required and must be a string"`

