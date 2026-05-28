/**
 * Stripe Products Helper Library
 * Handles creation and management of practitioner products via Edge Functions
 */

import { supabase } from '@/integrations/supabase/client';

/** Extract user-facing error from Edge Function invoke error (e.g. FunctionsHttpError) or data. */
async function extractEdgeFunctionError(err: unknown, data: unknown, fallback: string): Promise<string> {
  const ctx = (err as { context?: { json?: () => Promise<Record<string, unknown>> } })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      const detail = typeof body?.details === 'string' ? body.details : (body?.details ? String(body.details) : '');
      return body?.error ? (detail ? `${body.error}: ${detail}` : String(body.error)) : fallback;
    } catch (_) {
      /* ignore parse errors */
    }
  }
  const d = data as { error?: string; details?: string } | null;
  if (d?.error) {
    const detail = typeof d.details === 'string' ? d.details : (d.details ? String(d.details) : '');
    return detail ? `${d.error}: ${detail}` : String(d.error);
  }
  return (err as Error)?.message || fallback;
}

export interface PractitionerProduct {
  id: string;
  practitioner_id: string;
  stripe_product_id?: string;
  stripe_price_id?: string;
  name: string;
  description?: string;
  price_amount: number; // in pence
  currency: string;
  duration_minutes?: number;
  is_active: boolean;
  service_category?: string; // Links to services_offered values
  service_type?: 'clinic' | 'mobile' | 'both'; // Service delivery type
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price_amount: number; // in pence
  duration_minutes?: number;
  category?: string; // Legacy field
  service_category?: string; // New: links to services_offered
  service_type?: 'clinic' | 'mobile' | 'both'; // Service delivery type
}

/**
 * Create a product via Edge Function
 */
export async function createPractitionerProduct(
  practitionerId: string,
  productData: CreateProductData
): Promise<{ success: boolean; product?: PractitionerProduct; error?: string }> {
  try {
    // Get session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Your session has expired. Please refresh the page.' };
    }

    const { data, error } = await supabase.functions.invoke('stripe-payment', {
      body: {
        action: 'create-product',
        practitioner_id: practitionerId,
        name: productData.name,
        description: productData.description,
        price_amount: productData.price_amount,
        duration_minutes: productData.duration_minutes,
        category: productData.category || 'general',
        service_category: productData.service_category || null,
        service_type: productData.service_type || 'clinic',
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      const msg = await extractEdgeFunctionError(error, data, 'We couldn\'t save this service. Please check your connection and try again.');
      return { success: false, error: msg };
    }

    if (data?.error) {
      const msg = await extractEdgeFunctionError(null, data, 'We couldn\'t save this service. Please try again.');
      return { success: false, error: msg };
    }

    return { success: true, product: data?.product };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'We couldn\'t save this service. Please try again.';
    console.error('Error creating practitioner product:', err);
    return { success: false, error: message };
  }
}

/**
 * Update a practitioner product via Edge Function
 */
export async function updatePractitionerProduct(
  productId: string,
  updates: Partial<CreateProductData>
): Promise<{ success: boolean; product?: PractitionerProduct; error?: string }> {
  try {
    // Get session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Your session has expired. Please refresh the page.' };
    }

    const { data, error } = await supabase.functions.invoke('stripe-payment', {
      body: {
        action: 'update-product',
        product_id: productId,
        ...updates,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      const msg = await extractEdgeFunctionError(error, data, 'We couldn\'t update this service. Please try again.');
      return { success: false, error: msg };
    }

    if (data?.error) {
      const msg = await extractEdgeFunctionError(null, data, 'We couldn\'t update this service. Please try again.');
      return { success: false, error: msg };
    }

    return { success: true, product: data?.product };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'We couldn\'t update this service. Please try again.';
    console.error('Error updating practitioner product:', err);
    return { success: false, error: message };
  }
}

/**
 * Delete a practitioner product via Edge Function
 */
export async function deletePractitionerProduct(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Your session has expired. Please refresh the page.' };
    }

    const { data, error } = await supabase.functions.invoke('stripe-payment', {
      body: {
        action: 'delete-product',
        product_id: productId,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      const msg = await extractEdgeFunctionError(error, data, 'We couldn\'t delete this service. Please try again.');
      return { success: false, error: msg };
    }

    if (data?.error) {
      const msg = await extractEdgeFunctionError(null, data, 'We couldn\'t delete this service. Please try again.');
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'We couldn\'t delete this service. Please try again.';
    console.error('Error deleting practitioner product:', err);
    return { success: false, error: message };
  }
}

/**
 * Get practitioner's products
 */
export async function getPractitionerProducts(
  practitionerId: string,
  includeInactive: boolean = false
): Promise<{ success: boolean; products?: PractitionerProduct[]; error?: string }> {
  try {
    let query = supabase
      .from('practitioner_products')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: products, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message || 'We couldn\'t load your services. Check your connection and try again.',
      };
    }

    return { success: true, products: products || [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'We couldn\'t load your services. Check your connection and try again.';
    console.error('Error fetching practitioner products:', err);
    return { success: false, error: message };
  }
}

/**
 * Get all active products for marketplace
 */
export async function getAllActiveProducts(): Promise<{ success: boolean; products?: PractitionerProduct[]; error?: string }> {
  try {
    const { data: products, error } = await supabase
      .from('practitioner_products')
      .select(`
        *,
        users: practitioner_id (
          id,
          first_name,
          last_name,
          user_role,
          location,
          stripe_connect_account_id
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, products: products || [] };
  } catch (error: any) {
    console.error('Error fetching all products:', error);
    return { success: false, error: error.message };
  }
}
