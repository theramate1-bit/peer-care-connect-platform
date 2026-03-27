-- Hybrid mobile eligibility: require real base_latitude/base_longitude for mobile requests.
-- Remove clinic fallback so UI and backend agree: hybrid without base cannot receive mobile requests.

create or replace function public.create_mobile_booking_request(
  p_client_id uuid,
  p_practitioner_id uuid,
  p_product_id uuid,
  p_requested_date date,
  p_requested_start_time time without time zone,
  p_duration_minutes integer,
  p_client_address text,
  p_client_latitude numeric,
  p_client_longitude numeric,
  p_client_notes text default null::text,
  p_pre_assessment_payload jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_practitioner record;
  v_product record;
  v_client record;
  v_distance_km decimal(10, 2);
  v_request_id uuid;
  v_total_price_pence integer;
  v_platform_fee_pence integer;
  v_practitioner_earnings_pence integer;
  v_client_name text;
  v_product_name text;
  v_existing_request_id uuid;
begin
  select id, therapist_type, base_latitude, base_longitude,
         mobile_service_radius_km, first_name, last_name
  into v_practitioner
  from public.users
  where id = p_practitioner_id
    and user_role in ('sports_therapist', 'osteopath', 'massage_therapist')
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Practitioner not found or inactive');
  end if;

  select id, price_amount, service_type, name
  into v_product
  from public.practitioner_products
  where id = p_product_id
    and practitioner_id = p_practitioner_id
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Product not found or inactive');
  end if;

  if v_product.service_type not in ('mobile', 'both') then
    return jsonb_build_object('success', false, 'error', 'This service is not available for mobile booking');
  end if;

  if v_practitioner.therapist_type not in ('mobile', 'hybrid') then
    return jsonb_build_object('success', false, 'error', 'Practitioner does not offer mobile services');
  end if;

  if p_client_latitude is null or p_client_longitude is null then
    return jsonb_build_object('success', false, 'error', 'Client location coordinates are required');
  end if;

  -- Require base_latitude/base_longitude for both mobile and hybrid (no clinic fallback).
  if v_practitioner.base_latitude is null or v_practitioner.base_longitude is null then
    return jsonb_build_object('success', false, 'error', 'Practitioner base location is not configured for mobile requests');
  end if;

  if v_practitioner.mobile_service_radius_km is null or v_practitioner.mobile_service_radius_km <= 0 then
    return jsonb_build_object('success', false, 'error', 'Practitioner mobile service radius is not configured');
  end if;

  -- Reuse an existing open pending request for the exact same slot.
  select id
  into v_existing_request_id
  from public.mobile_booking_requests
  where client_id = p_client_id
    and practitioner_id = p_practitioner_id
    and requested_date = p_requested_date
    and requested_start_time = p_requested_start_time
    and status = 'pending'
    and coalesce(expires_at, created_at + interval '60 minutes') > now()
  order by created_at desc
  limit 1;

  if v_existing_request_id is not null then
    return jsonb_build_object(
      'success', true,
      'request_id', v_existing_request_id,
      'reused_existing_pending_request', true
    );
  end if;

  v_distance_km := st_distance(
    st_setsrid(st_makepoint(p_client_longitude, p_client_latitude), 4326)::geography,
    st_setsrid(st_makepoint(v_practitioner.base_longitude, v_practitioner.base_latitude), 4326)::geography
  ) / 1000.0;

  if v_distance_km > v_practitioner.mobile_service_radius_km then
    return jsonb_build_object(
      'success', false,
      'error', format('Client location is %.1f km away, outside practitioner service radius of %s km', v_distance_km, v_practitioner.mobile_service_radius_km)
    );
  end if;

  select first_name, last_name into v_client
  from public.users
  where id = p_client_id;

  v_client_name := coalesce(nullif(trim(coalesce(v_client.first_name, '') || ' ' || coalesce(v_client.last_name, '')), ''), 'A client');
  v_product_name := coalesce(v_product.name, 'Service');

  v_total_price_pence := v_product.price_amount;
  v_platform_fee_pence := round(v_total_price_pence * 0.005);
  v_practitioner_earnings_pence := v_total_price_pence - v_platform_fee_pence;

  insert into public.mobile_booking_requests (
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
    client_notes,
    pre_assessment_payload,
    expires_at
  ) values (
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
    p_client_notes,
    p_pre_assessment_payload,
    now() + interval '60 minutes'
  ) returning id into v_request_id;

  perform public.create_notification(
    p_practitioner_id,
    'booking_request',
    'New Mobile Booking Request',
    format('%s has requested a mobile session for %s on %s at %s', v_client_name, v_product_name, p_requested_date, p_requested_start_time),
    jsonb_build_object(
      'request_id', v_request_id,
      'client_id', p_client_id,
      'client_name', v_client_name,
      'product_id', p_product_id,
      'product_name', v_product_name,
      'requested_date', p_requested_date,
      'requested_start_time', p_requested_start_time,
      'client_address', p_client_address,
      'distance_km', round(v_distance_km::numeric, 2)
    ),
    'mobile_booking_request',
    v_request_id::text
  );

  return jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'distance_km', round(v_distance_km::numeric, 2),
    'total_price_pence', v_total_price_pence,
    'platform_fee_pence', v_platform_fee_pence,
    'practitioner_earnings_pence', v_practitioner_earnings_pence,
    'reused_existing_pending_request', false
  );
exception
  when unique_violation then
    select id
    into v_existing_request_id
    from public.mobile_booking_requests
    where client_id = p_client_id
      and practitioner_id = p_practitioner_id
      and requested_date = p_requested_date
      and requested_start_time = p_requested_start_time
      and status = 'pending'
    order by created_at desc
    limit 1;

    return jsonb_build_object(
      'success', true,
      'request_id', v_existing_request_id,
      'reused_existing_pending_request', true
    );
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$function$;

comment on function public.create_mobile_booking_request(uuid, uuid, uuid, date, time, integer, text, numeric, numeric, text, jsonb) is
  'Creates a mobile booking request. Requires base_latitude/base_longitude for both mobile and hybrid practitioners; no clinic fallback.';
