/**
 * Practitioner Services API
 * Handles CRUD operations for practitioner services and custom pricing
 */

import { supabase } from '@/integrations/supabase/client';
import { ServiceData, ServicePricing, calculateServicePricing, validateServicePricing } from '@/utils/pricing';

export interface PractitionerService {
  id: string;
  practitioner_id: string;
  service_name: string;
  service_type: 'sports_therapy' | 'massage_therapy' | 'osteopathy';
  duration_minutes: number;
  base_price_pence: number;
  platform_fee_percentage: number;
  platform_fee_pence: number;
  practitioner_earnings_pence: number;
  stripe_price_id?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  platform_fee_percentage: number;
  is_active: boolean;
}

/**
 * Get all service categories
 */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch service categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Get practitioner's services
 */
export async function getPractitionerServices(practitionerId: string): Promise<PractitionerService[]> {
  const { data, error } = await supabase
    .from('practitioner_services')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch practitioner services: ${error.message}`);
  }

  return data || [];
}

/**
 * Get active services for marketplace browsing
 */
export async function getActiveServices(filters?: {
  serviceType?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
}): Promise<PractitionerService[]> {
  let query = supabase
    .from('practitioner_services')
    .select(`
      *,
      users!practitioner_services_practitioner_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        location,
        bio
      )
    `)
    .eq('is_active', true);

  if (filters?.serviceType) {
    query = query.eq('service_type', filters.serviceType);
  }

  if (filters?.minPrice) {
    query = query.gte('base_price_pence', filters.minPrice);
  }

  if (filters?.maxPrice) {
    query = query.lte('base_price_pence', filters.maxPrice);
  }

  if (filters?.duration) {
    query = query.eq('duration_minutes', filters.duration);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch active services: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new practitioner service
 */
export async function createPractitionerService(
  practitionerId: string,
  serviceData: ServiceData
): Promise<PractitionerService> {
  // Validate service data
  const validationErrors = validateServicePricing(serviceData);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // Calculate pricing
  const pricing = calculateServicePricing(serviceData.basePricePence);

  const { data, error } = await supabase
    .from('practitioner_services')
    .insert({
      practitioner_id: practitionerId,
      service_name: serviceData.serviceName,
      service_type: serviceData.serviceType,
      duration_minutes: serviceData.durationMinutes,
      base_price_pence: serviceData.basePricePence,
      platform_fee_percentage: 4, // Default 4% platform fee
      description: serviceData.description,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create service: ${error.message}`);
  }

  return data;
}

/**
 * Update a practitioner service
 */
export async function updatePractitionerService(
  serviceId: string,
  practitionerId: string,
  updates: Partial<ServiceData>
): Promise<PractitionerService> {
  // If base price is being updated, recalculate pricing
  if (updates.basePricePence) {
    const validationErrors = validateServicePricing({
      serviceName: updates.serviceName || '',
      serviceType: updates.serviceType || 'sports_therapy',
      durationMinutes: updates.durationMinutes || 0,
      basePricePence: updates.basePricePence
    });
    
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
  }

  const { data, error } = await supabase
    .from('practitioner_services')
    .update({
      service_name: updates.serviceName,
      service_type: updates.serviceType,
      duration_minutes: updates.durationMinutes,
      base_price_pence: updates.basePricePence,
      description: updates.description,
      updated_at: new Date().toISOString()
    })
    .eq('id', serviceId)
    .eq('practitioner_id', practitionerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service: ${error.message}`);
  }

  return data;
}

/**
 * Delete a practitioner service
 */
export async function deletePractitionerService(
  serviceId: string,
  practitionerId: string
): Promise<void> {
  const { error } = await supabase
    .from('practitioner_services')
    .delete()
    .eq('id', serviceId)
    .eq('practitioner_id', practitionerId);

  if (error) {
    throw new Error(`Failed to delete service: ${error.message}`);
  }
}

/**
 * Toggle service active status
 */
export async function toggleServiceStatus(
  serviceId: string,
  practitionerId: string,
  isActive: boolean
): Promise<PractitionerService> {
  const { data, error } = await supabase
    .from('practitioner_services')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', serviceId)
    .eq('practitioner_id', practitionerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service status: ${error.message}`);
  }

  return data;
}

/**
 * Get service by ID
 */
export async function getServiceById(serviceId: string): Promise<PractitionerService | null> {
  const { data, error } = await supabase
    .from('practitioner_services')
    .select('*')
    .eq('id', serviceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Service not found
    }
    throw new Error(`Failed to fetch service: ${error.message}`);
  }

  return data;
}

/**
 * Get services by practitioner ID for public viewing
 */
export async function getPractitionerPublicServices(practitionerId: string): Promise<PractitionerService[]> {
  const { data, error } = await supabase
    .from('practitioner_services')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('is_active', true)
    .order('service_name');

  if (error) {
    throw new Error(`Failed to fetch practitioner services: ${error.message}`);
  }

  return data || [];
}

/**
 * Search services with filters
 */
export async function searchServices(filters: {
  query?: string;
  serviceType?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
  location?: string;
  limit?: number;
  offset?: number;
}): Promise<{ services: PractitionerService[]; total: number }> {
  let query = supabase
    .from('practitioner_services')
    .select(`
      *,
      users!practitioner_services_practitioner_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        location,
        bio
      )
    `, { count: 'exact' })
    .eq('is_active', true);

  if (filters.query) {
    query = query.or(`service_name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
  }

  if (filters.serviceType) {
    query = query.eq('service_type', filters.serviceType);
  }

  if (filters.minPrice) {
    query = query.gte('base_price_pence', filters.minPrice);
  }

  if (filters.maxPrice) {
    query = query.lte('base_price_pence', filters.maxPrice);
  }

  if (filters.duration) {
    query = query.eq('duration_minutes', filters.duration);
  }

  if (filters.location) {
    query = query.ilike('users.location', `%${filters.location}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 20) - 1
    );

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to search services: ${error.message}`);
  }

  return {
    services: data || [],
    total: count || 0
  };
}
