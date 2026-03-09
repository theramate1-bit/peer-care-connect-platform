-- Fix client_profiles trigger to only count confirmed and completed sessions
-- This ensures total_sessions and total_spent_pence only include confirmed/completed sessions

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
      ELSE (SELECT MIN(session_date) FROM client_sessions WHERE client_id = v_client_id AND therapist_id = v_therapist_id AND status IN ('confirmed', 'completed'))
    END
  )
  ON CONFLICT (client_id, practitioner_id) DO UPDATE SET
    -- Only count confirmed and completed sessions for total_sessions
    total_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status IN ('confirmed', 'completed')
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
    -- Only sum confirmed and completed sessions for revenue
    total_spent_pence = (
      SELECT COALESCE(SUM(price * 100), 0)  -- Convert pounds to pence
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status IN ('confirmed', 'completed')
    ),
    last_session_date = (
      SELECT MAX(session_date)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status IN ('confirmed', 'completed')
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
              AND therapist_id = v_therapist_id
              AND status IN ('confirmed', 'completed')) > NOW() - INTERVAL '30 days' 
      THEN 'active'
      ELSE 'inactive'
    END,
    updated_at = NOW();
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recalculate all client_profiles to fix existing data
UPDATE public.client_profiles
SET
  total_sessions = (
    SELECT COUNT(*)
    FROM client_sessions
    WHERE client_sessions.client_id = client_profiles.client_id
      AND client_sessions.therapist_id = client_profiles.practitioner_id
      AND client_sessions.status IN ('confirmed', 'completed')
  ),
  total_spent_pence = (
    SELECT COALESCE(SUM(price * 100), 0)
    FROM client_sessions
    WHERE client_sessions.client_id = client_profiles.client_id
      AND client_sessions.therapist_id = client_profiles.practitioner_id
      AND client_sessions.status IN ('confirmed', 'completed')
  ),
  last_session_date = (
    SELECT MAX(session_date)
    FROM client_sessions
    WHERE client_sessions.client_id = client_profiles.client_id
      AND client_sessions.therapist_id = client_profiles.practitioner_id
      AND client_sessions.status IN ('confirmed', 'completed')
  ),
  updated_at = NOW();

COMMENT ON FUNCTION update_client_profile_on_session_change() IS 'Trigger function to maintain client_profiles. Only counts confirmed and completed sessions for totals and revenue. Uses SECURITY DEFINER to bypass RLS for trigger-based inserts.';

