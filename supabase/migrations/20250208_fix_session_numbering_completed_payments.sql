-- Fix session numbering to only count sessions with completed payments
-- Session numbers should reflect the sequential order of completed payment sessions only

-- Temporarily disable triggers that might interfere
ALTER TABLE client_sessions DISABLE TRIGGER trg_enforce_paid_before_schedule;
ALTER TABLE client_sessions DISABLE TRIGGER trigger_update_client_profile;

-- Function to calculate and set session numbers retroactively (only for completed payments)
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
    
    -- Update session numbers in order of session_date, but ONLY for sessions with completed payments
    FOR session_record IN 
      SELECT id FROM client_sessions
      WHERE client_id = pair_record.client_id 
        AND therapist_id = pair_record.therapist_id
        AND payment_status = 'completed'
      ORDER BY session_date ASC, created_at ASC
    LOOP
      UPDATE client_sessions 
      SET session_number = current_number 
      WHERE id = session_record.id;
      
      current_number := current_number + 1;
    END LOOP;
    
    -- Set session_number to NULL for sessions without completed payments
    UPDATE client_sessions
    SET session_number = NULL
    WHERE client_id = pair_record.client_id 
      AND therapist_id = pair_record.therapist_id
      AND payment_status != 'completed';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign session number on insert (only for completed payments)
CREATE OR REPLACE FUNCTION assign_session_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign session number if payment is completed
  IF NEW.payment_status = 'completed' THEN
    -- Get the next session number for this client-therapist pair (only counting completed payments)
    SELECT COALESCE(MAX(session_number), 0) + 1 
    INTO NEW.session_number
    FROM client_sessions
    WHERE client_id = NEW.client_id 
      AND therapist_id = NEW.therapist_id
      AND payment_status = 'completed';
  ELSE
    -- Set to NULL for non-completed payments
    NEW.session_number := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_assign_session_number ON client_sessions;

-- Trigger to auto-assign session number on insert
CREATE TRIGGER auto_assign_session_number
BEFORE INSERT ON client_sessions
FOR EACH ROW
WHEN (NEW.client_id IS NOT NULL)
EXECUTE FUNCTION assign_session_number();

-- Also create trigger for UPDATE to handle payment status changes
CREATE OR REPLACE FUNCTION update_session_number_on_payment_change()
RETURNS TRIGGER AS $$
DECLARE
  new_session_number INTEGER;
BEGIN
  -- If payment status changed to completed, assign session number
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get the next session number for this client-therapist pair (only counting completed payments)
    SELECT COALESCE(MAX(session_number), 0) + 1 
    INTO new_session_number
    FROM client_sessions
    WHERE client_id = NEW.client_id 
      AND therapist_id = NEW.therapist_id
      AND payment_status = 'completed'
      AND id != NEW.id; -- Exclude current session
    
    NEW.session_number := new_session_number;
  -- If payment status changed from completed to something else, remove session number
  ELSIF OLD.payment_status = 'completed' AND NEW.payment_status != 'completed' THEN
    NEW.session_number := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing update trigger if it exists
DROP TRIGGER IF EXISTS update_session_number_on_payment_change ON client_sessions;

-- Trigger to update session number when payment status changes
CREATE TRIGGER update_session_number_on_payment_change
BEFORE UPDATE ON client_sessions
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION update_session_number_on_payment_change();

-- Recalculate all session numbers based on completed payments only
SELECT calculate_session_numbers();

-- Re-enable the triggers
ALTER TABLE client_sessions ENABLE TRIGGER trg_enforce_paid_before_schedule;
ALTER TABLE client_sessions ENABLE TRIGGER trigger_update_client_profile;

-- Update comment for documentation
COMMENT ON COLUMN client_sessions.session_number IS 'Sequential session number per client-therapist pair, automatically assigned only for sessions with completed payment status';

