-- Quick fix for OAuth credits error
-- Remove the trigger that's causing the credits.balance error

-- Connect to the database and run this SQL directly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS initialize_user_credits();
