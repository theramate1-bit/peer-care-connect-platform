-- Cancellation Policy System
-- Allows practitioners to configure cancellation policies with automatic enforcement

-- Cancellation policies table (practitioner-level configuration)
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  advance_notice_hours INTEGER DEFAULT 24,
  full_refund_hours INTEGER DEFAULT 24,
  partial_refund_hours INTEGER DEFAULT 2,
  partial_refund_percent DECIMAL(5,2) DEFAULT 50.00,
  no_refund_hours INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practitioner_id)
);

-- Add cancellation fields to client_sessions if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_sessions' AND column_name = 'cancelled_at') THEN
    ALTER TABLE client_sessions ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_sessions' AND column_name = 'cancelled_by') THEN
    ALTER TABLE client_sessions ADD COLUMN cancelled_by UUID REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_sessions' AND column_name = 'refund_amount') THEN
    ALTER TABLE client_sessions ADD COLUMN refund_amount DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_sessions' AND column_name = 'refund_percentage') THEN
    ALTER TABLE client_sessions ADD COLUMN refund_percentage DECIMAL(5,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_sessions' AND column_name = 'policy_accepted') THEN
    ALTER TABLE client_sessions ADD COLUMN policy_accepted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_practitioner ON cancellation_policies(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_active ON cancellation_policies(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

-- Practitioners can manage their own cancellation policies
CREATE POLICY "Practitioners can view their own policies"
  ON cancellation_policies FOR SELECT
  USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can insert their own policies"
  ON cancellation_policies FOR INSERT
  WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their own policies"
  ON cancellation_policies FOR UPDATE
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

-- Clients can view active policies for practitioners they're booking with
CREATE POLICY "Clients can view active policies"
  ON cancellation_policies FOR SELECT
  USING (
    is_active = true AND 
    EXISTS (
      SELECT 1 FROM client_sessions 
      WHERE therapist_id = cancellation_policies.practitioner_id 
      AND client_id = auth.uid()
    )
  );

-- RPC Function: Get cancellation policy for a practitioner (with defaults)
CREATE OR REPLACE FUNCTION get_cancellation_policy(p_practitioner_id UUID)
RETURNS TABLE (
  advance_notice_hours INTEGER,
  full_refund_hours INTEGER,
  partial_refund_hours INTEGER,
  partial_refund_percent DECIMAL(5,2),
  no_refund_hours INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(cp.advance_notice_hours, 24),
    COALESCE(cp.full_refund_hours, 24),
    COALESCE(cp.partial_refund_hours, 2),
    COALESCE(cp.partial_refund_percent, 50.00),
    COALESCE(cp.no_refund_hours, 2)
  FROM cancellation_policies cp
  WHERE cp.practitioner_id = p_practitioner_id
    AND cp.is_active = true
  UNION ALL
  SELECT 24, 24, 2, 50.00, 2  -- Default policy if none exists
  LIMIT 1;
END;
$$;

-- RPC Function: Calculate refund based on cancellation policy
CREATE OR REPLACE FUNCTION calculate_cancellation_refund(
  p_session_id UUID,
  p_cancellation_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_policy RECORD;
  v_session_datetime TIMESTAMPTZ;
  v_hours_before_session NUMERIC;
  v_refund_amount DECIMAL(10,2);
  v_refund_percent DECIMAL(5,2);
  v_refund_type TEXT;
BEGIN
  -- Get session details
  SELECT 
    id,
    therapist_id,
    session_date,
    start_time,
    price,
    status,
    payment_status
  INTO v_session
  FROM client_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;
  
  -- Check if already cancelled
  IF v_session.status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session already cancelled'
    );
  END IF;
  
  -- Calculate session datetime
  v_session_datetime := (v_session.session_date::text || ' ' || v_session.start_time::text)::TIMESTAMPTZ;
  
  -- Calculate hours before session
  v_hours_before_session := EXTRACT(EPOCH FROM (v_session_datetime - p_cancellation_time)) / 3600;
  
  -- Get cancellation policy
  SELECT * INTO v_policy
  FROM get_cancellation_policy(v_session.therapist_id);
  
  -- Calculate refund based on timing
  IF v_hours_before_session >= v_policy.full_refund_hours THEN
    -- Full refund
    v_refund_amount := COALESCE(v_session.price, 0);
    v_refund_percent := 100.00;
    v_refund_type := 'full';
  ELSIF v_hours_before_session >= v_policy.partial_refund_hours THEN
    -- Partial refund
    v_refund_percent := v_policy.partial_refund_percent;
    v_refund_amount := (COALESCE(v_session.price, 0) * v_refund_percent) / 100.00;
    v_refund_type := 'partial';
  ELSIF v_hours_before_session >= v_policy.no_refund_hours THEN
    -- No refund (partial refund window)
    v_refund_amount := (COALESCE(v_session.price, 0) * v_policy.partial_refund_percent) / 100.00;
    v_refund_percent := v_policy.partial_refund_percent;
    v_refund_type := 'partial';
  ELSE
    -- No refund (too late)
    v_refund_amount := 0;
    v_refund_percent := 0;
    v_refund_type := 'none';
  END IF;
  
  -- Return calculation
  RETURN json_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'refund_percent', v_refund_percent,
    'refund_type', v_refund_type,
    'hours_before_session', v_hours_before_session,
    'session_datetime', v_session_datetime,
    'cancellation_time', p_cancellation_time,
    'policy_used', json_build_object(
      'full_refund_hours', v_policy.full_refund_hours,
      'partial_refund_hours', v_policy.partial_refund_hours,
      'partial_refund_percent', v_policy.partial_refund_percent,
      'no_refund_hours', v_policy.no_refund_hours
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_cancellation_policy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cancellation_policy(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_cancellation_refund(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_cancellation_refund(UUID, TIMESTAMPTZ) TO service_role;

-- Comments
COMMENT ON TABLE cancellation_policies IS 'Practitioner-level cancellation policies with configurable refund windows';
COMMENT ON FUNCTION get_cancellation_policy IS 'Returns cancellation policy for a practitioner with defaults';
COMMENT ON FUNCTION calculate_cancellation_refund IS 'Calculates refund amount and percentage based on cancellation timing and policy';

