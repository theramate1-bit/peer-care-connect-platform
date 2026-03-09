-- Create process_peer_booking_refund RPC function
-- This is a HIGH PRIORITY function for handling session cancellations

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
BEGIN
    -- Get session details with lock
    SELECT 
        id,
        client_id,
        therapist_id,
        credit_cost,
        payment_status,
        status
    INTO v_session
    FROM public.client_sessions
    WHERE id = p_session_id
    FOR UPDATE;
    
    -- Validate session exists
    IF v_session.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session not found'
        );
    END IF;
    
    -- Validate session is eligible for refund
    IF v_session.payment_status != 'paid' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session payment status is not paid: ' || COALESCE(v_session.payment_status, 'null')
        );
    END IF;
    
    -- Validate session has credit cost
    IF v_session.credit_cost IS NULL OR v_session.credit_cost = 0 THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'No credits to refund'
        );
    END IF;
    
    -- Validate session is not already cancelled
    IF v_session.status = 'cancelled' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session is already cancelled'
        );
    END IF;
    
    -- Lock credit records
    SELECT balance INTO v_client_balance
    FROM public.credits 
    WHERE user_id = v_session.client_id 
    FOR UPDATE;
    
    SELECT balance INTO v_practitioner_balance
    FROM public.credits 
    WHERE user_id = v_session.therapist_id 
    FOR UPDATE;
    
    -- Validate practitioner has sufficient credits to refund
    IF v_practitioner_balance IS NULL OR v_practitioner_balance < v_session.credit_cost THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Practitioner has insufficient credits for refund. Required: %s, Available: %s',
                           v_session.credit_cost, COALESCE(v_practitioner_balance, 0))
        );
    END IF;
    
    -- Calculate new balances
    v_client_new_balance := COALESCE(v_client_balance, 0) + v_session.credit_cost;
    v_practitioner_new_balance := v_practitioner_balance - v_session.credit_cost;
    
    -- Refund credits to client
    UPDATE public.credits
    SET 
        balance = v_client_new_balance,
        current_balance = v_client_new_balance,
        updated_at = NOW()
    WHERE user_id = v_session.client_id;
    
    -- Deduct credits from practitioner
    UPDATE public.credits
    SET 
        balance = v_practitioner_new_balance,
        current_balance = v_practitioner_new_balance,
        total_spent = COALESCE(total_spent, 0) + v_session.credit_cost,
        updated_at = NOW()
    WHERE user_id = v_session.therapist_id;
    
    -- Create transaction record for client (refund)
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
    
    -- Create transaction record for practitioner (deduction)
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
        'session_payment', 
        v_session.credit_cost, 
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
        'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_peer_booking_refund(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_peer_booking_refund(UUID, TEXT) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION process_peer_booking_refund IS 
'Atomically processes credit refund for cancelled peer treatment sessions. Returns credits to client, deducts from practitioner. Uses row-level locking to prevent race conditions.';

