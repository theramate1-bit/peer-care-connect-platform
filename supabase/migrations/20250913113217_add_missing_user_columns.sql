-- Add missing columns to users table
-- This migration adds the missing columns that are referenced in our trigger function

-- Add missing columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Update the trigger function to handle the correct columns
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

-- Update the sync function to handle the correct columns
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
    COALESCE(au.raw_user_meta_data->>'user_role', 'client'),
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

-- Run the sync function to create profiles for existing users
SELECT public.sync_existing_users();
