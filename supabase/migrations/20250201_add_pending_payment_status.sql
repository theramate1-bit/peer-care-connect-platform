-- Add 'pending_payment' to session_status enum
-- This status is used for sessions that are held while payment is being processed

DO $$
BEGIN
  -- Check if 'pending_payment' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'pending_payment' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')
  ) THEN
    ALTER TYPE session_status ADD VALUE 'pending_payment';
  END IF;
END $$;

-- Update comment to include pending_payment
COMMENT ON TYPE session_status IS 'Session lifecycle status: pending_payment (payment being processed) -> scheduled (booked) -> confirmed (accepted by practitioner) -> in_progress (session active) -> completed/finished or cancelled/no_show';

