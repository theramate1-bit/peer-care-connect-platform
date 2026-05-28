-- Add preferences column to users table
-- This migration adds a JSONB preferences column to store user account preferences

-- Add preferences column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN public.users.preferences IS 'Stores user account preferences including notification settings, privacy settings, and other user preferences';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_preferences 
ON public.users USING GIN (preferences);

-- Update the trigger function to handle preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    user_role,
    first_name,
    last_name,
    full_name,
    onboarding_status,
    profile_completed,
    created_at,
    updated_at,
    phone,
    bio,
    location,
    preferences
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'client'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'onboarding_status', 'pending'),
    COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false),
    NOW(),
    NOW(),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'location',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_role = EXCLUDED.user_role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    onboarding_status = EXCLUDED.onboarding_status,
    profile_completed = EXCLUDED.profile_completed,
    updated_at = NOW(),
    phone = EXCLUDED.phone,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
