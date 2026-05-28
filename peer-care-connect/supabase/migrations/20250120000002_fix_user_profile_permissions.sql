-- Fix user profile creation permissions
-- This migration addresses the 403 error when creating user profiles after OAuth

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to view other users' profiles (for marketplace, etc.)
CREATE POLICY "Users can view all profiles" ON users
    FOR SELECT USING (true);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT USAGE ON SEQUENCE users_id_seq TO authenticated;

-- Ensure the users table has the correct structure
-- Add any missing columns that might be needed
DO $$ 
BEGIN
    -- Add user_role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_role') THEN
        ALTER TABLE users ADD COLUMN user_role TEXT DEFAULT 'client';
    END IF;
    
    -- Add onboarding_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'onboarding_status') THEN
        ALTER TABLE users ADD COLUMN onboarding_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add profile_completed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_completed') THEN
        ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT false;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create or replace the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Create the trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the table structure
COMMENT ON TABLE users IS 'User profiles table with RLS policies for secure access';
COMMENT ON COLUMN users.id IS 'Primary key, matches auth.users.id';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
COMMENT ON COLUMN users.user_role IS 'User role: client, sports_therapist, massage_therapist, osteopath, admin';
COMMENT ON COLUMN users.onboarding_status IS 'Onboarding status: pending, completed';
COMMENT ON COLUMN users.profile_completed IS 'Whether the user profile is fully completed';
COMMENT ON COLUMN users.created_at IS 'When the profile was created';
COMMENT ON COLUMN users.updated_at IS 'When the profile was last updated';
