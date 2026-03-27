-- Align DB-level booking conflict checks with shared scheduling model:
-- - booking conflict uses overlap + directional buffer
-- - blocked time uses direct overlap only
-- - directional 30-minute buffer applies only for hybrid mobile->clinic

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
BEGIN
  -- Only validate for active statuses
  IF NEW.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment') THEN
    RETURN NEW;
  END IF;

  -- Skip if expires_at has passed (expired pending_payment)
  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NOT NULL AND NEW.expires_at <= NOW() THEN
    RETURN NEW;
  END IF;

  SELECT therapist_type INTO v_therapist_type
  FROM users
  WHERE id = NEW.therapist_id
  LIMIT 1;

  -- Calculate new booking range
  v_new_start := NEW.session_date::timestamp + NEW.start_time;
  v_new_end := v_new_start + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval;

  -- Conflict if neither directional-gap condition holds:
  -- 1) new starts sufficiently after existing ends, OR
  -- 2) existing starts sufficiently after new ends.
  -- Gap uses shared helper: default 15m, 30m only for hybrid mobile->clinic.
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

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_blocked_time_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_blocked_count INTEGER;
  v_booking_start TIMESTAMP;
  v_booking_end TIMESTAMP;
BEGIN
  -- Only validate for active statuses
  IF NEW.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment') THEN
    RETURN NEW;
  END IF;

  -- Calculate booking time range
  v_booking_start := NEW.session_date::timestamp + NEW.start_time;
  v_booking_end := v_booking_start + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval;

  -- Blocked-time overlap is direct overlap only (no added buffer)
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = NEW.therapist_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND start_time < v_booking_end
    AND end_time > v_booking_start;

  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'Blocked time conflict: Time slot is unavailable'
      USING ERRCODE = '23505',
      HINT = 'This period overlaps practitioner blocked or unavailable time.';
  END IF;

  RETURN NEW;
END;
$function$;
