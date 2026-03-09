# How to Apply the Admin Status Fix

## Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tyogjftepxsicdeqvxoc
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix-admin-status.sql`
4. Click **Run** to execute
5. Verify the output shows `onboarding_status = 'completed'` and `profile_completed = true`

## Option 2: Supabase CLI (If you have proper permissions)

```bash
cd peer-care-connect
export SUPABASE_ACCESS_TOKEN="sbp_2ba0027bf1f909075918b631951f1da584e01dad"
npx supabase db execute --file supabase/migrations/20250122_fix_admin_pinpointtherapyuk_onboarding.sql
```

## Option 3: Direct SQL Query

If you have database access, you can run:

```sql
UPDATE public.users
SET 
  onboarding_status = 'completed',
  profile_completed = true,
  treatment_exchange_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'admin@pinpointtherapyuk.com';
```

## Verification

After applying the fix, verify it worked:

```sql
SELECT 
  email,
  onboarding_status,
  profile_completed,
  treatment_exchange_enabled,
  is_active
FROM public.users
WHERE email = 'admin@pinpointtherapyuk.com';
```

Expected result:
- `onboarding_status` should be `'completed'`
- `profile_completed` should be `true`
- `treatment_exchange_enabled` should be `true`
- `is_active` should be `true`
