-- Ensure credits table exists with proper structure
-- This migration creates the credits table if it doesn't exist

-- Create credits table if it doesn't exist
CREATE TABLE IF NOT EXISTS credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create credits records for existing users who don't have them
INSERT INTO credits (user_id, balance)
SELECT id, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM credits)
ON CONFLICT (user_id) DO NOTHING;

-- Enable RLS
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'credits' AND policyname = 'Users can view their own credits'
    ) THEN
        CREATE POLICY "Users can view their own credits" ON credits
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'credits' AND policyname = 'Users can update their own credits'
    ) THEN
        CREATE POLICY "Users can update their own credits" ON credits
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON credits TO authenticated;
