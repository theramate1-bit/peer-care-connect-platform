-- Additional indexes for geo-search performance
-- Note: GIST index on location_point already exists in 20250116_location_matching.sql

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_users_marketplace_filters 
ON users(user_role, is_active, profile_completed, onboarding_status) 
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND is_active = true
  AND profile_completed = true
  AND onboarding_status = 'completed';

-- Index for hourly_rate filtering
CREATE INDEX IF NOT EXISTS idx_users_hourly_rate 
ON users(hourly_rate) 
WHERE hourly_rate IS NOT NULL;

-- Index for services_offered array searches
CREATE INDEX IF NOT EXISTS idx_users_services_offered_gin 
ON users USING GIN(services_offered)
WHERE services_offered IS NOT NULL;

-- Index on reviews for rating calculations
CREATE INDEX IF NOT EXISTS idx_reviews_therapist_rating 
ON reviews(therapist_id, review_status) 
WHERE review_status = 'published';

-- Index on client_sessions for session counts
CREATE INDEX IF NOT EXISTS idx_client_sessions_therapist_status 
ON client_sessions(therapist_id, status) 
WHERE status = 'completed';

