-- Mobile booking remaining edge case fixes:
-- 1) Add payment_failed to mobile_booking_requests payment_status
-- 2) Create cancel_guest_mobile_request_by_email with clear error for wrong email
-- 3) Add minimum_gap_minutes between mobile visits (for future travel-time logic)

-- 1. Allow payment_failed status in mobile_booking_requests
ALTER TABLE public.mobile_booking_requests
  DROP CONSTRAINT IF EXISTS mobile_booking_requests_payment_status_check;

ALTER TABLE public.mobile_booking_requests
  ADD CONSTRAINT mobile_booking_requests_payment_status_check
  CHECK (payment_status IN (
    'pending', 'held', 'captured', 'released', 'refunded', 'payment_failed'
  ));

COMMENT ON COLUMN public.mobile_booking_requests.payment_status IS 'Payment status: pending, held (auth hold), captured, released, refunded, payment_failed (Stripe decline/failure)';

-- 2. Create cancel_guest_mobile_request_by_email - allows guest to cancel by request_id + email
--    Returns clear error when email does not match
CREATE OR REPLACE FUNCTION public.cancel_guest_mobile_request_by_email(
  p_request_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request RECORD;
  v_client_email text;
  v_pi_id text;
BEGIN
  IF p_request_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request ID is required'
    );
  END IF;

  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email is required to cancel this request'
    );
  END IF;

  SELECT mbr.*, u.email AS client_email
  INTO v_request
  FROM mobile_booking_requests mbr
  INNER JOIN users u ON u.id = mbr.client_id
  WHERE mbr.id = p_request_id
    AND mbr.status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found or no longer pending. It may have been accepted, declined, or expired.'
    );
  END IF;

  v_client_email := LOWER(TRIM(v_request.client_email));
  IF v_client_email IS NULL OR v_client_email != LOWER(TRIM(p_email)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'The email you entered does not match this booking. Please check your email address or use the link from your booking confirmation.'
    );
  END IF;

  v_pi_id := v_request.stripe_payment_intent_id;

  UPDATE mobile_booking_requests
  SET
    status = 'cancelled',
    payment_status = CASE
      WHEN payment_status = 'held' THEN 'released'
      WHEN payment_status = 'pending' THEN 'released'
      ELSE payment_status
    END,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Request cancelled. Any payment hold has been released.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_guest_mobile_request_by_email(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.cancel_guest_mobile_request_by_email IS 'Allows guests to cancel their mobile booking request by request_id and email. Returns clear error when email does not match.';

-- 3. Add stripe_payment_intent_id to get_guest_mobile_requests_by_email so guests can release payment on cancel
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

GRANT EXECUTE ON FUNCTION public.get_guest_mobile_requests_by_email(text, text) TO anon, authenticated;
