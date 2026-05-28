-- Extend authenticated client mobile request listing with guest_view_token for "View session".

DROP FUNCTION IF EXISTS public.get_client_mobile_requests(uuid, text);

CREATE OR REPLACE FUNCTION public.get_client_mobile_requests(
  p_client_id uuid,
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
  INNER JOIN public.users u ON u.id = mbr.practitioner_id
  LEFT JOIN public.practitioner_products pp ON pp.id = mbr.product_id
  LEFT JOIN public.client_sessions cs ON cs.id = mbr.session_id
  WHERE mbr.client_id = p_client_id
    AND (p_status IS NULL OR mbr.status = p_status)
  ORDER BY mbr.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_client_mobile_requests(uuid, text) TO authenticated;
