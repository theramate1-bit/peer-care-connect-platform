-- Fix marketplace visibility issues
-- This migration ensures practitioners appear on the marketplace

-- 1. Ensure all practitioner users have is_active = true
UPDATE public.users 
SET is_active = true 
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND is_active IS NULL;

-- 2. Ensure all completed practitioners have profile_completed = true
UPDATE public.users 
SET profile_completed = true 
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND profile_completed IS NULL;

-- 3. Ensure all practitioners have hourly_rate set (set default if missing)
UPDATE public.users 
SET hourly_rate = 50.00 
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND hourly_rate IS NULL;

-- 4. Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add profile_completed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_completed'
    ) THEN
        ALTER TABLE public.users ADD COLUMN profile_completed BOOLEAN DEFAULT false;
    END IF;

    -- Add hourly_rate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'hourly_rate'
    ) THEN
        ALTER TABLE public.users ADD COLUMN hourly_rate DECIMAL(10,2);
    END IF;
END $$;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_marketplace_visibility 
ON public.users(user_role, is_active, profile_completed, onboarding_status) 
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist');

-- 6. Add comments for clarity
COMMENT ON COLUMN public.users.is_active IS 'Whether the user account is active and visible on marketplace';
COMMENT ON COLUMN public.users.profile_completed IS 'Whether the user has completed their profile setup';
COMMENT ON COLUMN public.users.hourly_rate IS 'Hourly rate for practitioners, required for marketplace visibility';

