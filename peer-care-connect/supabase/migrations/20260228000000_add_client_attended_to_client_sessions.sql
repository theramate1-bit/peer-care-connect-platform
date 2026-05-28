-- KAN-16: Client attended status on sessions
-- Practitioner can mark "Client attended" / "Client did not attend" on session detail.
-- System defaults to attended (true).
ALTER TABLE public.client_sessions
ADD COLUMN IF NOT EXISTS client_attended BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.client_sessions.client_attended IS 'Whether the client attended the session; default true (assume attended).';
