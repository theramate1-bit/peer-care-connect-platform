# User Journey Audit Findings - Inconsistencies and Edge Cases

**Date:** January 21, 2025  
**Status:** Complete audit findings documented  
**Platform:** TheraMate - Musculoskeletal Health Practitioner Platform

---

## Executive Summary

This audit identifies critical inconsistencies in user journeys across different user roles (clients, sports therapists, massage therapists, osteopaths, and admins). These inconsistencies can lead to user frustration, payment issues, access control problems, and data integrity issues.

---

## 1. ONBOARDING FLOW INCONSISTENCIES

### Issue #1: Step Numbering Inconsistency for Practitioners

**Location:** `peer-care-connect/src/pages/auth/Onboarding.tsx`

**Problem:**
- Practitioner onboarding was renumbered from 6 steps to 7 steps (added Stripe Connect at Step 4)
- Validation logic references old step numbers
- Total steps calculation inconsistent

**Evidence:**
```typescript
// Line 243: Total steps calculation
const totalSteps = (effectiveRole === 'client' || effectiveRole === null) ? 3 : 7; // Client: 3 steps, Professional: 7 steps

// Lines 267-280: Validation uses step numbers
if (step === 2) { // Professional step 2
  // Professional details
} else if (step === 6) { // Service setup - RENUMBERED from step 5
  // Service offerings
}
```

**Impact:**
- Confusing UX when step numbers don't match displayed progress
- Validation errors on wrong steps
- User uncertainty about which step they're on

**Recommendation:**
- Standardize step numbers across all validation logic
- Add step number constants to avoid magic numbers
- Update progress bar calculation to be dynamic

---

### Issue #2: Payment Setup Order Dependency

**Location:** `Onboarding.tsx` lines 292-338

**Problem:**
- Stripe Connect must be completed BEFORE subscription
- If user abandons during Connect setup, they can't return to subscription
- No resumption logic for partial Connect setup

**Evidence:**
```typescript
// Lines 292-299: Blocks progression if Connect not set up
if (effectiveRole !== 'client' && step === 4) {
  if (!userProfile?.stripe_connect_account_id) {
    toast.error('Please complete Stripe Connect setup before continuing');
    return;
  }
}
```

**Impact:**
- Users can get stuck between steps
- Payment flow interruption
- Poor UX for returning users

**Recommendation:**
- Add "skip for now" option with warning
- Allow users to complete subscription first, then Connect
- Add clear messaging about what's required when

---

### Issue #3: Subscription Verification Timing

**Location:** `Onboarding.tsx` lines 437-466

**Problem:**
- Checks subscription status at step 5
- But subscription may not be active yet due to Stripe webhook delay
- User stuck waiting for webhook to fire

**Evidence:**
```typescript
// Lines 445-466: Checks subscription on return from payment
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  // ...
  if (effectiveRole !== 'client' && step === 5 && (sessionId || success || paymentSuccess)) {
    // User returned from Stripe checkout
    checkSubscription().then(() => {
      if (subscribed) {
        handleCompleteOnboarding();
      }
    });
  }
}, [effectiveRole, step, checkSubscription, subscribed]);
```

**Impact:**
- User pays but can't complete onboarding
- Long waits for webhook (can be 10-30 seconds)
- Potential duplicate subscription attempts

**Recommendation:**
- Add manual "verify payment" button
- Show pending payment state clearly
- Add retry mechanism with exponential backoff
- Consider optimistic completion with rollback if webhook fails

---

## 2. PAYMENT FLOW AUDIT

### Issue #4: Subscription vs Stripe Connect Status Mismatch

**Location:** Multiple files (SubscriptionContext, Onboarding, Edge Functions)

**Problem:**
- User can have subscription without Stripe Connect
- User can have Stripe Connect without subscription
- No validation that both are complete before dashboard access

**Evidence:**
- `SubscriptionContext.tsx` only checks subscription, not Connect
- `Onboarding.tsx` validates both but only blocks step progression
- No post-onboarding verification

**Impact:**
- Practitioners can access dashboard with incomplete payment setup
- Can't receive payments even though they have subscription
- Poor user experience when payments fail

**Recommendation:**
- Add pre-dashboard check for both subscription AND Stripe Connect
- Show clear blockers in UI
- Prevent dashboard access until both complete

---

### Issue #5: Edge Function Request Body Consumption

**Location:** `stripe-payment/index.ts` (FIXED in v47)

**Problem:**
- Was calling `req.json()` multiple times
- "Body already consumed" error
- 500 Internal Server Error

**Evidence:**
- Fixed in version 47 by passing parsed body to handlers
- Still being tested

**Impact:**
- Practitioners couldn't set up payments
- Complete onboarding blocker
- CRITICAL issue (now resolved)

---

## 3. ROLE-BASED ACCESS INCONSISTENCIES

