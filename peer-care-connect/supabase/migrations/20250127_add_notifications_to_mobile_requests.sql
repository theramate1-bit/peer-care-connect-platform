-- Add notifications to mobile booking request flow
-- This ensures practitioners are notified when requests are created
-- and clients are notified when requests are accepted/declined

-- 1. Update create_mobile_booking_request to notify practitioner
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
  v_payment_intent_id TEXT;
  v_total_price_pence INTEGER;
  v_platform_fee_pence INTEGER;
  v_practitioner_earnings_pence INTEGER;
  v_service_type TEXT;
  v_client_name TEXT;
  v_product_name TEXT;
BEGIN
  -- Get practitioner details
  SELECT 
    therapist_type,
    base_latitude,
    base_longitude,
    mobile_service_radius_km,
    clinic_latitude,
    clinic_longitude
  INTO v_practitioner
  FROM users
  WHERE id = p_practitioner_id
    AND user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Practitioner not found or inactive'
    );
  END IF;

  -- Get product details
  SELECT 
    price_amount,
    service_type,
    name
  INTO v_product
  FROM practitioner_products
  WHERE id = p_product_id
    AND practitioner_id = p_practitioner_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product not found or inactive'
    );
  END IF;

  -- Get client details for notification
  SELECT 
    first_name,
    last_name
  INTO v_client
  FROM users
  WHERE id = p_client_id;

  v_client_name := COALESCE(
    TRIM(COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '')),
    'A client'
  );
  v_product_name := COALESCE(v_product.name, 'Service');

  -- Check service type
  v_service_type := v_product.service_type;
  IF v_service_type NOT IN ('mobile', 'both') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This service is not available for mobile booking'
    );
  END IF;

  -- Calculate distance from practitioner's base/clinic to client location
  IF v_practitioner.therapist_type = 'mobile' THEN
    -- Mobile: check distance from base
    IF v_practitioner.base_latitude IS NULL OR v_practitioner.base_longitude IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Practitioner base location not set'
      );
    END IF;
    
    v_distance_km := ST_Distance(
      ST_SetSRID(ST_MakePoint(p_client_longitude, p_client_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(v_practitioner.base_longitude, v_practitioner.base_latitude), 4326)::geography
    ) / 1000.0;

    -- Check if within service radius
    IF v_distance_km > COALESCE(v_practitioner.mobile_service_radius_km, 25) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Client location is %.1f km away, outside practitioner service radius of %s km', 
          v_distance_km, COALESCE(v_practitioner.mobile_service_radius_km, 25))
      );
    END IF;
  ELSIF v_practitioner.therapist_type = 'hybrid' THEN
    -- Hybrid: check distance from base or clinic (whichever is closer)
    DECLARE
      v_base_distance DECIMAL(10, 2);
      v_clinic_distance DECIMAL(10, 2);
    BEGIN
      IF v_practitioner.base_latitude IS NOT NULL AND v_practitioner.base_longitude IS NOT NULL THEN
        v_base_distance := ST_Distance(
          ST_SetSRID(ST_MakePoint(p_client_longitude, p_client_latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(v_practitioner.base_longitude, v_practitioner.base_latitude), 4326)::geography
        ) / 1000.0;
      END IF;

      IF v_practitioner.clinic_latitude IS NOT NULL AND v_practitioner.clinic_longitude IS NOT NULL THEN
        v_clinic_distance := ST_Distance(
          ST_SetSRID(ST_MakePoint(p_client_longitude, p_client_latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(v_practitioner.clinic_longitude, v_practitioner.clinic_latitude), 4326)::geography
        ) / 1000.0;
      END IF;

      -- Use minimum distance
      v_distance_km := LEAST(
        COALESCE(v_base_distance, 999999),
        COALESCE(v_clinic_distance, 999999)
      );

      -- Check if within service radius (base) or reasonable distance (clinic)
      IF v_base_distance IS NOT NULL AND v_base_distance <= COALESCE(v_practitioner.mobile_service_radius_km, 25) THEN
        -- Within base radius, OK
        NULL;
      ELSIF v_clinic_distance IS NOT NULL AND v_clinic_distance <= 50 THEN
        -- Within reasonable clinic distance, OK
        NULL;
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Client location is %.1f km away, outside practitioner service area', v_distance_km)
        );
      END IF;
    END;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Practitioner does not offer mobile services'
    );
  END IF;

  -- Calculate pricing (platform fee is 0.5%, same as standard bookings)
  -- Note: Stripe Connect automatically deducts additional 1.5% processing fee
  -- Total fee to practitioner: 2.0% (0.5% platform + 1.5% Stripe)
  v_total_price_pence := v_product.price_amount;
  v_platform_fee_pence := ROUND(v_total_price_pence * 0.005); -- 0.5% platform fee
  v_practitioner_earnings_pence := v_total_price_pence - v_platform_fee_pence;

  -- Create the request record
  INSERT INTO mobile_booking_requests (
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
    v_service_type,
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

  -- Create notification for practitioner
  PERFORM create_notification(
    p_practitioner_id,
    'booking_request',
    'New Mobile Booking Request',
    format('%s has requested a mobile session for %s on %s at %s', 
      v_client_name,
      v_product_name,
      p_requested_date,
      p_requested_start_time),
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
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 2. Update accept_mobile_booking_request to notify client
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
BEGIN
  -- Get request details
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
    AND mbr.status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found or not pending'
    );
  END IF;

  v_practitioner_name := COALESCE(
    TRIM(COALESCE(v_request.practitioner_first_name, '') || ' ' || COALESCE(v_request.practitioner_last_name, '')),
    'Your practitioner'
  );
  v_product_name := COALESCE(v_request.product_name, 'Service');

  -- Update request status and payment
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

-- 3. Update decline_mobile_booking_request to notify client
CREATE OR REPLACE FUNCTION public.decline_mobile_booking_request(
  p_request_id uuid,
  p_decline_reason text DEFAULT NULL,
  p_alternate_date date DEFAULT NULL,
  p_alternate_start_time time without time zone DEFAULT NULL,
  p_alternate_suggestions jsonb DEFAULT NULL,
  p_practitioner_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_practitioner_name TEXT;
  v_product_name TEXT;
  v_notification_body TEXT;
BEGIN
  -- Get request details
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
    AND mbr.status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found or not pending'
    );
  END IF;

  v_practitioner_name := COALESCE(
    TRIM(COALESCE(v_request.practitioner_first_name, '') || ' ' || COALESCE(v_request.practitioner_last_name, '')),
    'Your practitioner'
  );
  v_product_name := COALESCE(v_request.product_name, 'Service');

  -- Update request status
  UPDATE mobile_booking_requests
  SET 
    status = 'declined',
    payment_status = 'released',
    decline_reason = p_decline_reason,
    alternate_date = p_alternate_date,
    alternate_start_time = p_alternate_start_time,
    alternate_suggestions = COALESCE(p_alternate_suggestions, '[]'::jsonb),
    practitioner_notes = p_practitioner_notes,
    declined_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Build notification message
  v_notification_body := format('%s has declined your mobile session request for %s on %s at %s', 
    v_practitioner_name,
    v_product_name,
    v_request.requested_date,
    v_request.requested_start_time);

  IF p_decline_reason IS NOT NULL THEN
    v_notification_body := v_notification_body || format('. Reason: %s', p_decline_reason);
  END IF;

  IF p_alternate_date IS NOT NULL AND p_alternate_start_time IS NOT NULL THEN
    v_notification_body := v_notification_body || format(' Suggested alternate time: %s at %s', 
      p_alternate_date, 
      p_alternate_start_time);
  END IF;

  -- Create notification for client
  PERFORM create_notification(
    v_request.client_id,
    'booking_request',
    'Mobile Session Request Declined',
    v_notification_body,
    jsonb_build_object(
      'request_id', p_request_id,
      'practitioner_id', v_request.practitioner_id,
      'practitioner_name', v_practitioner_name,
      'product_id', v_request.product_id,
      'product_name', v_product_name,
      'requested_date', v_request.requested_date,
      'requested_start_time', v_request.requested_start_time,
      'decline_reason', p_decline_reason,
      'alternate_date', p_alternate_date,
      'alternate_start_time', p_alternate_start_time,
      'alternate_suggestions', COALESCE(p_alternate_suggestions, '[]'::jsonb),
      'practitioner_notes', p_practitioner_notes
    ),
    'mobile_booking_request',
    p_request_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
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

-- Add comments
COMMENT ON FUNCTION public.create_mobile_booking_request IS 'Creates a mobile booking request and notifies the practitioner';
COMMENT ON FUNCTION public.accept_mobile_booking_request IS 'Accepts a mobile booking request, creates a session, and notifies the client';
COMMENT ON FUNCTION public.decline_mobile_booking_request IS 'Declines a mobile booking request and notifies the client with optional alternate suggestions';
