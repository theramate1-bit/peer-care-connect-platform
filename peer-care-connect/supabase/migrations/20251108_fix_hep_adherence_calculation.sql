-- Fix HEP Adherence Calculation
-- Updates calculate_program_adherence to count exercise completions, not unique dates
-- Also accounts for multiple exercises per program in expected completions

CREATE OR REPLACE FUNCTION calculate_program_adherence(p_program_id UUID)
RETURNS JSON AS $$
DECLARE
  v_program RECORD;
  v_total_exercises INTEGER;
  v_completed_exercises INTEGER;
  v_adherence_percent DECIMAL;
  v_start_date DATE;
  v_days_since_start INTEGER;
  v_expected_completions DECIMAL;
BEGIN
  SELECT * INTO v_program
  FROM home_exercise_programs
  WHERE id = p_program_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Program not found');
  END IF;
  
  v_start_date := COALESCE(v_program.start_date, CURRENT_DATE);
  v_days_since_start := GREATEST(0, CURRENT_DATE - v_start_date);
  
  -- Calculate number of exercises in program from JSONB array
  SELECT jsonb_array_length(exercises) INTO v_total_exercises
  FROM home_exercise_programs
  WHERE id = p_program_id;
  
  -- If no exercises, set to 1 to avoid division by zero
  IF v_total_exercises IS NULL OR v_total_exercises = 0 THEN
    v_total_exercises := 1;
  END IF;
  
  -- Calculate expected completions: (days / 7) * frequency * exercises
  -- This accounts for multiple exercises in the program
  v_expected_completions := (v_days_since_start / 7.0) * v_program.frequency_per_week * v_total_exercises;
  
  -- Count total exercise completions (not just unique dates)
  SELECT COUNT(*) INTO v_completed_exercises
  FROM exercise_program_progress
  WHERE program_id = p_program_id;
  
  -- Calculate adherence percentage
  IF v_expected_completions > 0 THEN
    v_adherence_percent := (v_completed_exercises::DECIMAL / v_expected_completions) * 100;
  ELSE
    v_adherence_percent := 0;
  END IF;
  
  RETURN json_build_object(
    'program_id', p_program_id,
    'days_since_start', v_days_since_start,
    'expected_completions', ROUND(v_expected_completions, 2),
    'actual_completions', v_completed_exercises,
    'adherence_percent', ROUND(v_adherence_percent, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (if not already granted)
GRANT EXECUTE ON FUNCTION calculate_program_adherence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_program_adherence(UUID) TO service_role;

