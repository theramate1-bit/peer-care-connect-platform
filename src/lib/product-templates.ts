/**
 * Product Templates Library
 * Handles fetching and managing product templates for practitioners
 */

import { supabase } from '@/integrations/supabase/client';

export interface ProductTemplate {
  id: string;
  practitioner_id?: string | null;
  service_category: string;
  template_name: string;
  name_template: string; // e.g., "{duration}-minute {service} Session"
  description_template?: string | null;
  default_duration_minutes: number;
  suggested_price_per_hour?: number | null; // In pence
  pricing_type: 'hourly' | 'fixed' | 'range';
  min_duration_minutes?: number | null;
  max_duration_minutes?: number | null;
  is_platform_template: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  service_category: string;
  template_name: string;
  name_template: string;
  description_template?: string;
  default_duration_minutes: number;
  suggested_price_per_hour?: number;
  pricing_type?: 'hourly' | 'fixed' | 'range';
  min_duration_minutes?: number;
  max_duration_minutes?: number;
}

/**
 * Get templates for a service category
 * Returns both platform templates and practitioner's custom templates
 */
export async function getTemplatesForService(
  serviceCategory: string,
  practitionerId?: string
): Promise<{ success: boolean; templates?: ProductTemplate[]; error?: string }> {
  try {
    let query = supabase
      .from('product_templates')
      .select('*')
      .eq('service_category', serviceCategory)
      .eq('is_active', true)
      .order('is_platform_template', { ascending: false }) // Platform templates first
      .order('template_name', { ascending: true });

    // Get platform templates + practitioner's custom templates
    if (practitionerId) {
      query = query.or(`is_platform_template.eq.true,practitioner_id.eq.${practitionerId}`);
    } else {
      query = query.eq('is_platform_template', true);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, templates: data || [] };
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all available templates for practitioner's services
 */
export async function getTemplatesForPractitioner(
  practitionerId: string,
  serviceCategories: string[]
): Promise<{ success: boolean; templates?: ProductTemplate[]; error?: string }> {
  try {
    if (serviceCategories.length === 0) {
      return { success: true, templates: [] };
    }

    const { data, error } = await supabase
      .from('product_templates')
      .select('*')
      .in('service_category', serviceCategories)
      .eq('is_active', true)
      .or(`is_platform_template.eq.true,practitioner_id.eq.${practitionerId}`)
      .order('service_category', { ascending: true })
      .order('is_platform_template', { ascending: false })
      .order('template_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, templates: data || [] };
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a custom template from a product
 */
export async function createTemplateFromProduct(
  practitionerId: string,
  templateData: CreateTemplateData
): Promise<{ success: boolean; template?: ProductTemplate; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('product_templates')
      .insert({
        practitioner_id: practitionerId,
        ...templateData,
        is_platform_template: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (error: any) {
    console.error('Error creating template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a custom template
 */
export async function deleteTemplate(
  templateId: string,
  practitionerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('product_templates')
      .delete()
      .eq('id', templateId)
      .eq('practitioner_id', practitionerId); // Ensure practitioner owns it

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Apply template to product data
 * Replaces template variables with actual values
 */
export function applyTemplate(
  template: ProductTemplate,
  customDuration?: number
): {
  name: string;
  description: string;
  duration_minutes: number;
  price_amount: number;
} {
  const duration = customDuration || template.default_duration_minutes;
  
  // Replace template variables in name
  let name = template.name_template
    .replace(/{duration}/g, duration.toString())
    .replace(/{service}/g, getServiceLabel(template.service_category))
    .replace(/{service_lower}/g, getServiceLabel(template.service_category).toLowerCase());

  // Replace template variables in description
  let description = template.description_template || '';
  if (description) {
    description = description
      .replace(/{duration}/g, duration.toString())
      .replace(/{service}/g, getServiceLabel(template.service_category))
      .replace(/{service_lower}/g, getServiceLabel(template.service_category).toLowerCase());
  }

  // Calculate price - hourly_rate no longer used, must use suggested_price_per_hour
  let price_amount = 0;
  if (template.pricing_type === 'hourly' && template.suggested_price_per_hour) {
    // suggested_price_per_hour is in pence
    price_amount = Math.round((template.suggested_price_per_hour * duration) / 60);
  } else if (template.suggested_price_per_hour) {
    // Fixed pricing, already in pence
    price_amount = template.suggested_price_per_hour;
  }
  // If no suggested price, return 0 (user must set price manually)

  return {
    name,
    description,
    duration_minutes: duration,
    price_amount,
  };
}

/**
 * Helper to get service label (imported from service-defaults)
 */
function getServiceLabel(serviceValue: string): string {
  const serviceNames: Record<string, string> = {
    'sports_injury_assessment': 'Sports Injury Assessment',
    'exercise_rehabilitation': 'Exercise Rehabilitation',
    'strength_conditioning': 'Strength & Conditioning',
    'injury_prevention': 'Injury Prevention Programs',
    'performance_enhancement': 'Sports Performance Enhancement',
    'return_to_play': 'Return to Play Protocols',
    'deep_tissue': 'Deep Tissue Massage',
    'sports_massage': 'Sports Massage',
    'swedish_massage': 'Swedish Massage',
    'trigger_point': 'Trigger Point Therapy',
    'myofascial_release': 'Myofascial Release',
    'relaxation_massage': 'Relaxation Massage',
    'structural_osteopathy': 'Structural Osteopathy',
    'cranial_osteopathy': 'Cranial Osteopathy',
    'visceral_osteopathy': 'Visceral Osteopathy',
    'paediatric_osteopathy': 'Paediatric Osteopathy',
    'sports_osteopathy': 'Sports Osteopathy',
    'postural_assessment': 'Postural Assessment',
  };
  return serviceNames[serviceValue] || serviceValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

