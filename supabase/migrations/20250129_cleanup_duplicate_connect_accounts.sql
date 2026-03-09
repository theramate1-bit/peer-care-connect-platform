-- Cleanup duplicate connect_accounts records
-- This migration identifies and marks orphaned records where stripe_account_id
-- doesn't match the user's current stripe_connect_account_id

-- Step 1: Identify orphaned records (accounts that don't match user's current stripe_connect_account_id)
-- These are accounts created during testing or failed idempotency checks

DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Count orphaned records
    SELECT COUNT(*) INTO orphaned_count
    FROM public.connect_accounts ca
    INNER JOIN public.users u ON ca.user_id = u.id
    WHERE u.stripe_connect_account_id IS NOT NULL
    AND ca.stripe_account_id != u.stripe_connect_account_id;
    
    RAISE NOTICE 'Found % orphaned connect_accounts records', orphaned_count;
    
    -- Mark orphaned records (add a status field if it doesn't exist, or use a flag)
    -- For now, we'll add a comment field to mark them
    UPDATE public.connect_accounts ca
    SET account_status = 'orphaned'
    FROM public.users u
    WHERE ca.user_id = u.id
    AND u.stripe_connect_account_id IS NOT NULL
    AND ca.stripe_account_id != u.stripe_connect_account_id
    AND ca.account_status != 'orphaned';
    
    RAISE NOTICE 'Marked orphaned records';
END $$;

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures a user can only have one active connect_account per stripe_account_id
-- Note: We allow multiple records if they have different stripe_account_ids (historical tracking)

-- First, add a partial unique index for active accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_accounts_user_active_unique 
ON public.connect_accounts(user_id, stripe_account_id)
WHERE account_status != 'orphaned';

-- Step 3: Create a view to identify users with multiple active accounts (shouldn't happen after constraint)
CREATE OR REPLACE VIEW public.connect_accounts_duplicates AS
SELECT 
    u.id as user_id,
    u.email,
    u.stripe_connect_account_id as current_account_id,
    COUNT(ca.id) as account_count,
    STRING_AGG(ca.stripe_account_id, ', ') as all_account_ids
FROM public.users u
INNER JOIN public.connect_accounts ca ON u.id = ca.user_id
WHERE ca.account_status != 'orphaned'
GROUP BY u.id, u.email, u.stripe_connect_account_id
HAVING COUNT(ca.id) > 1;

-- Step 4: Add function to automatically clean up when stripe_connect_account_id changes
CREATE OR REPLACE FUNCTION cleanup_orphaned_connect_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user's stripe_connect_account_id changes, mark old accounts as orphaned
    IF NEW.stripe_connect_account_id IS DISTINCT FROM OLD.stripe_connect_account_id
       AND OLD.stripe_connect_account_id IS NOT NULL
       AND NEW.stripe_connect_account_id IS NOT NULL
    THEN
        UPDATE public.connect_accounts
        SET account_status = 'orphaned',
            updated_at = NOW()
        WHERE user_id = NEW.id
        AND stripe_account_id = OLD.stripe_connect_account_id
        AND account_status != 'orphaned';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-cleanup when account changes
DROP TRIGGER IF EXISTS cleanup_orphaned_on_account_change ON public.users;
CREATE TRIGGER cleanup_orphaned_on_account_change
    AFTER UPDATE OF stripe_connect_account_id ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_connect_accounts();

-- Step 5: Update account_status enum if needed (add 'orphaned' status)
-- Note: This assumes account_status is a TEXT field with CHECK constraint or enum
-- If using enum, you'll need to ALTER TYPE separately

-- Verify the changes
DO $$
DECLARE
    active_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM public.connect_accounts
    WHERE account_status != 'orphaned';
    
    SELECT COUNT(*) INTO orphaned_count
    FROM public.connect_accounts
    WHERE account_status = 'orphaned';
    
    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  Active accounts: %', active_count;
    RAISE NOTICE '  Orphaned accounts: %', orphaned_count;
END $$;

