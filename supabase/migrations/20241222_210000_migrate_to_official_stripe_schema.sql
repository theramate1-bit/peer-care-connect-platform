-- Migration: Update subscriptions table to official Stripe integration schema
-- This migration updates the existing subscriptions table to match the official Supabase + Stripe pattern

-- Step 1: Add new columns to existing subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create prices table if it doesn't exist
CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_price_id TEXT UNIQUE NOT NULL,
  stripe_product_id TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  currency TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'one_time' or 'recurring'
  unit_amount BIGINT,
  interval TEXT, -- 'day', 'week', 'month', 'year'
  interval_count INTEGER,
  trial_period_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Migrate existing data to new schema
-- Map existing plan/billing combinations to Stripe price IDs
UPDATE subscriptions 
SET price_id = CASE 
  WHEN plan = 'practitioner' AND billing_cycle = 'monthly' THEN 'price_1SGfP1Fk77knaVvan6m5IRRS'
  WHEN plan = 'practitioner' AND billing_cycle = 'yearly' THEN 'price_1SL6QFFk77knaVvaRMyinzWv'
  WHEN plan = 'pro' AND billing_cycle = 'monthly' THEN 'price_1SGfPIFk77knaVvaeBxPlhJ9'
  WHEN plan = 'pro' AND billing_cycle = 'yearly' THEN 'price_1SL6QFFk77knaVvarSHwZKou'
  ELSE NULL
END
WHERE price_id IS NULL;

-- Step 6: Update status values to match Stripe standards
UPDATE subscriptions 
SET status = CASE 
  WHEN status = 'cancelled' THEN 'canceled'
  WHEN status = 'unpaid' THEN 'past_due'
  ELSE status
END
WHERE status IN ('cancelled', 'unpaid');

-- Step 7: Enable RLS on new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for new tables
CREATE POLICY "Users can view own customer data" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Products are publicly readable" ON products
  FOR SELECT USING (true);

CREATE POLICY "Prices are publicly readable" ON prices
  FOR SELECT USING (true);

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS customers_stripe_customer_id_idx ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS products_stripe_product_id_idx ON products(stripe_product_id);
CREATE INDEX IF NOT EXISTS prices_stripe_price_id_idx ON prices(stripe_price_id);
CREATE INDEX IF NOT EXISTS prices_stripe_product_id_idx ON prices(stripe_product_id);

-- Step 10: Create function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Add comments for clarity
COMMENT ON COLUMN subscriptions.price_id IS 'Stripe price ID for the subscription';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN subscriptions.quantity IS 'Number of subscription items';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN subscriptions.ended_at IS 'When the subscription ended';

