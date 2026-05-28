-- Fix process_peer_booking_refund to accept both 'paid' and 'completed' payment_status
-- Treatment exchange sessions use 'completed' status, not 'paid'

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
    
    -- Validate session exists
    IF v_session.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session not found',
            'refunded_credits', 0
        );
    END IF;
    
    -- Validate session is eligible for refund
    -- Accept both 'paid' and 'completed' for peer bookings (treatment exchange uses 'completed')
    IF v_session.payment_status NOT IN ('paid', 'completed') THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session payment status is not eligible for refund: ' || COALESCE(v_session.payment_status, 'null') || '. Expected: paid or completed',
            'refunded_credits', 0
        );
    END IF;
    
    -- Validate session has credit cost
    IF v_session.credit_cost IS NULL OR v_session.credit_cost = 0 THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'No credits to refund - session has no credit cost',
            'refunded_credits', 0
        );
    END IF;
    
    -- Validate session is not already cancelled
    IF v_session.status = 'cancelled' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session is already cancelled',
            'refunded_credits', 0
        );
    END IF;
    
    -- Check if client payment transaction exists (for validation)
    SELECT EXISTS (
        SELECT 1 
        FROM public.credit_transactions 
        WHERE user_id = v_session.client_id 
          AND session_id = p_session_id 
          AND transaction_type = 'session_payment'
    ) INTO v_client_payment_exists;
    
    -- Check if practitioner earning transaction exists (for validation)
    SELECT EXISTS (
        SELECT 1 
        FROM public.credit_transactions 
        WHERE user_id = v_session.therapist_id 
          AND session_id = p_session_id 
          AND transaction_type = 'session_earning'
    ) INTO v_practitioner_earning_exists;
    
    -- Lock credit records
    SELECT balance INTO v_client_balance
    FROM public.credits 
    WHERE user_id = v_session.client_id 
    FOR UPDATE;
    
    SELECT balance INTO v_practitioner_balance
    FROM public.credits 
    WHERE user_id = v_session.therapist_id 
    FOR UPDATE;
    
    -- Calculate new balances
    v_client_new_balance := COALESCE(v_client_balance, 0) + v_session.credit_cost;
    v_practitioner_new_balance := GREATEST(COALESCE(v_practitioner_balance, 0) - v_session.credit_cost, 0);
    
    -- Update client balance (refund credits)
    UPDATE public.credits
    SET 
        balance = v_client_new_balance,
        total_spent = GREATEST(COALESCE(total_spent, 0) - v_session.credit_cost, 0),
        updated_at = NOW()
    WHERE user_id = v_session.client_id;
    
    -- Update practitioner balance (deduct credits)
    UPDATE public.credits
    SET 
        balance = v_practitioner_new_balance,
        total_earned = GREATEST(COALESCE(total_earned, 0) - v_session.credit_cost, 0),
        updated_at = NOW()
    WHERE user_id = v_session.therapist_id;
    
    -- Create transaction record for client (refund - adds credits back)
    INSERT INTO public.credit_transactions (
        user_id, 
        transaction_type, 
        amount, 
        balance_before, 
        balance_after, 
        description, 
        session_id,
        created_at
    ) VALUES (
        v_session.client_id, 
        'refund', 
        v_session.credit_cost, 
        v_client_balance, 
        v_client_new_balance,
        'Refund: ' || p_cancellation_reason, 
        p_session_id,
        NOW()
    );
    
    -- Create transaction record for practitioner (deduction - removes credits)
    INSERT INTO public.credit_transactions (
        user_id, 
        transaction_type, 
        amount, 
        balance_before, 
        balance_after, 
        description, 
        session_id,
        created_at
    ) VALUES (
        v_session.therapist_id, 
        'refund', 
        -v_session.credit_cost, 
        v_practitioner_balance, 
        v_practitioner_new_balance,
        'Refund deduction: ' || p_cancellation_reason, 
        p_session_id,
        NOW()
    );
    
    -- Update session status
    UPDATE public.client_sessions
    SET 
        status = 'cancelled',
        payment_status = 'refunded',
        cancellation_reason = p_cancellation_reason,
        updated_at = NOW()
    WHERE id = p_session_id;
    
    -- Return success
    RETURN json_build_object(
        'success', true, 
        'refunded_credits', v_session.credit_cost,
        'client_new_balance', v_client_new_balance,
        'practitioner_new_balance', v_practitioner_new_balance
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error in process_peer_booking_refund: %', SQLERRM;
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'refunded_credits', 0
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_peer_booking_refund(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_peer_booking_refund(UUID, TEXT) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION process_peer_booking_refund IS 
'Atomically processes credit refund for cancelled peer treatment sessions. Accepts both "paid" and "completed" payment_status (treatment exchange sessions use "completed"). Returns credits to client, deducts from practitioner. Uses row-level locking to prevent race conditions.';

