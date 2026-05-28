-- Make client_id nullable in treatment_notes to support guest sessions
-- Guest sessions don't have a user account, so client_id should be nullable

-- Drop the NOT NULL constraint on client_id
ALTER TABLE public.treatment_notes
  ALTER COLUMN client_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- The existing foreign key constraint already allows NULL, so we just need to drop NOT NULL

-- Add a comment explaining the nullable client_id
COMMENT ON COLUMN public.treatment_notes.client_id IS 'Client user ID. NULL for guest sessions where client has not created an account yet.';

