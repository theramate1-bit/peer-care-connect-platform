/**
 * Treatment Exchange Matching Utilities
 * 
 * Handles finding and filtering eligible practitioners for treatment exchange.
 * Includes rating tier calculation, distance calculation, and filtering logic.
 */

import { supabase } from '@/integrations/supabase/client';
import type { EligiblePractitioner, TreatmentExchangePreferences, PractitionerFilters } from './types';

/**
 * Calculate star rating tier from average rating
 * 
 * Practitioners are matched within the same rating tier:
 * - Tier 0: 0-1 stars
 * - Tier 1: 2-3 stars
 * - Tier 2: 4-5 stars
 * 
 * This ensures practitioners exchange with peers of similar quality.
 * 
 * @param averageRating - Average rating (0-5)
 * @returns Rating tier (0, 1, or 2)
 */
export function getStarRatingTier(averageRating: number | string | null | undefined): number {
  // Handle DECIMAL type from database (may be string)
  const rating = averageRating 
    ? (typeof averageRating === 'string' ? parseFloat(averageRating) : averageRating) || 0
    : 0;
  
  if (!rating || rating === 0) {
    return 0; // 0-1 stars
  }
  
  if (rating >= 4) {
    return 2; // 4-5 stars
  } else if (rating >= 2) {
    return 1; // 2-3 stars
  } else {
    return 0; // 0-1 stars
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get eligible practitioners for treatment exchange
 * 
 * This finds practitioners who:
 * - Have opted into treatment exchange
 * - Are in the same rating tier (4-5 stars, 2-3 stars, or 0-1 stars)
 * - Match optional filters (specialization, distance, session types)
 * - Have completed their profile
 * 
 * Rating tier matching ensures practitioners exchange with peers of similar quality.
 * 
 * @param userId - User ID requesting the list (excluded from results)
 * @param filters - Optional filters for specialization, distance, session types
 * @returns Array of eligible practitioners with their details
 * 
 * @example
 * ```typescript
 * // Get all eligible practitioners
 * const practitioners = await getEligiblePractitioners(userId);
 * 
 * // Filter by specialization and distance
 * const filtered = await getEligiblePractitioners(userId, {
 *   specializations: ['sports_therapy'],
 *   max_distance_km: 10
 * });
 * ```
 */
export async function getEligiblePractitioners(
  userId: string,
  filters?: PractitionerFilters
): Promise<EligiblePractitioner[]> {
  try {
    // Get user's preferences and rating
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('treatment_exchange_preferences, latitude, longitude, average_rating')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const userPrefs = userData?.treatment_exchange_preferences as TreatmentExchangePreferences || {};
    const userLat = userData?.latitude;
    const userLng = userData?.longitude;
    
    // Handle DECIMAL type from database (may be string or number)
    const userRating = userData?.average_rating 
      ? parseFloat(String(userData.average_rating)) || 0 
      : 0;
    const userTier = getStarRatingTier(userRating);

    // Build query - get all practitioners who opted in
    let query = supabase
      .from('users')
      .select(`
        id,
        user_id: id,
        first_name,
        last_name,
        user_role,
        specializations,
        average_rating,
        profile_photo_url,
        location,
        latitude,
        longitude,
        treatment_exchange_preferences
      `)
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
      .eq('treatment_exchange_opt_in', true)
      .eq('profile_completed', true)
      .neq('id', userId); // Exclude self

    const { data, error } = await query;

    if (error) throw error;

    let practitioners = data || [];

    // Filter by star rating tier - only show practitioners in same tier
    practitioners = practitioners.filter(p => {
      // Handle DECIMAL type from database (may be string or number)
      const practitionerRating = p.average_rating 
        ? parseFloat(String(p.average_rating)) || 0 
        : 0;
      const practitionerTier = getStarRatingTier(practitionerRating);
      return practitionerTier === userTier;
    });

    // Apply specialization filter
    if (filters?.specializations && filters.specializations.length > 0) {
      practitioners = practitioners.filter(p => 
        p.specializations && 
        filters.specializations!.some(spec => p.specializations.includes(spec))
      );
    }

    // Apply distance filter
    if (filters?.max_distance_km && userLat && userLng) {
      const maxDistance = filters.max_distance_km;
      practitioners = practitioners.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        
        const distance = calculateDistance(userLat, userLng, p.latitude, p.longitude);
        return distance <= maxDistance;
      });
    }

    return practitioners;
  } catch (error) {
    console.error('Error getting eligible practitioners:', error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Error object:', JSON.stringify(error, null, 2));
    }
    return [];
  }
}
