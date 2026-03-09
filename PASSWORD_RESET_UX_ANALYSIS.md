# Password Reset UX Flow Analysis

## Account Status Verification

**User:** admin@pinpointtherapyuk.com
- **User ID:** 8bd6c8dd-e096-4f4a-9168-d2113e964bad
- **Role:** sports_therapist
- **Onboarding Status:** `in_progress` ⚠️ (NOT completed)
- **Profile Completed:** `false`
- **First Name:** Empty
- **Last Name:** Empty
- **Last Sign In:** 2026-01-22 20:03:54 UTC
- **Password Reset Requested:** 2026-01-22 20:03:45 UTC

**Note:** The user stated they "already completed onboarding" but the database shows `onboarding_status: 'in_progress'` and `profile_completed: false`. This is the root cause of the redirect issue.

---

## Current UX Flow (After Fix)

### Step 1: User Clicks Password Reset Link
- URL: `https://theramate.co.uk/auth/reset-password-confirm#access_token=...&refresh_token=...&type=recovery`
- **UrlFragmentHandler** processes tokens
- Sets session via `supabase.auth.setSession()`
- User becomes authenticated
- Redirects to `/auth/reset-password-confirm`

### Step 2: Reset Password Page Loads
- **RouteGuard** runs:
  - User is authenticated ✅
  - `shouldRedirectToOnboarding(userProfile)` returns `true` (onboarding_status = 'in_progress')
  - **BUT** `currentPath === '/auth/reset-password-confirm'` ✅
  - **Exception applies:** No redirect to onboarding
- **ResetPasswordConfirm** component:
  - Checks for existing session ✅
  - Finds valid session (set by UrlFragmentHandler)
  - Sets `isValidToken = true`
  - Shows password reset form ✅

### Step 3: User Completes Password Reset
- User enters new password
- Calls `supabase.auth.updateUser({ password })`
- Password updated successfully ✅
- **Navigates to `/login`** (line 167)

### Step 4: After Password Reset - Login Page
- User lands on `/login`
- **RouteGuard** runs:
  - User is still authenticated (session persists)
  - `shouldRedirectToOnboarding(userProfile)` returns `true`
  - `currentPath === '/login'` (NOT `/auth/reset-password-confirm`)
  - **Redirects to `/onboarding`** ⚠️

---

## UX Issues Identified

### Issue 1: Unnecessary Redirect After Password Reset
**Problem:** After successfully resetting password, user is sent to `/login` but immediately redirected to `/onboarding` because:
- Session is still active from password reset
- User needs onboarding (status = 'in_progress')
- Login page doesn't exempt onboarding redirect

**Impact:** User never sees the login page or success message. They're immediately redirected to onboarding, which may be confusing.

### Issue 2: Session Persistence
**Problem:** The session created during password reset persists after password update, so user is already "logged in" when they reach `/login`.

**Options:**
1. Sign out user after password reset (clear session)
2. Redirect directly to onboarding/dashboard instead of login
3. Exempt `/login` from onboarding redirect (but this might cause other issues)

---

## Recommended Solutions

### Option A: Sign Out After Password Reset (Recommended)
**Change:** After successful password reset, sign out the user so they must sign in with new password.

```typescript
// In ResetPasswordConfirm.tsx, after password update:
const { error } = await supabase.auth.updateUser({ password });
if (!error) {
  await supabase.auth.signOut(); // Clear session
  toast.success('Password updated successfully! Please sign in with your new password.');
  navigate('/login');
}
```

**Pros:**
- User must sign in with new password (security best practice)
- Clean state - no lingering session
- User sees login page and success message

**Cons:**
- Extra step for user (but this is expected after password reset)

### Option B: Redirect to Dashboard/Onboarding Directly
**Change:** After successful password reset, redirect based on user status instead of always going to login.

```typescript
// In ResetPasswordConfirm.tsx, after password update:
const { error } = await supabase.auth.updateUser({ password });
if (!error) {
  toast.success('Password updated successfully!');
  // Check if user needs onboarding
  const { data: userProfile } = await supabase
    .from('users')
    .select('onboarding_status, profile_completed')
    .eq('id', user.id)
    .single();
  
  if (shouldRedirectToOnboarding(userProfile)) {
    navigate('/onboarding');
  } else {
    navigate('/dashboard'); // or appropriate dashboard
  }
}
```

**Pros:**
- Smoother flow - no unnecessary redirects
- User goes directly where they need to be

**Cons:**
- User doesn't explicitly sign in with new password
- Might be confusing if they expected to sign in

### Option C: Exempt Login Page from Onboarding Redirect
**Change:** Allow users to see login page even if they need onboarding.

```typescript
// In RouteGuard.tsx:
if (shouldRedirectToOnboarding(userProfile) && 
    currentPath !== '/auth/reset-password-confirm' && 
    currentPath !== '/login') {
  navigate('/onboarding', { replace: true });
}
```

**Pros:**
- User can see login page
- Simple change

**Cons:**
- If user is already authenticated, why show login page?
- Might cause confusion

---

## Recommended Implementation: Option A

**Why:** Security best practice - after password reset, user should explicitly sign in with new password. This ensures:
1. User verifies they can sign in with new password
2. Clean session state
3. Clear UX flow

**Implementation:**
1. Sign out user after password update
2. Show success message
3. Redirect to login
4. User signs in with new password
5. After sign in, RouteGuard will redirect to onboarding if needed

---

## Testing Checklist

- [ ] User can complete password reset without being redirected
- [ ] After password reset, user is signed out
- [ ] User can sign in with new password
- [ ] After sign in, user is redirected to onboarding (if needed)
- [ ] Success messages are clear and visible
- [ ] No redirect loops occur

---

## Current Status

✅ **Fixed:** Password reset page no longer redirects to onboarding
⚠️ **Needs Fix:** Post-reset flow (redirect to login while authenticated)
