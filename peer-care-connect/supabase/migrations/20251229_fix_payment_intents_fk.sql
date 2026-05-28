-- Fix Foreign Key constraints for payment_intents table
-- The previous migration referenced auth.users which excludes guest users who only exist in public.users

-- Drop existing constraints
ALTER TABLE payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_client_id_fkey,
  DROP CONSTRAINT IF EXISTS payment_intents_practitioner_id_fkey;

-- Add new constraints referencing public.users
ALTER TABLE payment_intents
  ADD CONSTRAINT payment_intents_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE; -- Optional: Cascade delete if user is deleted

ALTER TABLE payment_intents
  ADD CONSTRAINT payment_intents_practitioner_id_fkey
  FOREIGN KEY (practitioner_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;
