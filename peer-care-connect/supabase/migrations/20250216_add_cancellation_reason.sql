-- Add cancellation_reason column to client_sessions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_sessions' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE client_sessions ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;
