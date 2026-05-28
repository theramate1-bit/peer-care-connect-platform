-- IP Tracking Audit Log
-- Creates table for auditing IP address collection
-- Required for UK GDPR accountability and security monitoring

CREATE TABLE IF NOT EXISTS public.ip_tracking_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User associated with IP (if logged in)
  session_id TEXT, -- Session identifier (if available)
  ip_address TEXT NOT NULL, -- IP address collected
  general_location JSONB, -- General location inference (country, city) - not precise
  purpose TEXT NOT NULL, -- 'security', 'analytics', 'error_logging'
  consent_status TEXT, -- 'granted', 'denied', 'not_required' (for security)
  user_agent TEXT, -- User agent
  endpoint TEXT, -- Endpoint or page accessed
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  anonymized BOOLEAN DEFAULT false, -- Whether IP has been anonymized
  anonymized_at TIMESTAMPTZ, -- When IP was anonymized
  collected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ip_tracking_log_user_id ON public.ip_tracking_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_log_ip_address ON public.ip_tracking_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_log_purpose ON public.ip_tracking_log(purpose);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_log_consent_status ON public.ip_tracking_log(consent_status);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_log_collected_at ON public.ip_tracking_log(collected_at);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_log_anonymized ON public.ip_tracking_log(anonymized);

-- Enable RLS
ALTER TABLE public.ip_tracking_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own IP tracking logs
CREATE POLICY "Users can view own IP tracking logs"
  ON public.ip_tracking_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert IP tracking logs
CREATE POLICY "Service role can insert IP tracking logs"
  ON public.ip_tracking_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can view all IP tracking logs (for admin/audit purposes)
CREATE POLICY "Service role can view all IP tracking logs"
  ON public.ip_tracking_log
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Function to anonymize IP address
CREATE OR REPLACE FUNCTION anonymize_ip(p_ip_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_ip_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- IPv4: Set last octet to 0 (e.g., 192.168.1.1 -> 192.168.1.0)
  IF p_ip_address ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' THEN
    RETURN regexp_replace(p_ip_address, '\.[0-9]{1,3}$', '.0');
  END IF;
  
  -- IPv6: Set last 64 bits to 0 (simplified - set last segment to 0)
  IF p_ip_address ~ ':' THEN
    -- For simplicity, replace last segment with 0
    -- More sophisticated anonymization can be implemented if needed
    RETURN regexp_replace(p_ip_address, ':[0-9a-fA-F:]+$', ':0');
  END IF;
  
  -- Return as-is if format not recognized (shouldn't happen)
  RETURN p_ip_address;
END;
$$;

-- Function to log IP address collection
CREATE OR REPLACE FUNCTION log_ip_tracking(
  p_ip_address TEXT,
  p_purpose TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_general_location JSONB DEFAULT NULL,
  p_consent_status TEXT DEFAULT NULL,
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
  INSERT INTO public.ip_tracking_log (
    user_id,
    session_id,
    ip_address,
    general_location,
    purpose,
    consent_status,
    user_agent,
    endpoint,
    metadata
  )
  VALUES (
    p_user_id,
    p_session_id,
    p_ip_address,
    p_general_location,
    p_purpose,
    p_consent_status,
    p_user_agent,
    p_endpoint,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  -- Log errors but don't block the main operation
  RAISE WARNING 'Failed to log IP tracking: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Function to anonymize old IP addresses (for retention enforcement)
CREATE OR REPLACE FUNCTION anonymize_old_ip_addresses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.ip_tracking_log
  SET 
    ip_address = anonymize_ip(ip_address),
    anonymized = true,
    anonymized_at = NOW()
  WHERE 
    anonymized = false
    AND (
      -- Security logs: 12 months
      (purpose = 'security' AND collected_at < NOW() - INTERVAL '12 months')
      OR
      -- Analytics: 26 months
      (purpose = 'analytics' AND collected_at < NOW() - INTERVAL '26 months')
      OR
      -- Error logs: 3 months
      (purpose = 'error_logging' AND collected_at < NOW() - INTERVAL '3 months')
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to delete old anonymized IP addresses (after anonymization retention)
CREATE OR REPLACE FUNCTION delete_old_anonymized_ip_addresses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete anonymized IP addresses older than 6 months after anonymization
  DELETE FROM public.ip_tracking_log
  WHERE 
    anonymized = true
    AND anonymized_at < NOW() - INTERVAL '6 months';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Comments
COMMENT ON TABLE public.ip_tracking_log IS 'Audit log for IP address collection - required for UK GDPR accountability';
COMMENT ON COLUMN public.ip_tracking_log.purpose IS 'Purpose of IP collection: security, analytics, error_logging';
COMMENT ON COLUMN public.ip_tracking_log.consent_status IS 'Consent status at time of collection: granted, denied, not_required';
COMMENT ON COLUMN public.ip_tracking_log.general_location IS 'General location inference (country, city) - not precise coordinates';
COMMENT ON COLUMN public.ip_tracking_log.anonymized IS 'Whether IP address has been anonymized for retention compliance';
COMMENT ON FUNCTION anonymize_ip(TEXT) IS 'Anonymizes IP address by setting last octet (IPv4) or last segment (IPv6) to 0';
COMMENT ON FUNCTION log_ip_tracking IS 'Logs IP address collection for audit purposes';
COMMENT ON FUNCTION anonymize_old_ip_addresses() IS 'Anonymizes IP addresses after retention period (12-26 months depending on purpose)';
COMMENT ON FUNCTION delete_old_anonymized_ip_addresses() IS 'Deletes anonymized IP addresses 6 months after anonymization';
