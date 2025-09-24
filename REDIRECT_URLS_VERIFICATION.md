# Redirect URLs Verification Guide

## Current Configuration Status ✅

### Supabase Configuration (Updated)
Your Supabase project now includes these redirect URLs:
- `http://localhost:3000/**` (wildcard for all localhost:3000 paths)
- `https://localhost:3000/**` (wildcard for HTTPS localhost:3000 paths)
- `http://localhost:8080/**` (wildcard for all localhost:8080 paths)
- `https://localhost:8080/**` (wildcard for HTTPS localhost:8080 paths)
- `https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback` (Supabase callback)
- Specific callback URLs for both ports

### Google Cloud Console Configuration (You've Done This ✅)
- `https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback`

## Additional Redirects You Might Need

### 1. For Development (If using different ports)
If your dev server runs on a different port, add:
- `http://localhost:[PORT]/**` (replace [PORT] with actual port)
- `https://localhost:[PORT]/**`

### 2. For Production (When you deploy)
When you deploy to production, you'll need to add:
- `https://yourdomain.com/**`
- `https://yourdomain.com/auth/callback`

### 3. For Preview Deployments (If using Vercel/Netlify)
If you're using Vercel or Netlify for preview deployments:
- **Vercel**: `https://*-yourteam.vercel.app/**`
- **Netlify**: `https://**--yourapp.netlify.app/**`

## Current Status Check

### ✅ What's Already Configured:
1. **Supabase**: All necessary redirect URLs added
2. **Google Cloud Console**: Supabase callback URL added
3. **Wildcard patterns**: Added for flexibility
4. **Multiple ports**: Support for both 3000 and 8080

### 🔍 What to Test:
1. **Start your dev server**: `npm run dev`
2. **Check what port it runs on** (usually 3000 or 8080)
3. **Test Google OAuth**: Click "Continue with Google"
4. **Verify redirect works**: Should redirect back to your app

## Expected Behavior

When you click "Continue with Google":
1. **Redirect to Google**: You'll be taken to Google's OAuth consent screen
2. **Grant permissions**: You'll see what the app wants to access
3. **Redirect back**: Google will redirect to `https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback`
4. **Supabase processes**: Supabase handles the OAuth response
5. **Redirect to your app**: Supabase redirects to your app (e.g., `http://localhost:3000/dashboard`)

## Troubleshooting

### If OAuth still doesn't work:
1. **Check browser console** for specific error messages
2. **Verify the port** your dev server is running on
3. **Clear browser cache** and try again
4. **Test in incognito mode** to avoid cached OAuth state

### Common Error Messages:
- `redirect_uri_mismatch`: Check Google Cloud Console redirect URIs
- `invalid_request`: Check Supabase redirect URL configuration
- `access_denied`: User denied permission (try again)

## Next Steps

1. **Test the OAuth flow** with your current setup
2. **If it works**: You're all set! 🎉
3. **If it doesn't work**: Check the troubleshooting section above
4. **When you deploy**: Add your production domain to both Supabase and Google Cloud Console

## Summary

You should be good to go with the current configuration! The wildcard patterns (`/**`) ensure that all paths under your localhost URLs are allowed, which should cover any redirect scenarios during development.
