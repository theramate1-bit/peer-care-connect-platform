-- Create optimized dashboard data function
-- Consolidates 7+ queries into a single RPC call for better performance
CREATE OR REPLACE FUNCTION get_practitioner_dashboard_data(
  p_therapist_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_today DATE := CURRENT_DATE;
  v_next_week DATE := CURRENT_DATE + INTERVAL '7 days';
  v_current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
  v_next_month_start DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  v_thirty_days_ago DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'upcoming_sessions', (
      SELECT COALESCE(JSON_AGG(row_to_json(s.*)), '[]'::json)
      FROM (
        SELECT *
        FROM client_sessions
        WHERE therapist_id = p_therapist_id
          AND session_date BETWEEN v_today AND v_next_week
          AND status = 'scheduled'
        ORDER BY session_date ASC, start_time ASC
        LIMIT 5
      ) s
    ),
    'total_sessions', (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE therapist_id = p_therapist_id
    ),
    'completed_sessions', (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE therapist_id = p_therapist_id
        AND status = 'completed'
    ),
    'active_clients', (
      SELECT COUNT(DISTINCT client_id)
      FROM client_sessions
      WHERE therapist_id = p_therapist_id
        AND session_date >= v_thirty_days_ago
    ),
    'monthly_revenue', (
      SELECT COALESCE(SUM(amount), 0)
      FROM payments
      WHERE therapist_id = p_therapist_id
        AND payment_status = 'completed'
        AND created_at >= v_current_month_start
        AND created_at < v_next_month_start
    ),
    'credit_balance', (
      SELECT COALESCE(balance, 0)
      FROM credit_balances
      WHERE user_id = p_therapist_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_practitioner_dashboard_data(UUID) TO authenticated;

