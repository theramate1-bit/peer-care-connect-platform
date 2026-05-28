-- KAN-18: Apply cancellation policy to peer booking refunds
-- 24+ hours: full refund; 12-24 hours: 50%; <12 hours: no refund

CREATE OR REPLACE FUNCTION process_peer_booking_refund(
    p_session_id UUID,
    p_cancellation_reason TEXT DEFAULT 'Session cancelled'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_client_balance INTEGER;
    v_practitioner_balance INTEGER;
    v_client_new_balance INTEGER;
    v_practitioner_new_balance INTEGER;
    v_client_payment_exists BOOLEAN;
    v_practitioner_earning_exists BOOLEAN;
    v_refund_calc JSON;
    v_refund_percent NUMERIC;
    v_refund_credits INTEGER;
BEGIN
    -- Get session details with lock
    SELECT 
        id,
        client_id,
        therapist_id,
        credit_cost,
        payment_status,
        status,
        is_peer_booking
    INTO v_session
    FROM public.client_sessions
    WHERE id = p_session_id
    FOR UPDATE;
    
    IF v_session.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session not found',
            'refunded_credits', 0
        );
    END IF;
    
    IF v_session.payment_status NOT IN ('paid', 'completed') THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session payment status is not eligible for refund: ' || COALESCE(v_session.payment_status, 'null') || '. Expected: paid or completed',
            'refunded_credits', 0
        );
    END IF;
    
    IF v_session.credit_cost IS NULL OR v_session.credit_cost = 0 THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'No credits to refund - session has no credit cost',
            'refunded_credits', 0
        );
    END IF;
    
    IF v_session.status = 'cancelled' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session is already cancelled',
            'refunded_credits', 0
        );
    END IF;
    
    -- KAN-18: Apply cancellation policy (24h full, 12h half, <12h none)
    v_refund_calc := calculate_cancellation_refund(p_session_id, NOW());
    IF (v_refund_calc->>'success')::boolean AND (v_refund_calc->>'refund_percent') IS NOT NULL THEN
        v_refund_percent := (v_refund_calc->>'refund_percent')::NUMERIC;
        v_refund_credits := ROUND((v_session.credit_cost * v_refund_percent) / 100.00)::INTEGER;
    ELSE
        v_refund_percent := 100.00;
        v_refund_credits := v_session.credit_cost;
    END IF;
    
    IF v_refund_credits <= 0 THEN
        -- No refund (e.g. <12h before): still cancel session, just don't move credits
        UPDATE public.client_sessions
        SET 
            status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = p_cancellation_reason,
            refund_amount = 0,
            refund_percentage = 0,
            updated_at = NOW()
        WHERE id = p_session_id;
        RETURN json_build_object(
            'success', true, 
            'refunded_credits', 0,
            'client_new_balance', NULL,
            'practitioner_new_balance', NULL
        );
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM public.credit_transactions 
        WHERE user_id = v_session.client_id AND session_id = p_session_id AND transaction_type = 'session_payment'
    ) INTO v_client_payment_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM public.credit_transactions 
        WHERE user_id = v_session.therapist_id AND session_id = p_session_id AND transaction_type = 'session_earning'
    ) INTO v_practitioner_earning_exists;
    
    SELECT balance INTO v_client_balance FROM public.credits WHERE user_id = v_session.client_id FOR UPDATE;
    SELECT balance INTO v_practitioner_balance FROM public.credits WHERE user_id = v_session.therapist_id FOR UPDATE;
    
    v_client_new_balance := COALESCE(v_client_balance, 0) + v_refund_credits;
    v_practitioner_new_balance := GREATEST(COALESCE(v_practitioner_balance, 0) - v_refund_credits, 0);
    
    UPDATE public.credits
    SET 
        balance = v_client_new_balance,
        total_spent = GREATEST(COALESCE(total_spent, 0) - v_refund_credits, 0),
        updated_at = NOW()
    WHERE user_id = v_session.client_id;
    
    UPDATE public.credits
    SET 
        balance = v_practitioner_new_balance,
        total_earned = GREATEST(COALESCE(total_earned, 0) - v_refund_credits, 0),
        updated_at = NOW()
    WHERE user_id = v_session.therapist_id;
    
    INSERT INTO public.credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after, description, session_id, created_at
    ) VALUES (
        v_session.client_id, 'refund', v_refund_credits, v_client_balance, v_client_new_balance,
        'Refund: ' || p_cancellation_reason, p_session_id, NOW()
    );
    
    INSERT INTO public.credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after, description, session_id, created_at
    ) VALUES (
        v_session.therapist_id, 'refund', -v_refund_credits, v_practitioner_balance, v_practitioner_new_balance,
        'Refund deduction: ' || p_cancellation_reason, p_session_id, NOW()
    );
    
    UPDATE public.client_sessions
    SET 
        status = 'cancelled',
        payment_status = 'refunded',
        cancellation_reason = p_cancellation_reason,
        refund_amount = v_refund_credits,
        refund_percentage = v_refund_percent,
        updated_at = NOW()
    WHERE id = p_session_id;
    
    RETURN json_build_object(
        'success', true, 
        'refunded_credits', v_refund_credits,
        'client_new_balance', v_client_new_balance,
        'practitioner_new_balance', v_practitioner_new_balance
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in process_peer_booking_refund: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'refunded_credits', 0
    );
END;
$$;

GRANT EXECUTE ON FUNCTION process_peer_booking_refund(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_peer_booking_refund(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION process_peer_booking_refund IS 
'Refunds credits for cancelled peer sessions. Applies cancellation policy (KAN-18): 24+ hours full refund, 12-24 hours 50%%, <12 hours no refund. Accepts paid/completed payment_status.';
