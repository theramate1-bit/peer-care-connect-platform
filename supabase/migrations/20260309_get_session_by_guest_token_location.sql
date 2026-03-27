-- Return appointment_type, visit_address and practitioner clinic_address from get_session_by_guest_token
-- so GuestBookingView can show location/directions using "booking record first" (clinic vs mobile).
CREATE OR REPLACE FUNCTION public.get_session_by_guest_token(
  p_session_id UUID,
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_practitioner RECORD;
  v_result JSONB;
BEGIN
  IF p_session_id IS NULL OR p_token IS NULL OR trim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id, client_email, client_name, therapist_id, session_date, start_time,
         duration_minutes, session_type, price, status, payment_status,
         appointment_type, visit_address
  INTO v_session
  FROM public.client_sessions
  WHERE id = p_session_id
    AND guest_view_token = p_token
    AND payment_status = 'completed'
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, first_name, last_name, location, clinic_address
  INTO v_practitioner
  FROM public.users
  WHERE id = v_session.therapist_id
  LIMIT 1;

  v_result := jsonb_build_object(
    'id', v_session.id,
    'client_email', v_session.client_email,
    'client_name', v_session.client_name,
    'session_date', v_session.session_date,
    'start_time', v_session.start_time,
    'duration_minutes', v_session.duration_minutes,
    'session_type', v_session.session_type,
    'price', v_session.price,
    'status', v_session.status,
    'appointment_type', COALESCE(v_session.appointment_type, 'clinic'),
    'visit_address', v_session.visit_address,
    'practitioner', CASE WHEN v_practitioner.id IS NOT NULL THEN jsonb_build_object(
      'first_name', v_practitioner.first_name,
      'last_name', v_practitioner.last_name,
      'location', v_practitioner.location,
      'clinic_address', v_practitioner.clinic_address
    ) ELSE NULL END
  );
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_session_by_guest_token(UUID, TEXT) IS 'Returns public session details for guest view page when token matches; includes appointment_type and visit_address for location/directions (booking record first).';
