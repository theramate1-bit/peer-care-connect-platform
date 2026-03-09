-- Create RPC function to allow guests to view their sessions by email + session ID
-- This is secure because it requires both the session ID and the email address

CREATE OR REPLACE FUNCTION public.get_session_by_email_and_id(
  p_session_id UUID,
  p_email TEXT
)
RETURNS TABLE (
  id UUID,
  therapist_id UUID,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  session_date DATE,
  start_time TIME,
  duration_minutes INTEGER,
  session_type TEXT,
  price DECIMAL(10,2),
  notes TEXT,
  status TEXT,
  payment_status TEXT,
  credit_cost INTEGER,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  platform_fee_amount DECIMAL(10,2),
  practitioner_amount DECIMAL(10,2),
  follow_up_date DATE,
  has_recording BOOLEAN,
  recording_consent BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.therapist_id,
    cs.client_id,
    cs.client_name,
    cs.client_email,
    cs.client_phone,
    cs.session_date,
    cs.start_time,
    cs.duration_minutes,
    cs.session_type,
    cs.price,
    cs.notes,
    cs.status,
    cs.payment_status,
    cs.credit_cost,
    cs.stripe_session_id,
    cs.stripe_payment_intent_id,
    cs.platform_fee_amount,
    cs.practitioner_amount,
    cs.follow_up_date,
    cs.has_recording,
    cs.recording_consent,
    cs.created_at,
    cs.updated_at
  FROM public.client_sessions cs
  WHERE cs.id = p_session_id
    AND LOWER(cs.client_email) = LOWER(p_email)
  LIMIT 1;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_session_by_email_and_id(UUID, TEXT) IS 
'Allows guests to view their session details by providing both session ID and email address. This is secure because it requires both pieces of information.';

