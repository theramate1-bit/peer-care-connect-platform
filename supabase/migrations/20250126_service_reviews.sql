-- Create service_reviews table
CREATE TABLE IF NOT EXISTS service_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES practitioner_products(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Ratings
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
  
  -- Review content
  review_title TEXT,
  review_text TEXT,
  
  -- Moderation
  review_status TEXT DEFAULT 'published' CHECK (review_status IN ('pending', 'published', 'rejected')),
  moderation_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one review per booking
  UNIQUE(booking_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_reviews_product ON service_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_client ON service_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_practitioner ON service_reviews(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_status ON service_reviews(review_status);

-- RLS Policies
ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;

-- Clients can create and view their own reviews
CREATE POLICY "Clients can manage their reviews" ON service_reviews
  FOR ALL USING (client_id = auth.uid());

-- Everyone can view published reviews
CREATE POLICY "Anyone can view published reviews" ON service_reviews
  FOR SELECT USING (review_status = 'published');

-- Practitioners can view reviews for their services
CREATE POLICY "Practitioners can view their service reviews" ON service_reviews
  FOR SELECT USING (practitioner_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_service_reviews_updated_at 
  BEFORE UPDATE ON service_reviews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add has_review column to marketplace_bookings
ALTER TABLE marketplace_bookings 
ADD COLUMN IF NOT EXISTS has_review BOOLEAN DEFAULT false;
