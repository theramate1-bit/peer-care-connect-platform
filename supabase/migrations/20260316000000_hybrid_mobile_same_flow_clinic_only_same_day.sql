-- Hybrid mobile bookings must follow the mobile flow (create_mobile_booking_request → Accept/Decline).
-- Same-day approval is for CLINIC bookings only. Mobile uses the mobile request flow in "New Bookings".
-- See docs/product/HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md

-- 1. Ensure get_pending_same_day_bookings only returns clinic sessions.
--    Mobile sessions must never appear in Same Day Booking Approval.
DO $$
DECLARE
  fn_def text;
  new_def text;
  already_has_filter boolean;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO fn_def
  FROM pg_proc p
  WHERE proname = 'get_pending_same_day_bookings'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;

  IF fn_def IS NULL OR fn_def = '' THEN
    RAISE NOTICE 'get_pending_same_day_bookings not found; create it with clinic-only filter.';
    EXECUTE 'CREATE OR REPLACE FUNCTION public.get_pending_same_day_bookings(p_practitioner_id uuid)
    RETURNS TABLE (
      id uuid,
      client_id uuid,
      client_name text,
      client_email text,
      session_date date,
      start_time time,
      duration_minutes integer,
      session_type text,
      price numeric,
      payment_status text,
      stripe_payment_intent_id text,
      approval_expires_at timestamptz,
      created_at timestamptz,
      notes text
    )
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
      SELECT
        cs.id,
        cs.client_id,
        COALESCE(cs.client_name, trim(u.first_name || '' '' || u.last_name), ''Client'')::text,
        cs.client_email,
        cs.session_date,
        cs.start_time,
        cs.duration_minutes,
        cs.session_type,
        cs.price,
        cs.payment_status,
        cs.stripe_payment_intent_id,
        cs.approval_expires_at,
        cs.created_at,
        cs.notes
      FROM client_sessions cs
      LEFT JOIN users u ON u.id = cs.client_id
      WHERE cs.therapist_id = p_practitioner_id
        AND cs.status = ''pending_approval''
        AND (cs.appointment_type IS NULL OR cs.appointment_type = ''clinic'')
      ORDER BY cs.session_date, cs.start_time;
    $body$';
    RETURN;
  END IF;

  already_has_filter := (
    position('appointment_type' in fn_def) > 0
    AND (position('clinic' in fn_def) > 0 OR position('''clinic''' in fn_def) > 0)
  );
  IF already_has_filter THEN
    RAISE NOTICE 'get_pending_same_day_bookings already filters clinic; skip.';
    RETURN;
  END IF;

  -- Try to inject filter before ORDER BY or at end of WHERE
  -- Pattern: "cs.status = 'pending_approval'" or "status = 'pending_approval'"
  new_def := regexp_replace(
    fn_def,
    '(\s+(AND\s+)?cs\.therapist_id\s*=\s*p_practitioner_id\s+AND\s+cs\.status\s*=\s*''pending_approval'')(\s+)',
    E'\\1\n    AND (cs.appointment_type IS NULL OR cs.appointment_type = ''clinic'')\\3',
    1,
    1,
    'n'
  );
  IF new_def = fn_def THEN
    new_def := regexp_replace(
      fn_def,
      '(\s+status\s*=\s*''pending_approval'')(\s+)',
      E'\\1\n    AND (appointment_type IS NULL OR appointment_type = ''clinic'')\\2',
      1,
      1,
      'n'
    );
  END IF;
  IF new_def IS NOT NULL AND new_def <> fn_def THEN
    EXECUTE new_def;
    RAISE NOTICE 'get_pending_same_day_bookings: added clinic-only filter.';
  ELSE
    RAISE NOTICE 'get_pending_same_day_bookings: could not inject filter; function structure may vary. Consider manual update.';
  END IF;
END $$;

-- 2. Reject same-day mobile via create_booking_with_validation.
--    Client-initiated mobile (including hybrid) must use create_mobile_booking_request.
DO $$
DECLARE
  fn_def text;
  new_def text;
  search_str text;
  insert_str text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_booking_with_validation'
    AND p.proargnames @> ARRAY['p_appointment_type']::text[]
  ORDER BY p.oid DESC
  LIMIT 1;

  IF fn_def IS NULL OR fn_def = '' THEN
    RAISE NOTICE 'create_booking_with_validation (24-param) not found; skip same-day mobile reject.';
    RETURN;
  END IF;

  IF position('SAME_DAY_MOBILE_USE_REQUEST_FLOW' IN fn_def) > 0 THEN
    RAISE NOTICE 'create_booking_with_validation already rejects same-day mobile; skip.';
    RETURN;
  END IF;

  search_str := 'v_requested_appointment_type := COALESCE(NULLIF(TRIM(p_appointment_type), ''''), ''clinic'');';
  insert_str := search_str || E'\n\n  -- Hybrid mobile must use create_mobile_booking_request, not same-day approval.\n  IF v_requested_appointment_type = ''mobile'' AND p_session_date = CURRENT_DATE THEN\n    RETURN jsonb_build_object(''success'', false, ''error_code'', ''SAME_DAY_MOBILE_USE_REQUEST_FLOW'', ''error_message'', ''Mobile sessions for today must use Request Visit to My Location.'');\n  END IF;';

  new_def := replace(fn_def, search_str, insert_str);

  IF new_def = fn_def THEN
    RAISE NOTICE 'create_booking_with_validation: could not find injection point for same-day mobile reject.';
    RETURN;
  END IF;

  EXECUTE new_def;
  RAISE NOTICE 'create_booking_with_validation: added same-day mobile rejection (must use request flow).';
END $$;
