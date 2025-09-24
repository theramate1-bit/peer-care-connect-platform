-- Temporary fix: Remove credits trigger to prevent OAuth errors
-- This allows OAuth flow to work while we fix the database schema

-- Drop the trigger that's causing the credits.balance error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function as well to be safe
DROP FUNCTION IF EXISTS initialize_user_credits();
