-- DAP notes use note_type='data' for the Data section, but the original constraint
-- only allowed: subjective, objective, assessment, plan, general.
-- Add 'data' so DAP notes can be saved correctly.
ALTER TABLE treatment_notes DROP CONSTRAINT IF EXISTS treatment_notes_note_type_check;
ALTER TABLE treatment_notes ADD CONSTRAINT treatment_notes_note_type_check CHECK (
  note_type = ANY (ARRAY['subjective'::text, 'objective'::text, 'assessment'::text, 'plan'::text, 'general'::text, 'data'::text])
);
