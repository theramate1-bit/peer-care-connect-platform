-- Fix User Profile Creation and RLS Policies
-- Run this SQL script in your Supabase Dashboard > SQL Editor
-- This addresses the issues found in registration testing:
-- 1. RLS policy blocking user profile creation
-- 2. Missing automatic user profile creation trigger

-- Step 1: Create or replace the function to handle new user creation
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
    updated_at
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
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_role = EXCLUDED.user_role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    onboarding_status = EXCLUDED.onboarding_status,
    profile_completed = EXCLUDED.profile_completed,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Update RLS policies for users table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create new RLS policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 4: Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create function to sync existing users (for users already in auth.users but not in public.users)
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
    updated_at
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
    NOW()
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Run the sync function to create profiles for existing users
SELECT public.sync_existing_users();

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_role ON public.users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON public.users(onboarding_status);

-- Step 8: Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile in public.users when a new user signs up';
COMMENT ON FUNCTION public.sync_existing_users() IS 'Syncs existing auth.users to public.users table';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger to automatically create user profile on signup';

-- Step 9: Verify the setup
SELECT 
  'Setup Complete' as status,
  COUNT(*) as existing_users_synced
FROM public.users;
