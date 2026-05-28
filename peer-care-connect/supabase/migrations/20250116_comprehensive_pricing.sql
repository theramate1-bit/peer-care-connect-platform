-- Comprehensive Pricing System Migration
-- Supports practitioner subscriptions, custom pricing, and marketplace fees

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Practitioner Subscription Plans Table
CREATE TABLE IF NOT EXISTS practitioner_subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL UNIQUE,
    plan_name TEXT NOT NULL,
    plan_tier TEXT NOT NULL CHECK (plan_tier IN ('professional', 'premium')),
    monthly_fee DECIMAL(10,2) NOT NULL,
    marketplace_fee_percentage DECIMAL(5,2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practitioner Subscriptions Table
CREATE TABLE IF NOT EXISTS practitioner_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES practitioner_subscription_plans(id),
    stripe_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Pricing Products Table
CREATE TABLE IF NOT EXISTS custom_pricing_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id TEXT NOT NULL UNIQUE,
    product_type TEXT NOT NULL CHECK (product_type IN ('individual_session', 'group_session', 'workshop')),
    product_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practitioner Custom Pricing Table
CREATE TABLE IF NOT EXISTS practitioner_custom_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL CHECK (product_type IN ('individual_session', 'group_session', 'workshop')),
    stripe_price_id TEXT NOT NULL,
    price_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'gbp',
    session_duration_minutes INTEGER,
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(practitioner_id, product_type, stripe_price_id)
);

-- Marketplace Fee Structure Table
CREATE TABLE IF NOT EXISTS marketplace_fee_structure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id TEXT NOT NULL UNIQUE,
    fee_type TEXT NOT NULL DEFAULT 'commission',
    calculation_method TEXT NOT NULL DEFAULT 'percentage',
    professional_plan_fee DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    premium_plan_fee DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Transactions Table (for tracking fees)
CREATE TABLE IF NOT EXISTS session_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    practitioner_id UUID NOT NULL REFERENCES auth.users(id),
    client_id UUID NOT NULL REFERENCES auth.users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    practitioner_amount DECIMAL(10,2) NOT NULL,
    marketplace_fee DECIMAL(10,2) NOT NULL,
    fee_percentage DECIMAL(5,2) NOT NULL,
    stripe_payment_intent_id TEXT,
    transaction_status TEXT NOT NULL DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default practitioner subscription plans
INSERT INTO practitioner_subscription_plans (stripe_product_id, stripe_price_id, plan_name, plan_tier, monthly_fee, marketplace_fee_percentage, features) VALUES
('prod_T3lh86M0PSoksn', 'price_1S7eAKFk77knaVvaWcHSypjx', 'Professional Practitioner Plan', 'professional', 79.99, 3.00, '["advanced_scheduling", "analytics", "priority_support", "marketing_tools"]'),
('prod_T3lh9cQHjenztM', 'price_1S7eANFk77knaVva8L3m7l2Y', 'Premium Practitioner Plan', 'premium', 199.99, 1.00, '["full_analytics", "white_label", "api_access", "dedicated_support"]');

-- Insert custom pricing products
INSERT INTO custom_pricing_products (stripe_product_id, product_type, product_name, description) VALUES
('prod_T1YG1QMpPEH5yY', 'individual_session', 'Individual Session', 'Custom pricing for individual therapy sessions'),
('prod_T1YGWLQT4rW1l7', 'group_session', 'Group Session', 'Custom pricing for group therapy sessions'),
('prod_T1YGIPEnqJcv6a', 'workshop', 'Workshop', 'Custom pricing for workshops and seminars');

