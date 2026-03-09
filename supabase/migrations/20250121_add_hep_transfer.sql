-- Add HEP Transfer Functionality
-- Allows practitioners to transfer program ownership to another practitioner

-- Add fields for tracking program transfers
ALTER TABLE home_exercise_programs
ADD COLUMN IF NOT EXISTS original_practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_notes TEXT;

-- Create function to transfer program to another practitioner
CREATE OR REPLACE FUNCTION transfer_hep_program(
  p_program_id UUID,
  p_new_practitioner_id UUID,
  p_transfer_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_program RECORD;
  v_old_practitioner_id UUID;
BEGIN
  -- Get current program details
  SELECT * INTO v_program
  FROM home_exercise_programs
  WHERE id = p_program_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Program not found');
  END IF;

  -- Store original practitioner if not already set (first transfer)
  IF v_program.original_practitioner_id IS NULL THEN
    v_old_practitioner_id := v_program.practitioner_id;
  ELSE
    v_old_practitioner_id := v_program.original_practitioner_id;
  END IF;

  -- Update program with new practitioner
  UPDATE home_exercise_programs
  SET 
    practitioner_id = p_new_practitioner_id,
    original_practitioner_id = COALESCE(original_practitioner_id, v_old_practitioner_id),
    transferred_at = NOW(),
    transfer_notes = p_transfer_notes,
    updated_at = NOW()
  WHERE id = p_program_id;

  RETURN json_build_object(
    'success', true,
    'program_id', p_program_id,
    'old_practitioner_id', v_program.practitioner_id,
    'new_practitioner_id', p_new_practitioner_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION transfer_hep_program(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_hep_program(UUID, UUID, TEXT) TO service_role;

-- Update RLS policy to allow practitioners to see transferred programs
-- The existing policy already checks practitioner_id, so transferred programs
-- will automatically be visible to the new practitioner

-- Add comment
COMMENT ON FUNCTION transfer_hep_program IS 'Transfers a home exercise program from one practitioner to another, preserving original practitioner ID for audit trail';

