-- MOBILE #16: Allow editing visit address for accepted mobile sessions before the session.
-- 1) create_session_from_mobile_request: set appointment_type and visit_address for correct UI
-- 2) update_session_visit_address RPC: client or practitioner can update address before 24h cutoff

-- 1. Update create_session_from_mobile_request to set appointment_type and visit_address
-- (location already set in 20260309130000; add appointment_type and visit_address for SessionDetailView)
CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_session_id UUID;
  v_request RECORD;
  v_client_name TEXT;
  v_client_email TEXT;
BEGIN
  SELECT
    mbr.*,
    COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Client') AS client_name,
    COALESCE(u.email, '') AS client_email
  INTO v_request
  FROM public.mobile_booking_requests mbr
  LEFT JOIN public.users u ON u.id = mbr.client_id
  WHERE mbr.id = request_id
    AND mbr.status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not accepted';
  END IF;

  v_client_name := COALESCE(v_request.client_name, 'Client');
  v_client_email := COALESCE(NULLIF(TRIM(v_request.client_email), ''), 'no-email@placeholder.local');

  INSERT INTO public.client_sessions (
    therapist_id,
    client_id,
    client_name,
    client_email,
    session_date,
    start_time,
    duration_minutes,
    session_type,
    status,
    price,
    payment_status,
    stripe_payment_intent_id,
    platform_fee_amount,
    practitioner_amount,
    is_guest_booking,
    location,
    appointment_type,
    visit_address
  ) VALUES (
    v_request.practitioner_id,
    v_request.client_id,
    v_client_name,
    v_client_email,
    v_request.requested_date,
    v_request.requested_start_time,
    v_request.duration_minutes,
    (SELECT name FROM public.practitioner_products WHERE id = v_request.product_id),
    'confirmed',
    v_request.total_price_pence / 100.0,
    'completed',
    v_request.stripe_payment_intent_id,
    v_request.platform_fee_pence / 100.0,
    v_request.practitioner_earnings_pence / 100.0,
    false,
    v_request.client_address,
    'mobile',
    v_request.client_address
  )
  RETURNING id INTO v_session_id;

  UPDATE public.mobile_booking_requests
  SET
    session_id = v_session_id,
    updated_at = NOW()
  WHERE id = request_id;

  RETURN v_session_id;
END;
$function$;

-- 2. Add columns if missing (some DBs may have added them via create_booking_with_validation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_sessions' AND column_name = 'appointment_type') THEN
    ALTER TABLE public.client_sessions ADD COLUMN appointment_type TEXT CHECK (appointment_type IN ('clinic', 'mobile'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_sessions' AND column_name = 'visit_address') THEN
    ALTER TABLE public.client_sessions ADD COLUMN visit_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_sessions' AND column_name = 'location') THEN
    ALTER TABLE public.client_sessions ADD COLUMN location TEXT;
  END IF;
END $$;

-- 3. Backfill: sessions from mobile_booking_requests that have location but not appointment_type/visit_address
UPDATE public.client_sessions cs
SET
  appointment_type = 'mobile',
  visit_address = COALESCE(cs.visit_address, cs.location),
  location = COALESCE(cs.location, cs.visit_address)
WHERE cs.id IN (
  SELECT mbr.session_id FROM public.mobile_booking_requests mbr
  WHERE mbr.session_id IS NOT NULL
)
  AND (cs.appointment_type IS NULL OR cs.visit_address IS NULL)
  AND (cs.location IS NOT NULL OR cs.visit_address IS NOT NULL);

-- 4. RPC: Update visit address for mobile sessions (client or practitioner, before 24h cutoff)
CREATE OR REPLACE FUNCTION public.update_session_visit_address(
  p_session_id uuid,
  p_new_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_session RECORD;
  v_session_start TIMESTAMPTZ;
  v_cutoff TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_new_address IS NULL OR TRIM(p_new_address) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Address cannot be empty');
  END IF;

  SELECT id, therapist_id, client_id, session_date, start_time, status, appointment_type, visit_address, location
  INTO v_session
  FROM public.client_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  IF auth.uid() IS DISTINCT FROM v_session.therapist_id AND auth.uid() IS DISTINCT FROM v_session.client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update this session');
  END IF;

  IF v_session.status NOT IN ('confirmed', 'scheduled', 'pending_payment') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only update address for confirmed or scheduled sessions');
  END IF;

  v_session_start := (v_session.session_date || ' ' || v_session.start_time)::TIMESTAMPTZ;
  v_cutoff := v_session_start - INTERVAL '24 hours';

  IF NOW() >= v_cutoff THEN
    RETURN jsonb_build_object('success', false, 'error', 'Address cannot be changed within 24 hours of the session');
  END IF;

  IF v_session.appointment_type = 'mobile' OR v_session.visit_address IS NOT NULL OR v_session.location IS NOT NULL THEN
    UPDATE public.client_sessions
    SET
      visit_address = TRIM(p_new_address),
      location = TRIM(p_new_address),
      updated_at = NOW()
    WHERE id = p_session_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'This is not a mobile session');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_session_visit_address(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.update_session_visit_address IS 'Allows client or practitioner to update visit address for mobile sessions, up to 24h before session start (MOBILE #16)';
