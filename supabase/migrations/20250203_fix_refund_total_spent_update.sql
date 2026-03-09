-- Fix process_peer_booking_refund to decrease total_spent for client when refunding
-- When a client gets a refund, their total_spent should decrease because they're getting credits back

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
        status
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
    IF v_session.payment_status != 'paid' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Session payment status is not paid: ' || COALESCE(v_session.payment_status, 'null'),
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
    
    -- CRITICAL: Check if client actually paid credits
    SELECT EXISTS(
        SELECT 1 FROM public.credit_transactions
        WHERE user_id = v_session.client_id
          AND session_id = p_session_id
          AND transaction_type = 'session_payment'
    ) INTO v_client_payment_exists;
    
    -- CRITICAL: Check if practitioner actually earned credits
    SELECT EXISTS(
        SELECT 1 FROM public.credit_transactions
        WHERE user_id = v_session.therapist_id
          AND session_id = p_session_id
          AND transaction_type = 'session_earning'
    ) INTO v_practitioner_earning_exists;
    
    -- If no payment was made, return success with 0 refund (session can still be cancelled)
    IF NOT v_client_payment_exists THEN
        -- Still cancel the session, but don't process refund
        UPDATE public.client_sessions
        SET 
            status = 'cancelled',
            cancellation_reason = p_cancellation_reason,
            updated_at = NOW()
        WHERE id = p_session_id;
        
        RETURN json_build_object(
            'success', true,
            'refunded_credits', 0,
            'warning', 'No credits were refunded because credits were never deducted when the booking was accepted',
            'client_new_balance', NULL,
            'practitioner_new_balance', NULL
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
    
    -- Validate practitioner has sufficient credits to refund (only if they earned credits)
    IF v_practitioner_earning_exists AND (v_practitioner_balance IS NULL OR v_practitioner_balance < v_session.credit_cost) THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Practitioner has insufficient credits for refund. Required: %s, Available: %s',
                           v_session.credit_cost, COALESCE(v_practitioner_balance, 0)),
            'refunded_credits', 0
        );
    END IF;
    
    -- Calculate new balances
    v_client_new_balance := COALESCE(v_client_balance, 0) + v_session.credit_cost;
    
    -- Only deduct from practitioner if they actually earned credits
    IF v_practitioner_earning_exists THEN
        v_practitioner_new_balance := v_practitioner_balance - v_session.credit_cost;
    ELSE
        v_practitioner_new_balance := v_practitioner_balance; -- No change if they never earned
    END IF;
    
    -- Refund credits to client AND decrease total_spent
    -- When refunding, total_spent should decrease because the client is getting credits back
    UPDATE public.credits
    SET 
        balance = v_client_new_balance,
        current_balance = v_client_new_balance,
        total_spent = GREATEST(COALESCE(total_spent, 0) - v_session.credit_cost, 0),
        updated_at = NOW()
    WHERE user_id = v_session.client_id;
    
    -- Deduct credits from practitioner (only if they earned credits)
    IF v_practitioner_earning_exists THEN
        UPDATE public.credits
        SET 
            balance = v_practitioner_new_balance,
            current_balance = v_practitioner_new_balance,
            total_earned = GREATEST(COALESCE(total_earned, 0) - v_session.credit_cost, 0),
            updated_at = NOW()
        WHERE user_id = v_session.therapist_id;
        
        -- Create transaction record for practitioner (deduction) - use 'refund' type with negative amount
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
    END IF;
    
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

-- Update comment
COMMENT ON FUNCTION process_peer_booking_refund IS 
'Atomically processes credit refund for cancelled peer treatment sessions. Validates that credits were actually paid before refunding. Returns credits to client (decreases total_spent), deducts from practitioner only if they earned credits (decreases total_earned). Uses row-level locking to prevent race conditions.';

