-- Update session_status enum to include 'confirmed' and 'in_progress'
-- This fixes the enum mismatch that caused 404 and invalid status errors

-- First, check if these values already exist
DO $$
BEGIN
  -- Check if we need to add 'confirmed' to the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'confirmed' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')
  ) THEN
    ALTER TYPE session_status ADD VALUE 'confirmed';
  END IF;

  -- Check if we need to add 'in_progress' to the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'in_progress' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')
  ) THEN
    ALTER TYPE session_status ADD VALUE 'in_progress';
  END IF;
END $$;

-- Add comment explaining the enum values
COMMENT ON TYPE session_status IS 'Session lifecycle status: scheduled (booked) -> confirmed (accepted by practitioner) -> in_progress (session active) -> completed/finished or cancelled/no_show';

-- Update any existing sessions that might have been set to invalid status
UPDATE client_sessions 
SET status = 'scheduled' 
WHERE status IS NULL OR status NOT IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

