-- Fix signup 500 "Database error saving new user" when email already exists in public.users
-- (e.g. guest created by get_or_create_guest_conversation). The trigger handle_new_user
-- previously only used ON CONFLICT (id); duplicate email caused unique_violation and Auth
-- returned 500. We catch unique_violation so signup succeeds; the app then calls
-- convert_guest_to_client_or_create_profile to merge the guest into the new auth user.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'User'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), 'User'),
    NULL,
    'pending'::onboarding_status,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    user_role = COALESCE(EXCLUDED.user_role, users.user_role),
    onboarding_status = EXCLUDED.onboarding_status,
    profile_completed = EXCLUDED.profile_completed,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists (e.g. guest user). Let signup succeed; the app will call
    -- convert_guest_to_client_or_create_profile to merge the guest into this auth user.
    RETURN NEW;
END;
$$;
