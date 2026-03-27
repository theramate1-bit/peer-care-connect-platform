-- Align mobile booking requests with regular booking pre-assessment requirements.
-- New users must provide required pre-assessment data before request submission.

ALTER TABLE public.mobile_booking_requests
ADD COLUMN IF NOT EXISTS pre_assessment_payload jsonb;

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
  p_client_notes text DEFAULT NULL::text,
  p_pre_assessment_payload jsonb DEFAULT NULL::jsonb
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
BEGIN
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
    client_notes,
    pre_assessment_payload
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
    p_client_notes,
    p_pre_assessment_payload
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

CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session_id UUID;
  v_request RECORD;
  v_client RECORD;
  v_payload jsonb;
BEGIN
  SELECT *
  INTO v_request
  FROM public.mobile_booking_requests
  WHERE id = request_id
    AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not accepted';
  END IF;

  INSERT INTO public.client_sessions (
    therapist_id,
    client_id,
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
    appointment_type,
    visit_address
  ) VALUES (
    v_request.practitioner_id,
    v_request.client_id,
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
    'mobile',
    v_request.client_address
  )
  RETURNING id INTO v_session_id;

  UPDATE public.mobile_booking_requests
  SET
    session_id = v_session_id,
    updated_at = NOW()
  WHERE id = request_id;

  v_payload := v_request.pre_assessment_payload;
  IF v_payload IS NOT NULL AND jsonb_typeof(v_payload) = 'object' THEN
    SELECT id, email, first_name, last_name
    INTO v_client
    FROM public.users
    WHERE id = v_request.client_id;

    IF NOT EXISTS (
      SELECT 1
      FROM public.pre_assessment_forms paf
      WHERE paf.session_id = v_session_id
        AND paf.completed_at IS NOT NULL
    ) THEN
      INSERT INTO public.pre_assessment_forms (
        session_id,
        client_id,
        client_email,
        client_name,
        name,
        date_of_birth,
        contact_email,
        contact_phone,
        gp_name,
        gp_address,
        current_medical_conditions,
        past_medical_history,
        area_of_body,
        time_scale,
        how_issue_began,
        activities_affected,
        body_map_markers,
        is_guest_booking,
        is_initial_session,
        completed_at,
        created_at,
        updated_at
      ) VALUES (
        v_session_id,
        v_request.client_id,
        COALESCE(v_client.email, ''),
        COALESCE(NULLIF(TRIM(COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '')), ''), 'Client'),
        NULLIF(v_payload->>'name', ''),
        NULLIF(v_payload->>'date_of_birth', '')::date,
        NULLIF(v_payload->>'contact_email', ''),
        NULLIF(v_payload->>'contact_phone', ''),
        NULLIF(v_payload->>'gp_name', ''),
        NULLIF(v_payload->>'gp_address', ''),
        NULLIF(v_payload->>'current_medical_conditions', ''),
        NULLIF(v_payload->>'past_medical_history', ''),
        NULLIF(v_payload->>'area_of_body', ''),
        NULLIF(v_payload->>'time_scale', ''),
        NULLIF(v_payload->>'how_issue_began', ''),
        NULLIF(v_payload->>'activities_affected', ''),
        COALESCE(v_payload->'body_map_markers', '[]'::jsonb),
        (v_client.id IS NULL),
        COALESCE((v_payload->>'required')::boolean, true),
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN v_session_id;
END;
$function$;
