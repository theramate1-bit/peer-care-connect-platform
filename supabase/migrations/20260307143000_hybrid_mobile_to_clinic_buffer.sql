-- Hybrid-only directional buffer:
-- - default 15 minutes
-- - 30 minutes only when earlier session is mobile and later session is clinic
--   for therapist_type = 'hybrid'

CREATE OR REPLACE FUNCTION public.get_directional_booking_buffer_minutes(
  p_therapist_type text,
  p_earlier_appointment_type text,
  p_later_appointment_type text
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_therapist_type = 'hybrid'
      AND COALESCE(p_earlier_appointment_type, 'clinic') = 'mobile'
      AND COALESCE(p_later_appointment_type, 'clinic') = 'clinic'
    THEN 30
    ELSE 15
  END;
$$;

DO $$
DECLARE
  fn_def text;
  new_def text;
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
    RAISE NOTICE 'create_booking_with_validation with p_appointment_type not found; skipping buffer patch.';
    RETURN;
  END IF;

  IF position('v_requested_appointment_type TEXT' in fn_def) > 0
     AND position('CONFLICT_BOOKING_BUFFER' in fn_def) > 0 THEN
    RAISE NOTICE 'create_booking_with_validation already includes directional buffer patch.';
    RETURN;
  END IF;

  new_def := fn_def;

  -- Add new declaration variables.
  new_def := replace(
    new_def,
    '  v_client_tier TEXT;',
    '  v_client_tier TEXT;
  v_therapist_type TEXT;
  v_requested_appointment_type TEXT;'
  );

  -- Resolve practitioner therapist_type + requested appointment type once.
  new_def := replace(
    new_def,
    '  v_booking_end := v_booking_start + (p_duration_minutes || '' minutes'')::interval;',
    '  v_booking_end := v_booking_start + (p_duration_minutes || '' minutes'')::interval;

  v_requested_appointment_type := COALESCE(NULLIF(TRIM(p_appointment_type), ''''), ''clinic'');

  SELECT therapist_type INTO v_therapist_type
  FROM users
  WHERE id = p_therapist_id
  LIMIT 1;'
  );

  -- Insert directional buffer check before the legacy overlap check.
  new_def := replace(
    new_def,
    '-- Check for existing bookings (prevents race conditions)',
    '-- Directional buffer conflict check (hybrid mobile->clinic = 30, everything else = 15)
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id
    FROM client_sessions
    WHERE therapist_id = p_therapist_id
      AND session_date = p_session_date
      AND status IN (''scheduled'', ''confirmed'', ''in_progress'', ''pending_payment'')
      AND (
        (status = ''pending_payment'' AND expires_at IS NOT NULL AND expires_at > NOW())
        OR status != ''pending_payment''
      )
      AND (
        -- Direct overlap
        (
          p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || '' minutes'')::interval)
          AND (p_start_time::time + (p_duration_minutes || '' minutes'')::interval) > start_time::time
        )
        OR
        -- Requested booking starts after existing booking:
        -- required gap depends on existing -> requested direction.
        (
          p_start_time::time >= (start_time::time + (COALESCE(duration_minutes, 60) || '' minutes'')::interval)
          AND p_start_time::time < (
            (start_time::time + (COALESCE(duration_minutes, 60) || '' minutes'')::interval)
            + make_interval(
              mins => public.get_directional_booking_buffer_minutes(
                v_therapist_type,
                COALESCE(appointment_type, ''clinic''),
                v_requested_appointment_type
              )
            )
          )
        )
        OR
        -- Existing booking starts after requested booking:
        -- required gap depends on requested -> existing direction.
        (
          start_time::time >= (p_start_time::time + (p_duration_minutes || '' minutes'')::interval)
          AND start_time::time < (
            (p_start_time::time + (p_duration_minutes || '' minutes'')::interval)
            + make_interval(
              mins => public.get_directional_booking_buffer_minutes(
                v_therapist_type,
                v_requested_appointment_type,
                COALESCE(appointment_type, ''clinic'')
              )
            )
          )
        )
      )
    FOR UPDATE
  ) directional_locked_rows;

  IF v_conflict_count > 0 THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = ''conflict_booking'',
          error_code = ''CONFLICT_BOOKING_BUFFER'',
          error_message = ''This time slot conflicts with an existing booking or required transition buffer. Please select another time.''
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if table doesn''t exist
    END;

    RETURN jsonb_build_object(
      ''success'', false,
      ''error_code'', ''CONFLICT_BOOKING'',
      ''error_message'', ''This time slot is already booked or requires more transition time. Please select another time.''
    );
  END IF;

  -- Check for existing bookings (prevents race conditions)'
  );

  EXECUTE new_def;
  RAISE NOTICE 'create_booking_with_validation patched with directional hybrid buffer logic.';
END $$;
