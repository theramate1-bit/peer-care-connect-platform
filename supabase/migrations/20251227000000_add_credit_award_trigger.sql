-- Add trigger to automatically award credits when sessions are completed
-- This ensures practitioners earn credits automatically when sessions are marked as completed

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trg_award_credits_on_session_completion ON client_sessions;

-- Create trigger to call award_credits_for_completed_session function
CREATE TRIGGER trg_award_credits_on_session_completion
AFTER UPDATE OF status, payment_status ON client_sessions
FOR EACH ROW
WHEN (
  -- Only trigger when status changes to 'completed' AND payment_status is 'completed'
  NEW.status = 'completed' 
  AND NEW.payment_status = 'completed'
  AND (OLD.status != 'completed' OR OLD.payment_status != 'completed')
)
EXECUTE FUNCTION public.award_credits_for_completed_session();

-- Add comment
COMMENT ON TRIGGER trg_award_credits_on_session_completion ON client_sessions IS 
'Automatically awards 1 credit to practitioners when a session is marked as completed with completed payment status. Only triggers on status/payment_status changes to avoid duplicate awards.';

