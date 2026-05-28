import { supabase } from '@/integrations/supabase/client';

export interface UserLocation {
  id: string;
  user_id: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  service_radius_km: number;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceArea {
  id: string;
  therapist_id: string;
  area_name: string;
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationPreferences {
  id: string;
  user_id: string;
  preferred_travel_distance_km: number;
  preferred_cities: string[];
  avoid_areas: string[];
  home_visit_preferred: boolean;
  clinic_visit_preferred: boolean;
  virtual_session_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export interface NearbyTherapist {
  therapist_id: string;
  therapist_name: string;
  therapist_photo_url: string | null;
  distance_km: number;
  address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  service_radius_km: number;
  hourly_rate: number;
  specializations: string[];
  rating: number;
  review_count: number;
  is_verified: boolean;
  last_active: string | null;
}

export interface NearbyClient {
  client_id: string;
  client_name: string;
  client_photo_url: string | null;
  distance_km: number;
  address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  preferred_travel_distance_km: number;
  last_active: string | null;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

export class LocationManager {
  /**
   * Check if user has consented to location tracking
   * Required for UK GDPR and PECR compliance
   */
  static async hasLocationConsent(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('has_location_consent', { p_user_id: userId });
      
      if (error) {
        console.warn('Error checking location consent:', error);
        return false; // Default to no consent if check fails
      }
      
      return data === true;
    } catch (error) {
      console.warn('Error checking location consent:', error);
      return false; // Default to no consent if check fails
    }
  }

  /**
   * Get user's current location using HTML5 Geolocation API
   * Now checks for consent before accessing location (UK GDPR/PECR compliance)
   */
  static async getCurrentLocation(userId?: string): Promise<{ latitude: number; longitude: number } | null> {
    // Check consent if userId provided
    if (userId) {
      const hasConsent = await this.hasLocationConsent(userId);
      if (!hasConsent) {
        console.warn('Location consent not granted. Please grant consent before accessing location.');
        return null;
      }
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let errorMessage = 'Unknown geolocation error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = error.message || 'Unknown geolocation error';
              break;
          }
          
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout to 15 seconds
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Geocode an address to get coordinates
   */
  static async geocodeAddress(
    address: string,
    city: string,
    state: string,
    country: string = 'United States'
  ): Promise<GeocodeResult | null> {
    try {
      // Use free Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          `${address}, ${city}, ${state}, ${country}`
        )}&limit=1&addressdetails=1`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          formatted_address: data[0].display_name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Add or update user location
   */
  static async setUserLocation(
    userId: string,
    address: string,
    city: string,
    state: string | null,
    country: string,
    postalCode: string | null,
    latitude: number,
    longitude: number,
    serviceRadiusKm: number | null = null,
    isPrimary: boolean = true
  ): Promise<string> {
    try {
      // Create PostGIS point
      const { data: pointData, error: pointError } = await supabase
        .rpc('st_point', { x: longitude, y: latitude });

      if (pointError) {
        throw new Error(pointError.message);
      }

      const { data, error } = await supabase
        .from('user_locations')
        .upsert({
          user_id: userId,
          address,
          city,
          state,
          country,
          postal_code: postalCode,
          latitude,
          longitude,
          location_point: pointData,
          service_radius_km: serviceRadiusKm ?? null,
          is_primary: isPrimary,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data.id;
    } catch (error) {
      console.error('Error setting user location:', error);
      throw error;
    }
  }

  /**
   * Get user's locations
   */
  static async getUserLocations(userId: string): Promise<UserLocation[]> {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting user locations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user locations:', error);
      return [];
    }
  }

  /**
   * Find nearby therapists
   */
  static async findNearbyTherapists(
    latitude: number,
    longitude: number,
    radiusKm: number = 25,
    sessionType?: string,
    limit: number = 20
  ): Promise<NearbyTherapist[]> {
    try {
      const { data, error } = await supabase
        .rpc('find_nearby_therapists', {
          user_lat: latitude,
          user_lng: longitude,
          radius_km: radiusKm,
          session_type: sessionType || null
        });

      if (error) {
        console.error('Error finding nearby therapists:', error);
        return [];
      }

      // Transform the data to match the NearbyTherapist interface
      const transformedData = (data || []).map((item: any) => ({
        therapist_id: item.therapist_id,
        therapist_name: item.therapist_name,
        therapist_photo_url: null, // This field is not returned by the function
        distance_km: item.distance_km,
        address: '', // This field is not returned by the function
        city: '', // This field is not returned by the function
        state: null, // This field is not returned by the function
        postal_code: null, // This field is not returned by the function
        service_radius_km: 25, // Default value
        hourly_rate: item.hourly_rate,
        specializations: item.specializations,
        rating: item.rating,
        review_count: item.review_count,
        is_verified: true, // Only verified therapists are returned
        last_active: null // This field is not returned by the function
      }));

      return transformedData.slice(0, limit);
    } catch (error) {
      console.error('Error finding nearby therapists:', error);
      return [];
    }
  }

  /**
   * Find nearby clients for therapists
   */
  static async findNearbyClients(
    therapistId: string,
    radiusKm: number = 25,
    sessionType?: string,
    limit: number = 20
  ): Promise<NearbyClient[]> {
    try {
      const { data, error } = await supabase
        .rpc('find_nearby_clients', {
          p_therapist_id: therapistId,
          p_radius_km: radiusKm,
          p_session_type: sessionType || null,
          p_limit: limit
        });

      if (error) {
        console.error('Error finding nearby clients:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error finding nearby clients:', error);
      return [];
    }
  }

  /**
   * Get or create location preferences
   */
  static async getLocationPreferences(userId: string): Promise<LocationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('location_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error getting location preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting location preferences:', error);
      return null;
    }
  }

  /**
   * Update location preferences
   */
  static async updateLocationPreferences(
    userId: string,
    preferences: Partial<Omit<LocationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('location_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error updating location preferences:', error);
      throw error;
    }
  }

  /**
   * Add service area for therapist
   */
  static async addServiceArea(
    therapistId: string,
    areaName: string,
    centerLatitude: number,
    centerLongitude: number,
    radiusKm: number
  ): Promise<string> {
    try {
      // Create PostGIS point
      const { data: pointData, error: pointError } = await supabase
        .rpc('st_point', { x: centerLongitude, y: centerLatitude });

      if (pointError) {
        throw new Error(pointError.message);
      }

      const { data, error } = await supabase
        .from('service_areas')
        .insert({
          therapist_id: therapistId,
          area_name: areaName,
          center_latitude: centerLatitude,
          center_longitude: centerLongitude,
          center_point: pointData,
          radius_km: radiusKm
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data.id;
    } catch (error) {
      console.error('Error adding service area:', error);
      throw error;
    }
  }

  /**
   * Get therapist's service areas
   */
  static async getServiceAreas(therapistId: string): Promise<ServiceArea[]> {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('therapist_id', therapistId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting service areas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting service areas:', error);
      return [];
    }
  }

  /**
   * Log location search
   */
  static async logLocationSearch(
    userId: string,
    latitude: number,
    longitude: number,
    radiusKm: number,
    filters: any = {},
    resultsCount: number = 0
  ): Promise<void> {
    try {
      // Create PostGIS point
      const { data: pointData, error: pointError } = await supabase
        .rpc('st_point', { x: longitude, y: latitude });

      if (pointError) {
        console.error('Error creating search point:', pointError);
        return;
      }

      await supabase
        .from('location_search_history')
        .insert({
          user_id: userId,
          search_latitude: latitude,
          search_longitude: longitude,
          search_point: pointData,
          search_radius_km: radiusKm,
          search_filters: filters,
          results_count: resultsCount
        });
    } catch (error) {
      console.error('Error logging location search:', error);
    }
  }

  /**
   * Get location statistics
   */
  static async getLocationStats(): Promise<{
    total_users_with_location: number;
    users_by_city: any;
    average_service_radius: number;
    most_popular_cities: string[];
  } | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_location_stats');

      if (error) {
        console.error('Error getting location stats:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting location stats:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }

  /**
   * Get location suggestions based on partial input
   */
  static async getLocationSuggestions(query: string): Promise<any[]> {
    try {
      // Use proxy in development to avoid CORS issues, Supabase Edge Function in production
      const isDev = import.meta.env.DEV;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const proxyUrl = isDev 
        ? `/api/photon/?q=${encodeURIComponent(query)}&limit=10&lang=en`
        : `${supabaseUrl}/functions/v1/location-proxy?q=${encodeURIComponent(query)}&limit=10&lang=en`;
      
      // Try Photon API first (better for autocomplete, faster, no rate limits)
      // Add headers for Chrome compatibility and proper CORS handling
      const photonResponse = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(isDev ? {} : {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
          }),
        },
        mode: 'cors',
        cache: 'default',
      });
      
      if (photonResponse.ok) {
        const photonData = await photonResponse.json();
        const features = photonData.features || [];
        
        // Filter and prioritize UK addresses
        const ukFeatures = features.filter((feature: any) => {
          const country = feature.properties?.country?.toLowerCase() || '';
          return country === 'united kingdom' || country === 'gb' || country === 'great britain';
        });
        
        // If we have UK results, use them; otherwise use all results
        const resultsToUse = ukFeatures.length > 0 ? ukFeatures : features.slice(0, 5);
        
        return resultsToUse.map((feature: any) => {
          const props = feature.properties || {};
          const coordinates = feature.geometry?.coordinates || [];
          const lon = coordinates[0];
          const lat = coordinates[1];
          
          const name = props.name || '';
          const street = props.street || '';
          const housenumber = props.housenumber || '';
          const city = props.city || props.town || props.village || props.district || '';
          const state = props.state || props.county || '';
          const country = props.country || 'United Kingdom';
          const postcode = props.postcode || '';
          
          // Build display name with UK formatting
          const parts = [];
          if (housenumber && street) parts.push(`${housenumber} ${street}`);
          else if (street) parts.push(street);
          else if (name) parts.push(name);
          
          if (city) parts.push(city);
          if (state && state !== city) parts.push(state);
          if (postcode) parts.push(postcode);
          if (country && country.toLowerCase() !== 'united kingdom') parts.push(country);
          
          const displayName = parts.length > 0 ? parts.join(', ') : name || 'Location';
          
          return {
            display_name: displayName,
            latitude: typeof lat === 'number' ? lat : parseFloat(lat) || 0,
            longitude: typeof lon === 'number' ? lon : parseFloat(lon) || 0,
            address: {
              street: street,
              housenumber: housenumber,
              city: city,
              state: state,
              country: country,
              postcode: postcode
            },
            city: city,
            state: state,
            country: country,
            postal_code: postcode
          };
        });
      }
      
      // Fallback to Nominatim API if Photon fails
      // Prioritize UK addresses with countrycodes=gb
      const nominatimProxyUrl = isDev
        ? `/api/nominatim/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&countrycodes=gb&accept-language=en-GB`
        : `${supabaseUrl}/functions/v1/location-proxy?service=nominatim&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&countrycodes=gb&accept-language=en-GB`;
      
      const response = await fetch(nominatimProxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(isDev ? {} : {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
          }),
        },
        mode: 'cors',
        cache: 'default',
      });
      
      if (!response.ok) {
        console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
        throw new Error(`Nominatim API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter and prioritize UK addresses, then format
      const ukResults = data.filter((item: any) => {
        const country = item.address?.country?.toLowerCase() || '';
        const countryCode = item.address?.country_code?.toLowerCase() || '';
        return country === 'united kingdom' || countryCode === 'gb' || country.includes('britain');
      });
      
      const resultsToUse = ukResults.length > 0 ? ukResults : data.slice(0, 5);
      
      return resultsToUse.map((item: any) => ({
        display_name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: item.address,
        city: item.address?.city || item.address?.town || item.address?.village || item.address?.suburb,
        state: item.address?.state || item.address?.county,
        country: item.address?.country || 'United Kingdom',
        postal_code: item.address?.postcode
      }));
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      // Log more details for debugging Chrome issues
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        console.error('Network error - possible CORS or connectivity issue:', {
          userAgent: navigator.userAgent,
          isChrome: isChrome,
          origin: window.location.origin,
          error: error.message,
          suggestion: isChrome ? 'Try using the Supabase Edge Function proxy in production' : 'Check network connectivity'
        });
      }
      
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }
}
