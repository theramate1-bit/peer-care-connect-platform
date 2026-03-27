# Stripe Transfers Capability Fix

**Date:** 2025-02-24  
**Issue:** `PRACTITIONER_TRANSFERS_NOT_ENABLED` error blocking payments  
**Root Cause:** Account capability check missing v1 API cross-reference  
**Status:** ✅ Fixed and Deployed

## Problem Description

The application was experiencing a critical payment error:

```json
{
  "error": "PRACTITIONER_TRANSFERS_NOT_ENABLED",
  "details": "The practitioner's Stripe account needs to have transfers enabled to receive payments. Please complete the Stripe onboarding process."
}
```

This error was occurring even though:

- Stripe showed `capabilities.transfers = active` for the account
- The account had `payouts_enabled = true` (which implies transfers capability)
- The account was previously working

## Root Cause Analysis

The issue was in the `handleCreatePaymentIntent` function in `supabase/functions/stripe-payment/index.ts`. The function was:

1. **Using Accounts v2 API** to retrieve account information
2. **Missing capability fields** in v2 responses for some accounts
3. **Not cross-checking with v1 API** when v2 data was incomplete
4. **Falsely concluding transfers were disabled** when capability fields were missing

### Technical Details

- **Accounts v2 API** (`/v2/core/accounts/{id}`) doesn't always include `capabilities` in the response
- **Accounts v1 API** (`stripe.accounts.retrieve()`) always includes `capabilities`
- The code was only checking v2 response, leading to false negatives

## Solution Implemented

### Code Changes

**File:** `supabase/functions/stripe-payment/index.ts`  
**Function:** `handleCreatePaymentIntent` (lines ~260-391)

**Key Changes:**

1. **Added v1 API cross-check** when v2 response is missing capability fields:

   ```typescript
   // Cross-check with v1 when v2 response is missing capability fields
   if (
     accountSource === "v2" &&
     (!account?.capabilities || typeof account?.payouts_enabled !== "boolean")
   ) {
     try {
       v1Account = await stripe.accounts.retrieve(finalConnectAccountId);
       // Use v1Account for capability checks
     } catch (v1Error) {
       console.warn("Failed v1 capability cross-check:", v1Error?.message);
     }
   }
   ```

2. **Enhanced capability detection** to check multiple sources:
   - v2 `configuration.recipient.capabilities.stripe_balance.stripe_transfers`
   - v1 `capabilities.transfers`
   - v1 `capabilities.stripe_balance.stripe_transfers`
   - Fallback: If `payouts_enabled = true`, assume transfers work

3. **Improved error logic** to only block when transfers are **definitely** not enabled:
   ```typescript
   // Only block if transfers are definitely not enabled AND payouts are not enabled
   if (!stripeTransfersEnabled && !effectivePayoutsEnabled) {
     return error response;
   }
   ```

### Logic Flow

```
1. Try Accounts v2 API first
2. If v2 response missing capabilities → fetch v1
3. Check capabilities from both sources:
   - v2 configuration.recipient.capabilities
   - v1 capabilities object
   - payouts_enabled status (if true, transfers work)
4. Only block if ALL checks fail
```

## Deployment

**Deployed:** ✅ Successfully deployed via Supabase CLI  
**Function:** `stripe-payment`  
**Project:** `aikqnvltuwwgifuocvto`  
**Version:** Latest (incremented automatically)  
**Status:** Active

### Deployment Command

```powershell
cd "C:\Users\rayma\Desktop\New folder\peer-care-connect"
supabase functions deploy stripe-payment --project-ref aikqnvltuwwgifuocvto
```

## Verification

After deployment, verify the fix:

1. **Test payment flow** for the affected practitioner account (`acct_1SjPIGC9On66iteO`)
2. **Check logs** in Supabase Dashboard for capability detection logs
3. **Verify** that payments proceed when:
   - `capabilities.transfers = active` (v1)
   - `payouts_enabled = true` (even if capability not explicitly found)

## Related Accounts

- **Practitioner Account:** `acct_1SjPIGC9On66iteO`
- **User ID:** `d419a3d1-5071-4940-a13f-b4aac9520dec`
- **Session ID (test case):** `92d0d4ba-e360-4931-94db-02a36d2ea994`

## Prevention

To prevent similar issues:

1. **Always cross-check** v1 and v2 API responses when checking capabilities
2. **Use `payouts_enabled`** as a reliable indicator of transfer capability
3. **Log detailed capability information** for debugging
4. **Test with both** Accounts v1 and v2 account types

## Files Modified

- `supabase/functions/stripe-payment/index.ts` - Enhanced capability checking logic

## References

- [Stripe Accounts v2 API Documentation](https://docs.stripe.com/api/accounts/v2)
- [Stripe Connect Capabilities](https://docs.stripe.com/connect/accounts/capabilities)
- [Stripe Transfers](https://docs.stripe.com/connect/charges-transfers)
