-- P0 guest/mobile parity: correct is_guest_booking on mobile session creation,
-- guest_view_token on guest session links, extend guest mobile request listing.

-- 1) Sessions created from accepted mobile requests: honour guest users + issue view token
CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id UUID;
  v_request RECORD;
  v_is_guest BOOLEAN := false;
BEGIN
  SELECT
    mbr.*,
    COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Client') AS client_name,
    COALESCE(u.email, '') AS client_email,
    (u.user_role = 'guest') AS is_guest_user
  INTO v_request
  FROM public.mobile_booking_requests mbr
  LEFT JOIN public.users u ON u.id = mbr.client_id
  WHERE mbr.id = request_id
    AND mbr.status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not accepted';
  END IF;

  v_is_guest := COALESCE(v_request.is_guest_user, false);

  INSERT INTO public.client_sessions (
    therapist_id, client_id, client_name, client_email,
    session_date, start_time, duration_minutes, session_type,
    status, price, payment_status, stripe_payment_intent_id,
    platform_fee_amount, practitioner_amount,
    is_guest_booking,
    appointment_type, visit_address,
    guest_view_token
  ) VALUES (
    v_request.practitioner_id,
    v_request.client_id,
    COALESCE(v_request.client_name, 'Client'),
    COALESCE(NULLIF(TRIM(v_request.client_email), ''), 'no-email@placeholder.local'),
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
    v_is_guest,
    'mobile',
    v_request.client_address,
    CASE WHEN v_is_guest THEN encode(gen_random_bytes(32), 'hex') ELSE NULL END
  )
  RETURNING id INTO v_session_id;

  UPDATE public.mobile_booking_requests
  SET session_id = v_session_id, updated_at = NOW()
  WHERE id = request_id;

  RETURN v_session_id;
END;
$function$;

-- 2) Extend guest mobile request list with guest_view_token (preserve existing columns)
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
  session_id uuid,
  guest_view_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    mbr.session_id,
    cs.guest_view_token
  FROM public.mobile_booking_requests mbr
  INNER JOIN public.users c ON c.id = mbr.client_id
  INNER JOIN public.users u ON u.id = mbr.practitioner_id
  LEFT JOIN public.practitioner_products pp ON pp.id = mbr.product_id
  LEFT JOIN public.client_sessions cs ON cs.id = mbr.session_id
  WHERE LOWER(c.email) = LOWER(TRIM(p_email))
    AND (p_status IS NULL OR mbr.status = p_status)
  ORDER BY mbr.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_guest_mobile_requests_by_email(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_mobile_requests_by_email(text, text) TO authenticated;

-- 3) Secure session link for guest "View session" after acceptance
CREATE OR REPLACE FUNCTION public.get_guest_mobile_request_session_link(
  p_request_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_session_id uuid;
  v_token text;
BEGIN
  SELECT mbr.session_id, cs.guest_view_token
  INTO v_session_id, v_token
  FROM public.mobile_booking_requests mbr
  INNER JOIN public.users u ON u.id = mbr.client_id
  LEFT JOIN public.client_sessions cs ON cs.id = mbr.session_id
  WHERE mbr.id = p_request_id
    AND lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(p_email, '')))
    AND mbr.status = 'accepted'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Accepted request with session not found for this email'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'guest_view_token', v_token
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_guest_mobile_request_session_link(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_mobile_request_session_link(uuid, text) TO authenticated;
