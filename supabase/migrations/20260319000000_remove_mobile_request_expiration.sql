-- Remove 60-minute expiration from mobile booking requests.
-- Requests will no longer expire; they stay pending until accepted or declined.

-- 1) Make expire_mobile_requests a no-op (no longer expire by time)
CREATE OR REPLACE FUNCTION public.expire_mobile_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  return 0;
end;
$function$;

-- 2) Update create_mobile_booking_request: no expires_at, no TTL in conflict checks
--    Slot hold gets a long expires_at (session date + 30 days) so it stays active until accept/decline
CREATE OR REPLACE FUNCTION public.create_mobile_booking_request(
  p_client_id uuid,
  p_practitioner_id uuid,
  p_product_id uuid,
  p_requested_date date,
  p_requested_start_time time without time zone,
  p_duration_minutes integer,
  p_client_address text,
  p_client_latitude numeric,
  p_client_longitude numeric,
  p_client_notes text DEFAULT NULL,
  p_pre_assessment_payload jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_new_start timestamp;
  v_new_end timestamp;
  v_therapist_type text;
  v_conflict_count integer;
  v_hold_end_time time;
  v_hold_expires_at timestamptz;
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

  v_therapist_type := v_practitioner.therapist_type;

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
    return jsonb_build_object('success', false, 'error', 'Practitioner base location is not configured for mobile requests');
  end if;

  if v_practitioner.mobile_service_radius_km is null or v_practitioner.mobile_service_radius_km <= 0 then
    return jsonb_build_object('success', false, 'error', 'Practitioner mobile service radius is not configured');
  end if;

  -- Reuse existing pending request for same slot (no time-based expiry)
  select id into v_existing_request_id
  from public.mobile_booking_requests
  where client_id = p_client_id and practitioner_id = p_practitioner_id
    and requested_date = p_requested_date and requested_start_time = p_requested_start_time
    and status = 'pending'
  order by created_at desc limit 1;

  if v_existing_request_id is not null then
    return jsonb_build_object('success', true, 'request_id', v_existing_request_id, 'reused_existing_pending_request', true);
  end if;

  v_distance_km := st_distance(
    st_setsrid(st_makepoint(p_client_longitude, p_client_latitude), 4326)::geography,
    st_setsrid(st_makepoint(v_practitioner.base_longitude, v_practitioner.base_latitude), 4326)::geography
  ) / 1000.0;

  if v_distance_km > v_practitioner.mobile_service_radius_km then
    return jsonb_build_object('success', false, 'error',
      format('Client location is %.1f km away, outside practitioner service radius of %s km',
        v_distance_km, v_practitioner.mobile_service_radius_km));
  end if;

  v_new_start := p_requested_date::timestamp + p_requested_start_time;
  v_new_end   := v_new_start + (p_duration_minutes || ' minutes')::interval;

  select count(*) into v_conflict_count
  from public.client_sessions s
  cross join lateral (
    select
      (s.session_date::timestamp + s.start_time) as ex_start,
      (s.session_date::timestamp + s.start_time + (coalesce(s.duration_minutes, 60) || ' minutes')::interval) as ex_end
  ) ex
  where s.therapist_id = p_practitioner_id
    and s.session_date = p_requested_date
    and s.status in ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
    and (s.status <> 'pending_payment' or (s.expires_at is not null and s.expires_at > now()))
    and not (
      v_new_start >= ex.ex_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, coalesce(s.appointment_type, 'clinic'), 'mobile'
        )
      )
      or ex.ex_start >= v_new_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, 'mobile', coalesce(s.appointment_type, 'clinic')
        )
      )
    );

  if v_conflict_count > 0 then
    return jsonb_build_object('success', false, 'error',
      'Time slot conflicts with an existing booking. Please choose a different time.');
  end if;

  v_hold_expires_at := (p_requested_date + p_requested_start_time)::timestamptz + interval '30 days';

  select count(*) into v_conflict_count
  from public.slot_holds h
  where h.practitioner_id = p_practitioner_id
    and h.session_date = p_requested_date
    and h.status = 'active'
    and (h.expires_at is null or h.expires_at > now())
    and not (
      v_new_start >= (p_requested_date::timestamp + h.end_time)
      or (p_requested_date::timestamp + h.start_time) >= v_new_end
    );

  if v_conflict_count > 0 then
    return jsonb_build_object('success', false, 'error',
      'This time slot is temporarily held by another booking in progress. Please try again shortly.');
  end if;

  -- All pending mobile requests hold the slot (no time-based expiry)
  select count(*) into v_conflict_count
  from public.mobile_booking_requests m
  where m.practitioner_id = p_practitioner_id
    and m.requested_date = p_requested_date
    and m.status = 'pending'
    and not (
      v_new_start >= (p_requested_date::timestamp + m.requested_start_time + (m.duration_minutes || ' minutes')::interval)
      or (p_requested_date::timestamp + m.requested_start_time) >= v_new_end
    );

  if v_conflict_count > 0 then
    return jsonb_build_object('success', false, 'error',
      'Another mobile request is already pending for this time slot. Please choose a different time.');
  end if;

  select count(*) into v_conflict_count
  from public.calendar_events ce
  where ce.user_id = p_practitioner_id
    and ce.event_type in ('block', 'unavailable')
    and ce.status = 'confirmed'
    and ce.start_time < v_new_end
    and ce.end_time > v_new_start;

  if v_conflict_count > 0 then
    return jsonb_build_object('success', false, 'error',
      'Practitioner is unavailable at this time. Please choose a different time.');
  end if;

  select first_name, last_name into v_client from public.users where id = p_client_id;
  v_client_name := coalesce(nullif(trim(coalesce(v_client.first_name, '') || ' ' || coalesce(v_client.last_name, '')), ''), 'A client');
  v_product_name := coalesce(v_product.name, 'Service');
  v_total_price_pence := v_product.price_amount;
  v_platform_fee_pence := round(v_total_price_pence * 0.005);
  v_practitioner_earnings_pence := v_total_price_pence - v_platform_fee_pence;

  insert into public.mobile_booking_requests (
    client_id, practitioner_id, product_id, service_type,
    requested_date, requested_start_time, duration_minutes,
    client_address, client_latitude, client_longitude,
    total_price_pence, platform_fee_pence, practitioner_earnings_pence,
    payment_status, status, client_notes, pre_assessment_payload, expires_at
  ) values (
    p_client_id, p_practitioner_id, p_product_id, 'mobile',
    p_requested_date, p_requested_start_time, p_duration_minutes,
    p_client_address, p_client_latitude, p_client_longitude,
    v_total_price_pence, v_platform_fee_pence, v_practitioner_earnings_pence,
    'pending', 'pending', p_client_notes, p_pre_assessment_payload,
    null
  ) returning id into v_request_id;

  v_hold_end_time := p_requested_start_time + (p_duration_minutes || ' minutes')::interval;

  insert into public.slot_holds (
    practitioner_id, request_id, mobile_request_id,
    session_date, start_time, end_time, duration_minutes,
    expires_at, status
  ) values (
    p_practitioner_id, null, v_request_id,
    p_requested_date, p_requested_start_time, v_hold_end_time, p_duration_minutes,
    v_hold_expires_at, 'active'
  );

  perform public.create_notification(
    p_practitioner_id, 'booking_request', 'New Mobile Booking Request',
    format('%s has requested a mobile session for %s on %s at %s',
      v_client_name, v_product_name, p_requested_date, p_requested_start_time),
    jsonb_build_object(
      'request_id', v_request_id, 'client_id', p_client_id,
      'client_name', v_client_name, 'product_id', p_product_id,
      'product_name', v_product_name, 'requested_date', p_requested_date,
      'requested_start_time', p_requested_start_time,
      'client_address', p_client_address,
      'distance_km', round(v_distance_km::numeric, 2)
    ),
    'mobile_booking_request', v_request_id::text
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
    select id into v_existing_request_id
    from public.mobile_booking_requests
    where client_id = p_client_id and practitioner_id = p_practitioner_id
      and requested_date = p_requested_date and requested_start_time = p_requested_start_time
      and status = 'pending'
    order by created_at desc limit 1;
    return jsonb_build_object('success', true, 'request_id', v_existing_request_id, 'reused_existing_pending_request', true);
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$function$;

-- 3) Remove expires_at check from accept_mobile_booking_request
CREATE OR REPLACE FUNCTION public.accept_mobile_booking_request(
  p_request_id uuid,
  p_stripe_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_session_id UUID;
  v_practitioner_name TEXT;
  v_client_name TEXT;
  v_product_name TEXT;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
  v_therapist_type TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  SELECT
    mbr.*,
    u.first_name as practitioner_first_name,
    u.last_name as practitioner_last_name,
    u.therapist_type as therapist_type,
    pp.name as product_name
  INTO v_request
  FROM mobile_booking_requests mbr
  JOIN users u ON u.id = mbr.practitioner_id
  LEFT JOIN practitioner_products pp ON pp.id = mbr.product_id
  WHERE mbr.id = p_request_id
    AND mbr.status = 'pending'
  FOR UPDATE OF mbr;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not pending');
  END IF;

  v_practitioner_name := COALESCE(TRIM(COALESCE(v_request.practitioner_first_name, '') || ' ' || COALESCE(v_request.practitioner_last_name, '')), 'Your practitioner');
  v_product_name := COALESCE(v_request.product_name, 'Service');
  v_therapist_type := COALESCE(v_request.therapist_type, 'mobile');
  SELECT COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Client') INTO v_client_name
  FROM users u WHERE u.id = v_request.client_id;
  v_client_name := COALESCE(v_client_name, 'Client');

  v_booking_start := (v_request.requested_date || ' ' || v_request.requested_start_time)::TIMESTAMPTZ;
  v_booking_end := v_booking_start + (COALESCE(v_request.duration_minutes, 60) || ' minutes')::INTERVAL;

  SELECT COUNT(*) INTO v_conflict_count
  FROM client_sessions cs
  CROSS JOIN LATERAL (
    SELECT
      (cs.session_date::timestamp + cs.start_time) AS ex_start,
      (cs.session_date::timestamp + cs.start_time + (COALESCE(cs.duration_minutes, 60) || ' minutes')::interval) AS ex_end
  ) ex
  WHERE cs.therapist_id = v_request.practitioner_id
    AND cs.session_date = v_request.requested_date
    AND cs.status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
    AND (cs.status <> 'pending_payment' OR (cs.expires_at IS NOT NULL AND cs.expires_at > NOW()))
    AND NOT (
      v_booking_start >= ex.ex_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, COALESCE(cs.appointment_type, 'clinic'), 'mobile'
        )
      )
      OR ex.ex_start >= v_booking_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, 'mobile', COALESCE(cs.appointment_type, 'clinic')
        )
      )
    );

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'This time slot conflicts with an existing booking (including travel buffer). Please select another time.');
  END IF;

  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = v_request.practitioner_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND start_time < v_booking_end
    AND end_time > v_booking_start;

  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This time slot is blocked or unavailable. Please select another time.');
  END IF;

  UPDATE mobile_booking_requests
  SET status = 'accepted', payment_status = 'captured',
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      accepted_at = NOW(), updated_at = NOW()
  WHERE id = p_request_id;

  UPDATE slot_holds
  SET status = 'released', updated_at = NOW()
  WHERE mobile_request_id = p_request_id AND status = 'active';

  SELECT public.create_session_from_mobile_request(p_request_id) INTO v_session_id;

  IF v_session_id IS NULL THEN
    UPDATE mobile_booking_requests
    SET status = 'pending', payment_status = 'held', accepted_at = NULL, updated_at = NOW()
    WHERE id = p_request_id;
    UPDATE slot_holds
    SET status = 'active', updated_at = NOW()
    WHERE mobile_request_id = p_request_id AND status = 'released';
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create session');
  END IF;

  PERFORM create_notification(
    v_request.client_id, 'booking_confirmed', 'Mobile Session Request Accepted',
    format('%s has accepted your mobile session request for %s on %s at %s',
      v_practitioner_name, v_product_name,
      v_request.requested_date, v_request.requested_start_time),
    jsonb_build_object(
      'request_id', p_request_id, 'session_id', v_session_id,
      'practitioner_id', v_request.practitioner_id,
      'practitioner_name', v_practitioner_name,
      'product_id', v_request.product_id,
      'product_name', v_product_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request', p_request_id::text
  );

  PERFORM create_notification(
    v_request.practitioner_id, 'booking_confirmed', 'Mobile Session Confirmed',
    format('Session with %s on %s at %s is confirmed.',
      v_client_name, v_request.requested_date, v_request.requested_start_time),
    jsonb_build_object(
      'session_id', v_session_id, 'request_id', p_request_id,
      'client_name', v_client_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'product_name', v_product_name,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request', p_request_id::text
  );

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'request_id', p_request_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 4) Update prevent_overlapping_bookings: check only status='pending' for mobile conflict (no time filter)
CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_overlap_count INTEGER;
  v_new_start TIMESTAMP;
  v_new_end TIMESTAMP;
  v_therapist_type TEXT;
  v_mobile_conflict INTEGER;
BEGIN
  IF NEW.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NOT NULL AND NEW.expires_at <= NOW() THEN
    RETURN NEW;
  END IF;

  SELECT therapist_type INTO v_therapist_type
  FROM users
  WHERE id = NEW.therapist_id
  LIMIT 1;

  v_new_start := NEW.session_date::timestamp + NEW.start_time;
  v_new_end := v_new_start + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval;

  SELECT COUNT(*) INTO v_overlap_count
  FROM client_sessions s
  CROSS JOIN LATERAL (
    SELECT
      (s.session_date::timestamp + s.start_time) AS existing_start,
      (s.session_date::timestamp + s.start_time + (COALESCE(s.duration_minutes, 60) || ' minutes')::interval) AS existing_end
  ) ex
  WHERE s.therapist_id = NEW.therapist_id
    AND s.session_date = NEW.session_date
    AND s.status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
    AND (
      (s.status = 'pending_payment' AND s.expires_at IS NOT NULL AND s.expires_at > NOW())
      OR s.status <> 'pending_payment'
    )
    AND ((TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND s.id <> NEW.id))
    AND NOT (
      v_new_start >= ex.existing_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type,
          COALESCE(s.appointment_type, 'clinic'),
          COALESCE(NEW.appointment_type, 'clinic')
        )
      )
      OR ex.existing_start >= v_new_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type,
          COALESCE(NEW.appointment_type, 'clinic'),
          COALESCE(s.appointment_type, 'clinic')
        )
      )
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: Time slot overlaps or violates inter-session buffer'
      USING ERRCODE = '23505',
      HINT = 'Requires 15-minute gap by default and 30 minutes for hybrid mobile-to-clinic transitions.';
  END IF;

  -- Pending mobile requests hold the slot (no time-based expiry)
  SELECT COUNT(*) INTO v_mobile_conflict
  FROM mobile_booking_requests m
  WHERE m.practitioner_id = NEW.therapist_id
    AND m.requested_date = NEW.session_date
    AND m.status = 'pending'
    AND NOT (
      v_new_start >= (NEW.session_date::timestamp + m.requested_start_time + (m.duration_minutes || ' minutes')::interval)
      OR (NEW.session_date::timestamp + m.requested_start_time) >= v_new_end
    );

  IF v_mobile_conflict > 0 THEN
    RAISE EXCEPTION 'Booking conflict: A pending mobile request exists for this time slot'
      USING ERRCODE = '23505',
      HINT = 'A mobile booking request is pending for this time. Wait for it to be accepted or declined.';
  END IF;

  RETURN NEW;
END;
$function$;
