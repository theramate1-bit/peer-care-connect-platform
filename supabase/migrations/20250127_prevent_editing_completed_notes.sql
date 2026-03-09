-- Update RLS policy to prevent editing completed treatment notes
-- This enforces database-level protection against re-editing

-- Step 1: Drop existing update policy
DROP POLICY IF EXISTS "Practitioners can update their treatment notes" ON public.treatment_notes;

-- Step 2: Create new update policy that prevents editing completed notes
CREATE POLICY "Practitioners can update their treatment notes (not completed)" 
ON public.treatment_notes
FOR UPDATE
USING (
  auth.uid() = practitioner_id 
  AND status = 'draft'  -- Only allow updates if status is 'draft'
)
WITH CHECK (
  auth.uid() = practitioner_id
  AND status = 'draft'  -- Ensure status remains 'draft' (or explicitly set to 'completed')
);

-- Step 3: Add comment
COMMENT ON POLICY "Practitioners can update their treatment notes (not completed)" 
ON public.treatment_notes IS 'Prevents updating treatment notes that have been marked as completed. Only draft notes can be edited.';
