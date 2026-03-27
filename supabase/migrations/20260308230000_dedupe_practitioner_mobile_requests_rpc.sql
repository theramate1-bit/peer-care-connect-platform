DROP FUNCTION IF EXISTS public.get_practitioner_mobile_requests(uuid, text);

CREATE OR REPLACE FUNCTION public.get_practitioner_mobile_requests(
  p_practitioner_id uuid,
  p_status text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid,
  client_id uuid,
  client_name text,
  client_email text,
  product_id uuid,
  product_name text,
  service_type text,
  requested_date date,
  requested_start_time time without time zone,
  duration_minutes integer,
  client_address text,
  client_latitude numeric,
  client_longitude numeric,
  distance_from_base_km numeric,
  total_price_pence integer,
  stripe_payment_intent_id text,
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
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      mbr.id,
      mbr.client_id,
      concat(u.first_name, ' ', u.last_name)::text AS client_name,
      u.email::text AS client_email,
      mbr.product_id,
      pp.name::text AS product_name,
      mbr.service_type,
      mbr.requested_date,
      mbr.requested_start_time,
      mbr.duration_minutes,
      mbr.client_address,
      mbr.client_latitude,
      mbr.client_longitude,
      (
        CASE
          WHEN mbr.client_latitude IS NOT NULL
               AND mbr.client_longitude IS NOT NULL
               AND p.base_latitude IS NOT NULL
               AND p.base_longitude IS NOT NULL THEN
            st_distance(
              st_setsrid(st_makepoint(mbr.client_longitude, mbr.client_latitude), 4326)::geography,
              st_setsrid(st_makepoint(p.base_longitude, p.base_latitude), 4326)::geography
            ) / 1000.0
          ELSE NULL
        END
      )::numeric AS distance_from_base_km,
      mbr.total_price_pence,
      mbr.stripe_payment_intent_id::text,
      mbr.payment_status,
      mbr.status,
      mbr.decline_reason,
      mbr.alternate_date,
      mbr.alternate_start_time,
      mbr.alternate_suggestions,
      mbr.client_notes,
      mbr.created_at,
      mbr.expires_at,
      row_number() OVER (
        PARTITION BY
          mbr.practitioner_id,
          mbr.client_id,
          mbr.product_id,
          mbr.requested_date,
          mbr.requested_start_time,
          mbr.status
        ORDER BY mbr.created_at DESC, mbr.id DESC
      ) AS rn
    FROM mobile_booking_requests mbr
    INNER JOIN users u ON mbr.client_id = u.id
    INNER JOIN users p ON mbr.practitioner_id = p.id
    LEFT JOIN practitioner_products pp ON mbr.product_id = pp.id
    WHERE mbr.practitioner_id = p_practitioner_id
      AND (p_status IS NULL OR mbr.status = p_status)
  )
  SELECT
    ranked.id,
    ranked.client_id,
    ranked.client_name,
    ranked.client_email,
    ranked.product_id,
    ranked.product_name,
    ranked.service_type,
    ranked.requested_date,
    ranked.requested_start_time,
    ranked.duration_minutes,
    ranked.client_address,
    ranked.client_latitude,
    ranked.client_longitude,
    ranked.distance_from_base_km,
    ranked.total_price_pence,
    ranked.stripe_payment_intent_id,
    ranked.payment_status,
    ranked.status,
    ranked.decline_reason,
    ranked.alternate_date,
    ranked.alternate_start_time,
    ranked.alternate_suggestions,
    ranked.client_notes,
    ranked.created_at,
    ranked.expires_at
  FROM ranked
  WHERE ranked.rn = 1
  ORDER BY ranked.requested_date ASC, ranked.requested_start_time ASC, ranked.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_practitioner_mobile_requests(uuid, text) TO authenticated, service_role;
