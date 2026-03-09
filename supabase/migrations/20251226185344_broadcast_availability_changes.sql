-- Create database triggers for broadcasting availability changes
-- Uses PostgreSQL NOTIFY/LISTEN for real-time updates

-- Trigger function to notify when bookings change
CREATE OR REPLACE FUNCTION notify_booking_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify on INSERT
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'availability_changes',
      jsonb_build_object(
        'practitioner_id', NEW.therapist_id,
        'session_date', NEW.session_date,
        'change_type', 'booking_created',
        'session_id', NEW.id,
        'status', NEW.status
      )::text
    );
    RETURN NEW;
  END IF;

  -- Notify on UPDATE (status changes, cancellations, etc.)
  IF TG_OP = 'UPDATE' THEN
    -- Only notify if status or time changed
    IF OLD.status != NEW.status OR 
       OLD.session_date != NEW.session_date OR 
       OLD.start_time != NEW.start_time OR
       OLD.duration_minutes != NEW.duration_minutes THEN
      PERFORM pg_notify(
        'availability_changes',
        jsonb_build_object(
          'practitioner_id', NEW.therapist_id,
          'session_date', NEW.session_date,
          'change_type', 'booking_updated',
          'session_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        )::text
      );
      
      -- Also notify for old date if date changed
      IF OLD.session_date != NEW.session_date THEN
        PERFORM pg_notify(
          'availability_changes',
          jsonb_build_object(
            'practitioner_id', OLD.therapist_id,
            'session_date', OLD.session_date,
            'change_type', 'booking_removed',
            'session_id', OLD.id
          )::text
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Notify on DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify(
      'availability_changes',
      jsonb_build_object(
        'practitioner_id', OLD.therapist_id,
        'session_date', OLD.session_date,
        'change_type', 'booking_deleted',
        'session_id', OLD.id
      )::text
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking changes
DROP TRIGGER IF EXISTS trg_notify_booking_changes ON client_sessions;
CREATE TRIGGER trg_notify_booking_changes
AFTER INSERT OR UPDATE OR DELETE ON client_sessions
FOR EACH ROW
EXECUTE FUNCTION notify_booking_changes();

-- Trigger function to notify when blocked time changes
CREATE OR REPLACE FUNCTION notify_blocked_time_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_current_date DATE;
BEGIN
  -- Notify on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Only notify for block/unavailable events
    IF NEW.event_type IN ('block', 'unavailable') AND NEW.status = 'confirmed' THEN
      v_start_date := NEW.start_time::date;
      v_end_date := NEW.end_time::date;
      
      -- Notify for each day the block spans
      v_current_date := v_start_date;
      WHILE v_current_date <= v_end_date LOOP
        PERFORM pg_notify(
          'availability_changes',
          jsonb_build_object(
            'practitioner_id', NEW.user_id,
            'session_date', v_current_date,
            'change_type', 'blocked_time_added',
            'event_id', NEW.id,
            'event_type', NEW.event_type
          )::text
        );
        v_current_date := v_current_date + INTERVAL '1 day';
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  -- Notify on UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Notify if event_type, status, or time changed
    IF (OLD.event_type IN ('block', 'unavailable') OR NEW.event_type IN ('block', 'unavailable')) AND
       (OLD.status != NEW.status OR 
        OLD.start_time != NEW.start_time OR 
        OLD.end_time != NEW.end_time OR
        OLD.event_type != NEW.event_type) THEN
      
      -- Notify removal from old dates
      IF OLD.event_type IN ('block', 'unavailable') AND OLD.status = 'confirmed' THEN
        v_start_date := OLD.start_time::date;
        v_end_date := OLD.end_time::date;
        v_current_date := v_start_date;
        WHILE v_current_date <= v_end_date LOOP
          PERFORM pg_notify(
            'availability_changes',
            jsonb_build_object(
              'practitioner_id', OLD.user_id,
              'session_date', v_current_date,
              'change_type', 'blocked_time_removed',
              'event_id', OLD.id
            )::text
          );
          v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
      END IF;
      
      -- Notify addition to new dates
      IF NEW.event_type IN ('block', 'unavailable') AND NEW.status = 'confirmed' THEN
        v_start_date := NEW.start_time::date;
        v_end_date := NEW.end_time::date;
        v_current_date := v_start_date;
        WHILE v_current_date <= v_end_date LOOP
          PERFORM pg_notify(
            'availability_changes',
            jsonb_build_object(
              'practitioner_id', NEW.user_id,
              'session_date', v_current_date,
              'change_type', 'blocked_time_added',
              'event_id', NEW.id,
              'event_type', NEW.event_type
            )::text
          );
          v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Notify on DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.event_type IN ('block', 'unavailable') AND OLD.status = 'confirmed' THEN
      v_start_date := OLD.start_time::date;
      v_end_date := OLD.end_time::date;
      v_current_date := v_start_date;
      WHILE v_current_date <= v_end_date LOOP
        PERFORM pg_notify(
          'availability_changes',
          jsonb_build_object(
            'practitioner_id', OLD.user_id,
            'session_date', v_current_date,
            'change_type', 'blocked_time_removed',
            'event_id', OLD.id
          )::text
        );
        v_current_date := v_current_date + INTERVAL '1 day';
      END LOOP;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for blocked time changes
DROP TRIGGER IF EXISTS trg_notify_blocked_time_changes ON calendar_events;
CREATE TRIGGER trg_notify_blocked_time_changes
AFTER INSERT OR UPDATE OR DELETE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION notify_blocked_time_changes();

