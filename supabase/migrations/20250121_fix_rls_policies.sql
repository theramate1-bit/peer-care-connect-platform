-- Fix RLS Policies for User Registration Failures
-- This migration addresses the root causes of user registration failures

-- 1. Ensure users table has proper RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Fix user_role enum constraints
-- Allow NULL user_role during registration process
ALTER TABLE public.users ALTER COLUMN user_role DROP NOT NULL;

-- 3. Update handle_new_user function to handle OAuth users properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist
  INSERT INTO public.users (id, email, first_name, last_name, user_role, onboarding_status, profile_completed, is_verified, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_role')::user_role, NULL), -- Allow NULL initially
    'pending',
    false,
    true, -- OAuth users are verified
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    user_role = COALESCE(EXCLUDED.user_role, users.user_role),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to safely assign user role
CREATE OR REPLACE FUNCTION public.assign_user_role(user_id UUID, role_name user_role)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate role
  IF role_name NOT IN ('client', 'sports_therapist', 'massage_therapist', 'osteopath', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', role_name;
  END IF;
  
  -- Update user role safely
  UPDATE public.users 
  SET 
    user_role = role_name,
    onboarding_status = CASE 
      WHEN role_name = 'client' THEN 'pending'::onboarding_status
      ELSE 'role_selected'::onboarding_status
    END,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_role ON public.users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON public.users(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON public.users(profile_completed);

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, user_role) TO authenticated;
