-- Credit System Migration
-- Creates tables for credit-based exchange platform

-- Credits table - stores user credit balances
CREATE TABLE IF NOT EXISTS credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Credit transactions table - tracks all credit movements
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'purchase', 'refund', 'transfer')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id UUID, -- Links to session, purchase, etc.
    reference_type VARCHAR(50), -- 'session', 'purchase', 'refund', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit rates table - defines credit costs for different services
CREATE TABLE IF NOT EXISTS credit_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
    credit_earned INTEGER NOT NULL CHECK (credit_earned > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default credit rates
INSERT INTO credit_rates (service_type, duration_minutes, credit_cost, credit_earned) VALUES
('massage', 30, 6, 6),
('massage', 60, 10, 10),
('massage', 90, 15, 15),
('sports_therapy', 30, 6, 6),
('sports_therapy', 60, 10, 10),
('sports_therapy', 90, 15, 15),
('osteopathy', 30, 6, 6),
('osteopathy', 60, 10, 10),
('osteopathy', 90, 15, 15);

-- Update client_sessions table to include credit information
ALTER TABLE client_sessions 
ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_transaction_id UUID REFERENCES credit_transactions(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_rates_service_type ON credit_rates(service_type);
CREATE INDEX IF NOT EXISTS idx_credit_rates_active ON credit_rates(is_active);

-- Function to initialize credits for new users
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO credits (user_id, balance) 
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create credits record when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();

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

-- RLS Policies
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_rates ENABLE ROW LEVEL SECURITY;

-- Credits policies
CREATE POLICY "Users can view their own credits" ON credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "Users can view their own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Credit rates policies (public read)
CREATE POLICY "Anyone can view active credit rates" ON credit_rates
    FOR SELECT USING (is_active = true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON credits TO authenticated;
GRANT ALL ON credit_transactions TO authenticated;
GRANT SELECT ON credit_rates TO authenticated;
GRANT EXECUTE ON FUNCTION update_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_transactions TO authenticated;
