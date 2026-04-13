-- List candidate slots for booking the reciprocal exchange session (recipient books with requester as therapist).
-- Uses requester's practitioner_availability.working_hours (SECURITY DEFINER) and excludes overlapping sessions.

CREATE OR REPLACE FUNCTION public.get_exchange_reciprocal_available_slots(
  p_request_id uuid,
  p_recipient_id uuid,
  p_from_date date DEFAULT CURRENT_DATE,
  p_day_count integer DEFAULT 14
)
RETURNS TABLE(session_date date, start_time time)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req record;
  v_mes record;
  v_therapist uuid;
  v_wh jsonb;
  v_deadline_date date;
  v_duration integer;
  v_day_count integer;
  d date;
  v_day_key text;
  v_enabled boolean;
  v_day_start time;
  v_day_end time;
  v_slot_start time;
  v_slot_end time;
  v_step interval := interval '30 minutes';
  v_buf_mins integer := 15;
  v_now time;
  v_today date;
  v_count integer := 0;
  v_max_slots integer := 240;
  v_tz text;
  v_default_wh jsonb := '{
    "monday":{"enabled":true,"start":"09:00","end":"17:00"},
    "tuesday":{"enabled":true,"start":"09:00","end":"17:00"},
    "wednesday":{"enabled":true,"start":"09:00","end":"17:00"},
    "thursday":{"enabled":true,"start":"09:00","end":"17:00"},
    "friday":{"enabled":true,"start":"09:00","end":"17:00"},
    "saturday":{"enabled":false,"start":"10:00","end":"15:00"},
    "sunday":{"enabled":false,"start":"10:00","end":"15:00"}
  }'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  IF p_recipient_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_day_count := LEAST(GREATEST(COALESCE(p_day_count, 14), 1), 30);

  SELECT * INTO v_req
  FROM public.treatment_exchange_requests
  WHERE id = p_request_id
    AND recipient_id = p_recipient_id
    AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not accepted';
  END IF;

  SELECT * INTO v_mes
  FROM public.mutual_exchange_sessions
  WHERE exchange_request_id = p_request_id;

  IF NOT FOUND OR v_mes.practitioner_b_booked = true THEN
    RAISE EXCEPTION 'Nothing to book';
  END IF;

  v_therapist := v_req.requester_id;
  v_duration := COALESCE(v_req.duration_minutes, 60);

  v_deadline_date := (
    COALESCE(v_req.reciprocal_booking_deadline, v_req.accepted_at + interval '7 days')
  )::date;

  SELECT pa.working_hours INTO v_wh
  FROM public.practitioner_availability pa
  WHERE pa.user_id = v_therapist;

  IF v_wh IS NULL OR jsonb_typeof(v_wh) <> 'object' THEN
    v_wh := v_default_wh;
  END IF;

  SELECT COALESCE(
    (SELECT pa.timezone FROM public.practitioner_availability pa WHERE pa.user_id = v_therapist LIMIT 1),
    'Europe/London'
  ) INTO v_tz;
  IF trim(COALESCE(v_tz, '')) = '' THEN
    v_tz := 'Europe/London';
  END IF;

  v_today := (CURRENT_TIMESTAMP AT TIME ZONE v_tz)::date;
  v_now := (CURRENT_TIMESTAMP AT TIME ZONE v_tz)::time;

  d := p_from_date;
  WHILE d < p_from_date + v_day_count AND v_count < v_max_slots LOOP
    IF d > v_deadline_date THEN
      EXIT;
    END IF;

    v_day_key := CASE EXTRACT(DOW FROM d)::integer
      WHEN 0 THEN 'sunday'
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
      ELSE 'monday'
    END;
    v_enabled := COALESCE((v_wh->v_day_key->>'enabled')::boolean, false);
    IF v_enabled THEN
      BEGIN
        v_day_start := (v_wh->v_day_key->>'start')::time;
        v_day_end := (v_wh->v_day_key->>'end')::time;
      EXCEPTION WHEN OTHERS THEN
        v_enabled := false;
      END;
    END IF;

    IF v_enabled AND v_day_start IS NOT NULL AND v_day_end IS NOT NULL AND v_day_start < v_day_end THEN
      v_slot_start := v_day_start;
      WHILE v_slot_start + make_interval(mins => v_duration) <= v_day_end AND v_count < v_max_slots LOOP
        v_slot_end := v_slot_start + make_interval(mins => v_duration);

        IF d = v_today AND v_slot_start < v_now THEN
          v_slot_start := v_slot_start + v_step;
          CONTINUE;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.client_sessions s
          CROSS JOIN LATERAL (
            SELECT
              (s.session_date::timestamp + s.start_time) AS existing_start,
              (s.session_date::timestamp + s.start_time
                + make_interval(mins => COALESCE(s.duration_minutes, 60))) AS existing_end
          ) ex
          WHERE s.therapist_id = v_therapist
            AND s.session_date = d
            AND s.status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
            AND (
              s.status <> 'pending_payment'
              OR (s.expires_at IS NOT NULL AND s.expires_at > now())
            )
            AND NOT (
              (d::timestamp + v_slot_start) >= ex.existing_end + make_interval(mins => v_buf_mins)
              OR ex.existing_start >= (d::timestamp + v_slot_end) + make_interval(mins => v_buf_mins)
            )
        ) AND NOT EXISTS (
          SELECT 1
          FROM public.mobile_booking_requests m
          WHERE m.practitioner_id = v_therapist
            AND m.requested_date = d
            AND m.status = 'pending'
            AND NOT (
              (d::timestamp + v_slot_start) >= (d::timestamp + m.requested_start_time
                + make_interval(mins => COALESCE(m.duration_minutes, 60)))
              OR (d::timestamp + m.requested_start_time) >= (d::timestamp + v_slot_end)
            )
        ) THEN
          session_date := d;
          start_time := v_slot_start;
          RETURN NEXT;
          v_count := v_count + 1;
        END IF;

        v_slot_start := v_slot_start + v_step;
      END LOOP;
    END IF;

    d := d + 1;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_exchange_reciprocal_available_slots(uuid, uuid, date, integer)
  TO authenticated, service_role;
