/**
 * Geo-Search Service
 * PostGIS-powered geo-spatial search for practitioners
 */

import { supabase } from '@/integrations/supabase/client';

export interface PractitionerWithDistance {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  location: string;
  clinic_address?: string;
  clinic_latitude?: number;
  clinic_longitude?: number;
  base_address?: string;
  base_latitude?: number;
  base_longitude?: number;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid';
  mobile_service_radius_km?: number;
  hourly_rate: number;
  specializations: string[];
  services_offered?: string[];
  bio: string;
  experience_years: number;
  profile_photo_url?: string | null;
  average_rating?: number;
  total_sessions?: number;
  distance_km?: number;
  service_radius_used?: 'clinic' | 'base';
}

export interface GeoSearchFilters {
  radiusKm?: number;
  serviceType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  role?: string;
}

export class GeoSearchService {
  /**
   * Find practitioners nearby using PostGIS
   */
  static async findPractitionersNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 25,
    filters: GeoSearchFilters = {}
  ): Promise<PractitionerWithDistance[]> {
    try {
      // Use PostGIS RPC function for spatial query
      const { data, error } = await supabase.rpc('find_practitioners_by_distance', {
        search_lat: latitude,
        search_lon: longitude,
        radius_km: radiusKm,
        limit_count: 100,
        service_type: filters.serviceType || null,
        min_price: filters.minPrice || null,
        max_price: filters.maxPrice || null,
        min_rating: filters.minRating || null,
        user_role: filters.role || null
      });

      if (error) {
        console.error('PostGIS RPC error, falling back to client-side:', error);
        // Fallback to text-based search
        return await this.findPractitionersNearbyFallback(latitude, longitude, radiusKm, filters);
      }

      return (data || []) as PractitionerWithDistance[];
    } catch (error) {
      console.error('Error in geo-search:', error);
      return await this.findPractitionersNearbyFallback(latitude, longitude, radiusKm, filters);
    }
  }

  /**
   * Fallback method using text-based location search
   */
  private static async findPractitionersNearbyFallback(
    latitude: number,
    longitude: number,
    radiusKm: number,
    filters: GeoSearchFilters
  ): Promise<PractitionerWithDistance[]> {
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          user_id: id,
          first_name,
          last_name,
          location,
          clinic_address,
          clinic_latitude,
          clinic_longitude,
          base_address,
          base_latitude,
          base_longitude,
          therapist_type,
          mobile_service_radius_km,
          hourly_rate,
          specializations,
          services_offered,
          bio,
          experience_years,
          user_role,
          profile_completed,
          onboarding_status,
          profile_photo_url,
          products:practitioner_products(*)
        `)
        .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
        .eq('is_active', true)
        .eq('profile_completed', true)
        .eq('onboarding_status', 'completed')
        .not('hourly_rate', 'is', null);

      // Apply filters
      if (filters.role) {
        query = query.eq('user_role', filters.role);
      }

      if (filters.minPrice) {
        query = query.gte('hourly_rate', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('hourly_rate', filters.maxPrice);
      }

      if (filters.serviceType && filters.serviceType !== 'all') {
        query = query.contains('services_offered', [filters.serviceType]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate distances client-side using coordinates that match practitioner type.
      // Mobile/hybrid distance should be from base coordinates, clinic from clinic coordinates.
      const practitioners = (data || []).map(p => {
        let distance: number | undefined;

        const useBaseCoords = p.therapist_type === 'mobile' || p.therapist_type === 'hybrid';
        const originLat = useBaseCoords ? p.base_latitude : p.clinic_latitude;
        const originLon = useBaseCoords ? p.base_longitude : p.clinic_longitude;

        if (originLat && originLon) {
          distance = this.calculateDistance(
            latitude,
            longitude,
            originLat,
            originLon
          );
        }

        return {
          ...p,
          distance_km: distance
        };
      });

      // Filter by radius:
      // - Mobile/hybrid: searched location must be within the practitioner's own service radius
      // - Clinic-based: clinic must be within the user's search radius
      const filtered = practitioners.filter(p => {
        if (p.distance_km === undefined) return false;
        if (p.therapist_type === 'mobile' || p.therapist_type === 'hybrid') {
          if (p.mobile_service_radius_km == null) return false;
          return p.distance_km <= p.mobile_service_radius_km;
        }
        return p.distance_km <= radiusKm;
      });

      // Sort by distance
      return filtered.sort((a, b) => {
        const distA = a.distance_km || Infinity;
        const distB = b.distance_km || Infinity;
        return distA - distB;
      });
    } catch (error) {
      console.error('Error in fallback geo-search:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Build geo-search query (helper for direct Supabase queries with PostGIS)
   */
  static buildGeoSearchQuery(
    baseQuery: any,
    searchLat: number,
    searchLon: number,
    radiusKm: number
  ): any {
    // Note: Direct PostGIS queries via Supabase client require RPC functions
    // This is a placeholder for future direct query building
    return baseQuery;
  }
}

