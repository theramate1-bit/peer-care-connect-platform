# Google OAuth Troubleshooting Guide

## Your Supabase Project
- **Project URL**: `https://aikqnvltuwwgifuocvto.supabase.co`
- **Auth Callback**: `https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback`

## Common Issues & Solutions

### 1. ✅ Redirect URI Mismatch (Most Common)
**Problem**: Google OAuth fails with "redirect_uri_mismatch" error

**Solution**: 
- In Google Cloud Console, add these redirect URIs:
  ```
  https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback
  http://localhost:3000/auth/callback
  http://localhost:8080/auth/callback
  ```

### 2. ✅ Missing Email Scopes
**Problem**: Google OAuth works but can't access user email

**Solution**: Added proper scopes in the OAuth request:
```javascript
scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
```

### 3. ✅ Google Workspace Account Issues
**Problem**: Some Google Workspace accounts require explicit email scope requests

**Solution**: The scopes above should handle this automatically

## Step-by-Step Verification

### Step 1: Verify Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to APIs & Services → Credentials
4. Click on your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs", ensure you have:
   ```
   https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback
   ```

### Step 2: Verify Supabase Configuration
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `tsvzwxvpfflvkkvvaqss`
3. Go to Authentication → Providers
4. Click on Google provider
5. Verify:
   - ✅ Google provider is enabled
   - ✅ Client ID is correct
   - ✅ Client Secret is correct

### Step 3: Test the OAuth Flow
1. Start your development server: `npm run dev`
2. Go to registration page
3. Click "Continue with Google"
4. Check browser console for any errors
5. Complete the Google OAuth flow

## Debug Information

### Console Logs to Check
When you click "Continue with Google", look for these logs:
```
🔄 Starting Google OAuth...
OAuth redirect URL: http://localhost:3000/auth/callback
Current origin: http://localhost:3000
✅ Google OAuth initiated successfully
```

### Common Error Messages
- `redirect_uri_mismatch`: Check Google Cloud Console redirect URIs
- `invalid_client`: Check Client ID in Supabase
- `unauthorized_client`: Check Client Secret in Supabase
- `access_denied`: User denied permission or scope issues

## Testing Checklist

- [ ] Google OAuth provider enabled in Supabase
- [ ] Correct Client ID and Secret in Supabase
- [ ] Redirect URI added to Google Cloud Console
- [ ] Proper scopes requested in OAuth call
- [ ] No console errors during OAuth initiation
- [ ] User can complete Google OAuth flow
- [ ] User profile created after OAuth success

## If Still Not Working

1. **Check Browser Console**: Look for specific error messages
2. **Test in Incognito Mode**: Clear any cached OAuth state
3. **Verify Google Account**: Test with different Google accounts
4. **Check Supabase Logs**: Go to Supabase Dashboard → Logs → Auth
5. **Contact Support**: If all else fails, contact Supabase support

## Quick Fix Commands

If you need to restart Supabase:
```bash
npx supabase stop
npx supabase start
```

If you need to clear browser cache:
- Press F12 → Application → Storage → Clear All
- Or use incognito/private mode
