-- Phase 2: Sync users.stripe_connect_account_id with connect_accounts table
-- This ensures data consistency between the two tables

-- Function to sync users.stripe_connect_account_id when connect_accounts is updated
CREATE OR REPLACE FUNCTION sync_users_stripe_connect_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Update users.stripe_connect_account_id when connect_accounts.stripe_account_id changes
  UPDATE public.users
  SET stripe_connect_account_id = NEW.stripe_account_id
  WHERE id = NEW.user_id
  AND (stripe_connect_account_id IS NULL OR stripe_connect_account_id != NEW.stripe_account_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After INSERT or UPDATE on connect_accounts
DROP TRIGGER IF EXISTS sync_users_stripe_connect_trigger ON public.connect_accounts;
CREATE TRIGGER sync_users_stripe_connect_trigger
  AFTER INSERT OR UPDATE OF stripe_account_id, user_id ON public.connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_users_stripe_connect_account();

-- Function to sync connect_accounts when users.stripe_connect_account_id is updated (if needed)
CREATE OR REPLACE FUNCTION sync_connect_accounts_from_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if connect_accounts doesn't exist for this user
  IF NOT EXISTS (
    SELECT 1 FROM public.connect_accounts 
    WHERE user_id = NEW.id AND stripe_account_id = NEW.stripe_connect_account_id
  ) AND NEW.stripe_connect_account_id IS NOT NULL THEN
    INSERT INTO public.connect_accounts (user_id, stripe_account_id, account_status)
    VALUES (NEW.id, NEW.stripe_connect_account_id, 'pending')
    ON CONFLICT (stripe_account_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After UPDATE of stripe_connect_account_id on users (backup sync)
DROP TRIGGER IF EXISTS sync_connect_accounts_from_users_trigger ON public.users;
CREATE TRIGGER sync_connect_accounts_from_users_trigger
  AFTER UPDATE OF stripe_connect_account_id ON public.users
  FOR EACH ROW
  WHEN (NEW.stripe_connect_account_id IS DISTINCT FROM OLD.stripe_connect_account_id)
  EXECUTE FUNCTION sync_connect_accounts_from_users();

-- Sync existing data (one-time fix)
UPDATE public.users u
SET stripe_connect_account_id = ca.stripe_account_id
FROM public.connect_accounts ca
WHERE u.id = ca.user_id
AND (u.stripe_connect_account_id IS NULL OR u.stripe_connect_account_id != ca.stripe_account_id);

