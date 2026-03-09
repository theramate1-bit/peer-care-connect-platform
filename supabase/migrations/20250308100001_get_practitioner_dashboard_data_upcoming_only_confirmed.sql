-- Ensure upcoming_sessions only returns confirmed sessions (scheduled, confirmed, in_progress), never pending_payment.
-- Replaces function to match current live shape; upcoming_sessions already excludes pending_payment and expired.

CREATE OR REPLACE FUNCTION public.get_practitioner_dashboard_data(p_therapist_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_sessions', (
            SELECT COUNT(*)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status NOT IN ('cancelled', 'no_show')
                AND is_peer_booking = false
        ),
        'completed_sessions', (
            SELECT COUNT(*)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status = 'completed'
                AND is_peer_booking = false
        ),
        'cancelled_sessions', (
            SELECT COUNT(*)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status = 'cancelled'
                AND cancelled_by = p_therapist_id
                AND is_peer_booking = false
        ),
        'total_refunds', COALESCE((
            SELECT SUM(COALESCE(refund_amount, 0))
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status = 'cancelled'
                AND cancelled_by = p_therapist_id
                AND payment_status = 'refunded'
                AND is_peer_booking = false
        ), 0),
        'monthly_revenue', COALESCE((
            SELECT SUM(price::numeric)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND payment_status = 'completed'
                AND session_date >= date_trunc('month', CURRENT_DATE)
                AND is_peer_booking = false
        ) * 100, 0),
        'active_clients', (
            SELECT COUNT(DISTINCT client_id)
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND status IN ('scheduled', 'confirmed', 'in_progress')
                AND is_peer_booking = false
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
                    'duration_minutes', duration_minutes,
                    'is_guest_booking', is_guest_booking
                )
            )
            FROM (
                SELECT *
                FROM public.client_sessions
                WHERE therapist_id = p_therapist_id
                    AND status IN ('scheduled', 'confirmed', 'in_progress')
                    AND session_date >= CURRENT_DATE
                    AND is_peer_booking = false
                ORDER BY session_date ASC, start_time ASC
                LIMIT 10
            ) upcoming
        )
    ) INTO result;

    RETURN result;
END;
$function$;

COMMENT ON FUNCTION public.get_practitioner_dashboard_data(uuid) IS
  'Returns aggregated dashboard statistics for a practitioner. upcoming_sessions only includes scheduled, confirmed, in_progress (excludes pending_payment and expired).';

GRANT EXECUTE ON FUNCTION public.get_practitioner_dashboard_data(uuid) TO authenticated;
