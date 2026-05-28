-- Create webhook_events table for idempotency tracking
-- This prevents duplicate webhook processing and provides audit trail

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON public.webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON public.webhook_events(processed_at);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can read/write
CREATE POLICY "Service role can manage webhook events"
  ON public.webhook_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment
COMMENT ON TABLE public.webhook_events IS 'Tracks all Stripe webhook events for idempotency and audit trail';

