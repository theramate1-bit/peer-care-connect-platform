create or replace function public.get_practitioner_mobile_requests(
  p_practitioner_id uuid,
  p_status text default null
)
returns table(
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
language plpgsql
security definer
as $function$
begin
  return query
  select
    mbr.id,
    mbr.client_id,
    concat(u.first_name, ' ', u.last_name)::text as client_name,
    u.email::text as client_email,
    mbr.product_id,
    pp.name::text as product_name,
    mbr.service_type,
    mbr.requested_date,
    mbr.requested_start_time,
    mbr.duration_minutes,
    mbr.client_address,
    mbr.client_latitude,
    mbr.client_longitude,
    (
      case
        when mbr.client_latitude is not null and mbr.client_longitude is not null
             and p.base_latitude is not null and p.base_longitude is not null then
          st_distance(
            st_setsrid(st_makepoint(mbr.client_longitude, mbr.client_latitude), 4326)::geography,
            st_setsrid(st_makepoint(p.base_longitude, p.base_latitude), 4326)::geography
          ) / 1000.0
        else null
      end
    )::numeric as distance_from_base_km,
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
  from mobile_booking_requests mbr
  inner join users u on mbr.client_id = u.id
  inner join users p on mbr.practitioner_id = p.id
  left join practitioner_products pp on mbr.product_id = pp.id
  where mbr.practitioner_id = p_practitioner_id
    and (p_status is null or mbr.status = p_status)
  order by mbr.requested_date asc, mbr.requested_start_time asc;
end;
$function$;
