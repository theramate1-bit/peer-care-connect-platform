# Testing Stripe Account Creation - Debug Guide

## Current Issue
500 error when clicking "Set Up Payment Account" button.

## Enhanced Error Logging
I've added comprehensive error logging that will show:
- Full error object
- Error message
- Error context
- Error data (parsed JSON)
- Error code and type
- Full error response (JSON stringified)

## How to Debug

### Step 1: Check Browser Console
After clicking "Set Up Payment Account", look for these console logs:
```
=== STRIPE CONNECT CREATION ERROR ===
Error object: ...
Error message: ...
Error context: ...
Error data: ...
=== FULL ERROR RESPONSE ===
{ ... }
=== FINAL ERROR MESSAGE ===
Message: ...
Code: ...
Type: ...
```

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Click "Set Up Payment Account"
3. Find the request to `stripe-payment`
4. Click on it → Response tab
5. Copy the full response body

### Step 3: Common Causes

#### A. User Not in `public.users` Table
**Error Message:** `User profile not found. Please complete your profile first.`
**Fix:** Ensure user exists in `public.users` table before creating Connect account

#### B. Missing STRIPE_SECRET_KEY
**Error Message:** `Server configuration error: Missing Stripe key`
**Fix:** Set `STRIPE_SECRET_KEY` in Supabase Edge Functions environment variables

#### C. Stripe API Error
**Possible errors:**
- Accounts v2 API not available
- Custom account creation failing
- Invalid configuration

**Check for:**
- `[CREATE-CONNECT] Accounts v2 failed:`
- `[CREATE-CONNECT] Custom account creation failed:`
- `[CREATE-CONNECT] Both v2 and v1 account creation failed:`

#### D. Database Error
**Possible errors:**
- Foreign key constraint violation
- Duplicate key error
- Connection error

**Check for:**
- `[CREATE-CONNECT] Database error:`

## Next Steps

1. **Try again** - The enhanced logging will show the exact error
2. **Check browser console** - Look for the detailed error logs
3. **Check Network tab** - See the actual HTTP response
4. **Share the error details** - The console logs will show exactly what's failing

## What to Share

When reporting the error, please share:
1. The console logs (especially the "=== FULL ERROR RESPONSE ===" section)
2. The Network tab response body
3. Any error codes or types shown

This will help identify the exact cause of the 500 error.

