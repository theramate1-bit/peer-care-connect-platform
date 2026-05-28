-- Remove earnings from treatment exchange sessions
-- Treatment exchange sessions should NOT count as earnings - credits only come from subscriptions
-- This updates process_peer_booking_credits to transfer credits without counting as earnings

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
    v_practitioner_balance INTEGER;
    v_client_spent INTEGER;
    v_client_new_balance INTEGER;
    v_practitioner_new_balance INTEGER;
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
    
    -- Lock practitioner credit record
    SELECT balance
    INTO v_practitioner_balance
    FROM public.credits
    WHERE user_id = p_practitioner_id
    FOR UPDATE;
    
    -- Create credit record for practitioner if doesn't exist
    IF v_practitioner_balance IS NULL THEN
        INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
        VALUES (p_practitioner_id, 0, 0, 0, 0)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = EXCLUDED.balance
        RETURNING balance INTO v_practitioner_balance;
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
    
    -- Calculate new balances
    v_client_new_balance := v_client_balance - v_credit_cost;
    v_practitioner_new_balance := v_practitioner_balance + v_credit_cost;
    
    -- Deduct credits from client (increases total_spent)
    UPDATE public.credits
    SET 
        balance = v_client_new_balance,
        current_balance = v_client_new_balance,
        total_spent = COALESCE(total_spent, 0) + v_credit_cost,
        updated_at = NOW()
    WHERE user_id = p_client_id;
    
    -- Transfer credits to practitioner (balance only, NO total_earned update)
    -- Credits come ONLY from subscriptions, not from sessions
    UPDATE public.credits
    SET 
        balance = v_practitioner_new_balance,
        current_balance = v_practitioner_new_balance,
        -- DO NOT update total_earned - credits only come from subscriptions
        updated_at = NOW()
    WHERE user_id = p_practitioner_id;
    
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
        'Peer treatment session booking',
        p_session_id,
        NOW()
    );
    
    -- Create transaction record for practitioner (transfer, NOT earning)
    -- Use 'transfer' type instead of 'session_earning' to indicate this is not an earning
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
        p_practitioner_id, 
        'transfer', 
        v_credit_cost,
        v_practitioner_balance, 
        v_practitioner_new_balance,
        'Peer treatment session - credit transfer (not an earning)',
        p_session_id,
        NOW()
    );
    
    -- Update session with credit cost
    UPDATE public.client_sessions
    SET credit_cost = v_credit_cost
    WHERE id = p_session_id;
    
    -- Return success with details
    RETURN json_build_object(
        'success', true,
        'credit_cost', v_credit_cost,
        'client_balance_before', v_client_balance,
        'client_balance_after', v_client_new_balance,
        'practitioner_balance_before', v_practitioner_balance,
        'practitioner_balance_after', v_practitioner_new_balance
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

-- Update comment
COMMENT ON FUNCTION process_peer_booking_credits IS 
'Atomically processes credit transfer for peer treatment bookings. Deducts credits from client (increases total_spent), transfers credits to practitioner (balance only, NO total_earned update). Credits come ONLY from subscriptions, not from sessions. Uses row-level locking (FOR UPDATE) to prevent race conditions.';

