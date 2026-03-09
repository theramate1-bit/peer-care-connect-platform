-- Add HEP Program Versioning
-- Tracks changes to exercise programs over time

-- Create table to store program versions
CREATE TABLE IF NOT EXISTS home_exercise_program_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES home_exercise_programs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  exercises JSONB NOT NULL,
  title TEXT,
  description TEXT,
  instructions TEXT,
  frequency_per_week INTEGER,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hep_versions_program ON home_exercise_program_versions(program_id);
CREATE INDEX IF NOT EXISTS idx_hep_versions_program_version ON home_exercise_program_versions(program_id, version_number);

-- Create function to create a version before updating
CREATE OR REPLACE FUNCTION create_program_version(
  p_program_id UUID,
  p_changed_by UUID,
  p_change_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_program RECORD;
  v_next_version INTEGER;
BEGIN
  -- Get current program data
  SELECT * INTO v_program
  FROM home_exercise_programs
  WHERE id = p_program_id;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM home_exercise_program_versions
  WHERE program_id = p_program_id;

  -- Create version record
  INSERT INTO home_exercise_program_versions (
    program_id,
    version_number,
    exercises,
    title,
    description,
    instructions,
    frequency_per_week,
    changed_by,
    change_notes
  ) VALUES (
    p_program_id,
    v_next_version,
    v_program.exercises,
    v_program.title,
    v_program.description,
    v_program.instructions,
    v_program.frequency_per_week,
    p_changed_by,
    p_change_notes
  );

  RETURN v_next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_program_version(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_program_version(UUID, UUID, TEXT) TO service_role;

-- RLS Policies
ALTER TABLE home_exercise_program_versions ENABLE ROW LEVEL SECURITY;

-- Practitioners can view versions of their programs
CREATE POLICY "Practitioners can view program versions" ON home_exercise_program_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_exercise_programs
      WHERE home_exercise_programs.id = home_exercise_program_versions.program_id
      AND home_exercise_programs.practitioner_id = auth.uid()
    )
  );

-- Clients can view versions of their programs
CREATE POLICY "Clients can view program versions" ON home_exercise_program_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM home_exercise_programs
      WHERE home_exercise_programs.id = home_exercise_program_versions.program_id
      AND home_exercise_programs.client_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to program versions" ON home_exercise_program_versions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE home_exercise_program_versions IS 'Tracks historical versions of home exercise programs for audit trail';

