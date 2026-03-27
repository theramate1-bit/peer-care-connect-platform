create or replace function public.accept_mobile_booking_request(
  p_request_id uuid,
  p_stripe_payment_intent_id text
)
returns jsonb
language plpgsql
security definer
as $function$
declare
  v_request record;
  v_session_id uuid;
  v_practitioner_name text;
  v_product_name text;
  v_effective_payment_intent_id text;
  v_previous_payment_status text;
begin
  select
    mbr.*,
    u.first_name as practitioner_first_name,
    u.last_name as practitioner_last_name,
    pp.name as product_name
  into v_request
  from mobile_booking_requests mbr
  join users u on u.id = mbr.practitioner_id
  left join practitioner_products pp on pp.id = mbr.product_id
  where mbr.id = p_request_id
    and mbr.status = 'pending';

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Request not found or not pending'
    );
  end if;

  if coalesce(v_request.payment_status, 'pending') not in ('held', 'captured') then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment authorization hold is not completed'
    );
  end if;

  v_effective_payment_intent_id := coalesce(nullif(p_stripe_payment_intent_id, ''), v_request.stripe_payment_intent_id);
  if v_effective_payment_intent_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Missing stripe payment intent id'
    );
  end if;

  v_previous_payment_status := v_request.payment_status;

  v_practitioner_name := coalesce(
    trim(coalesce(v_request.practitioner_first_name, '') || ' ' || coalesce(v_request.practitioner_last_name, '')),
    'Your practitioner'
  );
  v_product_name := coalesce(v_request.product_name, 'Service');

  update mobile_booking_requests
  set
    status = 'accepted',
    payment_status = 'captured',
    stripe_payment_intent_id = v_effective_payment_intent_id,
    accepted_at = now(),
    updated_at = now()
  where id = p_request_id;

  select create_session_from_mobile_request(p_request_id)
  into v_session_id;

  if v_session_id is null then
    update mobile_booking_requests
    set
      status = 'pending',
      payment_status = coalesce(v_previous_payment_status, 'pending'),
      accepted_at = null,
      updated_at = now()
    where id = p_request_id;

    return jsonb_build_object(
      'success', false,
      'error', 'Failed to create session'
    );
  end if;

  perform create_notification(
    v_request.client_id,
    'booking_confirmed',
    'Mobile Session Request Accepted',
    format('%s has accepted your mobile session request for %s on %s at %s',
      v_practitioner_name,
      v_product_name,
      v_request.requested_date,
      v_request.requested_start_time),
    jsonb_build_object(
      'request_id', p_request_id,
      'session_id', v_session_id,
      'practitioner_id', v_request.practitioner_id,
      'practitioner_name', v_practitioner_name,
      'product_id', v_request.product_id,
      'product_name', v_product_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request',
    p_request_id::text
  );

  return jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'request_id', p_request_id
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', sqlerrm
    );
end;
$function$;

create or replace function public.create_session_from_mobile_request(request_id uuid)
returns uuid
language plpgsql
security definer
as $function$
declare
  v_session_id uuid;
  v_request record;
  v_client record;
  v_payload jsonb;
  v_client_name text;
begin
  select * into v_request
  from public.mobile_booking_requests
  where id = request_id
    and status = 'accepted';

  if not found then
    raise exception 'Request not found or not accepted';
  end if;

  select id, email, first_name, last_name
  into v_client
  from public.users
  where id = v_request.client_id;

  v_client_name := coalesce(
    nullif(trim(coalesce(v_client.first_name, '') || ' ' || coalesce(v_client.last_name, '')), ''),
    'Client'
  );

  insert into public.client_sessions (
    therapist_id,
    client_id,
    client_name,
    client_email,
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
    visit_address,
    is_guest_booking
  ) values (
    v_request.practitioner_id,
    v_request.client_id,
    v_client_name,
    v_client.email,
    v_request.requested_date,
    v_request.requested_start_time,
    v_request.duration_minutes,
    (select name from public.practitioner_products where id = v_request.product_id),
    'confirmed',
    v_request.total_price_pence / 100.0,
    'completed',
    v_request.stripe_payment_intent_id,
    v_request.platform_fee_pence / 100.0,
    v_request.practitioner_earnings_pence / 100.0,
    'mobile',
    v_request.client_address,
    false
  ) returning id into v_session_id;

  update public.mobile_booking_requests
  set session_id = v_session_id, updated_at = now()
  where id = request_id;

  v_payload := v_request.pre_assessment_payload;
  if v_payload is not null and jsonb_typeof(v_payload) = 'object' then
    if not exists (
      select 1
      from public.pre_assessment_forms paf
      where paf.session_id = v_session_id
        and paf.completed_at is not null
    ) then
      insert into public.pre_assessment_forms (
        session_id, client_id, client_email, client_name,
        name, date_of_birth, contact_email, contact_phone,
        gp_name, gp_address, current_medical_conditions, past_medical_history,
        area_of_body, time_scale, how_issue_began, activities_affected,
        body_map_markers, is_guest_booking, is_initial_session,
        completed_at, created_at, updated_at
      ) values (
        v_session_id,
        v_request.client_id,
        coalesce(v_client.email, ''),
        v_client_name,
        nullif(v_payload->>'name', ''),
        nullif(v_payload->>'date_of_birth', '')::date,
        nullif(v_payload->>'contact_email', ''),
        nullif(v_payload->>'contact_phone', ''),
        nullif(v_payload->>'gp_name', ''),
        nullif(v_payload->>'gp_address', ''),
        nullif(v_payload->>'current_medical_conditions', ''),
        nullif(v_payload->>'past_medical_history', ''),
        nullif(v_payload->>'area_of_body', ''),
        nullif(v_payload->>'time_scale', ''),
        nullif(v_payload->>'how_issue_began', ''),
        nullif(v_payload->>'activities_affected', ''),
        coalesce(v_payload->'body_map_markers', '[]'::jsonb),
        (v_client.id is null),
        coalesce((v_payload->>'required')::boolean, true),
        now(), now(), now()
      );
    end if;
  end if;

  return v_session_id;
end;
$function$;
