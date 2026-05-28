-- Fix OAuth signup 500 error by updating trigger function
-- This migration fixes the database trigger to only use fields that exist in the users table

-- First, let's check what columns actually exist and create a simple trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    user_role,
    onboarding_status,
    profile_completed,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    -- For OAuth users (no user_role in metadata), set to null so they go to role selection
    -- For email signup users, use the role from metadata
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_role' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'user_role')::user_role
      ELSE NULL  -- OAuth users get null role to trigger role selection
    END,
    'pending',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    user_role = COALESCE(EXCLUDED.user_role, users.user_role), -- Don't overwrite existing role
    onboarding_status = EXCLUDED.onboarding_status,
    profile_completed = EXCLUDED.profile_completed,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup. OAuth users get null role for role selection, email users get role from metadata.';
