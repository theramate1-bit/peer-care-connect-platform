# Environment Variables Setup

This guide explains how to configure environment variables for the Peer Care Connect platform.

## Overview

Environment variables are used to configure:

- API keys and secrets
- Database connections
- Third-party service integrations
- Feature flags
- Application settings

## File Structure

```
peer-care-connect/
├── .env.local          # Local development (gitignored)
├── .env.example       # Template for developers
└── env.production.example  # Production template
```

## Required Variables

### Supabase Configuration

```env
# Public (safe for client-side)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Server-only (Edge Functions only)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**Where to get these:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the URL and keys

### Stripe Configuration

```env
# Public (safe for client-side)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_STRIPE_CONNECT_CLIENT_ID=ca_your_client_id_here

# Server-only (Edge Functions only)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Where to get these:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy publishable and secret keys
4. For webhooks: **Developers** → **Webhooks** → Create endpoint

## Optional Variables

### Groq API (AI SOAP Notes)

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

**Where to get:**

1. Sign up at [Groq Console](https://console.groq.com)
2. Navigate to **API Keys**
3. Create a new key

### Resend API (Email)

```env
RESEND_API_KEY=re_your_resend_api_key_here
```

**Where to get:**

1. Sign up at [Resend](https://resend.com)
2. Navigate to **API Keys**
3. Create a new key

## Environment-Specific Configuration

### Development (.env.local)

```env
# Use test mode for Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=your_test_stripe_secret_key_...

# Local development
VITE_APP_DOMAIN=localhost:5173
VITE_ENABLE_DEBUG_LOGGING=true
VITE_STRIPE_LIVE_MODE=false
```

### Production

```env
# Use live mode for Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=your_live_stripe_secret_key_...

# Production domain
VITE_APP_DOMAIN=peercareconnect.com
VITE_ENABLE_DEBUG_LOGGING=false
VITE_STRIPE_LIVE_MODE=true
```

## Security Best Practices

### ✅ DO

- Store secrets in `.env.local` (gitignored)
- Use `.env.example` as a template
- Use `VITE_` prefix for client-safe variables
- Keep server-only secrets out of client code
- Rotate keys regularly
- Use different keys for dev/staging/production

### ❌ DON'T

- Commit `.env` files to git
- Put secrets in code
- Expose server secrets to client
- Share keys in documentation (use placeholders)
- Use production keys in development

## Variable Naming Convention

- **`VITE_*`** - Safe for client-side (bundled with app)
- **No prefix** - Server-only (Edge Functions, API routes)

## Setting Variables in Different Environments

### Local Development

Create `.env.local` file in project root.

### Vercel

1. Go to Project Settings → Environment Variables
2. Add variables for each environment
3. Variables are automatically available

### Supabase Edge Functions

1. Go to Project Settings → Edge Functions → Secrets
2. Add secrets via CLI or Dashboard
3. Access via `Deno.env.get('SECRET_NAME')`

## Verification

After setting up environment variables:

1. **Restart development server:**

   ```bash
   npm run dev
   ```

2. **Check console for errors:**
   - Missing variables will show warnings
   - Invalid keys will cause API errors

3. **Test connections:**
   - Try logging in (tests Supabase)
   - Try a payment flow (tests Stripe)

## Troubleshooting

### Variables Not Loading

- Ensure file is named `.env.local`
- Restart the dev server
- Check variable names match exactly
- Verify `VITE_` prefix for client variables

### "Invalid API Key" Errors

- Verify keys are correct
- Check for extra spaces or quotes
- Ensure using correct environment (test vs live)
- Verify keys haven't been rotated

### Build Errors

- Ensure all required variables are set
- Check variable types (strings vs booleans)
- Verify no syntax errors in `.env.local`

## Example .env.local

```env
# Supabase
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
STRIPE_SECRET_KEY=your_test_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_ABC123...

# App Config
VITE_APP_NAME="Theramate"
VITE_APP_DOMAIN="localhost:5173"
VITE_ENABLE_DEBUG_LOGGING=true
```

## Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/platform/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Stripe API Keys](https://stripe.com/docs/keys)

---

**Last Updated:** 2025-02-09
