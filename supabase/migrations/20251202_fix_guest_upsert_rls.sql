-- Fix RLS policies to allow guest user upsert when email exists with different role
-- This allows guest bookings to work even when email already exists as 'client'
-- Uses RPC function approach for better security and explicit handling

-- Create RPC function for guest user upsert
-- This function bypasses RLS using SECURITY DEFINER to handle the upsert logic securely
CREATE OR REPLACE FUNCTION upsert_guest_user(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT
)
RETURNS TABLE(id UUID, email TEXT, user_role user_role, first_name TEXT, last_name TEXT, phone TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_role user_role;
  v_result_id UUID;
  v_result_email TEXT;
  v_result_role user_role;
  v_result_first_name TEXT;
  v_result_last_name TEXT;
  v_result_phone TEXT;
BEGIN
  -- Check if user exists by email
  SELECT u.id, u.user_role INTO v_user_id, v_existing_role
  FROM users u
  WHERE u.email = p_email
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Update existing user to guest if needed
    -- Preserve existing data if new data is null/empty
    UPDATE users u
    SET 
      first_name = COALESCE(NULLIF(p_first_name, ''), u.first_name),
      last_name = COALESCE(NULLIF(p_last_name, ''), u.last_name),
      phone = COALESCE(NULLIF(p_phone, ''), u.phone),
      user_role = 'guest',
      onboarding_status = 'completed',
      profile_completed = true,
      is_active = true,
      updated_at = NOW()
    WHERE u.id = v_user_id
    RETURNING 
      u.id, u.email, u.user_role, u.first_name, u.last_name, u.phone 
    INTO 
      v_result_id, v_result_email, v_result_role, v_result_first_name, v_result_last_name, v_result_phone;
  ELSE
    -- Insert new guest user
    INSERT INTO users (
      email, first_name, last_name, phone, user_role,
      onboarding_status, profile_completed, is_active
    )
    VALUES (
      p_email, 
      COALESCE(NULLIF(p_first_name, ''), 'Guest'),
      COALESCE(NULLIF(p_last_name, ''), 'User'),
      NULLIF(p_phone, ''),
      'guest',
      'completed', 
      true, 
      true
    )
    RETURNING 
      id, email, user_role, first_name, last_name, phone 
    INTO 
      v_result_id, v_result_email, v_result_role, v_result_first_name, v_result_last_name, v_result_phone;
  END IF;
  
  -- Return the result
  RETURN QUERY SELECT 
    v_result_id, 
    v_result_email, 
    v_result_role, 
    v_result_first_name, 
    v_result_last_name, 
    v_result_phone;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION upsert_guest_user TO anon;
GRANT EXECUTE ON FUNCTION upsert_guest_user TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION upsert_guest_user IS 'Upserts a guest user by email. If email exists, updates to guest role. If not, creates new guest user. Bypasses RLS using SECURITY DEFINER for secure handling.';

