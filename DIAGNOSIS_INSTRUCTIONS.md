# Diagnose Admin Account Issues

## Problem
- User `admin@pinpointtherapyuk.com` logged back in
- All details entered during onboarding are gone
- Subscription shows as not active

## Diagnosis Steps

### Step 1: Run Diagnostic Query

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/tyogjftepxsicdeqvxoc
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `diagnose-admin-account.sql`
4. Click **Run**
5. Review all the results to see what data exists

### Step 2: Analyze Results

Look for:

1. **USER PROFILE**: 
   - Are `phone`, `location`, `bio` filled in?
   - Is `onboarding_status = 'in_progress'` or `'pending'`?
   - When was `updated_at`?

2. **SUBSCRIPTION**:
   - Does a subscription exist?
   - What is the `status`? (should be 'active' or 'trialing')
   - Is there a `stripe_subscription_id`?

3. **CREDITS**:
   - Does the user have a credits record?
   - What is the `balance`?

4. **STRIPE CONNECT**:
   - Does a Stripe Connect account exist?
   - Are `charges_enabled` and `payouts_enabled` true?

5. **ONBOARDING PROGRESS**:
   - Is there saved progress?
   - What's in `form_data`? (this might contain the lost data)

## Possible Scenarios

### Scenario A: Data was never saved
- `onboarding_progress` table has the data but it wasn't transferred to `users` table
- **Fix**: Extract data from `onboarding_progress.form_data` and manually update `users` table

### Scenario B: Subscription payment failed
- No subscription record OR status is not 'active'
- **Fix**: User needs to complete subscription payment

### Scenario C: Data was saved but something reset it
- `updated_at` timestamp shows recent change
- Fields are NULL or empty
- **Fix**: Need to investigate what cleared the data

## Next Steps

After running the diagnostic:

1. **Share the results** - Copy all output and send it
2. **I'll analyze** what went wrong and provide specific fix
3. **We'll restore** the missing data if it exists in `onboarding_progress`
4. **We'll fix** the subscription issue if payment didn't complete

## Quick Checks

If you want to do quick checks without the full diagnostic:

```sql
-- Just check if data exists
SELECT phone, location, bio, onboarding_status, profile_completed
FROM public.users
WHERE email = 'admin@pinpointtherapyuk.com';

-- Check subscription
SELECT status, plan_id, stripe_subscription_id
FROM public.subscriptions s
JOIN public.users u ON s.user_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com';
```
