-- Create booking_attempts_log table for tracking all booking attempts
-- Helps with debugging, analytics, and preventing duplicate submissions

CREATE TABLE IF NOT EXISTS booking_attempts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  attempt_status TEXT NOT NULL CHECK (attempt_status IN (
    'success',
    'conflict_booking',
    'conflict_blocked',
    'invalid_time',
    'invalid_date',
    'insufficient_credits',
    'duplicate_request',
    'practitioner_unavailable',
    'database_error',
    'unknown_error'
  )),
  error_message TEXT,
  error_code TEXT,
  idempotency_key TEXT,
  session_id UUID REFERENCES client_sessions(id) ON DELETE SET NULL,
  is_peer_booking BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_therapist ON booking_attempts_log(therapist_id);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_client ON booking_attempts_log(client_id);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_session_date ON booking_attempts_log(session_date);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_status ON booking_attempts_log(attempt_status);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_idempotency ON booking_attempts_log(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_created_at ON booking_attempts_log(created_at);

-- Enable RLS
ALTER TABLE booking_attempts_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only practitioners and admins can view logs
CREATE POLICY "Practitioners can view their booking attempts" ON booking_attempts_log
  FOR SELECT USING (auth.uid() = therapist_id);

CREATE POLICY "Clients can view their booking attempts" ON booking_attempts_log
  FOR SELECT USING (auth.uid() = client_id);

-- Service role can insert (for RPC functions)
CREATE POLICY "Service role can insert booking attempts" ON booking_attempts_log
  FOR INSERT WITH CHECK (true);

-- Add comment
COMMENT ON TABLE booking_attempts_log IS 'Audit log for all booking attempts, including successful and failed attempts';
COMMENT ON COLUMN booking_attempts_log.attempt_status IS 'Status of the booking attempt: success, conflict_booking, conflict_blocked, etc.';
COMMENT ON COLUMN booking_attempts_log.idempotency_key IS 'Unique key to prevent duplicate submissions';

-- Update RPC functions to log attempts
-- Note: This will be done by modifying the RPC functions to include logging

