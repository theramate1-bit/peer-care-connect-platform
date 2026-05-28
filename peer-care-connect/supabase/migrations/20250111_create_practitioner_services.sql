-- Create practitioner_services table for custom pricing
CREATE TABLE IF NOT EXISTS practitioner_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(100) NOT NULL CHECK (service_type IN ('sports_therapy', 'massage_therapy', 'osteopathy')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  base_price_pence INTEGER NOT NULL CHECK (base_price_pence > 0),
  platform_fee_percentage INTEGER DEFAULT 4 CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100),
  platform_fee_pence INTEGER GENERATED ALWAYS AS (ROUND(base_price_pence * platform_fee_percentage / 100.0)) STORED,
  practitioner_earnings_pence INTEGER GENERATED ALWAYS AS (base_price_pence - ROUND(base_price_pence * platform_fee_percentage / 100.0)) STORED,
  stripe_price_id VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_bookings table for tracking bookings
CREATE TABLE IF NOT EXISTS session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES practitioner_services(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  session_duration_minutes INTEGER NOT NULL,
  total_price_pence INTEGER NOT NULL,
  platform_fee_pence INTEGER NOT NULL,
  practitioner_earnings_pence INTEGER NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  client_notes TEXT,
  practitioner_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_practitioner_services_practitioner_id ON practitioner_services(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_services_service_type ON practitioner_services(service_type);
CREATE INDEX IF NOT EXISTS idx_practitioner_services_is_active ON practitioner_services(is_active);
CREATE INDEX IF NOT EXISTS idx_session_bookings_client_id ON session_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_session_bookings_practitioner_id ON session_bookings(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_session_bookings_service_id ON session_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_session_bookings_status ON session_bookings(status);
CREATE INDEX IF NOT EXISTS idx_session_bookings_session_date ON session_bookings(session_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_practitioner_services_updated_at 
    BEFORE UPDATE ON practitioner_services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_bookings_updated_at 
    BEFORE UPDATE ON session_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE practitioner_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies for practitioner_services
CREATE POLICY "Practitioners can view their own services" ON practitioner_services
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can insert their own services" ON practitioner_services
    FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their own services" ON practitioner_services
    FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete their own services" ON practitioner_services
    FOR DELETE USING (auth.uid() = practitioner_id);

-- RLS policies for session_bookings
CREATE POLICY "Clients can view their own bookings" ON session_bookings
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Practitioners can view bookings for their services" ON session_bookings
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can insert their own bookings" ON session_bookings
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Practitioners can update bookings for their services" ON session_bookings
    FOR UPDATE USING (auth.uid() = practitioner_id);

-- Allow public access to active services for marketplace browsing
CREATE POLICY "Public can view active services" ON practitioner_services
    FOR SELECT USING (is_active = true);

-- Add service categories table for reference
CREATE TABLE IF NOT EXISTS service_categories (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  platform_fee_percentage INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default service categories
INSERT INTO service_categories (id, name, description, platform_fee_percentage) VALUES
('sports_therapy', 'Sports Therapy', 'Specialized therapy for sports injuries and performance enhancement', 4),
('massage_therapy', 'Massage Therapy', 'Various massage techniques for relaxation and therapeutic benefits', 4),
('osteopathy', 'Osteopathy', 'Manual therapy focusing on musculoskeletal system', 4)
ON CONFLICT (id) DO NOTHING;
