# Google OAuth 500 Error Fix

## 🔍 Root Cause Identified

The 500 error with `unexpected_failure` is caused by **leading spaces in the referer URL**:

```
"   https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app"
```

Notice the **3 spaces** before the URL, which causes:
- `"site url is improperly formatted"`
- `"first path segment in URL cannot contain colon"`

## 🚨 The Problem

Your Vercel deployment URL has leading spaces, which breaks Supabase's URI parsing. This happens when:
1. The URL is constructed with leading whitespace
2. The referer header contains spaces
3. The redirect URL has formatting issues

## ✅ Solutions

### Solution 1: Fix URL Construction (Immediate Fix)

Update your OAuth redirect URL construction to ensure no leading spaces:

```javascript
// In Register.tsx - ensure clean URL construction
const redirectUrl = `${window.location.origin}/auth/callback`.trim();
```

### Solution 2: Add Vercel URL to Supabase (Recommended)

Add your Vercel deployment URL to Supabase redirect URLs:

1. **Go to Supabase Dashboard** → Authentication → URL Configuration
2. **Add these URLs**:
   - `https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app`
   - `https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app/**`

### Solution 3: Fix Vercel Deployment (Long-term)

The leading spaces suggest an issue with your Vercel deployment configuration. Check:
1. **Environment variables** in Vercel dashboard
2. **Build configuration** for any URL formatting issues
3. **Deployment settings** for proper URL handling

## 🔧 Immediate Fix Implementation

Let me update your code to handle this issue:

1. **Trim all URLs** to remove leading/trailing spaces
2. **Add proper error handling** for malformed URLs
3. **Add Vercel URL** to Supabase configuration

## 📋 Next Steps

1. **Apply the code fixes** (I'll do this now)
2. **Add Vercel URL to Supabase** (you need to do this)
3. **Test the OAuth flow** again
4. **Check Vercel deployment** for URL formatting issues

## 🎯 Expected Result

After applying these fixes:
- ✅ No more 500 errors
- ✅ Google OAuth works properly
- ✅ Clean URL handling
- ✅ Proper error messages if issues occur
