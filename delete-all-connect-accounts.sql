-- Delete all Stripe Connect accounts from database
-- This script clears all connect_accounts records and user references

-- Step 1: Clear stripe_connect_account_id from users table
UPDATE public.users
SET stripe_connect_account_id = NULL
WHERE stripe_connect_account_id IS NOT NULL;

-- Step 2: Delete all records from connect_accounts table
DELETE FROM public.connect_accounts;

-- Verification queries (run these after to verify)
-- SELECT COUNT(*) as remaining_accounts FROM public.connect_accounts;
-- SELECT COUNT(*) as users_with_connect FROM public.users WHERE stripe_connect_account_id IS NOT NULL;



