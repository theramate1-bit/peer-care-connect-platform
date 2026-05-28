-- Create practitioner_products table for Stripe Connect marketplace
CREATE TABLE practitioner_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_product_id TEXT UNIQUE,
  stripe_price_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_amount INTEGER NOT NULL, -- in pence
  currency TEXT DEFAULT 'gbp',
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_practitioner_products_practitioner_id ON practitioner_products(practitioner_id);
CREATE INDEX idx_practitioner_products_stripe_product_id ON practitioner_products(stripe_product_id);
CREATE INDEX idx_practitioner_products_stripe_price_id ON practitioner_products(stripe_price_id);
CREATE INDEX idx_practitioner_products_is_active ON practitioner_products(is_active);

-- Enable RLS
ALTER TABLE practitioner_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Practitioners can manage their own products
CREATE POLICY "Practitioners can manage their own products" ON practitioner_products
  FOR ALL USING (
    practitioner_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
    )
  );

-- Clients can view active products
CREATE POLICY "Clients can view active products" ON practitioner_products
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = practitioner_id 
      AND is_active = true
    )
  );

-- Platform admins can view all products
CREATE POLICY "Platform admins can view all products" ON practitioner_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_practitioner_products_updated_at 
  BEFORE UPDATE ON practitioner_products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE practitioner_products IS 'Products/services created by practitioners for the marketplace';
COMMENT ON COLUMN practitioner_products.price_amount IS 'Price in pence (e.g., 6000 = £60.00)';
COMMENT ON COLUMN practitioner_products.stripe_product_id IS 'Stripe Product ID for this service';
COMMENT ON COLUMN practitioner_products.stripe_price_id IS 'Stripe Price ID for this service';
COMMENT ON COLUMN practitioner_products.duration_minutes IS 'Service duration in minutes (optional)';
