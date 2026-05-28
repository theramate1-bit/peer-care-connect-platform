-- Migration: Add Dynamic Pricing Support
-- Description: Add pricing fields to therapist profiles for custom practitioner pricing

-- Add pricing columns to therapist_profiles table
ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS hourly_rate INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_pricing JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pricing_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS pricing_notes TEXT,
ADD COLUMN IF NOT EXISTS accepts_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_providers TEXT[],
ADD COLUMN IF NOT EXISTS discount_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_session_duration INTEGER DEFAULT 30; -- in minutes

-- Add pricing columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS session_price INTEGER DEFAULT 0, -- in pence
ADD COLUMN IF NOT EXISTS pricing_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS practitioner_rate INTEGER DEFAULT 0, -- in pence
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 0, -- in pence
ADD COLUMN IF NOT EXISTS total_amount INTEGER DEFAULT 0; -- in pence

-- Create index for pricing queries
CREATE INDEX IF NOT EXISTS idx_therapist_profiles_hourly_rate 
ON therapist_profiles(hourly_rate);

CREATE INDEX IF NOT EXISTS idx_therapist_profiles_pricing_updated 
ON therapist_profiles(pricing_updated_at);

CREATE INDEX IF NOT EXISTS idx_bookings_session_price 
ON bookings(session_price);

-- Create function to update pricing timestamp
CREATE OR REPLACE FUNCTION update_pricing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pricing_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update pricing timestamp
CREATE TRIGGER trigger_update_pricing_timestamp
  BEFORE UPDATE ON therapist_profiles
  FOR EACH ROW
  WHEN (OLD.hourly_rate IS DISTINCT FROM NEW.hourly_rate 
        OR OLD.session_pricing IS DISTINCT FROM NEW.session_pricing)
  EXECUTE FUNCTION update_pricing_timestamp();

-- Create function to validate session pricing
CREATE OR REPLACE FUNCTION validate_session_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that session_pricing is a valid JSON object
  IF NOT (NEW.session_pricing ? '30min' AND NEW.session_pricing ? '60min') THEN
    RAISE EXCEPTION 'session_pricing must include at least 30min and 60min rates';
  END IF;
  
  -- Validate that all prices are positive integers
  IF EXISTS (
    SELECT 1 FROM jsonb_each(NEW.session_pricing) 
    WHERE value::text::integer <= 0
  ) THEN
    RAISE EXCEPTION 'All session prices must be positive integers';
  END IF;
  
  -- Validate hourly rate is positive
  IF NEW.hourly_rate <= 0 THEN
    RAISE EXCEPTION 'Hourly rate must be positive';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate pricing data
CREATE TRIGGER trigger_validate_session_pricing
  BEFORE INSERT OR UPDATE ON therapist_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_session_pricing();

-- Insert sample pricing data for existing practitioners
UPDATE therapist_profiles 
SET 
  hourly_rate = CASE 
    WHEN user_role = 'sports_therapist' THEN 75
    WHEN user_role = 'massage_therapist' THEN 65
    WHEN user_role = 'osteopath' THEN 85
    ELSE 70
  END,
  session_pricing = CASE 
    WHEN user_role = 'sports_therapist' THEN '{"30min": 40, "45min": 55, "60min": 70, "90min": 100}'::jsonb
    WHEN user_role = 'massage_therapist' THEN '{"30min": 35, "45min": 50, "60min": 65, "90min": 90}'::jsonb
    WHEN user_role = 'osteopath' THEN '{"30min": 45, "45min": 60, "60min": 80, "90min": 110}'::jsonb
    ELSE '{"30min": 40, "45min": 55, "60min": 70, "90min": 100}'::jsonb
  END,
  pricing_updated_at = NOW()
WHERE hourly_rate = 0 OR session_pricing = '{}'::jsonb;

-- Create view for pricing analytics
CREATE OR REPLACE VIEW pricing_analytics AS
SELECT 
  user_role,
  COUNT(*) as practitioner_count,
  AVG(hourly_rate) as avg_hourly_rate,
  MIN(hourly_rate) as min_hourly_rate,
  MAX(hourly_rate) as max_hourly_rate,
  AVG((session_pricing->>'60min')::integer) as avg_60min_rate,
  AVG((session_pricing->>'30min')::integer) as avg_30min_rate
FROM therapist_profiles 
WHERE hourly_rate > 0
GROUP BY user_role;

-- Create function to get practitioner pricing
CREATE OR REPLACE FUNCTION get_practitioner_pricing(practitioner_id UUID)
RETURNS TABLE (
  hourly_rate INTEGER,
  session_pricing JSONB,
  pricing_updated_at TIMESTAMP WITH TIME ZONE,
  accepts_insurance BOOLEAN,
  discount_available BOOLEAN,
  discount_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.hourly_rate,
    tp.session_pricing,
    tp.pricing_updated_at,
    tp.accepts_insurance,
    tp.discount_available,
    tp.discount_percentage
  FROM therapist_profiles tp
  WHERE tp.user_id = practitioner_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to search practitioners by price range
CREATE OR REPLACE FUNCTION search_practitioners_by_price(
  min_price INTEGER,
  max_price INTEGER,
  session_type TEXT DEFAULT '60min'
)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  user_role TEXT,
  hourly_rate INTEGER,
  session_price INTEGER,
  specialties TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.user_id,
    u.first_name,
    u.last_name,
    tp.user_role,
    tp.hourly_rate,
    (tp.session_pricing->>session_type)::integer as session_price,
    tp.specializations
  FROM therapist_profiles tp
  JOIN users u ON u.id = tp.user_id
  WHERE (tp.session_pricing->>session_type)::integer BETWEEN min_price AND max_price
  ORDER BY (tp.session_pricing->>session_type)::integer ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON pricing_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_practitioner_pricing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_practitioners_by_price(INTEGER, INTEGER, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN therapist_profiles.hourly_rate IS 'Practitioner hourly rate in pounds';
COMMENT ON COLUMN therapist_profiles.session_pricing IS 'JSON object with session type pricing in pounds';
COMMENT ON COLUMN therapist_profiles.pricing_updated_at IS 'Timestamp when pricing was last updated';
COMMENT ON COLUMN bookings.session_price IS 'Session price in pence for Stripe integration';
COMMENT ON COLUMN bookings.practitioner_rate IS 'Practitioner rate in pence';
COMMENT ON COLUMN bookings.platform_fee IS 'Platform fee in pence';

COMMENT ON VIEW pricing_analytics IS 'Analytics view for pricing trends by practitioner role';
COMMENT ON FUNCTION get_practitioner_pricing(UUID) IS 'Get pricing information for a specific practitioner';
COMMENT ON FUNCTION search_practitioners_by_price(INTEGER, INTEGER, TEXT) IS 'Search practitioners within a price range for specific session type';
