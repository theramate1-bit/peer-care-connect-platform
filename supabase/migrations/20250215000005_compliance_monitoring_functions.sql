-- Compliance Monitoring Functions
-- For tracking compliance metrics and KPIs

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_compliance_metrics_summary();
DROP FUNCTION IF EXISTS get_dsar_metrics(DATE);
DROP FUNCTION IF EXISTS get_retention_compliance_metrics();
DROP FUNCTION IF EXISTS get_consent_rate_trends(INTEGER);

-- Function to get compliance metrics summary
CREATE OR REPLACE FUNCTION get_compliance_metrics_summary()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  target_value NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    -- Location consent rate
    SELECT 
      'location_consent_rate'::TEXT as metric_name,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE consent_granted = true)::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0
      END as metric_value,
      70.0::NUMERIC as target_value
    FROM location_consents
    
    UNION ALL
    
    -- Location access logging coverage
    SELECT 
      'location_access_logging_coverage'::TEXT as metric_name,
      CASE 
        WHEN (SELECT COUNT(*) FROM user_locations) > 0 THEN
          (COUNT(DISTINCT location_id)::NUMERIC / (SELECT COUNT(*) FROM user_locations)::NUMERIC * 100)
        ELSE 100
      END as metric_value,
      100.0::NUMERIC as target_value
    FROM location_access_log
    
    UNION ALL
    
    -- IP anonymization compliance
    SELECT 
      'ip_anonymization_compliance'::TEXT as metric_name,
      CASE 
        WHEN COUNT(*) > 0 THEN
          (COUNT(*) FILTER (WHERE timestamp < NOW() - INTERVAL '26 months' AND anonymized = true)::NUMERIC / 
           COUNT(*) FILTER (WHERE timestamp < NOW() - INTERVAL '26 months')::NUMERIC * 100)
        ELSE 100
      END as metric_value,
      100.0::NUMERIC as target_value
    FROM ip_tracking_log
  )
  SELECT 
    m.metric_name,
    m.metric_value,
    m.target_value,
    CASE 
      WHEN m.metric_value >= m.target_value THEN 'meeting_target'::TEXT
      ELSE 'below_target'::TEXT
    END as status
  FROM metrics m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get DSAR metrics
CREATE OR REPLACE FUNCTION get_dsar_metrics(p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 month')
RETURNS TABLE (
  total_requests BIGINT,
  completed BIGINT,
  in_progress BIGINT,
  avg_response_days NUMERIC,
  on_time_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH dsar_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
      AVG(EXTRACT(EPOCH FROM (response_date - request_date))/86400) as avg_days,
      COUNT(*) FILTER (WHERE response_date - request_date <= INTERVAL '30 days')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)::NUMERIC * 100 as on_time
    FROM dsar_requests
    WHERE request_date >= p_start_date
  )
  SELECT 
    COALESCE(total, 0)::BIGINT,
    COALESCE(completed_count, 0)::BIGINT,
    COALESCE(in_progress_count, 0)::BIGINT,
    COALESCE(avg_days, 0)::NUMERIC,
    COALESCE(on_time, 100)::NUMERIC
  FROM dsar_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get retention compliance metrics
CREATE OR REPLACE FUNCTION get_retention_compliance_metrics()
RETURNS TABLE (
  location_past_retention BIGINT,
  ip_past_retention BIGINT,
  location_scheduled_deletion BIGINT,
  ip_anonymized BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Location data past retention (7 years)
    (SELECT COUNT(*) 
     FROM user_locations ul
     JOIN users u ON ul.user_id = u.id
     WHERE ul.updated_at < NOW() - INTERVAL '7 years'
     AND u.deleted_at IS NULL)::BIGINT as location_past_retention,
    
    -- IP addresses past retention (26 months for analytics)
    (SELECT COUNT(*) 
     FROM ip_tracking_log
     WHERE timestamp < NOW() - INTERVAL '26 months'
     AND purpose = 'analytics'
     AND anonymized = false)::BIGINT as ip_past_retention,
    
    -- Location data scheduled for deletion
    (SELECT COUNT(*) 
     FROM user_locations ul
     JOIN users u ON ul.user_id = u.id
     WHERE u.deleted_at IS NOT NULL
     AND ul.deleted_at IS NULL)::BIGINT as location_scheduled_deletion,
    
    -- IP addresses anonymized
    (SELECT COUNT(*) 
     FROM ip_tracking_log
     WHERE anonymized = true)::BIGINT as ip_anonymized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get consent rate trends (monthly)
CREATE OR REPLACE FUNCTION get_consent_rate_trends(p_months INTEGER DEFAULT 6)
RETURNS TABLE (
  month DATE,
  location_consent_rate NUMERIC,
  analytics_consent_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE - (p_months || ' months')::INTERVAL),
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::INTERVAL
    )::DATE as month
  ),
  location_consent AS (
    SELECT 
      DATE_TRUNC('month', granted_at)::DATE as month,
      COUNT(*) FILTER (WHERE consent_granted = true)::NUMERIC / 
      NULLIF(COUNT(*), 0)::NUMERIC * 100 as rate
    FROM location_consents
    WHERE granted_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', granted_at)
  )
  SELECT 
    m.month,
    COALESCE(lc.rate, 0)::NUMERIC as location_consent_rate,
    0::NUMERIC as analytics_consent_rate -- TODO: Implement analytics consent tracking
  FROM months m
  LEFT JOIN location_consent lc ON m.month = lc.month
  ORDER BY m.month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create DSAR requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_method TEXT,
  identity_verified BOOLEAN DEFAULT false,
  identity_verification_method TEXT,
  data_collected_date TIMESTAMP WITH TIME ZONE,
  response_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  data_categories TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for DSAR requests
CREATE INDEX IF NOT EXISTS idx_dsar_requests_user_id ON dsar_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_status ON dsar_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_date ON dsar_requests(request_date);

-- RLS policies for DSAR requests
ALTER TABLE dsar_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own DSAR requests"
  ON dsar_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all DSAR requests"
  ON dsar_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert DSAR requests"
  ON dsar_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update DSAR requests"
  ON dsar_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON dsar_requests TO authenticated;
GRANT INSERT, UPDATE ON dsar_requests TO authenticated;
