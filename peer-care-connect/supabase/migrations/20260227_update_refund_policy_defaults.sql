-- Update Refund Policy Defaults
-- Story 10: Implement Refund Policy
-- Requirements:
-- - 24+ hours: Full refund
-- - 12-24 hours: 50% refund
-- - <12 hours: No refund

-- Update default policy in get_cancellation_policy function
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
    COALESCE(cp.partial_refund_hours, 12),  -- Updated from 2 to 12
    COALESCE(cp.partial_refund_percent, 50.00),
    COALESCE(cp.no_refund_hours, 12)  -- Updated from 2 to 12
  FROM cancellation_policies cp
  WHERE cp.practitioner_id = p_practitioner_id
    AND cp.is_active = true
  UNION ALL
  SELECT 24, 24, 12, 50.00, 12  -- Updated default policy: 24+ full, 12-24 partial 50%, <12 none
  LIMIT 1;
END;
$$;

-- Update calculate_cancellation_refund function to match new policy
-- Logic: 24+ hours = full, 12-24 hours = 50%, <12 hours = none
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
  -- Updated logic: 24+ hours = full, 12-24 hours = 50%, <12 hours = none
  IF v_hours_before_session >= v_policy.full_refund_hours THEN
    -- Full refund (24+ hours)
    v_refund_amount := COALESCE(v_session.price, 0);
    v_refund_percent := 100.00;
    v_refund_type := 'full';
  ELSIF v_hours_before_session >= v_policy.partial_refund_hours THEN
    -- Partial refund (12-24 hours)
    v_refund_percent := v_policy.partial_refund_percent;
    v_refund_amount := (COALESCE(v_session.price, 0) * v_refund_percent) / 100.00;
    v_refund_type := 'partial';
  ELSE
    -- No refund (<12 hours)
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

-- Update default values in cancellation_policies table for new records
-- Note: Existing policies will keep their custom values, only defaults change
ALTER TABLE cancellation_policies 
  ALTER COLUMN partial_refund_hours SET DEFAULT 12,
  ALTER COLUMN no_refund_hours SET DEFAULT 12;

-- Grant permissions (re-grant in case function was recreated)
GRANT EXECUTE ON FUNCTION get_cancellation_policy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cancellation_policy(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_cancellation_refund(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_cancellation_refund(UUID, TIMESTAMPTZ) TO service_role;

-- Comments
COMMENT ON FUNCTION get_cancellation_policy IS 'Returns cancellation policy for a practitioner with updated defaults: 24+ hours full, 12-24 hours 50%, <12 hours none';
COMMENT ON FUNCTION calculate_cancellation_refund IS 'Calculates refund based on updated policy: 24+ hours = full, 12-24 hours = 50%, <12 hours = none';
