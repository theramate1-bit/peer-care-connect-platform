# Webhook & Account Session Configuration Fix

## Issue Identified

### Error
```
The `disable_stripe_user_authentication` feature can only be set to true for accounts where the platform owns requirements collection, such as custom accounts.
```

### Root Cause
- Existing account `acct_1Sj0sHCPWCYrygB7` has `requirement_collection: 'stripe'`
- Code was trying to use `disable_stripe_user_authentication: true` unconditionally
- This feature **only works** when `requirement_collection: 'application'`

---

## Solution Implemented

### Backend Fix (`stripe-payment/index.ts`)

1. **Check Account Configuration**:
   - Retrieve account details before creating session
   - Check `requirement_collection` value
   - Verify account type (Custom account required)

2. **Conditional Feature Enablement**:
   - Only enable `disable_stripe_user_authentication` if `requirement_collection === 'application'`
   - Remove it from components config if account has `requirement_collection: 'stripe'`
   - Override frontend components config to prevent errors

3. **Smart Component Merging**:
   - Merge frontend-provided components with validated backend config
   - Remove incompatible features automatically
   - Preserve other features (external_account_collection, etc.)

---

## Account Configuration Check

### Current Account Status
- **Account ID**: `acct_1Sj0sHCPWCYrygB7`
- **Type**: Custom (has controller)
- **Requirement Collection**: `stripe` ⚠️
- **Dashboard**: `none` ✅
- **Losses**: `stripe` (Stripe liable)
- **Fees**: `application` (Platform pays)

### For This Account
- ❌ **Cannot use** `disable_stripe_user_authentication`
- ✅ **Can use** fully embedded onboarding
- ✅ **Will require** SMS/email verification step

### For New Accounts
- ✅ **Will use** `requirement_collection: 'application'` (new code)
- ✅ **Can use** `disable_stripe_user_authentication`
- ✅ **No SMS/email verification** required

---

## Webhook Status

### ✅ Webhook Endpoint
- **ID**: `we_1SZobHFk77knaVvaU7N5ndNj`
- **URL**: `https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook`
- **Status**: ✅ **ENABLED**
- **Mode**: **LIVE**

### ✅ Configured Events (14)
- Connect: `account.updated`, `account.application.deauthorized`, `account.application.authorized`
- Payments: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.succeeded`, `charge.failed`
- Subscriptions: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Invoices: `invoice.payment_succeeded`, `invoice.payment_action_required`

### ✅ Handler Coverage
- All 14 configured events have handlers
- Additional v2 handlers exist (but v2 events not configured yet)

---

## Testing

### Test Existing Account
1. Try onboarding with existing account (`acct_1Sj0sHCPWCYrygB7`)
2. Should work but will require SMS/email verification
3. No error about `disable_stripe_user_authentication`

### Test New Account
1. Create new account (will use `requirement_collection: 'application'`)
2. Should work without SMS/email verification
3. Better UX for new practitioners

---

## Next Steps

1. ✅ **Backend deployed** - Account session creation now checks account config
2. ✅ **Webhooks verified** - All events configured and handled
3. ⚠️ **Existing accounts** - Will work but require authentication step
4. ✅ **New accounts** - Will have better UX (no authentication step)

---

**Status**: ✅ **FIXED - Backend now handles both account configurations**

