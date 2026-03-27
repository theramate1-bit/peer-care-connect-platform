-- Set appointment_type and visit_address when creating sessions.
-- 1) create_session_from_mobile_request: set 'mobile' and client_address.
-- 2) create_booking_with_validation: accept p_appointment_type (default 'clinic'), p_visit_address (default null) and set on insert.
-- Requires: 20260309_add_appointment_type_and_visit_address.sql (client_sessions columns).

-- 1) Mobile path: when creating a session from an accepted mobile request, set appointment_type = 'mobile' and visit_address = client_address.
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

  RETURN v_session_id;
END;
$function$;
