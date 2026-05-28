-- Convert guest to client (or create profile) on signup to avoid duplicate email and link guest bookings.
-- When a user signs up with an email that already exists as a guest, we re-point all FKs to the new auth id
-- and replace the guest row with the new profile so bookings stay linked.

CREATE OR REPLACE FUNCTION public.convert_guest_to_client_or_create_profile(
  p_new_id uuid,
  p_email text,
  p_first_name text DEFAULT 'User',
  p_last_name text DEFAULT 'User',
  p_user_role text DEFAULT 'client'
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_id uuid;
  v_guest users%ROWTYPE;
  r RECORD;
BEGIN
  SELECT id INTO v_old_id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email)) LIMIT 1;

  IF v_old_id IS NOT NULL AND v_old_id <> p_new_id THEN
    -- Convert: re-point all FKs from old id to new id, then replace the guest row
    FOR r IN
      SELECT kcu.table_name AS tbl, kcu.column_name AS col
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = rc.constraint_name AND kcu.table_schema = 'public'
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
      WHERE ccu.table_schema = 'public' AND ccu.table_name = 'users' AND ccu.column_name = 'id'
      AND kcu.table_name <> 'users'
    LOOP
      EXECUTE format('UPDATE %I SET %I = $1 WHERE %I = $2', r.tbl, r.col, r.col) USING p_new_id, v_old_id;
    END LOOP;

    SELECT * INTO v_guest FROM users WHERE id = v_old_id;
    DELETE FROM users WHERE id = v_old_id;

    INSERT INTO users (
      id, email, first_name, last_name, phone, user_role,
      onboarding_status, profile_completed, is_active, is_verified,
      preferences, created_at, updated_at
    ) VALUES (
      p_new_id,
      p_email,
      COALESCE(NULLIF(TRIM(p_first_name), ''), v_guest.first_name, 'User'),
      COALESCE(NULLIF(TRIM(p_last_name), ''), v_guest.last_name, 'User'),
      v_guest.phone,
      COALESCE(p_user_role::user_role, 'client'),
      'pending',
      false,
      true,
      false,
      v_guest.preferences,
      COALESCE(v_guest.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      user_role = EXCLUDED.user_role,
      onboarding_status = EXCLUDED.onboarding_status,
      profile_completed = EXCLUDED.profile_completed,
      updated_at = NOW();
  ELSIF v_old_id IS NULL OR v_old_id = p_new_id THEN
    INSERT INTO users (
      id, email, first_name, last_name, user_role,
      onboarding_status, profile_completed, is_active, is_verified,
      created_at, updated_at
    ) VALUES (
      p_new_id,
      p_email,
      COALESCE(NULLIF(TRIM(p_first_name), ''), 'User'),
      COALESCE(NULLIF(TRIM(p_last_name), ''), 'User'),
      COALESCE(p_user_role::user_role, 'client'),
      'pending',
      false,
      true,
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      user_role = EXCLUDED.user_role,
      updated_at = NOW();
  END IF;

  RETURN QUERY SELECT * FROM users WHERE id = p_new_id;
END;
$$;

COMMENT ON FUNCTION public.convert_guest_to_client_or_create_profile(uuid, text, text, text, text) IS
  'After signup: convert existing guest (by email) to client using new auth id, or create new user profile. Prevents duplicate email and links guest bookings to the new account.';
