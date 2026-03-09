-- Add profile_photo_url to find_practitioners_by_distance RPC function
-- Ensure PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION find_practitioners_by_distance(
  search_lat DECIMAL(10, 8),
  search_lon DECIMAL(11, 8),
  radius_km INTEGER DEFAULT 25,
  limit_count INTEGER DEFAULT 20,
  service_type TEXT DEFAULT NULL,
  min_price DECIMAL(10, 2) DEFAULT NULL,
  max_price DECIMAL(10, 2) DEFAULT NULL,
  min_rating DECIMAL(3, 2) DEFAULT NULL,
  p_user_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  location TEXT,
  clinic_address TEXT,
  clinic_latitude DECIMAL(10, 8),
  clinic_longitude DECIMAL(11, 8),
  hourly_rate DECIMAL(10, 2),
  specializations TEXT[],
  services_offered TEXT[],
  bio TEXT,
  experience_years INTEGER,
  user_role TEXT,
  profile_photo_url TEXT,
  average_rating DECIMAL(3, 2),
  total_sessions INTEGER,
  distance_km DECIMAL(10, 2)
) AS $$
DECLARE
  search_point GEOMETRY;
  radius_meters INTEGER;
BEGIN
  -- Create search point from lat/lon
  search_point := ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326);
  radius_meters := radius_km * 1000;

  RETURN QUERY
  SELECT DISTINCT
    u.id,
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.location,
    u.clinic_address,
    ul.latitude as clinic_latitude,
    ul.longitude as clinic_longitude,
    u.hourly_rate,
    u.specializations,
    u.services_offered,
    u.bio,
    u.experience_years,
    u.user_role,
    u.profile_photo_url,
    COALESCE(avg_reviews.avg_rating, 0)::DECIMAL(3, 2) as average_rating,
    COALESCE(session_counts.total_sessions, 0)::INTEGER as total_sessions,
    ST_Distance(
      search_point::geography,
      ul.location_point::geography
    ) / 1000.0 as distance_km
  FROM users u
  INNER JOIN user_locations ul ON u.id = ul.user_id AND ul.is_primary = true
  LEFT JOIN (
    SELECT 
      therapist_id,
      AVG(overall_rating)::DECIMAL(3, 2) as avg_rating,
      COUNT(*)::INTEGER as review_count
    FROM reviews
    WHERE review_status = 'published'
    GROUP BY therapist_id
  ) avg_reviews ON u.id = avg_reviews.therapist_id
  LEFT JOIN (
    SELECT 
      therapist_id,
      COUNT(*)::INTEGER as total_sessions
    FROM client_sessions
    WHERE status = 'completed'
    GROUP BY therapist_id
  ) session_counts ON u.id = session_counts.therapist_id
  WHERE 
    -- PostGIS spatial filter
    ST_DWithin(
      ul.location_point::geography,
      search_point::geography,
      radius_meters
    )
    -- Base filters
    AND u.is_active = true
    AND u.profile_completed = true
    AND u.onboarding_status = 'completed'
    AND u.hourly_rate IS NOT NULL
    AND u.user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
    -- Optional filters
    AND (p_user_role IS NULL OR u.user_role = p_user_role::text)
    AND (min_price IS NULL OR u.hourly_rate >= min_price)
    AND (max_price IS NULL OR u.hourly_rate <= max_price)
    AND (service_type IS NULL OR service_type = ANY(u.services_offered))
    AND (min_rating IS NULL OR COALESCE(avg_reviews.avg_rating, 0) >= min_rating)
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_practitioners_by_distance TO authenticated;

