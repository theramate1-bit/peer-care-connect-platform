# Edge Function Deployment Status

## Current Status

The `stripe-payment` Edge Function needs to be deployed but Docker Desktop is required for Supabase CLI deployment.

## Deployment Options

### Option 1: Using Supabase CLI (Requires Docker Desktop)

1. **Start Docker Desktop** on your machine
2. **Navigate to project directory**:
   ```powershell
   cd "C:\Users\rayma\Desktop\New folder\peer-care-connect"
   ```
3. **Deploy the function**:
   ```powershell
   supabase functions deploy stripe-payment --no-verify-jwt
   ```

### Option 2: Using Supabase Dashboard (No Docker Required)

1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions
2. Click on `stripe-payment` function
3. Copy the entire content from `peer-care-connect/supabase/functions/stripe-payment/index.ts`
4. Paste into the editor
5. Click "Deploy"

## What Changed

The Edge Function now requires `metadata.client_user_id` directly (no fallbacks):
- **Old Error**: "Could not resolve user_id from Authorization token or metadata.client_id"
- **New Error**: "metadata.client_user_id is required and must be a string"

## Verification After Deployment

After deploying, test a guest booking to verify:
1. The error message matches the new format
2. Payment checkout session is created successfully
3. The booking flow completes without errors

