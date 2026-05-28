-- Add status field to treatment_notes table to track completion
-- This prevents re-editing after notes are finalized

-- Step 1: Add status column
ALTER TABLE public.treatment_notes
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'
  CHECK (status IN ('draft', 'completed'));

-- Step 2: Update existing notes to 'completed' if they have all SOAP sections
-- This migrates existing completed notes
UPDATE public.treatment_notes tn
SET status = 'completed'
WHERE tn.template_type = 'SOAP'
  AND EXISTS (
    SELECT 1
    FROM public.treatment_notes tn2
    WHERE tn2.session_id = tn.session_id
      AND tn2.practitioner_id = tn.practitioner_id
      AND tn2.template_type = 'SOAP'
    GROUP BY tn2.session_id, tn2.practitioner_id
    HAVING COUNT(DISTINCT tn2.note_type) = 4
      AND bool_and(tn2.note_type IN ('subjective', 'objective', 'assessment', 'plan'))
  )
  AND tn.note_type IN ('subjective', 'objective', 'assessment', 'plan');

-- Step 3: Also mark as completed if session_recordings has status = 'completed'
UPDATE public.treatment_notes tn
SET status = 'completed'
WHERE EXISTS (
  SELECT 1
  FROM public.session_recordings sr
  WHERE sr.session_id = tn.session_id
    AND sr.practitioner_id = tn.practitioner_id
    AND sr.status = 'completed'
)
AND tn.status = 'draft';

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_treatment_notes_status 
ON public.treatment_notes(session_id, practitioner_id, status);

-- Step 5: Add comment
COMMENT ON COLUMN public.treatment_notes.status IS 'Status of the note: draft (editable) or completed (read-only). Prevents re-editing after finalization.';
