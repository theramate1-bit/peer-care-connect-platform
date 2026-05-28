import { supabase } from '@/integrations/supabase/client';

/**
 * Cache for resolved client IDs to avoid repeated queries
 */
const clientIdCache = new Map<string, string | null>();

/**
 * Resolves a client email to their user ID (UUID)
 * 
 * @param email - The client's email address
 * @param fallbackId - Optional fallback UUID if email lookup fails
 * @returns The user ID (UUID) or null if not found
 * 
 * @example
 * ```typescript
 * const clientId = await resolveClientId('client@example.com');
 * if (clientId) {
 *   // Use clientId for progress tracking
 * }
 * ```
 */
export async function resolveClientId(
  email: string,
  fallbackId?: string
): Promise<string | null> {
  if (!email || typeof email !== 'string') {
    console.warn('[resolveClientId] Invalid email provided:', email);
    return fallbackId || null;
  }

  // Check cache first
  if (clientIdCache.has(email)) {
    return clientIdCache.get(email) || fallbackId || null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error) {
      console.error('[resolveClientId] Error looking up user by email:', error);
      // Cache null result to avoid repeated failed queries
      clientIdCache.set(email, null);
      return fallbackId || null;
    }

    if (data?.id) {
      // Cache the result
      clientIdCache.set(email, data.id);
      return data.id;
    }

    // No user found
    console.warn('[resolveClientId] No user found for email:', email);
    clientIdCache.set(email, null);
    return fallbackId || null;
  } catch (error) {
    console.error('[resolveClientId] Unexpected error:', error);
    clientIdCache.set(email, null);
    return fallbackId || null;
  }
}

/**
 * Resolves client ID from a session object, handling null client_id
 * 
 * @param session - Session object with optional client_id and client_email
 * @returns The resolved client ID (UUID) or null
 * 
 * @example
 * ```typescript
 * const clientId = await resolveClientIdFromSession(session);
 * if (clientId) {
 *   // Use clientId
 * }
 * ```
 */
export async function resolveClientIdFromSession(session: {
  client_id?: string | null;
  client_email?: string;
}): Promise<string | null> {
  // If client_id exists and is valid UUID, use it
  if (session.client_id && isValidUUID(session.client_id)) {
    return session.client_id;
  }

  // Otherwise, try to resolve from email
  if (session.client_email) {
    return await resolveClientId(session.client_email);
  }

  return null;
}

/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Clears the client ID cache (useful for testing or when user data changes)
 */
export function clearClientIdCache(): void {
  clientIdCache.clear();
}