### Issue #6: Client vs Practitioner Navigation Logic

**Location:** `dashboard-routing.ts` and `AuthRouter.tsx`

**Problem:**
- Multiple places determine dashboard routes
- Inconsistent logic for determining "effective role"
- localStorage fallback logic differs between files

**Evidence:**
```typescript
// dashboard-routing.ts line 45
const effectiveRole = userProfile.user_role || (isRecentRoleSelection ? localStorageRole : null);

// Onboarding.tsx line 86
const effectiveRole = userProfile?.user_role || roleFromUrl || (isRecentRoleSelection ? localStorageRole : null);
```

**Impact:**
- Users redirected to wrong dashboard
- Role detection fails in edge cases
- Inconsistent user experience

**Recommendation:**
- Centralize "effective role" calculation in one utility
- Use that utility everywhere
- Remove duplicate logic

---

### Issue #7: Onboarding Completion Checks

**Location:** Multiple files check `onboarding_status` and `profile_completed`

**Problem:**
- Different files check different combinations
- Some check `onboarding_status === 'completed'`
- Some check `profile_completed === true`
- Some check both

**Evidence:**
```typescript
// dashboard-routing.ts line 85
if (userProfile.onboarding_status === 'completed') {
  return false;
}

// RealtimeContext.tsx line 90
const isCompleted = userRow.profile_completed === true && userRow.onboarding_status === 'completed';

// dashboard-routing.ts line 111
if (!userProfile.profile_completed) {
  return true;
}
```

**Impact:**
- Users marked complete in one system but not another
- Access control inconsistencies
- Dashboard redirect loops

**Recommendation:**
- Create single source of truth for "onboarding complete"
- Use helper function consistently everywhere
- Ensure both flags are always set/unset together

---

## 4. STATE MANAGEMENT INCONSISTENCIES

### Issue #8: Multiple Sources of Truth for User Role

**Location:** Throughout codebase

**Problem:**
- Database (`user_role` column)
- localStorage (`selectedRole`)
- URL params (`intendedRole`)
- In-memory state (React context)

**Evidence:**
- `AuthContext.tsx` - Database primary
- `Onboarding.tsx` - Falls back to URL then localStorage
- `dashboard-routing.ts` - Falls back to localStorage with time check
- `RoleSelection.tsx` - Uses localStorage and URL params

**Impact:**
- Role selection can be out of sync
- OAuth users get wrong role
- Hard to debug which source is authoritative

**Recommendation:**
- Database is always source of truth
- Only write to localStorage during role selection
- Clear localStorage after database update
- Add migration to sync existing localStorage roles to database

---

### Issue #9: Subscription Status Caching

**Location:** `SubscriptionContext.tsx`

**Problem:**
- Checks subscription in multiple places
- Caches result but cache can be stale
- No invalidation strategy

**Evidence:**
```typescript
// Line 38-41: Caching logic
const checkSubscription = async (forceRefresh = false) => {
  if (hasCheckedSubscription.current && !forceRefresh) {
    return; // Skip check
  }
```

**Impact:**
- User pays but platform doesn't update for minutes
- Dashboard shows "No subscription" after payment
- Poor user experience

**Recommendation:**
- Add timestamp-based cache expiration
- Invalidate cache on payment webhook
- Add manual refresh button for users
- Show "syncing" state while checking

---

## 5. EDGE CASES

### Issue #10: Session Expiry During Onboarding

**Problem:**
- No handling for session expiry during multi-step onboarding
- User loses progress if session expires

**Evidence:**
- Onboarding.tsx saves progress to database but doesn't check session validity
- If session expires, user may be redirected to login mid-flow

**Impact:**
- Data loss
- User frustration
- Support tickets

**Recommendation:**
- Check session validity before each step
- Gracefully extend session or allow re-auth
- Resume from saved progress after re-auth
- Add session expiry warning

---

### Issue #11: Multiple Browser Tabs During Onboarding

**Problem:**
- No prevention of multiple tabs doing onboarding simultaneously
- Progress saved but UI state out of sync

**Impact:**
- Data inconsistency
- Confusing UX
- Duplicate submissions

**Recommendation:**
- Use BroadcastChannel or localStorage events to sync tabs
- Show warning if another tab is active
- Lock onboarding to single tab

---

### Issue #12: User Has Subscription but No Stripe Connect

**Problem:**
- Practitioner can complete subscription (step 5)
- But skip Stripe Connect (step 4 was supposed to be before it)
- Now they have subscription but can't receive payments

**Evidence:**
- Steps were reordered but edge cases not handled
- No validation that Connect is actually required

**Impact:**
- Practitioner pays but can't use platform
- Support burden
- Refund requests

**Recommendation:**
- Make Connect mandatory BEFORE subscription
- Or allow Connect setup after subscription
- Add clear messaging about requirements
- Block certain actions until Connect is complete

