-- Create checkout_sessions table for tracking Stripe checkout sessions
-- This prevents double bookings and provides idempotency for booking flow

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL,
  practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT,
  session_id UUID REFERENCES client_sessions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, expired, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  UNIQUE(idempotency_key)
);

-- Create indexes for performance
CREATE INDEX idx_checkout_sessions_idempotency ON public.checkout_sessions(idempotency_key);
CREATE INDEX idx_checkout_sessions_expires ON public.checkout_sessions(expires_at);
CREATE INDEX idx_checkout_sessions_practitioner ON public.checkout_sessions(practitioner_id);
CREATE INDEX idx_checkout_sessions_status ON public.checkout_sessions(status);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.checkout_sessions
  WHERE expires_at < NOW()
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the table
COMMENT ON TABLE public.checkout_sessions IS 'Tracks Stripe checkout sessions to prevent double bookings through idempotency keys';

COMMENT ON COLUMN public.checkout_sessions.idempotency_key IS 'Unique key to ensure idempotency: practitioner_id + client_email + timestamp';
COMMENT ON COLUMN public.checkout_sessions.session_id IS 'Links to client_sessions table when booking is completed';

