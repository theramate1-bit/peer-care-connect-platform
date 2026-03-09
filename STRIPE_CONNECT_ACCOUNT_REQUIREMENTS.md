# Stripe Connect Account Requirements

## Critical Requirements for Payment Processing

### 1. Account Creation Configuration

When creating Stripe Connect accounts, **BOTH** of the following capabilities MUST be requested:

#### Merchant Capabilities (Required)
```json
{
  "configuration": {
    "merchant": {
      "capabilities": {
        "card_payments": {
          "requested": true
        }
      }
    }
  }
}
```

#### Recipient Capabilities (REQUIRED for transfers)
```json
{
  "configuration": {
    "recipient": {
      "capabilities": {
        "stripe_balance": {
          "stripe_transfers": {
            "requested": true
          }
        }
      }
    }
  }
}
```

**Why this is critical:**
- Without `recipient.stripe_balance.stripe_transfers`, payments with `transfer_data` will fail
- Error: "Your destination account needs to have the stripe_balance.stripe_transfers feature enabled"
- This prevents the platform from transferring funds to practitioners

### 2. Account Verification

Before processing payments, accounts must have:
- ✅ `charges_enabled: true` - Can accept payments
- ✅ `payouts_enabled: true` - Can receive transfers (implies transfers capability)
- ✅ `details_submitted: true` - Onboarding complete
- ✅ `stripe_transfers` capability active (or `payouts_enabled` as fallback)

### 3. Payment Creation Requirements

When creating payments with `transfer_data`:
- The destination account MUST have `stripe_balance.stripe_transfers` capability active
- If `payouts_enabled: true`, transfers should work (fallback check)
- Always verify account capabilities before creating payment

## Prevention Checklist

- [ ] Account creation always includes `recipient` configuration
- [ ] Verification checks for transfers capability
- [ ] Payment creation validates transfers before attempting
- [ ] Error messages clearly indicate missing transfers capability
- [ ] Logging shows capability status for debugging

## Testing

To verify an account has transfers enabled:
1. Check `account.payouts_enabled === true` (strong indicator)
2. Check `account.capabilities.transfers === 'active'` (v1 accounts)
3. Check `account.capabilities.stripe_balance?.stripe_transfers === 'active'` (v2 accounts)
4. Check `account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers` (v2 request status)

## Migration for Existing Accounts

If an account was created without recipient configuration:
- The account may still work if `payouts_enabled: true` (our fallback handles this)
- For new accounts, always include recipient configuration
- Consider updating existing accounts via Stripe API if needed


