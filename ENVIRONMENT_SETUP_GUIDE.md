# Environment Variables Setup Guide

## 🚨 CRITICAL: Edge Functions are currently failing due to missing environment variables

### Current Status

- ✅ Supabase URL: `https://aikqnvltuwwgifuocvto.supabase.co`
- ✅ Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- ❌ **STRIPE_SECRET_KEY**: Missing
- ❌ **SUPABASE_SERVICE_ROLE_KEY**: Missing

## 🔑 Required Keys

### 1. Supabase Service Role Key

**Location**: [https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/api](https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/api)

**Steps**:

1. Go to Supabase Dashboard
2. Select your project "theramate1@gmail.com's Project"
3. Navigate to **Settings** → **API**
4. Copy the **service_role** key (starts with `eyJ...`)

### 2. Stripe Secret Key

**Location**: [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

**Steps**:

1. Go to Stripe Dashboard
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_...` for test mode)

## ⚙️ Setting Environment Variables

### Option A: Supabase Dashboard (Recommended)

1. Go to [https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/functions](https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/functions)
2. Add these environment variables:
   - **Key**: `STRIPE_SECRET_KEY` | **Value**: `sk_test_your_key_here`
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY` | **Value**: `eyJ_your_service_role_key_here`

### Option B: Local .env File

Update your `.env` file with the actual values:

```bash
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJ_your_actual_service_role_key_here
```

## 🧪 Testing

### Before Setup

```bash
node ../test-scripts/test-edge-functions-with-keys.js
```

**Expected**: 500 errors with authentication issues

### After Setup

```bash
node ../test-scripts/test-edge-functions-with-keys.js
```

**Expected**: 401 errors (which means functions are working correctly!)

## 🚀 Deployment

After setting environment variables:

```bash
./deploy-edge-functions-final.ps1
```

## 📊 Current Edge Function Status

| Function           | Status | Issue                         |
| ------------------ | ------ | ----------------------------- |
| check-subscription | ❌ 500 | Missing environment variables |
| create-checkout    | ❌ 500 | Missing environment variables |
| customer-portal    | ❌ 500 | Missing environment variables |

## 🎯 Next Steps

1. **Get the keys** from Supabase and Stripe dashboards
2. **Set environment variables** in Supabase Dashboard
3. **Test Edge Functions** with the test script
4. **Deploy updated functions** using the PowerShell script
5. **Test OAuth flow** in production

## 🔍 Troubleshooting

### If you still get 500 errors after setting keys:

- Check that keys are copied correctly (no extra spaces)
- Verify keys are set in Supabase Dashboard
- Redeploy Edge Functions after setting variables

### If you get 401 errors:

- **This is GOOD!** It means your functions are working
- 401 means "authentication required" which is correct behavior
- Test with a real authenticated user session
