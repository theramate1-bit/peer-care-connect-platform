-- Fix treatment_notes.client_id foreign key to reference public.users instead of auth.users
-- This matches client_sessions.client_id which also references public.users

-- Drop the existing foreign key constraint
ALTER TABLE public.treatment_notes
  DROP CONSTRAINT IF EXISTS treatment_notes_client_id_fkey;

-- Add new foreign key constraint referencing public.users
ALTER TABLE public.treatment_notes
  ADD CONSTRAINT treatment_notes_client_id_fkey
  FOREIGN KEY (client_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

