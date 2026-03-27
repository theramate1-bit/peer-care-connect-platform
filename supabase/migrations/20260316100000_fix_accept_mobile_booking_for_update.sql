-- Fix: FOR UPDATE cannot be applied to the nullable side of an outer join.
-- The accept_mobile_booking_request function used FOR UPDATE with LEFT JOIN practitioner_products.
-- Lock only the mobile_booking_requests row via FOR UPDATE OF mbr.
CREATE OR REPLACE FUNCTION public.accept_mobile_booking_request(
  p_request_id uuid,
  p_stripe_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_session_id UUID;
  v_practitioner_name TEXT;
  v_client_name TEXT;
  v_product_name TEXT;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
  v_therapist_type TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  SELECT
    mbr.*,
    u.first_name as practitioner_first_name,
    u.last_name as practitioner_last_name,
    u.therapist_type as therapist_type,
    pp.name as product_name
  INTO v_request
  FROM mobile_booking_requests mbr
  JOIN users u ON u.id = mbr.practitioner_id
  LEFT JOIN practitioner_products pp ON pp.id = mbr.product_id
  WHERE mbr.id = p_request_id
    AND mbr.status = 'pending'
  FOR UPDATE OF mbr;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not pending');
  END IF;

  IF v_request.expires_at IS NOT NULL AND v_request.expires_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This request has expired');
  END IF;

  v_practitioner_name := COALESCE(TRIM(COALESCE(v_request.practitioner_first_name, '') || ' ' || COALESCE(v_request.practitioner_last_name, '')), 'Your practitioner');
  v_product_name := COALESCE(v_request.product_name, 'Service');
  SELECT COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Client') INTO v_client_name
  FROM users u WHERE u.id = v_request.client_id;
  v_client_name := COALESCE(v_client_name, 'Client');
  v_therapist_type := COALESCE(v_request.therapist_type, 'mobile');

  v_booking_start := (v_request.requested_date || ' ' || v_request.requested_start_time)::TIMESTAMPTZ;
  v_booking_end := v_booking_start + (COALESCE(v_request.duration_minutes, 60) || ' minutes')::INTERVAL;

  -- Conflict check using directional buffers (not hardcoded 30)
  SELECT COUNT(*) INTO v_conflict_count
  FROM client_sessions cs
  CROSS JOIN LATERAL (
    SELECT
      (cs.session_date::timestamp + cs.start_time) AS ex_start,
      (cs.session_date::timestamp + cs.start_time + (COALESCE(cs.duration_minutes, 60) || ' minutes')::interval) AS ex_end
  ) ex
  WHERE cs.therapist_id = v_request.practitioner_id
    AND cs.session_date = v_request.requested_date
    AND cs.status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
    AND (cs.status <> 'pending_payment' OR (cs.expires_at IS NOT NULL AND cs.expires_at > NOW()))
    AND NOT (
      v_booking_start >= ex.ex_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, COALESCE(cs.appointment_type, 'clinic'), 'mobile'
        )
      )
      OR ex.ex_start >= v_booking_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, 'mobile', COALESCE(cs.appointment_type, 'clinic')
        )
      )
    );

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'This time slot conflicts with an existing booking (including travel buffer). Please select another time.');
  END IF;

  -- Check blocked time
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = v_request.practitioner_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND start_time < v_booking_end
    AND end_time > v_booking_start;

  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This time slot is blocked or unavailable. Please select another time.');
  END IF;

  -- Accept the request
  UPDATE mobile_booking_requests
  SET status = 'accepted', payment_status = 'captured',
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      accepted_at = NOW(), updated_at = NOW()
  WHERE id = p_request_id;

  -- Release the slot_hold (the real session in client_sessions replaces it)
  UPDATE slot_holds
  SET status = 'released', updated_at = NOW()
  WHERE mobile_request_id = p_request_id AND status = 'active';

  SELECT public.create_session_from_mobile_request(p_request_id) INTO v_session_id;

  IF v_session_id IS NULL THEN
    UPDATE mobile_booking_requests
    SET status = 'pending', payment_status = 'held', accepted_at = NULL, updated_at = NOW()
    WHERE id = p_request_id;
    -- Re-activate the slot hold since we rolled back
    UPDATE slot_holds
    SET status = 'active', updated_at = NOW()
    WHERE mobile_request_id = p_request_id AND status = 'released';
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create session');
  END IF;

  PERFORM create_notification(
    v_request.client_id, 'booking_confirmed', 'Mobile Session Request Accepted',
    format('%s has accepted your mobile session request for %s on %s at %s',
      v_practitioner_name, v_product_name,
      v_request.requested_date, v_request.requested_start_time),
    jsonb_build_object(
      'request_id', p_request_id, 'session_id', v_session_id,
      'practitioner_id', v_request.practitioner_id,
      'practitioner_name', v_practitioner_name,
      'product_id', v_request.product_id,
      'product_name', v_product_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request', p_request_id::text
  );

  -- Practitioner notification: same format as clinic "is confirmed" for consistency
  PERFORM create_notification(
    v_request.practitioner_id, 'booking_confirmed', 'Mobile Session Confirmed',
    format('Session with %s on %s at %s is confirmed.',
      v_client_name, v_request.requested_date, v_request.requested_start_time),
    jsonb_build_object(
      'session_id', v_session_id, 'request_id', p_request_id,
      'client_name', v_client_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'product_name', v_product_name,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request', p_request_id::text
  );

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'request_id', p_request_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
