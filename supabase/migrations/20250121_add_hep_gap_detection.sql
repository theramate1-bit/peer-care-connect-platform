-- Add HEP Gap Detection
-- Identifies periods with no exercise completions

-- Create function to detect exercise gaps
CREATE OR REPLACE FUNCTION detect_exercise_gaps(
  p_program_id UUID,
  p_gap_threshold_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  gap_start_date DATE,
  gap_end_date DATE,
  gap_days INTEGER,
  expected_completions INTEGER,
  actual_completions INTEGER
) AS $$
DECLARE
  v_program RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_frequency INTEGER;
  v_total_exercises INTEGER;
  v_current_date DATE;
  v_last_completion_date DATE;
  v_gap_start DATE;
BEGIN
  -- Get program details
  SELECT * INTO v_program
  FROM home_exercise_programs
  WHERE id = p_program_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_start_date := COALESCE(v_program.start_date, CURRENT_DATE);
  v_end_date := COALESCE(v_program.end_date, CURRENT_DATE);
  v_frequency := v_program.frequency_per_week;
  
  -- Get number of exercises
  SELECT jsonb_array_length(exercises) INTO v_total_exercises
  FROM home_exercise_programs
  WHERE id = p_program_id;

  IF v_total_exercises IS NULL OR v_total_exercises = 0 THEN
    v_total_exercises := 1;
  END IF;

  -- Get all completion dates for this program
  v_current_date := v_start_date;
  v_last_completion_date := NULL;
  v_gap_start := NULL;

  -- Iterate through dates from start to end (or current date)
  WHILE v_current_date <= LEAST(v_end_date, CURRENT_DATE) LOOP
    -- Check if there are any completions on this date
    DECLARE
      v_completions_on_date INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_completions_on_date
      FROM exercise_program_progress
      WHERE program_id = p_program_id
        AND completed_date = v_current_date;

      -- If no completions and we're past the threshold, start tracking a gap
      IF v_completions_on_date = 0 THEN
        IF v_gap_start IS NULL THEN
          -- Check if we're far enough from last completion to start a gap
          IF v_last_completion_date IS NULL OR 
             (v_current_date - v_last_completion_date) >= p_gap_threshold_days THEN
            v_gap_start := v_current_date;
          END IF;
        END IF;
      ELSE
        -- We have completions - if we were tracking a gap, record it
        IF v_gap_start IS NOT NULL THEN
          RETURN QUERY SELECT
            v_gap_start,
            v_current_date - INTERVAL '1 day',
            (v_current_date - v_gap_start)::INTEGER,
            -- Expected completions during gap period
            ((v_current_date - v_gap_start) / 7.0 * v_frequency * v_total_exercises)::INTEGER,
            -- Actual completions (0)
            0;
          v_gap_start := NULL;
        END IF;
        v_last_completion_date := v_current_date;
      END IF;
    END;

    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  -- If we're still tracking a gap at the end, record it
  IF v_gap_start IS NOT NULL THEN
    RETURN QUERY SELECT
      v_gap_start,
      LEAST(v_end_date, CURRENT_DATE),
      (LEAST(v_end_date, CURRENT_DATE) - v_gap_start + 1)::INTEGER,
      ((LEAST(v_end_date, CURRENT_DATE) - v_gap_start + 1) / 7.0 * v_frequency * v_total_exercises)::INTEGER,
      0;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION detect_exercise_gaps(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_exercise_gaps(UUID, INTEGER) TO service_role;

-- Add comment
COMMENT ON FUNCTION detect_exercise_gaps IS 'Detects periods with no exercise completions for a given program, with configurable gap threshold in days';

