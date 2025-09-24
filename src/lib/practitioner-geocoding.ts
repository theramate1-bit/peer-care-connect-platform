import { supabase } from '@/integrations/supabase/client';
import { GeocodingService, GeocodeResult } from './geocoding';

export interface PractitionerLocation {
  id: string;
  first_name: string;
  last_name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  service_radius_km?: number;
}

export class PractitionerGeocodingService {
  /**
   * Update coordinates for a single practitioner
   */
  static async updatePractitionerCoordinates(
    practitionerId: string,
    address: string
  ): Promise<GeocodeResult | null> {
    try {
      const geocodeResult = await GeocodingService.geocodeAddress(address);
      
      if (geocodeResult) {
        const { error } = await supabase
          .from('users')
          .update({
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
            updated_at: new Date().toISOString()
          })
          .eq('id', practitionerId);

        if (error) {
          console.error('Error updating practitioner coordinates:', error);
          return null;
        }

        return geocodeResult;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating practitioner coordinates:', error);
      return null;
    }
  }

  /**
   * Update coordinates for all practitioners with missing coordinates
   */
  static async updateAllPractitionerCoordinates(): Promise<{
    success: number;
    failed: number;
    results: Array<{ id: string; name: string; success: boolean; error?: string }>;
  }> {
    try {
      // Get all practitioners without coordinates
      const { data: practitioners, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, location')
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('profile_completed', true)
        .is('latitude', null)
        .not('location', 'is', null)
        .not('location', 'eq', '');

      if (error) {
        throw error;
      }

      if (!practitioners || practitioners.length === 0) {
        return { success: 0, failed: 0, results: [] };
      }

      const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];
      let successCount = 0;
      let failedCount = 0;

      // Process practitioners in batches
      const batchSize = 10;
      for (let i = 0; i < practitioners.length; i += batchSize) {
        const batch = practitioners.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (practitioner) => {
          try {
            const geocodeResult = await GeocodingService.geocodeAddress(practitioner.location);
            
            if (geocodeResult) {
              const { error: updateError } = await supabase
                .from('users')
                .update({
                  latitude: geocodeResult.latitude,
                  longitude: geocodeResult.longitude,
                  updated_at: new Date().toISOString()
                })
                .eq('id', practitioner.id);

              if (updateError) {
                throw updateError;
              }

              successCount++;
              results.push({
                id: practitioner.id,
                name: `${practitioner.first_name} ${practitioner.last_name}`,
                success: true
              });
            } else {
              failedCount++;
              results.push({
                id: practitioner.id,
                name: `${practitioner.first_name} ${practitioner.last_name}`,
                success: false,
                error: 'Geocoding failed - no results found'
              });
            }
          } catch (error) {
            failedCount++;
            results.push({
              id: practitioner.id,
              name: `${practitioner.first_name} ${practitioner.last_name}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        });

        await Promise.all(batchPromises);
      }

      return { success: successCount, failed: failedCount, results };
    } catch (error) {
      console.error('Error updating all practitioner coordinates:', error);
      throw error;
    }
  }

  /**
   * Get practitioners with coordinates for map display
   */
  static async getPractitionersWithCoordinates(): Promise<PractitionerLocation[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, location, latitude, longitude, service_radius_km')
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('profile_completed', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting practitioners with coordinates:', error);
      return [];
    }
  }

  /**
   * Get practitioners without coordinates (need geocoding)
   */
  static async getPractitionersWithoutCoordinates(): Promise<PractitionerLocation[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, location, latitude, longitude, service_radius_km')
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('profile_completed', true)
        .is('latitude', null)
        .not('location', 'is', null)
        .not('location', 'eq', '');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting practitioners without coordinates:', error);
      return [];
    }
  }
}
