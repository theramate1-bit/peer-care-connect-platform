-- RPC function to get next available slot for rebooking
-- Returns the earliest available time slot matching the session requirements

CREATE OR REPLACE FUNCTION get_next_available_slot(
  p_practitioner_id UUID,
  p_duration_minutes INTEGER,
  p_service_id UUID DEFAULT NULL,
  p_preferred_time TIME DEFAULT NULL,
  p_min_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  session_date DATE,
  start_time TIME,
  duration_minutes INTEGER
) AS $$
DECLARE
  v_availability RECORD;
  v_working_hours JSONB;
  v_day_schedule JSONB;
  v_check_date DATE;
  v_day_of_week TEXT;
  v_time_block JSONB;
  v_time_str TEXT;
  v_start_str TEXT;
  v_end_str TEXT;
  v_start_hour INT;
  v_start_min INT;
  v_end_hour INT;
  v_end_min INT;
  v_check_hour INT;
  v_check_min INT := 0;
  v_time_slot TIME;
  v_conflict_count INT;
BEGIN
  -- Get practitioner availability
  SELECT working_hours, timezone
  INTO v_availability
  FROM practitioner_availability
  WHERE user_id = p_practitioner_id
  LIMIT 1;

  -- If no availability found, return empty
  IF v_availability IS NULL OR v_availability.working_hours IS NULL THEN
    RETURN;
  END IF;

  v_working_hours := v_availability.working_hours;

  -- Search up to 30 days ahead
  FOR day_offset IN 0..29 LOOP
    v_check_date := p_min_date + day_offset;
    v_day_of_week := LOWER(TO_CHAR(v_check_date, 'Day'));
    v_day_of_week := TRIM(v_day_of_week);

    -- Get schedule for this day of week
    v_day_schedule := v_working_hours->v_day_of_week;

    -- Skip if day not enabled or no hours configured
    IF v_day_schedule IS NULL OR 
       (v_day_schedule->>'enabled')::boolean IS NOT TRUE OR 
       v_day_schedule->'hours' IS NULL OR
       jsonb_array_length(v_day_schedule->'hours') = 0 THEN
      CONTINUE;
    END IF;

    -- Loop through time blocks for this day
    FOR v_time_block IN SELECT * FROM jsonb_array_elements(v_day_schedule->'hours')
    LOOP
      v_start_str := v_time_block->>'start';
      v_end_str := v_time_block->>'end';
      
      -- Parse start time
      v_start_hour := SPLIT_PART(v_start_str, ':', 1)::INT;
      v_start_min := SPLIT_PART(v_start_str, ':', 2)::INT;
      
      -- Parse end time
      v_end_hour := SPLIT_PART(v_end_str, ':', 1)::INT;
      v_end_min := SPLIT_PART(v_end_str, ':', 2)::INT;

      -- Check each hour slot in this time block
      v_check_hour := v_start_hour;
      WHILE v_check_hour < v_end_hour OR (v_check_hour = v_end_hour AND v_check_min < v_end_min) LOOP
        v_time_slot := MAKE_TIME(v_check_hour, v_check_min, 0);
        
        -- Check for conflicts with existing bookings
        SELECT COUNT(*) INTO v_conflict_count
        FROM client_sessions
        WHERE therapist_id = p_practitioner_id
          AND session_date = v_check_date
          AND status IN ('scheduled', 'in-progress', 'confirmed')
          AND (
            -- Booking starts before our slot ends
            start_time::time < (v_time_slot + (p_duration_minutes * INTERVAL '1 minute'))
            -- AND booking ends after our slot starts
            AND (start_time::time + (COALESCE(duration_minutes, 60) * INTERVAL '1 minute')) > v_time_slot
          );
        
        -- If no conflicts, this slot is available
        IF v_conflict_count = 0 THEN
          session_date := v_check_date;
          start_time := v_time_slot;
          duration_minutes := p_duration_minutes;
          RETURN NEXT;
          RETURN;
        END IF;

        -- Move to next hour slot (increment by 1 hour)
        v_check_hour := v_check_hour + 1;
        IF v_check_hour >= 24 THEN
          EXIT; -- End of day
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_next_available_slot TO authenticated;
