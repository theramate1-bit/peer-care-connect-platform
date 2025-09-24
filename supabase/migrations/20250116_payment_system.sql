-- Payment System Database Schema
-- This migration creates all necessary tables for Stripe payment integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table for Stripe customer mapping
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  phone TEXT,
  address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table for payment records
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  payment_method TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table for subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create platform_revenue table for tracking platform earnings
CREATE TABLE IF NOT EXISTS platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES client_sessions(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  practitioner_amount DECIMAL(10,2) NOT NULL,
  stripe_session_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_events table for webhook event logging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Update client_sessions table to include payment fields
ALTER TABLE client_sessions 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS practitioner_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_session_id ON platform_revenue(session_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_practitioner_id ON platform_revenue(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- Create RLS policies for customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer record" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer record" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer record" ON customers
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for platform_revenue table
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners can view their own revenue" ON platform_revenue
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can view their own payment records" ON platform_revenue
  FOR SELECT USING (auth.uid() = client_id);

-- Create RLS policies for webhook_events table (admin only)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access webhook events" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to process webhook events
CREATE OR REPLACE FUNCTION process_webhook_event(event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  event_record webhook_events%ROWTYPE;
  event_data JSONB;
BEGIN
  -- Get the webhook event
  SELECT * INTO event_record FROM webhook_events WHERE id = event_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark as processed
  UPDATE webhook_events 
  SET processed = TRUE, processed_at = NOW() 
  WHERE id = event_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get payment statistics
CREATE OR REPLACE FUNCTION get_payment_stats(user_id_param UUID)
RETURNS TABLE (
  total_payments BIGINT,
  total_amount DECIMAL,
  successful_payments BIGINT,
  failed_payments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_payments,
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) FILTER (WHERE status = 'succeeded') as successful_payments,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_payments
  FROM payments 
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get subscription status
CREATE OR REPLACE FUNCTION get_subscription_status(user_id_param UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  plan TEXT,
  billing_cycle TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (status = 'active') as is_active,
    plan,
    billing_cycle,
    current_period_end
  FROM subscriptions 
  WHERE user_id = user_id_param 
  ORDER BY created_at DESC 
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional)
INSERT INTO customers (user_id, stripe_customer_id, email, name) 
SELECT 
  id, 
  'cus_test_' || substr(id::text, 1, 8),
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM customers)
LIMIT 5;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create comments for documentation
COMMENT ON TABLE customers IS 'Stores Stripe customer information mapped to application users';
COMMENT ON TABLE payments IS 'Records all payment transactions processed through Stripe';
COMMENT ON TABLE subscriptions IS 'Manages user subscription plans and billing cycles';
COMMENT ON TABLE platform_revenue IS 'Tracks platform earnings from session payments';
COMMENT ON TABLE webhook_events IS 'Logs all incoming Stripe webhook events for debugging';

COMMENT ON FUNCTION process_webhook_event(UUID) IS 'Processes a webhook event and marks it as completed';
COMMENT ON FUNCTION get_payment_stats(UUID) IS 'Returns payment statistics for a specific user';
COMMENT ON FUNCTION get_subscription_status(UUID) IS 'Returns current subscription status for a user';
