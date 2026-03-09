# Stripe Connect Accounts v2 Migration - Fully Embedded

## Overview

Migrated from Accounts v1 (Express) with hosted onboarding to **Accounts v2 with fully embedded components** (`dashboard: "none"`).

## Key Changes

### 1. Account Creation (`handleCreateConnectAccount`)

**Before:**
- Used Accounts v1 Express: `stripe.accounts.create({ type: 'express' })`
- Created Account Links for hosted onboarding redirect
- Accounts had access to Stripe Dashboard

**After:**
- **Primary:** Attempts to use Accounts v2 API (`/v2/core/accounts`) with:
  - `dashboard: "none"` - No Stripe Dashboard access (fully embedded)
  - `defaults.responsibilities.fees_collector: "stripe"` - Stripe manages fees
  - `defaults.responsibilities.losses_collector: "stripe"` - Stripe manages losses
- **Fallback:** Uses Accounts v1 Express if v2 API is unavailable
- **No Account Links:** Removed all Account Link creation (hosted flow)

### 2. Embedded Components

Already implemented and working:
- ✅ `account-onboarding` - Embedded onboarding form
- ✅ `account-management` - Account settings management
- ✅ `payouts` - Payout management
- ✅ `payments` - Payment history and management

### 3. API Version

- Using Stripe API version `2025-11-17.preview` for Accounts v2
- Fallback uses `2023-10-16` for Accounts v1 compatibility

## Accounts v2 vs v1 Comparison

| Feature | Accounts v1 (Express) | Accounts v2 |
|---------|----------------------|-------------|
| **Dashboard Access** | ✅ Yes (Stripe Dashboard) | ❌ No (`dashboard: "none"`) |
| **Embedded Components** | ✅ Supported | ✅ Required |
| **Account Links** | ✅ Supported (hosted) | ❌ Not used (fully embedded) |
| **Risk Management** | Platform or Stripe | Stripe (managed) |
| **Fee Collection** | Platform or Stripe | Stripe (in this config) |
| **API Endpoint** | `/v1/accounts` | `/v2/core/accounts` |

## Implementation Details

### Account Creation Flow

```typescript
// Attempt Accounts v2 first
const v2Response = await fetch('https://api.stripe.com/v2/core/accounts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${stripeSecretKey}`,
    'Stripe-Version': '2025-11-17.preview',
  },
  body: JSON.stringify({
    dashboard: 'none', // Fully embedded - no Dashboard
    identity: { country: 'GB', entity_type: 'individual' },
    configuration: {
      merchant: { capabilities: { card_payments: { requested: true } } },
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
    },
    defaults: {
      responsibilities: {
        fees_collector: 'stripe',
        losses_collector: 'stripe',
      },
    },
  }),
});

// Fallback to v1 Express if v2 fails
if (!v2Response.ok) {
  const account = await stripe.accounts.create({ type: 'express', ... });
}
```

### Removed Code

- ❌ `stripe.accountLinks.create()` - No longer needed (hosted flow)
- ❌ `onboardingUrl` in response - Replaced with embedded component
- ❌ Account Link refresh/return URL logic

## Benefits of Accounts v2

1. **Fully Embedded Experience**
   - Users never leave your platform
   - Complete control over UI/UX
   - Consistent branding throughout

2. **Stripe-Managed Risk**
   - Stripe handles credit and fraud risk
   - Direct communication with accounts via embedded components
   - Reduced platform liability

3. **No Dashboard Access**
   - Accounts can't access Stripe Dashboard
   - All actions happen through your platform
   - Better user experience and control

## Migration Status

- ✅ Account creation updated to use v2 (with v1 fallback)
- ✅ Account Links removed
- ✅ Embedded components already implemented
- ✅ Account Session creation working
- ⚠️ **Note:** Accounts v2 is a preview API - may require Stripe approval or specific permissions

## Testing

When testing account creation:
1. Check if Accounts v2 API is available (check logs for "Created Accounts v2 account")
2. If v2 fails, verify fallback to v1 Express works
3. Verify embedded onboarding component loads correctly
4. Confirm no Account Links are created

## Future Considerations

- Monitor Stripe's Accounts v2 API availability
- Consider migrating existing v1 accounts to v2 (if supported)
- Update account status retrieval if v2 structure differs significantly
- Configure email branding and embedded component URLs in Stripe Dashboard

---

*Migration completed: December 27, 2025*

