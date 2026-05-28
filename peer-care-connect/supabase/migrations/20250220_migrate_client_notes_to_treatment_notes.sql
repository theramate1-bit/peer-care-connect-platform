-- Migration: Move client_notes to treatment_notes table for consistency
-- This migration moves client management notes to the unified treatment_notes structure
-- with note_type='general' and session_id=NULL

-- Step 1: Make session_id nullable in treatment_notes if not already
-- (This allows client management notes without a session)
DO $$
BEGIN
  -- Check if session_id is currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'treatment_notes' 
    AND column_name = 'session_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.treatment_notes
      ALTER COLUMN session_id DROP NOT NULL;
    
    COMMENT ON COLUMN public.treatment_notes.session_id IS 'Session ID. NULL for client management notes not linked to a specific session.';
  END IF;
END $$;

-- Step 2: Migrate existing client_notes to treatment_notes
-- Only migrate notes that haven't been migrated already (idempotent)
INSERT INTO public.treatment_notes (
  id,
  session_id,
  practitioner_id,
  client_id,
  note_type,
  content,
  template_type,
  timestamp,
  created_at,
  updated_at
)
SELECT 
  cn.id,
  NULL as session_id,  -- Client management notes are not linked to sessions
  cn.practitioner_id,
  cn.client_id,  -- May be NULL if client hasn't created account yet
  'general' as note_type,
  COALESCE(cn.notes, '') as content,  -- Ensure content is not NULL
  'FREE_TEXT' as template_type,
  COALESCE(cn.created_at, NOW()) as timestamp,
  COALESCE(cn.created_at, NOW()) as created_at,
  COALESCE(cn.updated_at, NOW()) as updated_at
FROM public.client_notes cn
WHERE NOT EXISTS (
  -- Check if this note has already been migrated
  SELECT 1 FROM public.treatment_notes tn
  WHERE tn.id = cn.id
)
AND cn.notes IS NOT NULL  -- Only migrate notes with content
AND cn.notes != '';  -- Skip empty notes

-- Step 3: For client_notes without client_id, try to find client_id from users table
-- Update treatment_notes where client_id is NULL but we can find it by email
UPDATE public.treatment_notes tn
SET client_id = u.id
FROM public.client_notes cn
JOIN auth.users u ON u.email = cn.client_email
WHERE tn.id = cn.id
  AND tn.client_id IS NULL
  AND cn.client_id IS NULL
  AND u.id IS NOT NULL;

-- Step 4: Add index for querying client management notes efficiently
CREATE INDEX IF NOT EXISTS idx_treatment_notes_client_mgmt 
ON public.treatment_notes(practitioner_id, client_id, note_type) 
WHERE session_id IS NULL AND note_type = 'general';

-- Step 5: Add comment explaining the migration
COMMENT ON TABLE public.client_notes IS 'DEPRECATED: Client notes have been migrated to treatment_notes table. This table is kept for rollback purposes only.';

-- Note: We keep the client_notes table intact for rollback safety
-- It can be dropped after verifying the migration was successful

