-- Fix role selection default issue
-- This migration fixes the issue where users are automatically assigned 'client' role
-- instead of being allowed to select their role during onboarding

-- Update the trigger function to NOT default to 'client' role
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
    location
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'user_role', -- Don't default to 'client', let it be NULL
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'onboarding_status', 'pending'),
    COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false),
    NOW(),
    NOW(),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'location'
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

-- Update the sync function to also not default to 'client'
CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
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
    location
  )
  SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'user_role', -- Don't default to 'client', let it be NULL
    au.raw_user_meta_data->>'first_name',
    au.raw_user_meta_data->>'last_name',
    au.raw_user_meta_data->>'full_name',
    COALESCE(au.raw_user_meta_data->>'onboarding_status', 'pending'),
    COALESCE((au.raw_user_meta_data->>'profile_completed')::boolean, false),
    au.created_at,
    NOW(),
    au.raw_user_meta_data->>'phone',
    au.raw_user_meta_data->>'bio',
    au.raw_user_meta_data->>'location'
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users who were incorrectly assigned 'client' role
-- Set their role to NULL so they can select it properly
UPDATE public.users 
SET user_role = NULL 
WHERE user_role = 'client' 
  AND onboarding_status = 'pending' 
  AND profile_completed = false
  AND created_at > NOW() - INTERVAL '7 days'; -- Only update recent users to avoid affecting existing clients

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile without defaulting to client role - allows proper role selection during onboarding';
