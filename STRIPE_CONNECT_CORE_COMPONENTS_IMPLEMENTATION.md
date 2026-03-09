# Stripe Connect Core Embedded Components - Complete Implementation

## Overview

This document outlines the complete implementation of all required Stripe Connect embedded components as per Stripe's requirements for fully embedded Connect integrations.

## ✅ Core Embedded Components (All Implemented)

### 1. Account Onboarding ✅
**Component**: `EmbeddedStripeOnboarding.tsx`
- **Purpose**: Guide users through providing necessary business and personal info for verification
- **Location**: `src/components/onboarding/EmbeddedStripeOnboarding.tsx`
- **Usage**: Used during practitioner onboarding flow
- **Features**:
  - Fully embedded (no redirects)
  - Inline bank account collection
  - `disable_stripe_user_authentication` support (when `requirement_collection: 'application'`)
  - Completion detection via database polling

### 2. Account Management ✅
**Component**: `EmbeddedAccountManagement.tsx` (Account tab)
- **Purpose**: Allow connected accounts to manage their settings
- **Location**: `src/components/settings/EmbeddedAccountManagement.tsx`
- **Usage**: Settings page for fully onboarded practitioners
- **Features**:
  - Account settings management
  - Business information updates
  - Legal entity management

### 3. Notification Banner ✅
**Component**: `EmbeddedAccountManagement.tsx` (Notification Banner)
- **Purpose**: Display important updates or requests from Stripe
- **Location**: `src/components/settings/EmbeddedAccountManagement.tsx`
- **Usage**: Always visible at top of account management page
- **Features**:
  - Displays Stripe notifications and alerts
  - Handles email redirects from Stripe
  - Auto-mounts when component loads

### 4. Dispute Resolution ✅
**Component**: `EmbeddedAccountManagement.tsx` (Disputes tab)
- **Purpose**: Respond to payment disputes
- **Location**: `src/components/settings/EmbeddedAccountManagement.tsx`
- **Usage**: Disputes tab in account management
- **Features**:
  - View and respond to disputes
  - Upload evidence
  - Track dispute status

### 5. Balance/Payouts ✅
**Component**: `EmbeddedAccountManagement.tsx` (Payouts & Balance tabs)
- **Purpose**: Manage payouts and view balance
- **Location**: `src/components/settings/EmbeddedAccountManagement.tsx`
- **Usage**: Payouts and Balance tabs in account management
- **Features**:
  - View payout history
  - Add funds to cover negative balances
  - Manage payout schedule
  - View account balance

## Technical Implementation

### Component Structure

```typescript
// EmbeddedAccountManagement.tsx
type ComponentType = 
  | 'account-management' 
  | 'payouts' 
  | 'payments' 
  | 'notification-banner' 
  | 'disputes' 
  | 'balance';
```

### Account Session Configuration

All components are enabled in account session creation:

```typescript
// supabase/functions/stripe-payment/index.ts
const componentsConfig = {
  account_onboarding: { enabled: true, features: {...} },
  account_management: { enabled: true },
  payouts: { enabled: true },
  payments: { enabled: true },
  'notification-banner': { enabled: true },
  disputes: { enabled: true },
  balance: { enabled: true },
};
```

### UI Layout

**Tabs Structure**:
1. **Account** - Account settings and management
2. **Payouts** - Payout history and schedule
3. **Payments** - Payment history and tracking
4. **Disputes** - Dispute resolution and evidence
5. **Balance** - Account balance and funding

**Notification Banner**:
- Always visible at top of page (when enabled)
- Handles Stripe email redirects
- Displays important alerts and updates

## Integration Points

### SettingsPayouts Page

**URL Parameters Handled**:
- `?stripe_account_id={id}` - Account ID from Stripe email links
- `?tab={tab}` - Default tab to show (account, payouts, payments, disputes, balance)

**Usage**:
```typescript
<EmbeddedAccountManagement
  stripeAccountId={connectAccount.stripe_account_id}
  defaultTab={urlTab || 'account'}
  showNotificationBanner={true}
/>
```

### Stripe Site Links Configuration

All components are configured in Stripe Dashboard:
- **Notification Banner**: `https://theramate.co.uk/settings/payouts`
- **Account Management**: `https://theramate.co.uk/settings/payouts?tab=account`
- **Payouts**: `https://theramate.co.uk/settings/payouts?tab=payouts`
- **Payments**: `https://theramate.co.uk/settings/payouts?tab=payments`
- **Balance**: `https://theramate.co.uk/settings/payouts?tab=balance`

## Key Features

### 1. Inline Rendering
- ✅ Removed `overlays: 'dialog'` to ensure inline embedding
- ✅ Components render directly in container divs
- ✅ No popups or redirects

### 2. User Authentication
- ✅ Handled within components for sensitive actions
- ✅ Legal entity updates require authentication
- ✅ Role-based access control ready

### 3. Customization
- ✅ Appearance customization via `appearance` prop
- ✅ Component-specific features via `components` config
- ✅ Tab-based navigation for better UX

### 4. Mobile Support
- ✅ Responsive design with hidden labels on mobile
- ✅ Touch-friendly tab navigation
- ✅ Components adapt to screen size

## Security Considerations

### Role Mapping
- Components respect user authentication
- Only account owners can access their account management
- Stripe handles verification for sensitive operations

### Custom Accounts
- Platform owns requirements collection (`requirement_collection: 'application'`)
- Platform is liable for losses (`losses.payments: 'application'`)
- Platform pays fees (`fees.payer: 'application'`)

## Status

### ✅ Completed
- [x] Account Onboarding component
- [x] Account Management component
- [x] Notification Banner component
- [x] Disputes component
- [x] Balance component
- [x] Payouts component
- [x] Payments component
- [x] Account session configuration
- [x] URL parameter handling
- [x] Inline rendering (no popups)
- [x] Tab-based navigation

### ⚠️ Pending
- [ ] Platform review completion (required for `requirement_collection: 'application'`)
- [ ] End-to-end testing of all components
- [ ] Mobile SDK integration (if needed)

## Next Steps

1. **Complete Platform Review**: 
   - Go to: https://dashboard.stripe.com/settings/connect/platform-profile
   - Accept responsibilities for collecting requirements
   - This enables `requirement_collection: 'application'` for new accounts

2. **Test All Components**:
   - Test notification banner from Stripe email links
   - Test dispute resolution flow
   - Test balance funding for negative balances
   - Verify all tabs work correctly

3. **Monitor Usage**:
   - Track component usage analytics
   - Monitor error rates
   - Collect user feedback

## Documentation References

- [Stripe Connect Embedded Components](https://docs.stripe.com/connect/embedded-components)
- [Account Sessions API](https://docs.stripe.com/api/account_sessions)
- [Custom Accounts](https://docs.stripe.com/connect/custom-accounts)
- [Requirement Collection](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection)



