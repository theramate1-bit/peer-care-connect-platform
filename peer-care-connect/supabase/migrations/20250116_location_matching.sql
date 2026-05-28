-- Location Matching System Migration
-- Creates tables for location data and geospatial queries

-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- User locations table
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(POINT, 4326) NOT NULL, -- PostGIS point for spatial queries
    service_radius_km INTEGER DEFAULT 25, -- How far they're willing to travel/provide service
    is_primary BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service areas table - defines where therapists provide services
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    area_name VARCHAR(100) NOT NULL, -- e.g., "Downtown Area", "North Side"
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    center_point GEOMETRY(POINT, 4326) NOT NULL,
    radius_km INTEGER NOT NULL DEFAULT 25,
    service_area GEOMETRY(POLYGON, 4326), -- Optional: custom service area polygon
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location preferences table
CREATE TABLE IF NOT EXISTS location_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_travel_distance_km INTEGER DEFAULT 25,
    preferred_cities TEXT[], -- Array of preferred cities
    avoid_areas TEXT[], -- Array of areas to avoid
    home_visit_preferred BOOLEAN DEFAULT false,
    clinic_visit_preferred BOOLEAN DEFAULT true,
    virtual_session_preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Location search history table
CREATE TABLE IF NOT EXISTS location_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_latitude DECIMAL(10, 8) NOT NULL,
    search_longitude DECIMAL(11, 8) NOT NULL,
    search_point GEOMETRY(POINT, 4326) NOT NULL,
    search_radius_km INTEGER NOT NULL,
    search_filters JSONB, -- Store search filters as JSON
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL(10, 8),
    lon1 DECIMAL(11, 8),
    lat2 DECIMAL(10, 8),
    lon2 DECIMAL(11, 8)
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    earth_radius_km DECIMAL(10, 2) := 6371.0;
    dlat DECIMAL(10, 8);
    dlon DECIMAL(11, 8);
    a DECIMAL(20, 10);
    c DECIMAL(20, 10);
    distance DECIMAL(10, 2);
BEGIN
    -- Convert degrees to radians
    lat1 := radians(lat1);
    lon1 := radians(lon1);
    lat2 := radians(lat2);
    lon2 := radians(lon2);
    
    -- Calculate differences
    dlat := lat2 - lat1;
    dlon := lon2 - lon1;
    
    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) + cos(lat1) * cos(lat2) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    distance := earth_radius_km * c;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find nearby therapists
