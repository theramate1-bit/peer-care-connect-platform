# Deploy send-email Edge Function - URGENT

## Status
✅ Local code is up-to-date with all email types
❌ Deployed version is out-of-sync (missing email types)
⚠️ Docker Desktop is not running (required for CLI deployment)

## Quick Deployment Options

### Option 1: Supabase Dashboard (Recommended - No Docker Required)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions/send-email

2. **Open the Function Editor:**
   - Click "Edit" or "Deploy" button

3. **Copy Local File Content:**
   - Open: `peer-care-connect/supabase/functions/send-email/index.ts`
   - Select all (Ctrl+A) and copy (Ctrl+C)

4. **Paste into Dashboard:**
   - Paste the entire content into the editor
   - Click "Deploy" button

5. **Verify Deployment:**
   - Wait for deployment to complete
   - Check that status shows "Active"

### Option 2: Start Docker Desktop and Use CLI

1. **Install/Start Docker Desktop:**
   - Download: https://docs.docker.com/desktop
   - Start Docker Desktop
   - Wait for it to fully start (whale icon in system tray)

2. **Deploy via CLI:**
   ```powershell
   cd "C:\Users\rayma\Desktop\New folder\peer-care-connect"
   supabase functions deploy send-email --project-ref aikqnvltuwwgifuocvto
   ```

## After Deployment

Run the test script to verify all email types work:

```powershell
cd "C:\Users\rayma\Desktop\New folder"
node test-email-system-comprehensive.js
```

## What This Fixes

The deployed Edge Function currently only recognizes these email types:
- ✅ `payment_received_practitioner` (working)

After deployment, ALL email types will work:
- ✅ `booking_confirmation_client`
- ✅ `booking_confirmation_practitioner`
- ✅ `payment_confirmation_client`
- ✅ `payment_received_practitioner`
- ✅ `session_reminder_24h`
- ✅ `session_reminder_2h`
- ✅ `session_reminder_1h`
- ✅ `cancellation`
- ✅ `practitioner_cancellation`
- ✅ `rescheduling`
- ✅ All peer treatment email types
- ✅ Review and messaging email types

## Current Issue

The local code has all email types defined (lines 296-1672), but the deployed version is missing them. This is why test scripts are getting "Unknown email type" errors.

