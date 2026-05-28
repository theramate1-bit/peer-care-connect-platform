-- Add session_number column to track sequential sessions per client-practitioner pair
ALTER TABLE public.client_sessions 
ADD COLUMN IF NOT EXISTS session_number INTEGER;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_practitioner 
ON public.client_sessions(client_id, therapist_id, session_date);

-- Function to calculate and set session numbers retroactively
CREATE OR REPLACE FUNCTION calculate_session_numbers()
RETURNS void AS $$
DECLARE
  pair_record RECORD;
  session_record RECORD;
  current_number INTEGER;
BEGIN
  -- For each unique client-therapist pair
  FOR pair_record IN 
    SELECT DISTINCT client_id, therapist_id 
    FROM client_sessions 
    WHERE client_id IS NOT NULL
  LOOP
    current_number := 1;
    
    -- Update session numbers in order of session_date
    FOR session_record IN 
      SELECT id FROM client_sessions
      WHERE client_id = pair_record.client_id 
        AND therapist_id = pair_record.therapist_id
      ORDER BY session_date ASC, created_at ASC
    LOOP
      UPDATE client_sessions 
      SET session_number = current_number 
      WHERE id = session_record.id;
      
      current_number := current_number + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to populate existing sessions
SELECT calculate_session_numbers();

-- Function to auto-assign session number on insert
CREATE OR REPLACE FUNCTION assign_session_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the next session number for this client-therapist pair
  SELECT COALESCE(MAX(session_number), 0) + 1 
  INTO NEW.session_number
  FROM client_sessions
  WHERE client_id = NEW.client_id 
    AND therapist_id = NEW.therapist_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_assign_session_number ON client_sessions;

-- Trigger to auto-assign session number on insert
CREATE TRIGGER auto_assign_session_number
BEFORE INSERT ON client_sessions
FOR EACH ROW
WHEN (NEW.session_number IS NULL AND NEW.client_id IS NOT NULL)
EXECUTE FUNCTION assign_session_number();

-- Add comment for documentation
COMMENT ON COLUMN client_sessions.session_number IS 'Sequential session number per client-therapist pair, automatically assigned';

