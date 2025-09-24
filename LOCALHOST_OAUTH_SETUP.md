# Google OAuth Setup for Localhost + Vercel

## 🎯 Complete Setup Guide

This guide will help you configure Google OAuth to work on both:
- **Localhost development** (http://localhost:3000)
- **Vercel deployment** (https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app)

## Step 1: Configure Google Cloud Console

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Select your project (or create one if you haven't)

### 1.2 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application** as the application type

### 1.3 Configure Authorized URLs
In the OAuth client configuration, add these URLs:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app/auth/callback
https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback
```

### 1.4 Save and Get Credentials
- Click **Create**
- Copy the **Client ID** and **Client Secret**

## Step 2: Configure Supabase Dashboard

### 2.1 Enable Google Provider
1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/auth/providers
2. Click on **Google** provider
3. Enable the provider
4. Enter your **Client ID** and **Client Secret** from Google Cloud Console

### 2.2 Configure Redirect URLs
1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/auth/url-configuration
2. Set **Site URL** to: `http://localhost:3000`
3. Add these **Additional Redirect URLs**:
```
http://localhost:3000/auth/callback
https://localhost:3000/auth/callback
http://localhost:8080/auth/callback
https://localhost:8080/auth/callback
https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app
https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app/**
https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback
```

## Step 3: Test Localhost Development

### 3.1 Start Your Development Server
```bash
cd peer-care-connect
npm run dev
```

### 3.2 Test Google OAuth
1. Go to http://localhost:3000
2. Navigate to the registration page
3. Click "Continue with Google"
4. Check browser console for debug logs:
   ```
   🔄 Starting Google OAuth...
   OAuth redirect URL: http://localhost:3000/auth/callback
   URL length: [number]
   URL starts with space: false
   ```

### 3.3 Expected Behavior
- ✅ Redirects to Google OAuth consent screen
- ✅ After consent, redirects back to localhost
- ✅ User is authenticated and redirected to dashboard
- ✅ No 500 errors

## Step 4: Test Vercel Deployment

### 4.1 Deploy to Vercel
```bash
# Option 1: Git-based deployment
git add .
git commit -m "Add localhost OAuth support"
git push origin main

# Option 2: Vercel CLI
vercel --prod
```

### 4.2 Test on Vercel
1. Go to your Vercel deployment URL
2. Test the Google OAuth flow
3. Verify it works the same as localhost

## 🔧 Troubleshooting

### Common Issues:

**1. "redirect_uri_mismatch" error:**
- Check that all URLs are added to Google Cloud Console
- Ensure URLs match exactly (including http vs https)

**2. "invalid_client" error:**
- Verify Client ID and Secret are correct in Supabase
- Check that Google provider is enabled

**3. 500 "unexpected_failure" error:**
- This should be fixed with the URL trimming we implemented
- Check Supabase logs for specific errors

**4. OAuth works on localhost but not Vercel:**
- Ensure Vercel URLs are added to both Google Cloud Console and Supabase
- Check that the deployed code includes the latest fixes

### Debug Steps:

1. **Check Browser Console:**
   - Look for the debug logs we added
   - Check for any error messages

2. **Check Supabase Logs:**
   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/logs
   - Look for authentication-related errors

3. **Verify URLs:**
   - Ensure all URLs are properly configured
   - Check for typos or missing protocols

## 📋 Configuration Checklist

### Google Cloud Console:
- [ ] OAuth 2.0 credentials created
- [ ] Client ID and Secret obtained
- [ ] localhost:3000 added to JavaScript origins
- [ ] Vercel URL added to JavaScript origins
- [ ] localhost callback URL added to redirect URIs
- [ ] Vercel callback URL added to redirect URIs
- [ ] Supabase callback URL added to redirect URIs

### Supabase Dashboard:
- [ ] Google provider enabled
- [ ] Client ID and Secret configured
- [ ] Site URL set to localhost:3000
- [ ] All localhost URLs added to redirect URLs
- [ ] All Vercel URLs added to redirect URLs
- [ ] Supabase callback URL added

### Application:
- [ ] URL trimming implemented
- [ ] Debug logging added
- [ ] Error handling enhanced
- [ ] Application builds successfully

## 🎯 Expected Results

After completing all steps:
- ✅ Google OAuth works on localhost:3000
- ✅ Google OAuth works on Vercel deployment
- ✅ No 500 errors on either environment
- ✅ Clean URL handling with proper trimming
- ✅ Comprehensive debug logging

## 🚀 Next Steps

1. **Complete the configuration** following this guide
2. **Test both environments** thoroughly
3. **Deploy your application** to Vercel
4. **Monitor for any issues** and use the debug logs to troubleshoot

This setup will give you a robust Google OAuth implementation that works seamlessly across both development and production environments!
