# 🚀 Vercel Deployment Guide for Theramate

## Prerequisites
- GitHub account
- Vercel account
- Supabase project (already configured)

## Step 1: Push to GitHub

1. Initialize git repository (if not already done):
```bash
git init
git add .
git commit -m "Initial commit - Professional Practitioner Registration"
```

2. Create a new repository on GitHub
3. Push your code:
```bash
git remote add origin https://github.com/yourusername/theramate.git
git push -u origin main
```

## Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect it's a Vite project

## Step 3: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

### Required Variables:
```
VITE_SUPABASE_URL = https://aikqnvltuwwgifuocvto.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac
VITE_APP_ENV = production
```

## Step 4: Update Supabase Configuration

Update your Supabase project settings:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel domain to:
   - Site URL: `https://your-app-name.vercel.app`
   - Redirect URLs: `https://your-app-name.vercel.app/auth/callback`

## Step 5: Deploy

1. Click "Deploy" in Vercel
2. Wait for deployment to complete
3. Your app will be live at: `https://your-app-name.vercel.app`

## Step 6: Test Professional Registration

1. Go to your deployed app
2. Navigate to `/register`
3. Test the professional practitioner registration flow
4. Verify email verification works in production

## Production Features

✅ Professional Practitioner Registration
✅ Email Verification
✅ Onboarding Flow
✅ Role-Based Access Control
✅ Secure Authentication
✅ Database Integration

## Troubleshooting

- If registration fails, check Supabase logs
- If email verification doesn't work, check Supabase email settings
- If redirects fail, verify URL configuration in Supabase

## Next Steps

After successful deployment:
1. Set up custom domain (optional)
2. Configure production email templates
3. Set up monitoring and analytics
4. Configure backup strategies