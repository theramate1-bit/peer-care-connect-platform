-- Add template type to treatment notes
ALTER TABLE treatment_notes 
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'FREE_TEXT';

-- Add constraint for valid template types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_template_type' 
    AND conrelid = 'treatment_notes'::regclass
  ) THEN
    ALTER TABLE treatment_notes 
    ADD CONSTRAINT check_template_type 
    CHECK (template_type IN ('SOAP', 'DAP', 'FREE_TEXT'));
  END IF;
END $$;

-- Add FK constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_treatment_notes_session' 
    AND conrelid = 'treatment_notes'::regclass
  ) THEN
    ALTER TABLE treatment_notes
    ADD CONSTRAINT fk_treatment_notes_session
    FOREIGN KEY (session_id)
    REFERENCES client_sessions(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_treatment_notes_template_type 
ON treatment_notes(template_type);

-- Add comment
COMMENT ON COLUMN treatment_notes.template_type IS 'Template format used: SOAP, DAP, or FREE_TEXT';

