# Google OAuth Setup Guide

## Why Google Sign-Up Isn't Working

The Google OAuth sign-up is failing because the Google OAuth provider is not configured in your Supabase project. Here's how to fix it:

## Step 1: Configure Google OAuth in Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `tsvzwxvpfflvkkvvaqss`

2. **Navigate to Authentication Settings**
   - Go to Authentication → Providers
   - Find "Google" in the list of providers

3. **Enable Google Provider**
   - Toggle "Enable Google provider" to ON
   - You'll need to provide Google OAuth credentials

## Step 2: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to APIs & Services → Library
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"

4. **Configure Authorized Redirect URIs**
   Add these URIs:
   ```
   http://localhost:3000/auth/callback
   https://localhost:3000/auth/callback
   http://localhost:8080/auth/callback
   https://localhost:8080/auth/callback
   ```

5. **Get Your Credentials**
   - Copy the Client ID and Client Secret
   - You'll need these for Supabase

## Step 3: Configure Supabase with Google Credentials

1. **In Supabase Dashboard**
   - Go to Authentication → Providers
   - Click on Google provider

2. **Enter Google Credentials**
   - Client ID: [Your Google Client ID]
   - Client Secret: [Your Google Client Secret]

3. **Save Configuration**
   - Click "Save" to apply the changes

## Step 4: Test the OAuth Flow

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Test Google Sign-Up**
   - Go to the registration page
   - Click "Continue with Google"
   - You should be redirected to Google's OAuth consent screen

3. **Complete the Flow**
   - Sign in with your Google account
   - Grant permissions
   - You should be redirected back to your app

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI" error**
   - Make sure the redirect URI in Google Console matches exactly
   - Check that the URI includes `/auth/callback`

2. **"Client ID not found" error**
   - Verify the Client ID is correct in Supabase
   - Make sure the Google project is active

3. **"Access denied" error**
   - Check that the Google+ API is enabled
   - Verify the OAuth consent screen is configured

4. **"Redirect URI mismatch" error**
   - Update the redirect URIs in Google Console
   - Restart your Supabase local instance

### Debug Steps:

1. **Check Console Logs**
   - Open browser dev tools
   - Look for OAuth-related errors in console

2. **Verify Supabase Configuration**
   - Check that Google provider is enabled
   - Verify redirect URLs are configured

3. **Test with Different Browsers**
   - Try incognito/private mode
   - Clear browser cache and cookies

## Alternative: Use Email Registration

If Google OAuth continues to have issues, users can still register using email and password. The email registration flow is fully functional and includes:

- Email verification
- Role selection (Client/Professional)
- Profile creation
- Dashboard access

## Production Deployment

When deploying to production:

1. **Update Redirect URIs**
   - Add your production domain to Google Console
   - Update Supabase redirect URLs

2. **Configure OAuth Consent Screen**
   - Add your production domain
   - Complete the verification process

3. **Test Production OAuth**
   - Verify OAuth works on production domain
   - Test with different user accounts

## Security Notes

- Keep your Google Client Secret secure
- Never commit credentials to version control
- Use environment variables for production
- Regularly rotate your OAuth credentials
