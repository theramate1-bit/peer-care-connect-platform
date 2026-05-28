-- Access Review Functions
-- Creates functions for reviewing access logs and generating compliance reports
-- Required for UK GDPR accountability and oversight

-- Function to review location access logs for a user
CREATE OR REPLACE FUNCTION review_location_access_for_user(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  access_id UUID,
  accessed_at TIMESTAMPTZ,
  accessed_by_user_id UUID,
  accessed_by_email TEXT,
  action TEXT,
  endpoint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lal.id AS access_id,
    lal.accessed_at,
    lal.accessed_by_user_id,
    u.email AS accessed_by_email,
    lal.action,
    lal.endpoint,
    lal.ip_address,
    lal.user_agent,
    lal.metadata
  FROM public.location_access_log lal
  LEFT JOIN public.users u ON u.id = lal.accessed_by_user_id
  WHERE 
    lal.user_id = p_user_id
    AND lal.accessed_at BETWEEN p_start_date AND p_end_date
  ORDER BY lal.accessed_at DESC;
END;
$$;

-- Function to review IP tracking logs for a user
CREATE OR REPLACE FUNCTION review_ip_tracking_for_user(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  tracking_id UUID,
  collected_at TIMESTAMPTZ,
  ip_address TEXT,
  anonymized BOOLEAN,
  general_location JSONB,
  purpose TEXT,
  consent_status TEXT,
  endpoint TEXT,
  user_agent TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    itl.id AS tracking_id,
    itl.collected_at,
    itl.ip_address,
    itl.anonymized,
    itl.general_location,
    itl.purpose,
    itl.consent_status,
    itl.endpoint,
    itl.user_agent
  FROM public.ip_tracking_log itl
  WHERE 
    itl.user_id = p_user_id
    AND itl.collected_at BETWEEN p_start_date AND p_end_date
  ORDER BY itl.collected_at DESC;
END;
$$;

-- Function to generate monthly access report
CREATE OR REPLACE FUNCTION generate_monthly_access_report(
  p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE(
  report_type TEXT,
  metric_name TEXT,
  metric_value BIGINT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_start_date := p_month::TIMESTAMPTZ;
  v_end_date := (p_month + INTERVAL '1 month')::TIMESTAMPTZ;
  
  RETURN QUERY
  -- Location access summary
  SELECT 
    'location_access'::TEXT AS report_type,
    'total_accesses'::TEXT AS metric_name,
    COUNT(*)::BIGINT AS metric_value,
    jsonb_build_object(
      'period_start', v_start_date,
      'period_end', v_end_date,
      'breakdown_by_action', (
        SELECT jsonb_object_agg(action, count)
        FROM (
          SELECT action, COUNT(*) as count
          FROM public.location_access_log
          WHERE accessed_at BETWEEN v_start_date AND v_end_date
          GROUP BY action
        ) sub
      ),
      'unique_users_accessed', (
        SELECT COUNT(DISTINCT user_id)
        FROM public.location_access_log
        WHERE accessed_at BETWEEN v_start_date AND v_end_date
      ),
      'unique_accessors', (
        SELECT COUNT(DISTINCT accessed_by_user_id)
        FROM public.location_access_log
        WHERE accessed_at BETWEEN v_start_date AND v_end_date
      )
    ) AS details
  FROM public.location_access_log
  WHERE accessed_at BETWEEN v_start_date AND v_end_date
  
  UNION ALL
  
  -- IP tracking summary
  SELECT 
    'ip_tracking'::TEXT AS report_type,
    'total_ip_collections'::TEXT AS metric_name,
    COUNT(*)::BIGINT AS metric_value,
    jsonb_build_object(
      'period_start', v_start_date,
      'period_end', v_end_date,
      'breakdown_by_purpose', (
        SELECT jsonb_object_agg(purpose, count)
        FROM (
          SELECT purpose, COUNT(*) as count
          FROM public.ip_tracking_log
          WHERE collected_at BETWEEN v_start_date AND v_end_date
          GROUP BY purpose
        ) sub
      ),
      'breakdown_by_consent', (
        SELECT jsonb_object_agg(COALESCE(consent_status, 'unknown'), count)
        FROM (
          SELECT consent_status, COUNT(*) as count
          FROM public.ip_tracking_log
          WHERE collected_at BETWEEN v_start_date AND v_end_date
          GROUP BY consent_status
        ) sub
      ),
      'unique_users', (
        SELECT COUNT(DISTINCT user_id)
        FROM public.ip_tracking_log
        WHERE collected_at BETWEEN v_start_date AND v_end_date
        AND user_id IS NOT NULL
      )
    ) AS details
  FROM public.ip_tracking_log
  WHERE collected_at BETWEEN v_start_date AND v_end_date
  
  UNION ALL
  
  -- Location consent summary
  SELECT 
    'location_consent'::TEXT AS report_type,
    'consent_statistics'::TEXT AS metric_name,
    COUNT(*)::BIGINT AS metric_value,
    jsonb_build_object(
      'period_start', v_start_date,
      'period_end', v_end_date,
      'total_consents', (
        SELECT COUNT(*)
        FROM public.location_consents
        WHERE consented_at BETWEEN v_start_date AND v_end_date
      ),
      'total_withdrawals', (
        SELECT COUNT(*)
        FROM public.location_consents
        WHERE withdrawn_at BETWEEN v_start_date AND v_end_date
      ),
      'active_consents', (
        SELECT COUNT(*)
        FROM public.location_consents
        WHERE consented = true
        AND (withdrawn_at IS NULL OR withdrawn_at > consented_at)
      )
    ) AS details
  FROM public.location_consents
  WHERE consented_at BETWEEN v_start_date AND v_end_date
     OR withdrawn_at BETWEEN v_start_date AND v_end_date;
END;
$$;

-- Function to detect suspicious access patterns
CREATE OR REPLACE FUNCTION detect_suspicious_location_access(
  p_threshold_count INTEGER DEFAULT 100,
  p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  accessed_by_user_id UUID,
  access_count BIGINT,
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  unique_locations_accessed BIGINT,
  ip_addresses TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lal.accessed_by_user_id,
    COUNT(*)::BIGINT AS access_count,
    MIN(lal.accessed_at) AS time_window_start,
    MAX(lal.accessed_at) AS time_window_end,
    COUNT(DISTINCT lal.location_id)::BIGINT AS unique_locations_accessed,
    array_agg(DISTINCT lal.ip_address) FILTER (WHERE lal.ip_address IS NOT NULL) AS ip_addresses
  FROM public.location_access_log lal
  WHERE 
    lal.accessed_at > NOW() - (p_time_window_hours || ' hours')::INTERVAL
    AND lal.accessed_by_user_id IS NOT NULL
  GROUP BY 
    lal.accessed_by_user_id,
    DATE_TRUNC('hour', lal.accessed_at)
  HAVING COUNT(*) >= p_threshold_count
  ORDER BY access_count DESC;
END;
$$;

-- Function to get compliance metrics summary
CREATE OR REPLACE FUNCTION get_compliance_metrics_summary()
RETURNS TABLE(
  metric_category TEXT,
  metric_name TEXT,
  metric_value NUMERIC,
  target_value NUMERIC,
  status TEXT,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Location consent rate
  SELECT 
    'consent'::TEXT AS metric_category,
    'location_consent_rate'::TEXT AS metric_name,
    (
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COUNT(*) FILTER (WHERE consented = true AND (withdrawn_at IS NULL OR withdrawn_at > consented_at))::NUMERIC / COUNT(*)::NUMERIC * 100)
          ELSE 0
        END
      FROM public.location_consents
    ) AS metric_value,
    80.0::NUMERIC AS target_value,
    CASE 
      WHEN (
        SELECT 
          CASE 
            WHEN COUNT(*) > 0 THEN 
              (COUNT(*) FILTER (WHERE consented = true AND (withdrawn_at IS NULL OR withdrawn_at > consented_at))::NUMERIC / COUNT(*)::NUMERIC * 100)
            ELSE 0
          END
        FROM public.location_consents
      ) >= 80 THEN 'meeting_target'::TEXT
      ELSE 'below_target'::TEXT
    END AS status,
    NOW() AS last_updated
    
  UNION ALL
  
  -- Location access logging coverage
  SELECT 
    'audit'::TEXT AS metric_category,
    'location_access_logging_coverage'::TEXT AS metric_name,
    (
      SELECT 
        CASE 
          WHEN COUNT(DISTINCT ul.user_id) > 0 THEN
            (COUNT(DISTINCT lal.user_id)::NUMERIC / COUNT(DISTINCT ul.user_id)::NUMERIC * 100)
          ELSE 0
        END
      FROM public.user_locations ul
      LEFT JOIN public.location_access_log lal ON lal.user_id = ul.user_id
      WHERE ul.created_at > NOW() - INTERVAL '30 days'
    ) AS metric_value,
    90.0::NUMERIC AS target_value,
    CASE 
      WHEN (
        SELECT 
          CASE 
            WHEN COUNT(DISTINCT ul.user_id) > 0 THEN
              (COUNT(DISTINCT lal.user_id)::NUMERIC / COUNT(DISTINCT ul.user_id)::NUMERIC * 100)
            ELSE 0
          END
        FROM public.user_locations ul
        LEFT JOIN public.location_access_log lal ON lal.user_id = ul.user_id
        WHERE ul.created_at > NOW() - INTERVAL '30 days'
      ) >= 90 THEN 'meeting_target'::TEXT
      ELSE 'below_target'::TEXT
    END AS status,
    NOW() AS last_updated
    
  UNION ALL
  
  -- IP anonymization compliance
  SELECT 
    'retention'::TEXT AS metric_category,
    'ip_anonymization_compliance'::TEXT AS metric_name,
    (
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN
            (COUNT(*) FILTER (WHERE anonymized = true OR collected_at > NOW() - INTERVAL '12 months')::NUMERIC / COUNT(*)::NUMERIC * 100)
          ELSE 100
        END
      FROM public.ip_tracking_log
      WHERE purpose = 'security'
    ) AS metric_value,
    100.0::NUMERIC AS target_value,
    CASE 
      WHEN (
        SELECT 
          CASE 
            WHEN COUNT(*) > 0 THEN
              (COUNT(*) FILTER (WHERE anonymized = true OR collected_at > NOW() - INTERVAL '12 months')::NUMERIC / COUNT(*)::NUMERIC * 100)
            ELSE 100
          END
        FROM public.ip_tracking_log
        WHERE purpose = 'security'
      ) = 100 THEN 'meeting_target'::TEXT
      ELSE 'below_target'::TEXT
    END AS status,
    NOW() AS last_updated;
END;
$$;

-- Comments
COMMENT ON FUNCTION review_location_access_for_user IS 'Reviews location access logs for a specific user (for DSAR/compliance)';
COMMENT ON FUNCTION review_ip_tracking_for_user IS 'Reviews IP tracking logs for a specific user (for DSAR/compliance)';
COMMENT ON FUNCTION generate_monthly_access_report IS 'Generates monthly compliance report on location/IP access';
COMMENT ON FUNCTION detect_suspicious_location_access IS 'Detects suspicious patterns in location access (for security monitoring)';
COMMENT ON FUNCTION get_compliance_metrics_summary IS 'Returns compliance metrics summary for dashboard/monitoring';
