-- Create SMS logs table for tracking SMS delivery
-- Story 18: SMS Reminders

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  session_id UUID REFERENCES public.client_sessions(id) ON DELETE SET NULL,
  reminder_type TEXT CHECK (reminder_type IN ('24h', '2h', '1h')),
  twilio_message_sid TEXT,
  status TEXT DEFAULT 'queued',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone_number ON public.sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_session_id ON public.sms_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON public.sms_logs(sent_at DESC);

-- RLS Policies
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own SMS logs
CREATE POLICY "Users can view own SMS logs"
  ON public.sms_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.phone = sms_logs.phone_number
    )
    OR EXISTS (
      SELECT 1 FROM public.client_sessions
      WHERE client_sessions.id = sms_logs.session_id
      AND (client_sessions.client_id = auth.uid() OR client_sessions.therapist_id = auth.uid())
    )
  );

-- Service role can insert/update (for edge function)
-- Note: Edge functions use service_role key, so they can insert directly

-- Comments
COMMENT ON TABLE public.sms_logs IS 'Logs of SMS messages sent for session reminders and notifications';
COMMENT ON COLUMN public.sms_logs.twilio_message_sid IS 'Twilio message SID for tracking delivery status';
COMMENT ON COLUMN public.sms_logs.status IS 'SMS status: queued, sent, delivered, failed';
