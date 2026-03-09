# Stripe Portal Issues Analysis - Root Causes

**Date:** January 21, 2025  
**Status:** 🔴 **CRITICAL ISSUES IDENTIFIED**

---

## Summary

Found two Stripe integrations that don't work in practitioner onboarding:
1. **Stripe Subscription** (Step 4) - BLOCKED by Connect requirement
2. **Stripe Connect** (Step 6) - Created too late in flow

**Result:** Practitioners cannot complete onboarding due to circular dependency.

---

## Issue 1: Stripe Connect Blocks Subscription ❌

### Location
`peer-care-connect/src/contexts/SubscriptionContext.tsx` (lines 252-262)

### Root Cause
```typescript
const isPractitioner = userData && ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userData.user_role);

if (isPractitioner && !userData.stripe_connect_account_id) {
  console.log('❌ Practitioner missing Stripe Connect account');
  toast.error('Please complete Stripe Connect setup before subscribing', {
    description: 'You need to connect your bank account to receive payments',
  });
  setTimeout(() => {
    window.location.href = '/profile#services';
  }, 2000);
  return; // ⚠️ BLOCKS SUBSCRIPTION
}
```

### The Problem
1. User starts onboarding (Step 1)
2. Reaches Step 4 (Subscription)
3. Clicks "Subscribe"
4. Code checks: Does user have `stripe_connect_account_id`?
5. **NO** - user hasn't set up Connect yet (that happens at Step 6)
6. **ERROR:** Redirects to profile page, blocks subscription
7. User stuck - can't complete onboarding

### Circular Dependency Flow
```
User Starts Onboarding
  ↓
Step 4: Subscription (requires payment)
  ↓
Check: Has Stripe Connect? ❌ NO (not created yet)
  ↓
ERROR: Redirect to /profile
  ↓
User Cannot Continue Onboarding
```

### Why This Happens
- **Stripe Connect** is created in `completePractitionerOnboarding()` 
- But `completePractitionerOnboarding()` is called at **Step 6 END**
- Subscription checkout happens at **Step 4**
- **Timing issue:** Connect doesn't exist when needed for subscription

---

## Issue 2: Stripe Connect Created Too Late ❌

### Location
`peer-care-connect/src/lib/onboarding-utils.ts` (lines 179-211)

### Root Cause
```typescript
export async function completePractitionerOnboarding(...) {
  // ... save user data ...
  
  // Create Stripe Connect account for practitioner
  try {
    const { data: connectData, error: connectError } = await supabase.functions.invoke('stripe-payment', {
      body: {
        action: 'create-connect-account',
        userId: userId,
        // ...
      }
    });
    
    // ⚠️ This happens at STEP 6 END
  }
}
```

### The Problem
1. User completes Steps 1-5
2. User clicks "Complete Setup" (Step 6)
3. `completePractitionerOnboarding()` called
4. Stripe Connect account created
5. **TOO LATE** - subscription was needed at Step 4!

### Timing Issue
```
Step 1: Basic Info ✓
Step 2: Professional Details ✓
Step 3: Availability ✓
Step 4: Subscription ← NEEDS CONNECT, but doesn't exist yet ❌
Step 5: Services ✓
Step 6: Location → Create Connect (too late!) ❌
```

---

## Issue 3: Wrong Return URL After Payment ❌

### Location
`peer-care-connect/supabase/functions/create-checkout/index.ts` (line 99)

### Root Cause
```typescript
success_url: `${req.headers.get("origin")}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment_success=true`
```

### The Problem
1. User clicks "Subscribe" during onboarding (Step 4)
2. Redirects to Stripe Checkout
3. Completes payment
4. Stripe redirects to `/dashboard` ← **WRONG!**
5. User loses onboarding state
6. User stuck outside onboarding flow

### Should Be
```typescript
success_url: `${req.headers.get("origin")}/onboarding?session_id={CHECKOUT_SESSION_ID}&payment_success=true&step=5`
```

