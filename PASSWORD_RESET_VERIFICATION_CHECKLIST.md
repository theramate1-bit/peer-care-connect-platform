# Password Reset Flow Verification Checklist

## ✅ Code Implementation Status

All logic tests passed! The code handles:
- ✅ URL fragments with access_token/refresh_token (type=recovery)
- ✅ Query string with code parameter (type=recovery)
- ✅ Homepage redirects with code parameter
- ✅ Direct links to reset-password-confirm
- ✅ Error handling in URL fragments
- ✅ Session validation
- ✅ Multiple token format support

## 🔧 Supabase Configuration Required

### 1. Redirect URLs Configuration

**Go to Supabase Dashboard:**
1. Navigate to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/auth/url-configuration
2. Under "Redirect URLs", ensure these URLs are added:

**For Production:**
```
https://theramate.co.uk/auth/reset-password-confirm
https://theramate.co.uk/**
https://theramate-ffr8yo2uu-theras-projects-6dfd5a34.vercel.app/auth/reset-password-confirm
https://theramate-ffr8yo2uu-theras-projects-6dfd5a34.vercel.app/**
```

**For Local Development:**
```
http://localhost:3000/auth/reset-password-confirm
http://localhost:3000/**
http://localhost:5173/auth/reset-password-confirm
http://localhost:5173/**
```

### 2. Site URL Configuration

**In Supabase Dashboard > Authentication > Settings:**
- **Site URL**: Set to your production domain (e.g., `https://theramate.co.uk`)
- This is the base URL Supabase uses for redirects

### 3. Email Template Configuration

**In Supabase Dashboard > Authentication > Email Templates:**
- Verify the "Reset Password" template includes the redirect URL
- The link should point to: `{{ .SiteURL }}/auth/reset-password-confirm`

## 🧪 Manual Testing Steps

### Test 1: Request Password Reset
1. Go to `/reset-password`
2. Enter a practitioner email (e.g., `admin@pinpointtherapyuk.com`)
3. Click "Send Reset Link"
4. ✅ Verify: Success message appears
5. ✅ Verify: Email is sent (check inbox)

### Test 2: Click Reset Link
1. Open the password reset email
2. Click the reset link
3. ✅ Verify: Redirects to `/auth/reset-password-confirm` (NOT homepage)
4. ✅ Verify: No "Invalid link" error appears
5. ✅ Verify: Password reset form is displayed

### Test 3: Set New Password
1. Enter a new password (min 6 characters)
2. Confirm the password
3. Click "Update Password"
4. ✅ Verify: Success message appears
5. ✅ Verify: Redirects to `/login`

### Test 4: Sign In with New Password
1. Go to `/login`
2. Enter email and new password
3. Click "Sign In"
4. ✅ Verify: Successfully signs in
5. ✅ Verify: Redirects to appropriate dashboard

## 🔍 Debugging Tips

### If Reset Link Doesn't Work:

1. **Check Browser Console:**
   - Look for errors in the console
   - Check network tab for failed requests
   - Verify tokens are being parsed correctly

2. **Check URL Format:**
   - URL fragment: `#access_token=...&refresh_token=...&type=recovery`
   - Query string: `?code=...&type=recovery`
   - Both should work

3. **Check Supabase Logs:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT 
     email,
     recovery_sent_at,
     last_sign_in_at
   FROM auth.users
   WHERE recovery_sent_at IS NOT NULL
   ORDER BY recovery_sent_at DESC
   LIMIT 10;
   ```

4. **Verify Redirect URL:**
   - The redirect URL in `ResetPassword.tsx` must match Supabase allowed URLs
   - Current: `${window.location.origin}/auth/reset-password-confirm`

## 📋 Files Modified

1. ✅ `src/components/auth/UrlFragmentHandler.tsx` - Added recovery type handling
2. ✅ `src/pages/auth/ResetPasswordConfirm.tsx` - Added multiple token format support
3. ✅ `src/components/auth/RouteGuard.tsx` - Added code parameter handling

## 🎯 Expected Behavior

When a user clicks a password reset link:

1. **If URL has fragment tokens:**
   - `UrlFragmentHandler` processes tokens
   - Sets session via `supabase.auth.setSession()`
   - Redirects to `/auth/reset-password-confirm`
   - `ResetPasswordConfirm` detects session and shows form

2. **If URL has code parameter:**
   - `RouteGuard` or `ResetPasswordConfirm` processes code
   - Validates via `supabase.auth.verifyOtp()`
   - Shows password reset form

3. **If URL lands on homepage:**
   - `RouteGuard` detects code parameter
   - Redirects to `/auth/reset-password-confirm` with state
   - `ResetPasswordConfirm` processes the token

## ⚠️ Known Issues Fixed

- ✅ Password reset links redirecting to homepage instead of reset page
- ✅ Tokens in URL fragments not being processed
- ✅ Code parameters not being handled
- ✅ Missing recovery type handling in UrlFragmentHandler

## 🚀 Next Steps

1. **Deploy the changes** to production
2. **Test with real email** from Supabase
3. **Monitor logs** for any errors
4. **Update Supabase redirect URLs** if needed
5. **Inform the practitioner** that the issue is fixed

---

**Last Updated:** January 22, 2026
**Status:** ✅ All code tests passing, ready for production testing
