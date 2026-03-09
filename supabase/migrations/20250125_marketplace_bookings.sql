-- Track all marketplace bookings and payments
CREATE TABLE marketplace_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES practitioner_products(id) ON DELETE SET NULL,
  
  -- Stripe identifiers
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Payment details
  amount_paid INTEGER NOT NULL, -- in pence
  platform_fee INTEGER NOT NULL, -- in pence (0.5% platform fee, 2% total with Stripe)
  practitioner_amount INTEGER NOT NULL, -- in pence
  currency TEXT DEFAULT 'gbp',
  
  -- Booking details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled', 'refunded')),
  booking_date TIMESTAMPTZ,
  session_date TIMESTAMPTZ, -- When the actual session is scheduled
  
  -- Metadata
  client_email TEXT,
  client_name TEXT,
  product_name TEXT, -- Snapshot in case product is deleted
  product_description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_marketplace_bookings_client ON marketplace_bookings(client_id);
CREATE INDEX idx_marketplace_bookings_practitioner ON marketplace_bookings(practitioner_id);
CREATE INDEX idx_marketplace_bookings_status ON marketplace_bookings(status);
CREATE INDEX idx_marketplace_bookings_stripe_session ON marketplace_bookings(stripe_checkout_session_id);

-- RLS Policies
ALTER TABLE marketplace_bookings ENABLE ROW LEVEL SECURITY;

-- Clients can view their own bookings
CREATE POLICY "Clients can view their bookings" ON marketplace_bookings
  FOR SELECT USING (client_id = auth.uid());

-- Practitioners can view bookings for their services
CREATE POLICY "Practitioners can view their bookings" ON marketplace_bookings
  FOR SELECT USING (practitioner_id = auth.uid());

-- Platform can manage all bookings (via service role)
CREATE POLICY "Service role can manage bookings" ON marketplace_bookings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_marketplace_bookings_updated_at 
  BEFORE UPDATE ON marketplace_bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
