# Stripe Connect Embedded Components Migration

## Overview

This document describes the migration from Stripe's hosted onboarding flow to embedded components, completed on December 27, 2025.

## Summary of Changes

### Frontend Components

#### New Components Created
- **`src/components/onboarding/EmbeddedStripeOnboarding.tsx`**
  - Replaces hosted redirect-based onboarding
  - Uses `@stripe/connect-js` SDK to embed the onboarding form directly
  - Handles completion detection via database polling
  - User never leaves the app during onboarding

- **`src/components/settings/EmbeddedAccountManagement.tsx`**
  - Allows practitioners to manage their Stripe Connect account settings
  - Provides tabs for Account, Payouts, and Payments views
  - Embedded directly in the settings page

#### Updated Components
- **`src/components/onboarding/PaymentSetupStep.tsx`**
  - Now uses `EmbeddedStripeOnboarding` instead of redirecting to Stripe
  - Creates Connect account first, then renders embedded component
  
- **`src/pages/settings/SettingsPayouts.tsx`**
  - Integrates `EmbeddedAccountManagement` for fully onboarded practitioners
  - Uses `EmbeddedStripeOnboarding` for incomplete accounts
  
- **`src/pages/onboarding/StripeReturn.tsx`**
  - Updated to handle edge cases (OAuth popups from embedded flow)
  - Redirects gracefully to settings/onboarding as appropriate
  
- **`src/components/practice/PracticeManagementHub.tsx`**
  - Replaced `StripeConnectOnboarding` with `EmbeddedAccountManagement`

#### Removed Components (Deprecated)
- **`src/components/payments/StripeConnectOnboarding.tsx`** - DELETED
  - Was the old hosted onboarding component with redirect
  
- **`src/components/payments/StripeConnectStatus.tsx`** - DELETED
  - Was unused and superseded by embedded management

### Backend Changes

#### Edge Function: `stripe-payment`
- **New Action: `create-account-session`**
  - Creates Stripe Account Sessions for embedded components
  - Returns `client_secret` for initializing Connect.js
  - Verifies user authentication and account ownership
  - Supports configurable components (onboarding, management, payouts, payments)

### Dependencies Added
- **`@stripe/connect-js`** - Stripe Connect.js SDK for embedded components

## How It Works

### New Onboarding Flow
1. User clicks "Set Up Payment Account"
2. Edge Function creates Stripe Express account (no redirect URL needed)
3. Frontend fetches Account Session via new `create-account-session` action
4. Connect.js SDK mounts `account-onboarding` component inline
5. User completes form without leaving the app
6. Frontend polls database for completion status
7. On completion, user proceeds to next onboarding step

### Account Management Flow
1. Practitioner navigates to Settings → Payouts
2. `EmbeddedAccountManagement` fetches Account Session
3. Connect.js mounts `account-management`, `payouts`, or `payments` components
4. Practitioner can update bank details, view payouts, etc. inline

## Database Impact
No schema changes required. The existing `connect_accounts` table continues to track:
- `stripe_account_id`
- `charges_enabled`, `payouts_enabled`, `details_submitted`
- `account_status`

## Existing User Handling
- **Ray Dhillon & Johnny Osteo**: Already fully onboarded via hosted flow
- They can use the new `EmbeddedAccountManagement` in Settings to update banking
- Alternatively, they can use the Stripe Dashboard directly

## Configuration

### Required Environment Variables
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key (Edge Function)

### Appearance Customization
The embedded components use custom appearance settings:
```javascript
appearance: {
  overlays: 'dialog',
  variables: {
    colorPrimary: '#10b981',  // Emerald brand color
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px',
  },
}
```

## Benefits

1. **Better UX**: Users stay on the platform throughout onboarding
2. **Consistent Branding**: Embedded forms match app styling
3. **Reduced Friction**: No browser redirects or new tabs
4. **Real-time Status**: Polling detects completion immediately
5. **Unified Settings**: Account management embedded in settings page

## Rollback (Not Needed)

This is a permanent migration. The hosted onboarding code has been removed.
If rollback were ever needed:
1. Restore deleted components from git history
2. Revert `PaymentSetupStep.tsx` changes
3. Revert Edge Function to remove `create-account-session`

---

*Migration completed: December 27, 2025*

