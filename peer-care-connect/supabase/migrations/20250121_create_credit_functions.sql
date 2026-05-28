-- Create Credit System Functions
-- This migration creates the necessary functions for the credit system

-- Function to get credit balance
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT balance INTO v_balance 
    FROM credits 
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update credit balance
CREATE OR REPLACE FUNCTION update_credit_balance(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT balance INTO v_balance_before 
    FROM credits 
    WHERE user_id = p_user_id;
    
    -- If no record exists, create one with 0 balance
    IF v_balance_before IS NULL THEN
        INSERT INTO credits (user_id, balance, created_at, updated_at)
        VALUES (p_user_id, 0, NOW(), NOW());
        v_balance_before := 0;
    END IF;
    
    -- Calculate new balance
    IF p_transaction_type = 'spend' THEN
        v_balance_after := v_balance_before - p_amount;
    ELSE
        v_balance_after := v_balance_before + p_amount;
    END IF;
    
    -- Check for insufficient credits on spend
    IF p_transaction_type = 'spend' AND v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', v_balance_before, p_amount;
    END IF;
    
    -- Update credits table
    UPDATE credits 
    SET balance = v_balance_after, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Insert transaction record
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        description, reference_id, reference_type
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
        p_description, p_reference_id, p_reference_type
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get credit transaction history
CREATE OR REPLACE FUNCTION get_credit_transactions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    transaction_type VARCHAR(20),
    amount INTEGER,
    balance_before INTEGER,
    balance_after INTEGER,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.transaction_type,
        ct.amount,
        ct.balance_before,
        ct.balance_after,
        ct.description,
        ct.reference_id,
        ct.reference_type,
        ct.created_at
    FROM credit_transactions ct
    WHERE ct.user_id = p_user_id
    ORDER BY ct.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has sufficient credits
CREATE OR REPLACE FUNCTION has_sufficient_credits(
    p_user_id UUID,
    p_required_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT balance INTO v_balance 
    FROM credits 
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_balance, 0) >= p_required_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add credit-related columns to client_sessions table
ALTER TABLE client_sessions 
ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_peer_booking BOOLEAN DEFAULT FALSE;

-- Create index for credit-related queries
CREATE INDEX IF NOT EXISTS idx_client_sessions_credit_cost ON client_sessions(credit_cost);
CREATE INDEX IF NOT EXISTS idx_client_sessions_is_peer_booking ON client_sessions(is_peer_booking);

-- Create index for credit transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_id, reference_type);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_credit_balance(UUID, INTEGER, VARCHAR, TEXT, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_transactions(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION has_sufficient_credits(UUID, INTEGER) TO authenticated;

-- Wrapper: earn credits
CREATE OR REPLACE FUNCTION credits_earn(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT 'session',
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_txn UUID;
BEGIN
    v_txn := update_credit_balance(p_user_id, p_amount, 'earn', p_description, p_reference_id, p_reference_type);
    RETURN v_txn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper: spend credits (with balance check in update function)
CREATE OR REPLACE FUNCTION credits_spend(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT 'exchange',
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_txn UUID;
BEGIN
    v_txn := update_credit_balance(p_user_id, p_amount, 'spend', p_description, p_reference_id, p_reference_type);
    RETURN v_txn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic transfer: debit from one user and credit to another
CREATE OR REPLACE FUNCTION credits_transfer(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_amount INTEGER,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT 'exchange',
    p_description TEXT DEFAULT 'Treatment exchange transfer'
)
RETURNS TABLE (spend_transaction_id UUID, earn_transaction_id UUID) AS $$
DECLARE
    v_spend UUID;
    v_earn UUID;
BEGIN
    -- Spend will raise if insufficient
    v_spend := credits_spend(p_from_user_id, p_amount, p_reference_id, p_reference_type, p_description);
    v_earn := credits_earn(p_to_user_id, p_amount, p_reference_id, p_reference_type, p_description);
    RETURN QUERY SELECT v_spend, v_earn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION credits_earn(UUID, INTEGER, UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION credits_spend(UUID, INTEGER, UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION credits_transfer(UUID, UUID, INTEGER, UUID, VARCHAR, TEXT) TO authenticated;