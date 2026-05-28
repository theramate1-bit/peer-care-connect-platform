CREATE OR REPLACE FUNCTION process_peer_booking_credits(
    p_client_id UUID,
    p_practitioner_id UUID,
    p_session_id UUID,
    p_duration_minutes INTEGER,
    p_product_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credit_cost INTEGER;
    v_client_balance INTEGER;
    v_client_spent INTEGER;
    v_client_new_balance INTEGER;
BEGIN
    -- Get credit cost for this session (using product_id if provided)
    v_credit_cost := get_practitioner_credit_cost(p_practitioner_id, p_duration_minutes, p_product_id);
    
    -- Validate inputs
    IF p_client_id IS NULL OR p_practitioner_id IS NULL OR p_session_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Missing required parameters',
            'credit_cost', v_credit_cost
        );
    END IF;
    
    -- Lock client credit record (FOR UPDATE prevents race conditions)
    SELECT balance, total_spent 
    INTO v_client_balance, v_client_spent
    FROM public.credits
    WHERE user_id = p_client_id
    FOR UPDATE;
    
    -- Create credit record for client if doesn't exist
    IF v_client_balance IS NULL THEN
        INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
        VALUES (p_client_id, 0, 0, 0, 0)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = EXCLUDED.balance
        RETURNING balance, total_spent INTO v_client_balance, v_client_spent;
    END IF;
    
    -- Validate client has sufficient credits
    IF v_client_balance < v_credit_cost THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Insufficient credits. Required: %s, Available: %s', 
                           v_credit_cost, v_client_balance),
            'credit_cost', v_credit_cost
        );
    END IF;
    
    -- Calculate new balance (Deduct ONLY)
    v_client_new_balance := v_client_balance - v_credit_cost;
    
    -- Deduct credits from client (increases total_spent)
    UPDATE public.credits
    SET 
        balance = v_client_new_balance,
        current_balance = v_client_new_balance,
        total_spent = COALESCE(total_spent, 0) + v_credit_cost,
        updated_at = NOW()
    WHERE user_id = p_client_id;
    
    -- Create transaction record for client (deduction)
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
        p_client_id, 
        'session_payment', 
        v_credit_cost,
        v_client_balance, 
        v_client_new_balance,
        'Peer treatment session booking (Credit Burn)',
        p_session_id,
        NOW()
    );
    
    -- NO TRANSFER to practitioner
    -- Credits are removed from circulation ("burned")
    -- We do not update practitioner balance or create a transaction for them
    
    -- Update session with credit cost
    UPDATE public.client_sessions
    SET credit_cost = v_credit_cost
    WHERE id = p_session_id;
    
    -- Return success with details
    RETURN json_build_object(
        'success', true,
        'credit_cost', v_credit_cost,
        'client_balance_before', v_client_balance,
        'client_balance_after', v_client_new_balance
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error in process_peer_booking_credits: %', SQLERRM;
    
    -- Return error details
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'credit_cost', v_credit_cost
    );
END;
$$;