---

## 6. VERIFICATION STATUS GAPS

### Issue #13: Verification Status Not Checked in Some Places

**Location:** Various dashboard routes

**Problem:**
- Practitioners can access features even if not verified
- Some routes check verification, others don't
- No consistent enforcement

**Evidence:**
- `RealtimeContext.tsx` line 103: Adds 'verification' to blockers but doesn't enforce
- Dashboard allows unverified practitioners

**Impact:**
- Unverified practitioners can book sessions
- Marketplace shows unverified practitioners
- Compliance issues

**Recommendation:**
- Add verification check to all practitioner routes
- Block marketplace listing until verified
- Show clear "pending verification" state
- Add admin verification dashboard priority alerts

---

## 7. DATA CONSISTENCY ISSUES

### Issue #14: Onboarding Progress vs User Profile State

**Location:** Multiple tables (`onboarding_progress`, `users`, `subscriptions`)

**Problem:**
- `onboarding_progress` table tracks steps
- `users` table has `onboarding_status` and `profile_completed`
- `subscriptions` table tracks payment
- Three different sources of "onboarding completion"

**Evidence:**
```typescript
// RealtimeContext.tsx line 90
const isCompleted = userRow.profile_completed === true && userRow.onboarding_status === 'completed';
// But also checks onboarding_progress table separately
```

**Impact:**
- Tables can be out of sync
- Progress saved but profile not updated
- Database inconsistencies

**Recommendation:**
- Use single source of truth (likely `users.onboarding_status`)
- Keep `onboarding_progress` as temporary working state only
- Clear `onboarding_progress` after completion
- Add database triggers to sync states

---

## 8. CLIENTS VS PRACTITIONERS ACCESS

### Issue #15: Clients Blocked by Subscription Checks

**Location:** `SubscriptionContext.tsx` (FIXED but important to document)

**Problem:**
- Clients don't need subscriptions
- But subscription check was blocking ALL users
- Code was: `if (not practitioner) then check subscription`
- This caused clients to be blocked

**Evidence:**
- `CLIENT_BLOCKING_FIXES.md` documents this
- Fixed by adding explicit client check first

**Impact:**
- Complete platform blocker for clients (FIXED)
- Shows importance of edge case testing

**Recommendation:**
- Always test edge cases (client, practitioner, admin, null role)
- Add automated tests for each role
- Document expected behavior per role

---

## PRIORITY MATRIX

### Critical (Fix Immediately)
1. Issue #2: Payment setup order dependency
2. Issue #3: Subscription verification timing
3. Issue #14: Data consistency across tables

### High Priority (Fix Soon)
4. Issue #1: Step numbering inconsistency
5. Issue #4: Subscription vs Connect mismatch
6. Issue #6: Dashboard routing inconsistencies
7. Issue #7: Onboarding completion checks

### Medium Priority (Fix When Possible)
8. Issue #8: Multiple sources of truth
9. Issue #9: Subscription caching
10. Issue #10: Session expiry handling
11. Issue #11: Multiple tabs

### Low Priority (Fix Eventually)
12. Issue #12: Subscription before Connect handling
13. Issue #13: Verification status enforcement
14. Issue #15: Client blocking (already fixed)

---

## TEST SCENARIOS TO VALIDATE FIXES

### Scenario 1: New Practitioner Joins
1. Sign up as practitioner
2. Select role (sports therapist, massage therapist, or osteopath)
3. Start onboarding
4. Complete all 7 steps in order
5. Verify: Subscription active, Stripe Connect active, Verification pending
6. Access dashboard

**Expected:** Clean flow with no blockers

### Scenario 2: Practitioner Abandons Mid-Onboarding
1. Start practitioner onboarding
2. Complete steps 1-3
3. Close browser
4. Return next day
5. Resume onboarding

**Expected:** Progress saved, resume from step 4

### Scenario 3: Client vs Practitioner Access
1. Create client account
2. Try to access practitioner dashboard
3. Create practitioner account
4. Try to access client dashboard

**Expected:** Redirected to appropriate dashboard, clear error messages

### Scenario 4: Subscription Expires
1. Practitioner has active subscription
2. Subscription ends
3. Try to access dashboard

**Expected:** Redirected to pricing, can't access dashboard

### Scenario 5: Stripe Webhook Delay
1. Practitioner pays for subscription
2. Webhook hasn't fired yet (<5 seconds)
3. Try to complete onboarding

**Expected:** Pending state with manual verify button

---

## NEXT STEPS

1. **Document each issue in detail** with code references
2. **Create fix tickets** for each issue in priority order
3. **Test scenarios** to reproduce each issue
4. **Implement fixes** one at a time with tests
5. **Re-audit** after fixes complete

---

**End of Audit Report**

