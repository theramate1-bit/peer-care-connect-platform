-- KAN-67: Practitioner earnings (this month, this year, monthly breakdown)
CREATE OR REPLACE FUNCTION public.get_practitioner_earnings(p_therapist_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'this_month_pence', COALESCE((
            SELECT ROUND(SUM(price::numeric) * 100)::bigint
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND payment_status = 'completed'
                AND is_peer_booking = false
                AND session_date >= date_trunc('month', CURRENT_DATE)
        ), 0),
        'this_year_pence', COALESCE((
            SELECT ROUND(SUM(price::numeric) * 100)::bigint
            FROM public.client_sessions
            WHERE therapist_id = p_therapist_id
                AND payment_status = 'completed'
                AND is_peer_booking = false
                AND session_date >= date_trunc('year', CURRENT_DATE)
        ), 0),
        'monthly_breakdown', (
            SELECT COALESCE(json_agg(months ORDER BY months->>'month' DESC), '[]'::json)
            FROM (
                SELECT json_build_object(
                    'month', to_char(month_start, 'YYYY-MM'),
                    'label', to_char(month_start, 'Mon YYYY'),
                    'amount_pence', ROUND(COALESCE(SUM(cs.price::numeric), 0) * 100)::bigint
                ) AS months
                FROM generate_series(
                    date_trunc('month', CURRENT_DATE) - interval '11 months',
                    date_trunc('month', CURRENT_DATE),
                    interval '1 month'
                ) AS month_start
                LEFT JOIN public.client_sessions cs
                    ON cs.therapist_id = p_therapist_id
                    AND cs.payment_status = 'completed'
                    AND cs.is_peer_booking = false
                    AND cs.session_date >= month_start
                    AND cs.session_date < month_start + interval '1 month'
                GROUP BY month_start
            ) sub
        )
    ) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_practitioner_earnings(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_practitioner_earnings IS 'Returns practitioner earnings: this month, this year, and last 12 months breakdown (KAN-67). Amounts in pence.';
