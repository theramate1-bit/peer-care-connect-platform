-- Add cancellation stats to practitioner dashboard
-- This migration updates the get_practitioner_dashboard_data function to include cancelled sessions and refund amounts

CREATE OR REPLACE FUNCTION public.get_practitioner_dashboard_data(p_therapist_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_sessions', (
            SELECT COUNT(*)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
        ),
        'completed_sessions', (
            SELECT COUNT(*)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status = 'completed'
        ),
        'cancelled_sessions', (
            SELECT COUNT(*)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status = 'cancelled'
                AND cancelled_by = p_therapist_id  -- Only cancellations by this practitioner
        ),
        'total_refunds', COALESCE((
            SELECT SUM(COALESCE(refund_amount, 0))
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status = 'cancelled'
                AND cancelled_by = p_therapist_id
                AND payment_status = 'refunded'
        ), 0),
        'monthly_revenue', COALESCE((
            SELECT SUM(price::numeric)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND payment_status = 'completed'
                AND session_date >= date_trunc('month', CURRENT_DATE)
        ) * 100, 0), -- Convert to pence
        'active_clients', (
            SELECT COUNT(DISTINCT client_id)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status IN ('scheduled', 'confirmed', 'in_progress')
        ),
        'credit_balance', (
            SELECT COALESCE(balance, 0)
            FROM get_credit_balance(p_therapist_id)
            LIMIT 1
        ),
        'upcoming_sessions', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'session_date', session_date,
                    'start_time', start_time,
                    'session_type', session_type,
                    'client_name', client_name,
                    'client_email', client_email,
                    'status', status,
                    'payment_status', payment_status,
                    'price', price,
                    'duration_minutes', duration_minutes
                )
            )
            FROM (
                SELECT *
                FROM public.client_sessions
                WHERE therapist_id = p_therapist_id
                    AND status IN ('scheduled', 'confirmed', 'in_progress')
                    AND session_date >= CURRENT_DATE
                ORDER BY session_date ASC, start_time ASC
                LIMIT 10
            ) upcoming
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.get_practitioner_dashboard_data IS 'Returns aggregated dashboard statistics for a practitioner, including cancellation stats';
