# Supabase Email Verification Production Setup

## Overview
This guide follows Supabase's official recommendations for setting up email verification in production, ensuring proper security and user experience.

## Required Supabase Configuration

### 1. Enable Email Confirmations
In your Supabase Dashboard:

1. **Navigate to Authentication > Settings**
2. **Enable "Confirm email"** - This requires users to verify their email addresses before they can sign in
3. **Set confirmation URL** to: `https://your-domain.com/auth/verify-email`

### 2. Configure SMTP Settings (Recommended)
For better deliverability and trust, set up custom SMTP:

1. **Go to Authentication > Settings**
2. **Under "SMTP" section**, configure:
   - **SMTP Host**: Your SMTP server address (e.g., `smtp.gmail.com`)
   - **SMTP Port**: `587` (for TLS) or `465` (for SSL)
   - **SMTP User**: Your SMTP username
   - **SMTP Password**: Your SMTP password
   - **Sender Email**: The email address verification emails will be sent from

### 3. Set Redirect URLs
Configure proper redirect URLs:

1. **In Authentication > Settings**
2. **Under "Redirect URLs"**, add:
   - `https://your-domain.com/auth/verify-email` (for email verification)
   - `https://your-domain.com/auth/callback` (for OAuth callbacks)

### 4. Customize Email Templates
Brand your verification emails:

1. **Go to Authentication > Templates**
2. **Modify the confirmation email template**:
   - Update subject line
   - Customize email content
   - Add your branding
   - Include clear instructions

### 5. Enable CAPTCHA Protection (Recommended)
Prevent automated abuse:

1. **In Authentication > Settings**
2. **Enable CAPTCHA** for:
   - Sign up
   - Sign in
   - Password reset

## Environment Variables Required

Ensure these are set in your production environment:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Email Verification Flow

### 1. User Registration
- User fills out registration form
- System calls `supabase.auth.signUp()` with `emailRedirectTo: '/auth/verify-email'`
- Supabase sends verification email

### 2. Email Verification
- User clicks link in email
- Redirected to `/auth/verify-email?token=...&type=signup`
- System calls `supabase.auth.verifyOtp()` to verify token
- On success, user is redirected to `/auth/callback`

### 3. Profile Creation
- AuthCallback component creates user profile
- User is redirected to onboarding or dashboard

## Security Considerations

### 1. Row Level Security (RLS)
Ensure RLS is enabled on all user tables:

```sql
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);
```

### 2. Email Verification Enforcement
- Never bypass email verification in production
- Always validate email confirmation status
- Implement proper error handling for verification failures

### 3. Rate Limiting
- Implement rate limiting for email resend requests
- Monitor for suspicious signup patterns
- Use CAPTCHA to prevent automated abuse

## Testing Checklist

Before going live, test:

- [ ] Email verification emails are sent
- [ ] Verification links work correctly
- [ ] Expired links are handled properly
- [ ] Resend functionality works
- [ ] Error states are handled gracefully
- [ ] Users can't bypass verification
- [ ] OAuth users complete verification flow

## Troubleshooting

### Common Issues

1. **Emails not being sent**
   - Check SMTP configuration
   - Verify sender email is valid
   - Check spam folder

2. **Verification links not working**
   - Ensure redirect URLs are configured correctly
   - Check token expiration settings
   - Verify URL encoding

3. **Users bypassing verification**
   - Ensure "Confirm email" is enabled in Supabase
   - Remove any development bypasses
   - Check authentication flow

### Debug Steps

1. Check Supabase logs for authentication events
2. Verify email delivery in SMTP logs
3. Test verification flow end-to-end
4. Monitor user registration patterns

## Production Deployment

### 1. Update Environment Variables
Set production Supabase credentials in your deployment platform.

### 2. Configure Domain
Update all redirect URLs to use your production domain.

### 3. Test Email Delivery
Send test verification emails to ensure they're delivered.

### 4. Monitor
Set up monitoring for:
- Email delivery rates
- Verification success rates
- Authentication errors
- User registration patterns

## Best Practices

1. **Always require email verification** in production
2. **Use custom SMTP** for better deliverability
3. **Implement proper error handling** for all verification states
4. **Monitor email delivery** and verification rates
5. **Provide clear user feedback** throughout the process
6. **Test thoroughly** before going live
7. **Have fallback mechanisms** for email delivery issues

## Support

For Supabase-specific issues:
- Check [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- Review [Email Configuration Guide](https://supabase.com/docs/guides/auth/auth-smtp)
- Contact Supabase support for SMTP issues


