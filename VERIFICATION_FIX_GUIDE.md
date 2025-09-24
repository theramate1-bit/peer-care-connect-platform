# Email Verification Fix Guide

## Problem
Users getting "Verification Link Expired" error when trying to sign up as practitioners.

## Root Causes
1. **Email verification links expiring too quickly** - Default Supabase setting is 24 hours
2. **Incorrect redirect URL configuration** - Links pointing to wrong endpoints
3. **Missing email template configuration** - Using default templates that may not work properly
4. **Poor error handling** - Users not getting clear instructions on what to do

## Solutions Implemented

### 1. Enhanced Email Verification Component
- **File**: `src/pages/auth/EmailVerification.tsx`
- **Improvements**:
  - Better error handling for expired/invalid tokens
  - Support for both `token` and `token_hash` parameters
  - Email input field for resending verification
  - Clear status messages and user guidance
  - Automatic redirect to login after successful verification

### 2. Improved Registration Flow
- **File**: `src/pages/auth/Register.tsx`
- **Improvements**:
  - Pass user role to verification page
  - Better error messages and recovery suggestions
  - Proper navigation to verification page

### 3. Enhanced Auth Callback
- **File**: `src/components/auth/AuthCallback.tsx`
- **Improvements**:
  - Check email verification status before proceeding
  - Redirect unverified users to verification page
  - Better error handling and user guidance

### 4. Better Redirect URL Configuration
- **Updated**: All verification emails now redirect to `/auth/callback`
- **Reason**: This endpoint properly handles both verification and OAuth flows

## Testing the Fix

### 1. Test Registration Flow
1. Go to `/register`
2. Select "Professional" and choose a role
3. Fill in registration form
4. Submit registration
5. Check email for verification link
6. Click verification link
7. Should redirect to login page

### 2. Test Verification Page
1. Go to `/auth/verify-email`
2. Enter email address
3. Click "Resend Verification Email"
4. Check email for new verification link
5. Click new verification link

### 3. Test Expired Link Handling
1. Try to use an old verification link
2. Should show "Verification Link Expired" message
3. Should provide option to resend verification email

## Supabase Configuration

### Required Settings
1. **Site URL**: Set to your production domain
2. **Redirect URLs**: Add your verification callback URL
3. **Email Templates**: Use custom templates with proper redirect URLs

### Email Template Configuration
Update your Supabase email templates to use:
```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">
  Verify Email
</a>
```

### Rate Limiting
- **Magic Link**: 1 per 60 seconds
- **Email OTP**: 1 per 60 seconds
- **Password Reset**: 1 per 60 seconds

## Troubleshooting

### Common Issues
1. **"Verification Link Expired"**
   - Solution: Use the resend verification feature
   - Check if email is in spam folder

2. **"Invalid Token"**
   - Solution: Request a new verification email
   - Check if the link was clicked multiple times

3. **Email Not Received**
   - Check spam/junk folder
   - Verify email address is correct
   - Check Supabase email sending limits

### Debug Steps
1. Check browser console for errors
2. Check Supabase logs for email sending issues
3. Verify redirect URLs are configured correctly
4. Test with different email providers

## Additional Improvements

### Future Enhancements
1. **Email Template Customization**: Create branded email templates
2. **SMS Verification**: Add phone number verification as backup
3. **Magic Link**: Implement magic link login as alternative
4. **Rate Limiting**: Implement custom rate limiting for verification requests

### Monitoring
1. Track verification success rates
2. Monitor email delivery rates
3. Log verification failures for debugging
4. Set up alerts for high failure rates

## Files Modified
- `src/pages/auth/EmailVerification.tsx` - Enhanced verification handling
- `src/pages/auth/Register.tsx` - Improved registration flow
- `src/components/auth/AuthCallback.tsx` - Better callback handling
- `src/components/AppContent.tsx` - Added verification route

## Testing Checklist
- [ ] Registration flow works for all user types
- [ ] Verification emails are sent successfully
- [ ] Verification links work correctly
- [ ] Expired links show proper error messages
- [ ] Resend verification works
- [ ] Users can complete onboarding after verification
- [ ] Error handling works for all edge cases
