-- Home Exercise Program (HEP) Module
-- Allows practitioners to prescribe exercises to clients

-- Exercise Library: Pre-defined exercises with instructions, videos, and images
CREATE TABLE IF NOT EXISTS exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'strength', 'flexibility', 'cardio', 'mobility', 'balance', 'rehabilitation'
  instructions TEXT NOT NULL,
  video_url TEXT,
  image_url TEXT,
  duration_minutes INTEGER DEFAULT 10,
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  muscle_groups TEXT[],
  equipment_needed TEXT[],
  contraindications TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_system_exercise BOOLEAN DEFAULT true, -- System-wide exercises vs practitioner-specific
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Home Exercise Programs: Practitioner-prescribed programs for clients
CREATE TABLE IF NOT EXISTS home_exercise_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES client_sessions(id) ON DELETE SET NULL, -- Optional: link to specific session
  title TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL, -- Array of exercise objects with reps, sets, frequency, etc.
  instructions TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  frequency_per_week INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  delivered_via TEXT DEFAULT 'messaging' CHECK (delivered_via IN ('messaging', 'email', 'both')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise Program Progress: Track client completion and adherence
CREATE TABLE IF NOT EXISTS exercise_program_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES home_exercise_programs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercise_library(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL, -- Denormalized for history
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  sets_completed INTEGER,
  reps_completed INTEGER,
  duration_minutes INTEGER,
  client_notes TEXT,
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON exercise_library(category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_difficulty ON exercise_library(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_exercise_library_active ON exercise_library(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_hep_programs_practitioner ON home_exercise_programs(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_hep_programs_client ON home_exercise_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_hep_programs_session ON home_exercise_programs(session_id);
CREATE INDEX IF NOT EXISTS idx_hep_programs_status ON home_exercise_programs(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_hep_progress_program ON exercise_program_progress(program_id);
CREATE INDEX IF NOT EXISTS idx_hep_progress_client ON exercise_program_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_hep_progress_date ON exercise_program_progress(completed_date);

-- RLS Policies
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_exercise_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_program_progress ENABLE ROW LEVEL SECURITY;

-- Exercise Library: System exercises visible to all, practitioner-specific visible only to creator
CREATE POLICY "Exercise library is visible to authenticated users" ON exercise_library
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      is_system_exercise = true OR
      created_by = auth.uid()
    )
  );

CREATE POLICY "Practitioners can create exercises" ON exercise_library
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Practitioners can update their exercises" ON exercise_library
  FOR UPDATE USING (created_by = auth.uid() OR is_system_exercise = false);

-- Home Exercise Programs: Practitioners can view/manage their programs, clients can view their programs
CREATE POLICY "Practitioners can view their HEP programs" ON home_exercise_programs
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can view their HEP programs" ON home_exercise_programs
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Practitioners can create HEP programs" ON home_exercise_programs
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their HEP programs" ON home_exercise_programs
  FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete their HEP programs" ON home_exercise_programs
  FOR DELETE USING (auth.uid() = practitioner_id);

-- Exercise Program Progress: Clients can log their own progress, practitioners can view their clients' progress
CREATE POLICY "Clients can view their progress" ON exercise_program_progress
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Practitioners can view their clients' progress" ON exercise_program_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_exercise_programs
      WHERE home_exercise_programs.id = exercise_program_progress.program_id
      AND home_exercise_programs.practitioner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can log their progress" ON exercise_program_progress
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their progress" ON exercise_program_progress
  FOR UPDATE USING (auth.uid() = client_id);

-- Service role has full access
CREATE POLICY "Service role has full access to exercise_library" ON exercise_library
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to home_exercise_programs" ON home_exercise_programs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to exercise_program_progress" ON exercise_program_progress
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to get exercises for a program
CREATE OR REPLACE FUNCTION get_program_exercises(p_program_id UUID)
RETURNS TABLE (
  exercise_id UUID,
  exercise_name TEXT,
  category TEXT,
  sets INTEGER,
  reps INTEGER,
  duration_minutes INTEGER,
  frequency_per_week INTEGER,
  instructions TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (exercise->>'id')::UUID as exercise_id,
    exercise->>'name' as exercise_name,
    exercise->>'category' as category,
    (exercise->>'sets')::INTEGER as sets,
    (exercise->>'reps')::INTEGER as reps,
    (exercise->>'duration_minutes')::INTEGER as duration_minutes,
    (exercise->>'frequency_per_week')::INTEGER as frequency_per_week,
    exercise->>'instructions' as instructions
  FROM home_exercise_programs,
       jsonb_array_elements(exercises) as exercise
  WHERE id = p_program_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate program adherence
CREATE OR REPLACE FUNCTION calculate_program_adherence(p_program_id UUID)
RETURNS JSON AS $$
DECLARE
  v_program RECORD;
  v_total_exercises INTEGER;
  v_completed_exercises INTEGER;
  v_adherence_percent DECIMAL;
  v_start_date DATE;
  v_days_since_start INTEGER;
  v_expected_completions INTEGER;
BEGIN
  SELECT * INTO v_program
  FROM home_exercise_programs
  WHERE id = p_program_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Program not found');
  END IF;
  
  v_start_date := COALESCE(v_program.start_date, CURRENT_DATE);
  v_days_since_start := CURRENT_DATE - v_start_date;
  
  -- Calculate expected completions based on frequency
  v_expected_completions := (v_days_since_start / 7.0) * v_program.frequency_per_week;
  
  -- Count actual completions
  SELECT COUNT(DISTINCT completed_date) INTO v_completed_exercises
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_program_exercises(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_program_exercises(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_program_adherence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_program_adherence(UUID) TO service_role;

-- Comments
COMMENT ON TABLE exercise_library IS 'Library of exercises that practitioners can prescribe';
COMMENT ON TABLE home_exercise_programs IS 'Home exercise programs prescribed by practitioners to clients';
COMMENT ON TABLE exercise_program_progress IS 'Client progress tracking for exercise programs';
COMMENT ON FUNCTION get_program_exercises IS 'Returns detailed exercise information for a program';
COMMENT ON FUNCTION calculate_program_adherence IS 'Calculates adherence percentage for an exercise program';

