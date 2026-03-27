-- Fix: client_sessions has no "location" column.
-- create_session_from_mobile_request was inserting into location; use visit_address only.
CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id UUID;
  v_request RECORD;
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

  INSERT INTO public.client_sessions (
    therapist_id, client_id, client_name, client_email,
    session_date, start_time, duration_minutes, session_type,
    status, price, payment_status, stripe_payment_intent_id,
    platform_fee_amount, practitioner_amount,
    is_guest_booking,
    appointment_type, visit_address
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
    false,
    'mobile',
    v_request.client_address
  )
  RETURNING id INTO v_session_id;

  UPDATE public.mobile_booking_requests
  SET session_id = v_session_id, updated_at = NOW()
  WHERE id = request_id;

  RETURN v_session_id;
END;
$function$;