### What Happens
```
Step 4: In Onboarding → Click Subscribe
  ↓
Redirect to Stripe
  ↓
Payment Complete
  ↓
Return to /dashboard ← WRONG! User should return to Step 5
  ↓
User Lost in Dashboard
  ↓
Cannot Continue Onboarding
```

---

## Solution Strategy

### Option 1: Remove Connect Requirement (RECOMMENDED)
**Pros:** Simple, fixes immediate issue
**Cons:** Practitioners can't receive payments until Connect setup

**Implementation:**
1. Remove the check in `SubscriptionContext.tsx` lines 252-262
2. Allow practitioners to subscribe during onboarding
3. Make Connect setup OPTIONAL for initial subscription
4. Remind practitioners to complete Connect after onboarding

### Option 2: Create Connect Earlier
**Pros:** Maintains payment capability
**Cons:** More complex flow

**Implementation:**
1. Create Connect at Step 2 or 3
2. Show Connect as a prerequisite before subscription
3. Redirect to Stripe Connect onboarding before Step 4
4. Return to onboarding after Connect setup

### Option 3: Two-Phase Subscription
**Pros:** Most flexible
**Cons:** Most complex

**Implementation:**
1. Allow subscription payment during onboarding
2. Allow practitioners to receive bookings immediately
3. Require Connect setup before receiving payments
4. Show warnings if Connect not completed

---

## Recommended Fix (Simple & Fast)

### 1. Fix `SubscriptionContext.tsx`

**REMOVE** lines 252-262:
```typescript
// DELETE THIS BLOCK
if (isPractitioner && !userData.stripe_connect_account_id) {
  console.log('❌ Practitioner missing Stripe Connect account');
  toast.error('Please complete Stripe Connect setup before subscribing');
  setTimeout(() => {
    window.location.href = '/profile#services';
  }, 2000);
  return;
}
```

**REPLACE WITH:**
```typescript
// Allow practitioners to subscribe without Connect during onboarding
// They'll be reminded to set up Connect after onboarding
if (isPractitioner && !userData.stripe_connect_account_id) {
  console.log('ℹ️ Practitioner will set up Connect after onboarding');
  // Continue with checkout
}
```

### 2. Fix Return URL

**In `create-checkout/index.ts` line 99:**

Change from:
```typescript
success_url: `${req.headers.get("origin")}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment_success=true`
```

To:
```typescript
success_url: `${req.headers.get("origin")}/onboarding?session_id={CHECKOUT_SESSION_ID}&payment_success=true&step=5`
```

### 3. Add Warning After Onboarding

**In dashboard or profile:**
- Show banner: "Complete Stripe Connect setup to receive payments"
- Link to Connect onboarding
- Block payment functionality until Connect setup

---

## Files to Modify

1. ✅ `peer-care-connect/src/contexts/SubscriptionContext.tsx`
   - Remove Connect requirement check (lines 252-262)
   
2. ✅ `peer-care-connect/supabase/functions/create-checkout/index.ts`
   - Fix success URL (line 99)
   
3. ⏳ `peer-care-connect/src/pages/auth/Onboarding.tsx`
   - Add reminder for Connect setup
   - Handle payment return correctly

---

## Testing Plan

### Test Case 1: Complete Onboarding
1. Register as practitioner
2. Complete Steps 1-3
3. Subscribe at Step 4 (should work now!)
4. Complete Steps 5-6
5. Verify subscription active
6. Set up Connect separately

### Test Case 2: Payment Return
1. Start subscription at Step 4
2. Complete payment at Stripe
3. Verify return to Step 5 (not dashboard)
4. Complete onboarding
5. Verify all data saved

---

## Summary

**Critical Blockers:**
1. ❌ Connect requirement blocks subscription
2. ❌ Wrong return URL after payment
3. ❌ Connect created too late

**Quick Fix:**
1. Remove Connect requirement
2. Fix return URL
3. Add post-onboarding Connect reminder

**Impact:** Allows practitioners to complete onboarding and subscribe successfully.

---

*Analysis completed January 21, 2025*

