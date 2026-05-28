-- Fix RLS policies for client_profiles to allow trigger-based inserts for guest bookings
-- The triggers need to insert client_profiles records even when the booking is created by a guest user
-- or when the authenticated user is not the practitioner

-- Drop existing policies that prevent trigger inserts
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.client_profiles;
DROP POLICY IF EXISTS "Practitioners can insert client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Clients can insert their own profile" ON public.client_profiles;

-- Make trigger functions use SECURITY DEFINER so they can bypass RLS
-- This is safe because the triggers only insert data based on client_sessions data
-- and don't expose any privileged information

-- Fix for the function in 20250130_client_profiles.sql
CREATE OR REPLACE FUNCTION update_client_profile_on_session_change()
RETURNS TRIGGER
SECURITY DEFINER -- Allow function to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_therapist_id UUID;
BEGIN
  -- Handle both INSERT/UPDATE and DELETE operations
  IF TG_OP = 'DELETE' THEN
    v_client_id := OLD.client_id;
    v_therapist_id := OLD.therapist_id;
  ELSE
    v_client_id := NEW.client_id;
    v_therapist_id := NEW.therapist_id;
  END IF;

  -- Insert or update client profile
  INSERT INTO public.client_profiles (
    client_id,
    practitioner_id,
    total_sessions,
    first_session_date
  )
  VALUES (
    v_client_id,
    v_therapist_id,
    CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE 1 END,
    CASE 
      WHEN TG_OP = 'DELETE' THEN NULL
      WHEN TG_OP = 'INSERT' THEN NEW.session_date
      ELSE (SELECT MIN(session_date) FROM client_sessions WHERE client_id = v_client_id AND therapist_id = v_therapist_id)
    END
  )
  ON CONFLICT (client_id, practitioner_id) DO UPDATE SET
    total_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
    ),
    completed_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'completed'
    ),
    cancelled_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'cancelled'
    ),
    no_show_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'no_show'
    ),
    total_spent_pence = (
      SELECT COALESCE(SUM(price * 100), 0)  -- Convert pounds to pence
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'completed'
    ),
    last_session_date = (
      SELECT MAX(session_date)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'completed'
    ),
    next_session_date = (
      SELECT MIN(session_date)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND session_date > NOW()
        AND status IN ('scheduled', 'confirmed')
    ),
    status = CASE
      WHEN (SELECT MAX(session_date) FROM client_sessions 
            WHERE client_id = v_client_id 
              AND therapist_id = v_therapist_id) > NOW() - INTERVAL '30 days' 
      THEN 'active'
      ELSE 'inactive'
    END,
    updated_at = NOW();
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fix for the functions in 20250128_client_profiles_denormalization.sql
CREATE OR REPLACE FUNCTION update_client_profile_on_session_insert()
RETURNS TRIGGER
SECURITY DEFINER -- Allow function to bypass RLS
SET search_path = public
AS $$
BEGIN
    -- Upsert client profile
    INSERT INTO public.client_profiles (
        practitioner_id,
        client_id,
        client_email,
        client_name,
        total_sessions,
        total_spent,
        last_session,
        status,
        updated_at
    )
    VALUES (
        NEW.therapist_id,
        NEW.client_id,
        COALESCE(NEW.client_email, ''),
        COALESCE(NEW.client_name, ''),
        1,
        COALESCE(NEW.price, 0.00),
        NEW.session_date,
        'active',
        NOW()
    )
    ON CONFLICT (practitioner_id, client_email) 
    DO UPDATE SET
        total_sessions = public.client_profiles.total_sessions + 1,
        total_spent = public.client_profiles.total_spent + COALESCE(NEW.price, 0.00),
        last_session = CASE 
            WHEN NEW.session_date > COALESCE(public.client_profiles.last_session, '1970-01-01'::timestamp) 
            THEN NEW.session_date 
            ELSE public.client_profiles.last_session 
        END,
        status = 'active',
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_client_profile_on_session_update()
RETURNS TRIGGER
SECURITY DEFINER -- Allow function to bypass RLS
SET search_path = public
AS $$
BEGIN
    -- If price changed or status changed, update the profile
    IF OLD.price != NEW.price OR OLD.status != NEW.status THEN
        UPDATE public.client_profiles
        SET
            total_spent = total_spent - COALESCE(OLD.price, 0.00) + COALESCE(NEW.price, 0.00),
            updated_at = NOW()
        WHERE practitioner_id = NEW.therapist_id 
          AND client_email = COALESCE(NEW.client_email, '');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_client_profile_on_session_delete()
RETURNS TRIGGER
SECURITY DEFINER -- Allow function to bypass RLS
SET search_path = public
AS $$
BEGIN
    UPDATE public.client_profiles
    SET
        total_sessions = GREATEST(total_sessions - 1, 0),
        total_spent = GREATEST(total_spent - COALESCE(OLD.price, 0.00), 0.00),
        updated_at = NOW()
    WHERE practitioner_id = OLD.therapist_id 
      AND client_email = COALESCE(OLD.client_email, '');
    
    -- If no sessions left, mark as inactive
    UPDATE public.client_profiles
    SET status = 'inactive',
        updated_at = NOW()
    WHERE practitioner_id = OLD.therapist_id 
      AND client_email = COALESCE(OLD.client_email, '')
      AND total_sessions = 0;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate policies for direct user access (read/update)
-- These still require authentication for direct user operations
CREATE POLICY "Practitioners can view their client profiles"
  ON public.client_profiles FOR SELECT
  USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their client profiles"
  ON public.client_profiles FOR UPDATE
  USING (auth.uid() = practitioner_id);

-- Note: We don't need an INSERT policy because triggers handle all inserts
-- Users cannot directly insert into client_profiles - only triggers can

COMMENT ON FUNCTION update_client_profile_on_session_change() IS 'Trigger function to maintain client_profiles. Uses SECURITY DEFINER to bypass RLS for trigger-based inserts.';
COMMENT ON FUNCTION update_client_profile_on_session_insert() IS 'Trigger function to maintain client_profiles on insert. Uses SECURITY DEFINER to bypass RLS for trigger-based inserts.';
COMMENT ON FUNCTION update_client_profile_on_session_update() IS 'Trigger function to maintain client_profiles on update. Uses SECURITY DEFINER to bypass RLS for trigger-based updates.';
COMMENT ON FUNCTION update_client_profile_on_session_delete() IS 'Trigger function to maintain client_profiles on delete. Uses SECURITY DEFINER to bypass RLS for trigger-based updates.';

