-- 1) Add client_id to get_guest_mobile_requests_by_email so guests can receive expiry emails
-- 2) Add location (client_address) to create_session_from_mobile_request for session reminders

-- 1. Add client_id to guest mobile requests (for expiry email trigger)
-- Must drop first because return type changes (adding client_id column)
DROP FUNCTION IF EXISTS public.get_guest_mobile_requests_by_email(text, text);

CREATE OR REPLACE FUNCTION public.get_guest_mobile_requests_by_email(
  p_email text,
  p_status text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid,
  client_id uuid,
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
  expires_at timestamp with time zone,
  stripe_payment_intent_id text,
  session_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    mbr.id,
    mbr.client_id,
    mbr.practitioner_id,
    TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS practitioner_name,
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
    mbr.expires_at,
    mbr.stripe_payment_intent_id,
    mbr.session_id
  FROM public.mobile_booking_requests mbr
  INNER JOIN public.users c ON c.id = mbr.client_id
  INNER JOIN public.users u ON u.id = mbr.practitioner_id
  LEFT JOIN public.practitioner_products pp ON pp.id = mbr.product_id
  WHERE LOWER(c.email) = LOWER(TRIM(p_email))
    AND (p_status IS NULL OR mbr.status = p_status)
  ORDER BY mbr.created_at DESC;
END;
$function$;

-- 2. Add location (visit address) to sessions created from mobile requests - for session reminder emails
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
    is_guest_booking,
    location
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

COMMENT ON FUNCTION public.get_guest_mobile_requests_by_email IS 'Guest view of mobile requests; includes client_id for expiry email';
COMMENT ON FUNCTION public.create_session_from_mobile_request IS 'Creates client_sessions from mobile request with client_name, email, location (visit address)';
