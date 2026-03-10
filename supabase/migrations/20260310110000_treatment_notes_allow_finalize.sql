-- Fix RLS: Allow practitioners to finalize treatment notes (draft → completed)
-- Previous policy had WITH CHECK (status = 'draft') which blocks the transition to 'completed'
-- See SESSION_NOTE_TAKING_EDGE_CASES.md #1

DROP POLICY IF EXISTS "Practitioners can update their treatment notes (not completed)" ON public.treatment_notes;

CREATE POLICY "Practitioners can update their treatment notes"
ON public.treatment_notes
FOR UPDATE
USING (
  auth.uid() = practitioner_id
  AND status = 'draft'  -- Only allow update of draft notes (prevents re-editing completed)
)
WITH CHECK (
  auth.uid() = practitioner_id
  AND status IN ('draft', 'completed')  -- Allow finalizing to completed; or staying draft
);

COMMENT ON POLICY "Practitioners can update their treatment notes" ON public.treatment_notes IS
  'Practitioners can edit draft notes and finalize them (draft→completed). Completed notes cannot be edited (USING excludes them).';
