-- Location Access Audit Log
-- Creates table for auditing all access to location data
-- Required for UK GDPR accountability and security monitoring

CREATE TABLE IF NOT EXISTS public.location_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User whose location was accessed
  accessed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who accessed the location
  location_id UUID REFERENCES public.user_locations(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'read', 'create', 'update', 'delete', 'search'
  ip_address TEXT, -- IP address of requester
  user_agent TEXT, -- User agent of requester
  endpoint TEXT, -- API endpoint or page accessed
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (search radius, filters, etc.)
  accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_location_access_log_user_id ON public.location_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_location_access_log_accessed_by ON public.location_access_log(accessed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_location_access_log_location_id ON public.location_access_log(location_id);
CREATE INDEX IF NOT EXISTS idx_location_access_log_action ON public.location_access_log(action);
CREATE INDEX IF NOT EXISTS idx_location_access_log_accessed_at ON public.location_access_log(accessed_at);
CREATE INDEX IF NOT EXISTS idx_location_access_log_ip_address ON public.location_access_log(ip_address);

-- Enable RLS
ALTER TABLE public.location_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view access logs for their own location data
CREATE POLICY "Users can view own location access logs"
  ON public.location_access_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view logs of their own access to others' locations
CREATE POLICY "Users can view own access activity"
  ON public.location_access_log
  FOR SELECT
  USING (auth.uid() = accessed_by_user_id);

-- Service role can insert access logs (via triggers/functions)
CREATE POLICY "Service role can insert location access logs"
  ON public.location_access_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can view all access logs (for admin/audit purposes)
CREATE POLICY "Service role can view all location access logs"
  ON public.location_access_log
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Function to log location access
CREATE OR REPLACE FUNCTION log_location_access(
  p_user_id UUID,
  p_accessed_by_user_id UUID,
  p_location_id UUID DEFAULT NULL,
  p_action TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.location_access_log (
    user_id,
    accessed_by_user_id,
    location_id,
    action,
    ip_address,
    user_agent,
    endpoint,
    metadata
  )
  VALUES (
    p_user_id,
    p_accessed_by_user_id,
    p_location_id,
    p_action,
    p_ip_address,
    p_user_agent,
    p_endpoint,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  -- Log errors but don't block the main operation
  RAISE WARNING 'Failed to log location access: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Trigger to log location reads (when user_locations table is queried)
-- Note: This is a best-effort trigger - some reads may not be captured
CREATE OR REPLACE FUNCTION trigger_log_location_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log read access (best effort - may not capture all reads)
  PERFORM log_location_access(
    NEW.user_id,
    auth.uid(),
    NEW.id,
    'read',
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'user-agent',
    current_setting('request.path', true),
    jsonb_build_object('table', 'user_locations')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the main operation if logging fails
  RETURN NEW;
END;
$$;

-- Trigger on user_locations table (for INSERT/UPDATE - DELETE handled separately)
-- Note: SELECT operations are harder to log via triggers, so we'll log them in application code
CREATE TRIGGER log_location_create_update
  AFTER INSERT OR UPDATE ON public.user_locations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_location_read();

-- Function to get IP address from request context (for use in application)
CREATE OR REPLACE FUNCTION get_request_ip_address()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Try to get IP from request headers (set by application)
  RETURN COALESCE(
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'x-real-ip',
    NULL
  );
END;
$$;

-- Comments
COMMENT ON TABLE public.location_access_log IS 'Audit log for all access to location data - required for UK GDPR accountability';
COMMENT ON COLUMN public.location_access_log.user_id IS 'User whose location data was accessed';
COMMENT ON COLUMN public.location_access_log.accessed_by_user_id IS 'User who accessed the location data';
COMMENT ON COLUMN public.location_access_log.action IS 'Action performed: read, create, update, delete, search';
COMMENT ON COLUMN public.location_access_log.ip_address IS 'IP address of the requester (for security audit)';
COMMENT ON FUNCTION log_location_access IS 'Logs access to location data for audit purposes';
