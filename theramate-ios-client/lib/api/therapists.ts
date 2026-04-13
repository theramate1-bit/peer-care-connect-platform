/**
 * Therapists API
 * API functions for therapist-related operations
 */

import { supabase } from '../supabase';
import type { MarketplacePractitioner, TherapistProfile, PractitionerProduct } from '@/types/database';
import { MAP_CONFIG } from '@/constants/config';

export interface TherapistSearchParams {
  query?: string;
  specialization?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  minRating?: number;
  maxRate?: number;
  limit?: number;
  offset?: number;
}

/**
 * Search marketplace practitioners
 */
export async function searchTherapists(params: TherapistSearchParams = {}) {
  const {
    query,
    specialization,
    latitude,
    longitude,
    radiusKm = MAP_CONFIG.DEFAULT_RADIUS_KM,
    minRating,
    maxRate,
    limit = 20,
    offset = 0,
  } = params;

  // If location provided, use distance-based search
  if (latitude && longitude) {
    const { data, error } = await supabase.rpc('find_practitioners_by_distance', {
      lat: latitude,
      lng: longitude,
      radius_km: radiusKm,
    });

    if (error) throw error;
    return { data, error };
  }

  // Otherwise, use standard query
  let query$ = supabase
    .from('marketplace_practitioners')
    .select('*')
    .eq('is_active', true);

  if (specialization) {
    query$ = query$.contains('specializations', [specialization]);
  }

  if (minRating) {
    query$ = query$.gte('average_rating', minRating);
  }

  if (maxRate) {
    query$ = query$.lte('hourly_rate', maxRate);
  }

  if (query) {
    query$ = query$.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,location.ilike.%${query}%`);
  }

  query$ = query$
    .order('average_rating', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query$;

  return { data, error, count };
}

/**
 * Get therapist by ID
 */
export async function getTherapist(userId: string) {
  const { data, error } = await supabase
    .from('marketplace_practitioners')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error };
}

/**
 * Get therapist full profile with additional details
 */
export async function getTherapistProfile(userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('therapist_profiles')
    .select(`
      *,
      users:user_id (
        first_name,
        last_name,
        email,
        phone,
        bio
      )
    `)
    .eq('user_id', userId)
    .single();

  if (profileError) return { data: null, error: profileError };

  // Get reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('therapist_id', userId)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get services/products
  const { data: products } = await supabase
    .from('practitioner_products')
    .select('*')
    .eq('practitioner_id', userId)
    .eq('is_active', true)
    .order('price_amount', { ascending: true });

  return {
    data: {
      ...profile,
      reviews: reviews || [],
      products: products || [],
    },
    error: null,
  };
}

/**
 * Get therapist products/services
 */
export async function getTherapistProducts(practitionerId: string) {
  const { data, error } = await supabase
    .from('practitioner_products')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('is_active', true)
    .order('price_amount', { ascending: true });

  return { data, error };
}

/**
 * Get therapist reviews
 */
export async function getTherapistReviews(therapistId: string, limit = 10, offset = 0) {
  const { data, error, count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('therapist_id', therapistId)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, error, count };
}

/**
 * Get therapist availability
 */
export async function getTherapistAvailability(therapistId: string, dayOfWeek?: number) {
  let query = supabase
    .from('availability_slots')
    .select('*')
    .eq('therapist_id', therapistId)
    .eq('is_available', true);

  if (dayOfWeek !== undefined) {
    query = query.eq('day_of_week', dayOfWeek);
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  return { data, error };
}

/**
 * Get next available slot for a therapist
 */
export async function getNextAvailableSlot(practitionerId: string, durationMinutes: number) {
  const { data, error } = await supabase.rpc('get_next_available_slot', {
    practitioner_id: practitionerId,
    duration_minutes: durationMinutes,
  });

  return { data, error };
}

