-- Mobile booking journey hardening:
-- 1) strict mobile/hybrid distance + therapist type checks (no fallback radius)
-- 2) traceable linkage from request -> session
-- 3) expiry notifications and cron schedule
-- 4) guest request status read function

ALTER TABLE public.mobile_booking_requests
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.client_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expired_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_email_sent_at TIMESTAMPTZ;

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

CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session_id UUID;
  v_request RECORD;
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
    practitioner_amount
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
    v_request.practitioner_earnings_pence / 100.0
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

CREATE OR REPLACE FUNCTION public.expire_mobile_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_expired_count INTEGER := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT
      mbr.id,
      mbr.client_id,
      mbr.practitioner_id,
      mbr.requested_date,
      mbr.requested_start_time,
      mbr.product_id,
      pp.name AS product_name,
      u.first_name AS practitioner_first_name,
      u.last_name AS practitioner_last_name
    FROM public.mobile_booking_requests mbr
    LEFT JOIN public.practitioner_products pp ON pp.id = mbr.product_id
    LEFT JOIN public.users u ON u.id = mbr.practitioner_id
    WHERE mbr.status = 'pending'
      AND mbr.expires_at IS NOT NULL
      AND mbr.expires_at < NOW()
  LOOP
    UPDATE public.mobile_booking_requests
    SET
      status = 'expired',
      payment_status = CASE
        WHEN payment_status = 'held' THEN 'released'
        ELSE payment_status
      END,
      expired_notified_at = NOW(),
      updated_at = NOW()
    WHERE id = v_row.id;

    PERFORM public.create_notification(
      v_row.client_id,
      'booking_request',
      'Mobile Session Request Expired',
      format(
        'Your mobile session request for %s on %s at %s has expired.',
        COALESCE(v_row.product_name, 'Service'),
        v_row.requested_date,
        v_row.requested_start_time
      ),
      jsonb_build_object(
        'request_id', v_row.id,
        'practitioner_id', v_row.practitioner_id,
        'practitioner_name', TRIM(COALESCE(v_row.practitioner_first_name, '') || ' ' || COALESCE(v_row.practitioner_last_name, '')),
        'product_id', v_row.product_id,
        'product_name', COALESCE(v_row.product_name, 'Service'),
        'requested_date', v_row.requested_date,
        'requested_start_time', v_row.requested_start_time
      ),
      'mobile_booking_request',
      v_row.id::text
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN v_expired_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_guest_mobile_requests_by_email(
  p_email text,
  p_status text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid,
  practitioner_id uuid,
  practitioner_name text,
  product_id uuid,
  product_name text,
  service_type text,
  requested_date date,
  requested_start_time time without time zone,
  duration_minutes integer,
  client_address text,
  total_price_pence integer,
  payment_status text,
  status text,
  decline_reason text,
  alternate_date date,
  alternate_start_time time without time zone,
  alternate_suggestions jsonb,
  client_notes text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    mbr.id,
    mbr.practitioner_id,
    CONCAT(u.first_name, ' ', u.last_name) AS practitioner_name,
    mbr.product_id,
    pp.name AS product_name,
    mbr.service_type,
    mbr.requested_date,
    mbr.requested_start_time,
    mbr.duration_minutes,
    mbr.client_address,
    mbr.total_price_pence,
    mbr.payment_status,
    mbr.status,
    mbr.decline_reason,
    mbr.alternate_date,
    mbr.alternate_start_time,
    mbr.alternate_suggestions,
    mbr.client_notes,
    mbr.created_at,
    mbr.expires_at
  FROM public.mobile_booking_requests mbr
  INNER JOIN public.users c ON c.id = mbr.client_id
  INNER JOIN public.users u ON u.id = mbr.practitioner_id
  LEFT JOIN public.practitioner_products pp ON pp.id = mbr.product_id
  WHERE LOWER(c.email) = LOWER(TRIM(p_email))
    AND (p_status IS NULL OR mbr.status = p_status)
  ORDER BY mbr.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_guest_mobile_requests_by_email(text, text) TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire_mobile_requests_job') THEN
      PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'expire_mobile_requests_job' LIMIT 1));
    END IF;

    PERFORM cron.schedule(
      'expire_mobile_requests_job',
      '*/15 * * * *',
      'SELECT public.expire_mobile_requests();'
    );
  END IF;
END $$;
