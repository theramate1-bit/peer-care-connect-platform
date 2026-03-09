-- Prevent double bookings at database level
-- Uses unique partial index and trigger validation

-- Create unique partial index to prevent exact time slot conflicts
-- Only applies to active bookings (not cancelled/completed)
-- Note: expires_at check is handled by triggers, not index predicate (NOW() is not immutable)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_sessions_no_double_booking 
ON client_sessions(therapist_id, session_date, start_time) 
WHERE status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment');

-- Create composite index for overlap checking performance
-- Note: expires_at check is handled by triggers, not index predicate (NOW() is not immutable)
CREATE INDEX IF NOT EXISTS idx_client_sessions_overlap_check 
ON client_sessions(therapist_id, session_date, status) 
WHERE status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment');

-- Create trigger function to validate no overlapping bookings
CREATE OR REPLACE FUNCTION prevent_overlapping_bookings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overlap_count INTEGER;
  v_new_start TIMESTAMPTZ;
  v_new_end TIMESTAMPTZ;
BEGIN
  -- Only validate for active statuses
  IF NEW.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment') THEN
    RETURN NEW;
  END IF;

  -- Skip if expires_at has passed (expired pending_payment)
  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NOT NULL AND NEW.expires_at <= NOW() THEN
    RETURN NEW;
  END IF;

  -- Calculate booking time range
  v_new_start := (NEW.session_date::text || ' ' || NEW.start_time::text)::timestamptz;
  v_new_end := v_new_start + (NEW.duration_minutes || ' minutes')::interval;

  -- Check for overlapping bookings (excluding current row on UPDATE)
  SELECT COUNT(*) INTO v_overlap_count
  FROM client_sessions
  WHERE therapist_id = NEW.therapist_id
    AND session_date = NEW.session_date
    AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
    AND (
      -- Exclude expired pending_payment sessions
      (status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW())
      OR status != 'pending_payment'
    )
    AND (
      -- Exclude current row on UPDATE
      (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND id != NEW.id)
    )
    AND (
      -- Overlap condition: existing_start < new_end AND existing_end > new_start
      (start_time::time < v_new_end::time)
      AND ((start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval) > v_new_start::time)
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: Time slot overlaps with existing booking'
      USING ERRCODE = '23505',
      HINT = 'Another booking exists for this time slot';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent overlapping bookings
DROP TRIGGER IF EXISTS trg_prevent_overlapping_bookings ON client_sessions;
CREATE TRIGGER trg_prevent_overlapping_bookings
BEFORE INSERT OR UPDATE ON client_sessions
FOR EACH ROW
EXECUTE FUNCTION prevent_overlapping_bookings();

-- Create trigger function to validate blocked time
CREATE OR REPLACE FUNCTION prevent_blocked_time_bookings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked_count INTEGER;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
BEGIN
  -- Only validate for active statuses
  IF NEW.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment') THEN
    RETURN NEW;
  END IF;

  -- Calculate booking time range
  v_booking_start := (NEW.session_date::text || ' ' || NEW.start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (NEW.duration_minutes || ' minutes')::interval;

  -- Check for blocked/unavailable time
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = NEW.therapist_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND (
      -- Block overlaps if: block_start < booking_end AND block_end > booking_start
      start_time < v_booking_end
      AND end_time > v_booking_start
    );

  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: Time slot is blocked or unavailable'
      USING ERRCODE = '23505',
      HINT = 'This time slot has been blocked by the practitioner';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent blocked time bookings
DROP TRIGGER IF EXISTS trg_prevent_blocked_time_bookings ON client_sessions;
CREATE TRIGGER trg_prevent_blocked_time_bookings
BEFORE INSERT OR UPDATE ON client_sessions
FOR EACH ROW
EXECUTE FUNCTION prevent_blocked_time_bookings();