-- Insert marketplace fee structure
INSERT INTO marketplace_fee_structure (stripe_product_id, fee_type, calculation_method, professional_plan_fee, premium_plan_fee) VALUES
('prod_T1YGScHfnT1k0l', 'commission', 'percentage', 3.00, 1.00);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practitioner_subscriptions_practitioner_id ON practitioner_subscriptions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_subscriptions_status ON practitioner_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_practitioner_custom_pricing_practitioner_id ON practitioner_custom_pricing(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_custom_pricing_product_type ON practitioner_custom_pricing(product_type);
CREATE INDEX IF NOT EXISTS idx_session_transactions_practitioner_id ON session_transactions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_session_transactions_client_id ON session_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_session_transactions_status ON session_transactions(transaction_status);

-- Create RLS policies
ALTER TABLE practitioner_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_pricing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioner_custom_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_fee_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practitioner_subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans" ON practitioner_subscription_plans
    FOR SELECT USING (true);

-- RLS Policies for practitioner_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON practitioner_subscriptions
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can create their own subscriptions" ON practitioner_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Users can update their own subscriptions" ON practitioner_subscriptions
    FOR UPDATE USING (auth.uid() = practitioner_id);

-- RLS Policies for custom_pricing_products (public read)
CREATE POLICY "Anyone can view custom pricing products" ON custom_pricing_products
    FOR SELECT USING (true);

-- RLS Policies for practitioner_custom_pricing
CREATE POLICY "Users can view their own custom pricing" ON practitioner_custom_pricing
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can create their own custom pricing" ON practitioner_custom_pricing
    FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Users can update their own custom pricing" ON practitioner_custom_pricing
    FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can delete their own custom pricing" ON practitioner_custom_pricing
    FOR DELETE USING (auth.uid() = practitioner_id);

-- RLS Policies for marketplace_fee_structure (public read)
CREATE POLICY "Anyone can view marketplace fee structure" ON marketplace_fee_structure
    FOR SELECT USING (true);

-- RLS Policies for session_transactions
CREATE POLICY "Users can view their own transactions" ON session_transactions
    FOR SELECT USING (auth.uid() = practitioner_id OR auth.uid() = client_id);

CREATE POLICY "System can create transactions" ON session_transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update transactions" ON session_transactions
    FOR UPDATE USING (true);

-- Create functions for pricing calculations
CREATE OR REPLACE FUNCTION calculate_marketplace_fee(
    total_amount DECIMAL,
    practitioner_plan_tier TEXT
) RETURNS DECIMAL AS $$
DECLARE
    fee_percentage DECIMAL;
BEGIN
    CASE practitioner_plan_tier
        WHEN 'basic' THEN fee_percentage := 5.00;
        WHEN 'professional' THEN fee_percentage := 3.00;
        WHEN 'premium' THEN fee_percentage := 1.00;
        ELSE fee_percentage := 5.00; -- Default to basic
    END CASE;
    
    RETURN ROUND((total_amount * fee_percentage / 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get practitioner's current subscription
CREATE OR REPLACE FUNCTION get_practitioner_subscription(practitioner_uuid UUID)
RETURNS TABLE (
    plan_tier TEXT,
    marketplace_fee_percentage DECIMAL,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psp.plan_tier,
        psp.marketplace_fee_percentage,
        psp.features
    FROM practitioner_subscriptions ps
    JOIN practitioner_subscription_plans psp ON ps.plan_id = psp.id
    WHERE ps.practitioner_id = practitioner_uuid
    AND ps.status = 'active'
    AND ps.current_period_end > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create session transaction
CREATE OR REPLACE FUNCTION create_session_transaction(
    session_uuid UUID,
    practitioner_uuid UUID,
    client_uuid UUID,
    total_amount DECIMAL,
    stripe_payment_intent_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    practitioner_plan_tier TEXT;
    marketplace_fee DECIMAL;
    practitioner_amount DECIMAL;
    transaction_id UUID;
BEGIN
    -- Get practitioner's current plan
    SELECT plan_tier INTO practitioner_plan_tier
    FROM get_practitioner_subscription(practitioner_uuid);
    
    -- Calculate fees
    marketplace_fee := calculate_marketplace_fee(total_amount, practitioner_plan_tier);
    practitioner_amount := total_amount - marketplace_fee;
    
    -- Create transaction record
    INSERT INTO session_transactions (
        session_id,
        practitioner_id,
        client_id,
        total_amount,
        practitioner_amount,
        marketplace_fee,
        fee_percentage,
        stripe_payment_intent_id,
        transaction_status
    ) VALUES (
        session_uuid,
        practitioner_uuid,
        client_uuid,
        total_amount,
        practitioner_amount,
        marketplace_fee,
        CASE practitioner_plan_tier
            WHEN 'basic' THEN 5.00
            WHEN 'professional' THEN 3.00
            WHEN 'premium' THEN 1.00
            ELSE 5.00
        END,
        stripe_payment_intent_id,
        'pending'
    ) RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_practitioner_subscriptions_updated_at
    BEFORE UPDATE ON practitioner_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practitioner_custom_pricing_updated_at
    BEFORE UPDATE ON practitioner_custom_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_transactions_updated_at
    BEFORE UPDATE ON session_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
