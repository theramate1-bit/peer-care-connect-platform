-- Location Consent Management
-- Creates table for storing location tracking consent records
-- Required for UK GDPR and PECR compliance

CREATE TABLE IF NOT EXISTS public.location_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consented BOOLEAN NOT NULL DEFAULT false,
  consented_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  consent_method TEXT NOT NULL, -- 'browser_geolocation', 'manual_address', etc.
  ip_address TEXT, -- IP address at time of consent (for audit)
  user_agent TEXT, -- User agent at time of consent (for audit)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one consent record per user
  CONSTRAINT location_consents_user_id_unique UNIQUE (user_id)
);

-- Index for quick consent lookups
CREATE INDEX IF NOT EXISTS idx_location_consents_user_id ON public.location_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_location_consents_consented ON public.location_consents(consented);
CREATE INDEX IF NOT EXISTS idx_location_consents_consented_at ON public.location_consents(consented_at);

-- Enable RLS
ALTER TABLE public.location_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own consent records
CREATE POLICY "Users can view own location consent"
  ON public.location_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consent records
CREATE POLICY "Users can create own location consent"
  ON public.location_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own consent records
CREATE POLICY "Users can update own location consent"
  ON public.location_consents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all consent records (for admin/DSAR purposes)
CREATE POLICY "Service role can manage all location consents"
  ON public.location_consents
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_location_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_location_consents_updated_at
  BEFORE UPDATE ON public.location_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_location_consents_updated_at();

-- Function to check if user has consented to location tracking
CREATE OR REPLACE FUNCTION has_location_consent(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consented BOOLEAN;
BEGIN
  SELECT consented INTO v_consented
  FROM public.location_consents
  WHERE user_id = p_user_id
  AND (withdrawn_at IS NULL OR withdrawn_at > consented_at);
  
  RETURN COALESCE(v_consented, false);
END;
$$;

-- Function to record location consent
CREATE OR REPLACE FUNCTION record_location_consent(
  p_user_id UUID,
  p_consented BOOLEAN,
  p_consent_method TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consent_id UUID;
BEGIN
  INSERT INTO public.location_consents (
    user_id,
    consented,
    consented_at,
    withdrawn_at,
    consent_method,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_consented,
    CASE WHEN p_consented THEN NOW() ELSE NULL END,
    CASE WHEN NOT p_consented THEN NOW() ELSE NULL END,
    p_consent_method,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    consented = p_consented,
    consented_at = CASE WHEN p_consented AND location_consents.consented_at IS NULL THEN NOW() ELSE location_consents.consented_at END,
    withdrawn_at = CASE WHEN NOT p_consented THEN NOW() ELSE NULL END,
    consent_method = p_consent_method,
    ip_address = COALESCE(p_ip_address, location_consents.ip_address),
    user_agent = COALESCE(p_user_agent, location_consents.user_agent),
    updated_at = NOW()
  RETURNING id INTO v_consent_id;
  
  RETURN v_consent_id;
END;
$$;

-- Comments
COMMENT ON TABLE public.location_consents IS 'Stores location tracking consent records for UK GDPR and PECR compliance';
COMMENT ON COLUMN public.location_consents.consented IS 'Whether user has consented to location tracking';
COMMENT ON COLUMN public.location_consents.consented_at IS 'Timestamp when consent was granted';
COMMENT ON COLUMN public.location_consents.withdrawn_at IS 'Timestamp when consent was withdrawn';
COMMENT ON COLUMN public.location_consents.consent_method IS 'Method by which consent was obtained (browser_geolocation, manual_address, etc.)';
COMMENT ON FUNCTION has_location_consent(UUID) IS 'Checks if user has active location tracking consent';
COMMENT ON FUNCTION record_location_consent(UUID, BOOLEAN, TEXT, TEXT, TEXT) IS 'Records or updates location tracking consent';
