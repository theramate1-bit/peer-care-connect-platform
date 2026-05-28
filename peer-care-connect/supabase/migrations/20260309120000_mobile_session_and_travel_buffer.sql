-- Mobile session creation fix + travel time buffer
-- 1) create_session_from_mobile_request: add client_name, client_email (required by client_sessions)
-- 2) accept_mobile_booking_request: use 30-min buffer for mobile requests (travel time between visits)

CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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
    is_guest_booking
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
    false
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

-- Use 30-minute buffer for mobile booking conflict check (travel time between visits)
CREATE OR REPLACE FUNCTION public.accept_mobile_booking_request(
  p_request_id uuid,
  p_stripe_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_session_id UUID;
  v_practitioner_name TEXT;
  v_product_name TEXT;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_buffer_minutes INTEGER := 30;  -- 30 min for mobile (travel time between visits)
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  SELECT
    mbr.*,
    u.first_name as practitioner_first_name,
    u.last_name as practitioner_last_name,
    pp.name as product_name
  INTO v_request
  FROM mobile_booking_requests mbr
  JOIN users u ON u.id = mbr.practitioner_id
  LEFT JOIN practitioner_products pp ON pp.id = mbr.product_id
  WHERE mbr.id = p_request_id
    AND mbr.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found or not pending'
    );
  END IF;

  IF v_request.expires_at IS NOT NULL AND v_request.expires_at <= NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This request has expired'
    );
  END IF;

  v_practitioner_name := COALESCE(
    TRIM(COALESCE(v_request.practitioner_first_name, '') || ' ' || COALESCE(v_request.practitioner_last_name, '')),
    'Your practitioner'
  );
  v_product_name := COALESCE(v_request.product_name, 'Service');

  v_booking_start := (v_request.requested_date || ' ' || v_request.requested_start_time)::TIMESTAMPTZ;
  v_booking_end := v_booking_start + (COALESCE(v_request.duration_minutes, 60) || ' minutes')::INTERVAL;

  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id
    FROM client_sessions cs
    WHERE cs.therapist_id = v_request.practitioner_id
      AND cs.session_date = v_request.requested_date
      AND cs.status IN ('scheduled', 'confirmed', 'in_progress')
      AND (
        (v_booking_start, v_booking_end) OVERLAPS
        ((cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ,
         (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ + (COALESCE(cs.duration_minutes, 60) || ' minutes')::INTERVAL)
        OR
        (v_booking_start >= (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ + (COALESCE(cs.duration_minutes, 60) || ' minutes')::INTERVAL
         AND v_booking_start < (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ + (COALESCE(cs.duration_minutes, 60) + v_buffer_minutes || ' minutes')::INTERVAL)
        OR
        ((cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ >= v_booking_end
         AND (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ < v_booking_end + (v_buffer_minutes || ' minutes')::INTERVAL)
      )
  ) sub;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('This time slot conflicts with an existing booking (including %s-minute travel buffer). Please select another time.', v_buffer_minutes)
    );
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM client_sessions cs
  WHERE cs.therapist_id = v_request.practitioner_id
    AND cs.session_date = v_request.requested_date
    AND cs.status = 'pending_payment'
    AND cs.expires_at IS NOT NULL
    AND cs.expires_at > NOW()
    AND (v_booking_start, v_booking_end) OVERLAPS
        ((cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ,
         (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ + (COALESCE(cs.duration_minutes, 60) || ' minutes')::INTERVAL);

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This time slot is temporarily held by another booking attempt'
    );
  END IF;

  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = v_request.practitioner_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND start_time < v_booking_end
    AND end_time > v_booking_start;

  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This time slot is blocked or unavailable. Please select another time.'
    );
  END IF;

  UPDATE mobile_booking_requests
  SET
    status = 'accepted',
    payment_status = 'captured',
    stripe_payment_intent_id = p_stripe_payment_intent_id,
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  SELECT id INTO v_session_id
  FROM create_session_from_mobile_request(p_request_id);

  IF v_session_id IS NULL THEN
    UPDATE mobile_booking_requests
    SET
      status = 'pending',
      payment_status = 'held',
      accepted_at = NULL,
      updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create session'
    );
  END IF;

  PERFORM create_notification(
    v_request.client_id,
    'booking_confirmed',
    'Mobile Session Request Accepted',
    format('%s has accepted your mobile session request for %s on %s at %s',
      v_practitioner_name,
      v_product_name,
      v_request.requested_date,
      v_request.requested_start_time),
    jsonb_build_object(
      'request_id', p_request_id,
      'session_id', v_session_id,
      'practitioner_id', v_request.practitioner_id,
      'practitioner_name', v_practitioner_name,
      'product_id', v_request.product_id,
      'product_name', v_product_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request',
    p_request_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'request_id', p_request_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

COMMENT ON FUNCTION public.create_session_from_mobile_request IS 'Creates client_sessions from accepted mobile request with client_name/email';
COMMENT ON FUNCTION public.accept_mobile_booking_request IS 'Accepts mobile request with 30-min travel buffer for conflicts';
