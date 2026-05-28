-- Ensure credits exist for all users
-- This migration creates credits records for users who don't have them

-- Create credits records for existing users who don't have them
INSERT INTO credits (user_id, balance)
SELECT id, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM credits)
ON CONFLICT (user_id) DO NOTHING;

-- Re-enable the trigger for new users (but only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();
    END IF;
END $$;
