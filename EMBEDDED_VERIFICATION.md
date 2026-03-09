# Stripe Connect Embedded Components - Verification Guide

## ✅ What's Been Implemented

### 1. **Account Creation - Fully Embedded**
- ✅ Accounts v2: `dashboard: "none"` (no Dashboard access)
- ✅ Accounts v1 Express: `controller.stripe_dashboard.type = "none"` (no Dashboard access)
- ✅ Both paths create accounts configured for embedded-only

### 2. **Embedded Components**
- ✅ Using `@stripe/connect-js` SDK
- ✅ `loadConnectAndInitialize()` with `fetchClientSecret`
- ✅ `stripeConnectInstance.create('account-onboarding')` mounted inline
- ✅ Account Sessions created with `account_onboarding` component enabled
- ✅ `external_account_collection: true` for inline bank account collection

### 3. **No Redirects**
- ✅ No Account Links created
- ✅ No `onboardingUrl` in responses
- ✅ Component renders directly in `<div ref={containerRef}>`

## 🔍 How to Verify It's Fully Embedded

### Visual Check
1. **Open browser DevTools** (F12)
2. **Navigate to onboarding payment setup**
3. **Check the DOM** - You should see:
   - A `<div>` with class `stripe-connect-container`
   - Stripe's embedded iframe/components rendered INSIDE your page
   - NO redirect buttons or "Continue to Stripe" links

### Code Verification
```typescript
// ✅ CORRECT - Embedded component mounted inline
const accountOnboarding = stripeConnectInstance.create('account-onboarding');
container.appendChild(accountOnboarding); // Renders in your page

// ❌ WRONG - Would redirect
window.location.href = accountLink.url; // This should NOT exist
```

### Account Configuration Check
Run this in your browser console on the onboarding page:
```javascript
// Check if Account Session is created correctly
fetch('/functions/v1/stripe-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${your_token}`
  },
  body: JSON.stringify({
    action: 'create-account-session',
    stripe_account_id: 'acct_xxx',
    components: { account_onboarding: { enabled: true } }
  })
})
.then(r => r.json())
.then(data => {
  console.log('Account Session:', data);
  // Should return: { client_secret: "acs_xxx", ... }
  // NOT: { onboardingUrl: "https://connect.stripe.com/..." }
});
```

## ⚠️ Common Issues

### Issue 1: Component Shows "Continue to Stripe" Button
**Cause:** Account was created BEFORE `controller.stripe_dashboard.type = "none"` was added.

**Solution:** 
- Create a NEW account (will have correct settings)
- OR update existing account:
```typescript
await stripe.accounts.update(accountId, {
  controller: {
    stripe_dashboard: {
      type: 'none',
    },
  },
});
```

### Issue 2: Component Redirects Instead of Rendering Inline
**Cause:** Account Session not configured correctly or account has Dashboard access.

**Check:**
1. Verify account has `controller.stripe_dashboard.type = "none"`
2. Verify Account Session includes `account_onboarding: { enabled: true }`
3. Verify `@stripe/connect-js` is loaded correctly

### Issue 3: "Failed to create account session"
**Cause:** Account doesn't exist or user doesn't own it.

**Solution:**
- Ensure account is created first via `create-connect-account`
- Verify `stripe_account_id` is correct

## 📋 Testing Checklist

- [ ] Create a NEW account (not existing one)
- [ ] Verify embedded component renders inline (no redirect)
- [ ] Fill out onboarding form within your page
- [ ] Verify no "Continue to Stripe" buttons appear
- [ ] Complete onboarding without leaving your site
- [ ] Check browser Network tab - no redirects to `connect.stripe.com`

## 🎯 Expected Behavior

**Fully Embedded (✅ Correct):**
- User clicks "Set Up Payment Account"
- Account created with `controller.stripe_dashboard.type = "none"`
- Embedded component renders INLINE in your page
- User fills form without leaving your site
- Onboarding completes on your page

**Hosted/Redirect (❌ Wrong):**
- User clicks button
- Redirects to `connect.stripe.com/...`
- User completes form on Stripe's site
- Redirects back to your site

---

**Current Status:** ✅ Code is configured for fully embedded. If you see redirects, it's likely an existing account that needs updating.

