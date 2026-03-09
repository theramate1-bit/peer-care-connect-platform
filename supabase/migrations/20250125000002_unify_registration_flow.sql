-- Unify Registration Flow - Ensure all new users go through role selection
-- This migration updates the handle_new_user trigger function to:
-- 1. Always set user_role to NULL for new users
-- This ensures both email and OAuth signups consistently redirect to role selection.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    user_role, -- Always set to NULL initially
    onboarding_status,
    profile_completed,
    is_verified,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
    NULL, -- Force NULL role for all new users to ensure role selection
    COALESCE((NEW.raw_user_meta_data->>'onboarding_status')::onboarding_status, 'pending'),
    COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false),
    true,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    -- Do not update user_role here if it's NULL from EXCLUDED,
    -- as it should be set by the role selection page.
    -- If a role was somehow passed, we'll keep it, but the primary flow is NULL.
    user_role = COALESCE(EXCLUDED.user_role, public.users.user_role), 
    onboarding_status = EXCLUDED.onboarding_status,
    profile_completed = EXCLUDED.profile_completed,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup. All users get NULL role initially to ensure role selection flow.';