CREATE OR REPLACE FUNCTION find_nearby_therapists(
    p_latitude DECIMAL(10, 8),
    p_longitude DECIMAL(11, 8),
    p_radius_km INTEGER DEFAULT 25,
    p_session_type VARCHAR(50) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    therapist_id UUID,
    therapist_name TEXT,
    therapist_photo_url TEXT,
    distance_km DECIMAL(10, 2),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    service_radius_km INTEGER,
    hourly_rate DECIMAL(10, 2),
    specializations TEXT[],
    rating DECIMAL(3, 2),
    review_count INTEGER,
    is_verified BOOLEAN,
    last_active TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ul.user_id as therapist_id,
        CONCAT(up.first_name, ' ', up.last_name) as therapist_name,
        up.profile_photo_url as therapist_photo_url,
        calculate_distance_km(p_latitude, p_longitude, ul.latitude, ul.longitude) as distance_km,
        ul.address,
        ul.city,
        ul.state,
        ul.postal_code,
        ul.service_radius_km,
        tp.hourly_rate,
        tp.specializations,
        COALESCE(avg_reviews.avg_rating, 0) as rating,
        COALESCE(avg_reviews.review_count, 0) as review_count,
        ul.is_verified,
        up.last_active
    FROM user_locations ul
    JOIN user_profiles up ON ul.user_id = up.user_id
    LEFT JOIN therapist_profiles tp ON ul.user_id = tp.user_id
    LEFT JOIN (
        SELECT 
            therapist_id,
            AVG(rating) as avg_rating,
            COUNT(*) as review_count
        FROM reviews
        GROUP BY therapist_id
    ) avg_reviews ON ul.user_id = avg_reviews.therapist_id
    WHERE 
        up.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
        AND ul.is_primary = true
        AND calculate_distance_km(p_latitude, p_longitude, ul.latitude, ul.longitude) <= p_radius_km
        AND (p_session_type IS NULL OR tp.specializations @> ARRAY[p_session_type])
        AND up.is_active = true
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find nearby clients for therapists
CREATE OR REPLACE FUNCTION find_nearby_clients(
    p_therapist_id UUID,
    p_radius_km INTEGER DEFAULT 25,
    p_session_type VARCHAR(50) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    client_photo_url TEXT,
    distance_km DECIMAL(10, 2),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    preferred_travel_distance_km INTEGER,
    last_active TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_therapist_location RECORD;
BEGIN
    -- Get therapist's location
    SELECT latitude, longitude INTO v_therapist_location
    FROM user_locations
    WHERE user_id = p_therapist_id AND is_primary = true;
    
    IF v_therapist_location IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        ul.user_id as client_id,
        CONCAT(up.first_name, ' ', up.last_name) as client_name,
        up.profile_photo_url as client_photo_url,
        calculate_distance_km(
            v_therapist_location.latitude, 
            v_therapist_location.longitude, 
            ul.latitude, 
            ul.longitude
        ) as distance_km,
        ul.address,
        ul.city,
        ul.state,
        ul.postal_code,
        lp.preferred_travel_distance_km,
        up.last_active
    FROM user_locations ul
    JOIN user_profiles up ON ul.user_id = up.user_id
    LEFT JOIN location_preferences lp ON ul.user_id = lp.user_id
    WHERE 
        up.user_role = 'client'
        AND ul.is_primary = true
        AND calculate_distance_km(
            v_therapist_location.latitude, 
            v_therapist_location.longitude, 
            ul.latitude, 
            ul.longitude
        ) <= p_radius_km
        AND (lp.preferred_travel_distance_km IS NULL OR 
             calculate_distance_km(
                 v_therapist_location.latitude, 
                 v_therapist_location.longitude, 
                 ul.latitude, 
                 ul.longitude
             ) <= lp.preferred_travel_distance_km)
        AND up.is_active = true
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to geocode address (simplified - in production, use a proper geocoding service)
CREATE OR REPLACE FUNCTION geocode_address(
    p_address TEXT,
    p_city VARCHAR(100),
    p_state VARCHAR(100),
    p_country VARCHAR(100) DEFAULT 'United States'
)
RETURNS TABLE (
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    formatted_address TEXT
) AS $$
DECLARE
    v_latitude DECIMAL(10, 8);
    v_longitude DECIMAL(11, 8);
    v_formatted_address TEXT;
BEGIN
    -- This is a simplified geocoding function
    -- In production, you would integrate with a geocoding service like Nominatim (free)
    -- For now, we'll return placeholder coordinates
    
    -- Example: Return coordinates for New York City as default
    v_latitude := 40.7128;
    v_longitude := -74.0060;
    v_formatted_address := CONCAT(p_address, ', ', p_city, ', ', p_state, ', ', p_country);
    
    RETURN QUERY SELECT v_latitude, v_longitude, v_formatted_address;
END;
$$ LANGUAGE plpgsql;

-- Function to get location statistics
CREATE OR REPLACE FUNCTION get_location_stats()
RETURNS TABLE (
    total_users_with_location INTEGER,
    users_by_city JSONB,
    average_service_radius DECIMAL(10, 2),
    most_popular_cities TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT ul.user_id)::INTEGER as total_users_with_location,
        jsonb_object_agg(ul.city, city_count) as users_by_city,
        AVG(ul.service_radius_km) as average_service_radius,
        ARRAY_AGG(city ORDER BY city_count DESC LIMIT 5) as most_popular_cities
    FROM (
        SELECT 
            ul.city,
            COUNT(*) as city_count
        FROM user_locations ul
        WHERE ul.is_primary = true
        GROUP BY ul.city
    ) city_stats
    JOIN user_locations ul ON city_stats.city = ul.city;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_point ON user_locations USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_user_locations_city ON user_locations(city);
CREATE INDEX IF NOT EXISTS idx_service_areas_therapist_id ON service_areas(therapist_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_center_point ON service_areas USING GIST(center_point);
CREATE INDEX IF NOT EXISTS idx_location_preferences_user_id ON location_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_location_search_history_user_id ON location_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_search_history_point ON location_search_history USING GIST(search_point);

-- RLS Policies
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_search_history ENABLE ROW LEVEL SECURITY;

-- User locations policies
CREATE POLICY "Users can view their own locations" ON user_locations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own locations" ON user_locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations" ON user_locations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view public location data" ON user_locations
    FOR SELECT USING (is_verified = true);

-- Service areas policies
CREATE POLICY "Users can view service areas" ON service_areas
    FOR SELECT USING (is_active = true);

CREATE POLICY "Therapists can manage their own service areas" ON service_areas
    FOR ALL USING (auth.uid() = therapist_id);

-- Location preferences policies
CREATE POLICY "Users can view their own preferences" ON location_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON location_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Location search history policies
CREATE POLICY "Users can view their own search history" ON location_search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" ON location_search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_locations TO authenticated;
GRANT ALL ON service_areas TO authenticated;
GRANT ALL ON location_preferences TO authenticated;
GRANT ALL ON location_search_history TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance_km TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_therapists TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_clients TO authenticated;
GRANT EXECUTE ON FUNCTION geocode_address TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_stats TO authenticated;
