-- Enforce 60-minute TTL and dedupe pending mobile booking requests.

-- 1) Deduplicate existing pending requests per slot: keep newest, expire older duplicates.
with ranked as (
  select
    id,
    row_number() over (
      partition by client_id, practitioner_id, requested_date, requested_start_time
      order by created_at desc, id desc
    ) as rn
  from public.mobile_booking_requests
  where status = 'pending'
)
update public.mobile_booking_requests m
set
  status = 'expired',
  payment_status = case when m.payment_status = 'held' then 'released' else m.payment_status end,
  expires_at = coalesce(m.expires_at, now()),
  expired_notified_at = coalesce(m.expired_notified_at, now()),
  updated_at = now()
from ranked r
where m.id = r.id
  and r.rn > 1;

-- 2) Expire any pending request past 60 minutes.
update public.mobile_booking_requests
set
  status = 'expired',
  payment_status = case when payment_status = 'held' then 'released' else payment_status end,
  expires_at = coalesce(expires_at, created_at + interval '60 minutes'),
  expired_notified_at = coalesce(expired_notified_at, now()),
  updated_at = now()
where status = 'pending'
  and coalesce(expires_at, created_at + interval '60 minutes') <= now();

-- 3) Backfill TTL for all remaining pending requests.
update public.mobile_booking_requests
set
  expires_at = created_at + interval '60 minutes',
  updated_at = now()
where status = 'pending'
  and expires_at is null;

-- 4) Ensure DB-level uniqueness for open pending slot per client+practitioner+datetime.
create unique index if not exists uq_mobile_pending_request_slot
  on public.mobile_booking_requests (client_id, practitioner_id, requested_date, requested_start_time)
  where status = 'pending';

-- 5) Recreate create_mobile_booking_request with duplicate guard + 60-min TTL.
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
  select id, therapist_type, base_latitude, base_longitude, mobile_service_radius_km, first_name, last_name
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

  if v_practitioner.base_latitude is null or v_practitioner.base_longitude is null then
    return jsonb_build_object('success', false, 'error', 'Practitioner base location is not configured');
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
  )
  returning id into v_request_id;

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

-- 6) Recreate expiry function to enforce implicit 60-min TTL even when expires_at is null.
create or replace function public.expire_mobile_requests()
returns integer
language plpgsql
security definer
as $function$
declare
  v_expired_count integer := 0;
  v_row record;
begin
  for v_row in
    select
      mbr.id,
      mbr.client_id,
      mbr.practitioner_id,
      mbr.requested_date,
      mbr.requested_start_time,
      mbr.product_id,
      pp.name as product_name,
      u.first_name as practitioner_first_name,
      u.last_name as practitioner_last_name
    from public.mobile_booking_requests mbr
    left join public.practitioner_products pp on pp.id = mbr.product_id
    left join public.users u on u.id = mbr.practitioner_id
    where mbr.status = 'pending'
      and coalesce(mbr.expires_at, mbr.created_at + interval '60 minutes') < now()
  loop
    update public.mobile_booking_requests
    set
      status = 'expired',
      payment_status = case when payment_status = 'held' then 'released' else payment_status end,
      expires_at = coalesce(expires_at, created_at + interval '60 minutes'),
      expired_notified_at = now(),
      updated_at = now()
    where id = v_row.id;

    perform public.create_notification(
      v_row.client_id,
      'booking_request',
      'Mobile Session Request Expired',
      format(
        'Your mobile session request for %s on %s at %s has expired.',
        coalesce(v_row.product_name, 'Service'),
        v_row.requested_date,
        v_row.requested_start_time
      ),
      jsonb_build_object(
        'request_id', v_row.id,
        'practitioner_id', v_row.practitioner_id,
        'practitioner_name', trim(coalesce(v_row.practitioner_first_name, '') || ' ' || coalesce(v_row.practitioner_last_name, '')),
        'product_id', v_row.product_id,
        'product_name', coalesce(v_row.product_name, 'Service'),
        'requested_date', v_row.requested_date,
        'requested_start_time', v_row.requested_start_time
      ),
      'mobile_booking_request',
      v_row.id::text
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$function$;
