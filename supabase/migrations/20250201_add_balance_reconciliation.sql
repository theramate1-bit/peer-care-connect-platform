-- Add balance reconciliation function for data integrity verification
-- This is a MEDIUM PRIORITY diagnostic tool

CREATE OR REPLACE FUNCTION reconcile_credit_balance(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_balance INTEGER;
    v_stored_earned INTEGER;
    v_stored_spent INTEGER;
    v_calculated_balance INTEGER;
    v_calculated_earned INTEGER;
    v_calculated_spent INTEGER;
    v_discrepancy INTEGER;
BEGIN
    -- Get stored values from credits table
    SELECT 
        balance, 
        total_earned, 
        total_spent 
    INTO 
        v_stored_balance, 
        v_stored_earned, 
        v_stored_spent
    FROM public.credits 
    WHERE user_id = p_user_id;
    
    -- If no credit record exists, return zeros
    IF v_stored_balance IS NULL THEN
        RETURN json_build_object(
            'user_id', p_user_id,
            'stored_balance', 0,
            'calculated_balance', 0,
            'discrepancy', 0,
            'stored_earned', 0,
            'calculated_earned', 0,
            'earned_discrepancy', 0,
            'stored_spent', 0,
            'calculated_spent', 0,
            'spent_discrepancy', 0,
            'status', 'no_record'
        );
    END IF;
    
    -- Calculate actual values from transaction history
    SELECT 
        COALESCE(SUM(CASE 
            WHEN transaction_type IN ('session_earning', 'bonus', 'refund') 
            THEN amount 
            ELSE 0 
        END), 0),
        COALESCE(SUM(CASE 
            WHEN transaction_type = 'session_payment' 
            THEN amount 
            ELSE 0 
        END), 0)
    INTO 
        v_calculated_earned, 
        v_calculated_spent
    FROM public.credit_transactions
    WHERE user_id = p_user_id;
    
    -- Calculate balance from transactions
    v_calculated_balance := v_calculated_earned - v_calculated_spent;
    
    -- Calculate discrepancies
    v_discrepancy := v_stored_balance - v_calculated_balance;
    
    -- Return detailed reconciliation report
    RETURN json_build_object(
        'user_id', p_user_id,
        'stored_balance', v_stored_balance,
        'calculated_balance', v_calculated_balance,
        'discrepancy', v_discrepancy,
        'stored_earned', COALESCE(v_stored_earned, 0),
        'calculated_earned', v_calculated_earned,
        'earned_discrepancy', COALESCE(v_stored_earned, 0) - v_calculated_earned,
        'stored_spent', COALESCE(v_stored_spent, 0),
        'calculated_spent', v_calculated_spent,
        'spent_discrepancy', COALESCE(v_stored_spent, 0) - v_calculated_spent,
        'status', CASE 
            WHEN v_discrepancy = 0 THEN 'balanced'
            WHEN ABS(v_discrepancy) < 5 THEN 'minor_discrepancy'
            ELSE 'significant_discrepancy'
        END,
        'checked_at', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'user_id', p_user_id,
        'error', SQLERRM,
        'status', 'error'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reconcile_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_credit_balance(UUID) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION reconcile_credit_balance IS 
'Diagnostic function that compares stored credit balance with calculated balance from transaction history. Returns detailed reconciliation report including discrepancies. Use for auditing and debugging balance issues.';

