-- Create mobile_booking_requests table for mobile therapist booking requests
CREATE TABLE IF NOT EXISTS mobile_booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES practitioner_products(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'both')),
  requested_date DATE NOT NULL,
  requested_start_time TIME NOT NULL,
  client_address TEXT NOT NULL,
  client_latitude DECIMAL(10, 8),
  client_longitude DECIMAL(11, 8),
  total_price_pence INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'held', 'captured', 'released', 'refunded')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  decline_reason TEXT,
  alternate_date DATE,
  alternate_start_time TIME,
  alternate_suggestions JSONB DEFAULT '[]'::jsonb,
  client_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mobile_booking_requests_practitioner_id 
  ON mobile_booking_requests(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_mobile_booking_requests_client_id 
  ON mobile_booking_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_mobile_booking_requests_status 
  ON mobile_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_mobile_booking_requests_expires_at 
  ON mobile_booking_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_mobile_booking_requests_practitioner_status 
  ON mobile_booking_requests(practitioner_id, status);

-- Create trigger to auto-set expires_at (48 hours after creation)
CREATE OR REPLACE FUNCTION set_mobile_request_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_mobile_request_expiry_trigger
  BEFORE INSERT ON mobile_booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_mobile_request_expiry();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_mobile_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mobile_request_updated_at_trigger
  BEFORE UPDATE ON mobile_booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_mobile_request_updated_at();

-- Enable RLS
ALTER TABLE mobile_booking_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Practitioners can view their own requests
CREATE POLICY "Practitioners can view their own requests" ON mobile_booking_requests
  FOR SELECT USING (
    practitioner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
    )
  );

-- Clients can view their own requests
CREATE POLICY "Clients can view their own requests" ON mobile_booking_requests
  FOR SELECT USING (
    client_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role = 'client'
    )
  );

-- Practitioners can update status of their requests
CREATE POLICY "Practitioners can update their requests" ON mobile_booking_requests
  FOR UPDATE USING (
    practitioner_id = auth.uid()
  );

-- Clients can insert their own requests
CREATE POLICY "Clients can create requests" ON mobile_booking_requests
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
  );

-- Clients can cancel their own pending requests
CREATE POLICY "Clients can cancel pending requests" ON mobile_booking_requests
  FOR UPDATE USING (
    client_id = auth.uid() AND
    status = 'pending'
  );

-- Add comments
COMMENT ON TABLE mobile_booking_requests IS 'Mobile booking requests from clients to mobile/hybrid therapists';
COMMENT ON COLUMN mobile_booking_requests.payment_status IS 'Payment status: pending (not yet held), held (payment held), captured (charged), released (not charged), refunded';
COMMENT ON COLUMN mobile_booking_requests.status IS 'Request status: pending (awaiting response), accepted (practitioner accepted), declined (practitioner declined), expired (auto-expired), cancelled (client cancelled)';
COMMENT ON COLUMN mobile_booking_requests.alternate_suggestions IS 'JSONB array of alternate date/time suggestions from practitioner: [{"date": "2025-02-25", "start_time": "14:00", "notes": "Alternative time"}]';
