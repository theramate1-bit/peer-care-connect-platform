-- Mobile booking edge case fixes:
-- 1) Past date/time validation in create_mobile_booking_request
-- 2) Minimum advance (2 hours) for mobile requests
-- 3) Conflict check on accept (client_sessions + calendar_events)
-- 4) Expired request check on accept (race with cron)
-- 5) Advisory lock to prevent client-cancel vs practitioner-accept race

-- 1 & 2: Update create_mobile_booking_request - add past and minimum advance validation
CREATE OR REPLACE FUNCTION public.create_mobile_booking_request(
  p_client_id uuid,
  p_practitioner_id uuid,
  p_product_id uuid,
  p_requested_date date,
  p_requested_start_time time without time zone,
  p_duration_minutes integer,
  p_client_address text,
  p_client_latitude numeric,
  p_client_longitude numeric,
  p_client_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_practitioner RECORD;
  v_product RECORD;
  v_client RECORD;
  v_distance_km DECIMAL(10, 2);
  v_request_id UUID;
  v_total_price_pence INTEGER;
  v_platform_fee_pence INTEGER;
  v_practitioner_earnings_pence INTEGER;
  v_client_name TEXT;
  v_product_name TEXT;
  v_requested_ts TIMESTAMPTZ;
  v_min_advance_hours INTEGER := 2;
BEGIN
  -- Past date/time validation: reject if requested time is in the past
  v_requested_ts := (p_requested_date + p_requested_start_time)::timestamptz;
  IF v_requested_ts <= NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Requested date and time must be in the future'
    );
  END IF;

  -- Minimum advance: mobile requests need at least 2 hours notice for travel
  IF v_requested_ts < NOW() + (v_min_advance_hours || ' hours')::INTERVAL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Mobile sessions require at least %s hours advance booking', v_min_advance_hours)
    );
  END IF;

  SELECT
    id,
    therapist_type,
    base_latitude,
    base_longitude,
    mobile_service_radius_km,
    first_name,
    last_name
  INTO v_practitioner
  FROM public.users
  WHERE id = p_practitioner_id
    AND user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Practitioner not found or inactive');
  END IF;

  SELECT id, price_amount, service_type, name
  INTO v_product
  FROM public.practitioner_products
  WHERE id = p_product_id
    AND practitioner_id = p_practitioner_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;

  IF v_product.service_type NOT IN ('mobile', 'both') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This service is not available for mobile booking');
  END IF;

  IF v_practitioner.therapist_type NOT IN ('mobile', 'hybrid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Practitioner does not offer mobile services');
  END IF;

  IF p_client_latitude IS NULL OR p_client_longitude IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client location coordinates are required');
  END IF;

  IF v_practitioner.base_latitude IS NULL OR v_practitioner.base_longitude IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Practitioner base location is not configured');
  END IF;

  IF v_practitioner.mobile_service_radius_km IS NULL OR v_practitioner.mobile_service_radius_km <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Practitioner mobile service radius is not configured');
  END IF;

  v_distance_km := ST_Distance(
    ST_SetSRID(ST_MakePoint(p_client_longitude, p_client_latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint(v_practitioner.base_longitude, v_practitioner.base_latitude), 4326)::geography
  ) / 1000.0;

  IF v_distance_km > v_practitioner.mobile_service_radius_km THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Client location is %.1f km away, outside practitioner service radius of %s km',
        v_distance_km, v_practitioner.mobile_service_radius_km
      )
    );
  END IF;

  SELECT first_name, last_name INTO v_client
  FROM public.users
  WHERE id = p_client_id;

  v_client_name := COALESCE(
    NULLIF(TRIM(COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '')), ''),
    'A client'
  );
  v_product_name := COALESCE(v_product.name, 'Service');

  v_total_price_pence := v_product.price_amount;
  v_platform_fee_pence := ROUND(v_total_price_pence * 0.005);
  v_practitioner_earnings_pence := v_total_price_pence - v_platform_fee_pence;

  INSERT INTO public.mobile_booking_requests (
    client_id,
    practitioner_id,
    product_id,
    service_type,
    requested_date,
    requested_start_time,
    duration_minutes,
    client_address,
    client_latitude,
    client_longitude,
    total_price_pence,
    platform_fee_pence,
    practitioner_earnings_pence,
    payment_status,
    status,
    client_notes
  ) VALUES (
    p_client_id,
    p_practitioner_id,
    p_product_id,
    'mobile',
    p_requested_date,
    p_requested_start_time,
    p_duration_minutes,
    p_client_address,
    p_client_latitude,
    p_client_longitude,
    v_total_price_pence,
    v_platform_fee_pence,
    v_practitioner_earnings_pence,
    'pending',
    'pending',
    p_client_notes
  ) RETURNING id INTO v_request_id;

  PERFORM public.create_notification(
    p_practitioner_id,
    'booking_request',
    'New Mobile Booking Request',
    format('%s has requested a mobile session for %s on %s at %s',
      v_client_name, v_product_name, p_requested_date, p_requested_start_time),
    jsonb_build_object(
      'request_id', v_request_id,
      'client_id', p_client_id,
      'client_name', v_client_name,
      'product_id', p_product_id,
      'product_name', v_product_name,
      'requested_date', p_requested_date,
      'requested_start_time', p_requested_start_time,
      'client_address', p_client_address,
      'distance_km', ROUND(v_distance_km::numeric, 2)
    ),
    'mobile_booking_request',
    v_request_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'distance_km', ROUND(v_distance_km::numeric, 2),
    'total_price_pence', v_total_price_pence,
    'platform_fee_pence', v_platform_fee_pence,
    'practitioner_earnings_pence', v_practitioner_earnings_pence
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 3, 4, 5: Update accept_mobile_booking_request - conflict check, expired check, advisory lock
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
  v_buffer_minutes INTEGER := 15;
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
BEGIN
  -- Advisory lock to prevent race with client cancel
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  -- Get request with expired check - must be pending and not expired
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

  -- Expired check: reject if request has passed its expiry time
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

  -- Conflict check: compute booking window with buffer
  v_booking_start := (v_request.requested_date || ' ' || v_request.requested_start_time)::TIMESTAMPTZ;
  v_booking_end := v_booking_start + (COALESCE(v_request.duration_minutes, 60) || ' minutes')::INTERVAL;

  -- Check for overlapping client_sessions (15-min buffer for mobile)
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id
    FROM client_sessions cs
    WHERE cs.therapist_id = v_request.practitioner_id
      AND cs.session_date = v_request.requested_date
      AND cs.status IN ('scheduled', 'confirmed', 'in_progress')
      AND (
        -- Direct overlap
        (v_booking_start, v_booking_end) OVERLAPS
        ((cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ,
         (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ + (COALESCE(cs.duration_minutes, 60) || ' minutes')::INTERVAL)
        OR
        -- New booking starts within buffer after existing
        (v_booking_start >= (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ + (COALESCE(cs.duration_minutes, 60) || ' minutes')::INTERVAL
         AND v_booking_start < (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ + (COALESCE(cs.duration_minutes, 60) + v_buffer_minutes || ' minutes')::INTERVAL)
        OR
        -- Existing starts within buffer after new booking
        ((cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ >= v_booking_end
         AND (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ < v_booking_end + (v_buffer_minutes || ' minutes')::INTERVAL)
      )
  ) sub;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This time slot conflicts with an existing booking (including 15-minute buffer). Please select another time.'
    );
  END IF;

  -- Check for pending_payment holds that haven't expired
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

  -- Check for blocked/unavailable time in calendar_events
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

  -- All validations passed: update status and create session
  UPDATE mobile_booking_requests
  SET
    status = 'accepted',
    payment_status = 'captured',
    stripe_payment_intent_id = p_stripe_payment_intent_id,
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Create client session using existing function
  SELECT id INTO v_session_id
  FROM create_session_from_mobile_request(p_request_id);

  IF v_session_id IS NULL THEN
    -- Rollback the status update
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

  -- Create notification for client
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

COMMENT ON FUNCTION public.create_mobile_booking_request IS 'Creates a mobile booking request with past/minimum-advance validation';
COMMENT ON FUNCTION public.accept_mobile_booking_request IS 'Accepts a mobile request with conflict and expiry checks';
