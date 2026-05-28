-- Security Tables Migration
-- Creates tables for CSRF tokens and rate limiting

-- CSRF Tokens Table
CREATE TABLE IF NOT EXISTS public.csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id ON public.csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON public.csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON public.csrf_tokens(expires_at);

-- Rate Limits Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Enable RLS
ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for csrf_tokens
-- Users can only access their own tokens
CREATE POLICY "Users can manage own CSRF tokens" ON public.csrf_tokens
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for rate_limits
-- Only service role can access rate limits
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up expired CSRF tokens (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_csrf_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.csrf_tokens
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.csrf_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;
