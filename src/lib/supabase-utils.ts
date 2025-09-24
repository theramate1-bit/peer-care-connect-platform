/**
 * Safe Supabase Query Utilities
 * Provides error handling and retry mechanisms for Supabase queries
 */

import { supabase } from '@/integrations/supabase/client';

export interface SafeQueryOptions {
  retries?: number;
  retryDelay?: number;
  fallbackValue?: any;
  logErrors?: boolean;
}

/**
 * Safely execute a Supabase query with error handling and retries
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: SafeQueryOptions = {}
): Promise<{ data: T | null; error: any }> {
  const {
    retries = 2,
    retryDelay = 1000,
    fallbackValue = null,
    logErrors = true
  } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await queryFn();
      
      if (result.error) {
        lastError = result.error;
        
        // Don't retry on certain error types
        if (result.error.code === 'PGRST116' || // No rows found
            result.error.code === '42501' ||    // Insufficient privilege
            result.error.code === 'PGRST301') { // Row Level Security violation
          if (logErrors) {
            console.warn(`Supabase query failed (non-retryable):`, result.error.message);
          }
          return { data: fallbackValue, error: null };
        }
        
        // Retry on other errors
        if (attempt < retries) {
          if (logErrors) {
            console.warn(`Supabase query failed (attempt ${attempt + 1}/${retries + 1}):`, result.error.message);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
      }
      
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        if (logErrors) {
          console.warn(`Supabase query exception (attempt ${attempt + 1}/${retries + 1}):`, error);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
    }
  }

  if (logErrors) {
    console.error('Supabase query failed after all retries:', lastError);
  }
  
  return { data: fallbackValue, error: null };
}

/**
 * Safely get user profile with fallback
 */
export async function safeGetUserProfile(userId: string) {
  return safeQuery(
    () => supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),
    {
      fallbackValue: null,
      logErrors: true
    }
  );
}

/**
 * Safely get subscription status with fallback
 */
export async function safeGetSubscription(userId: string) {
  return safeQuery(
    () => supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    {
      fallbackValue: null,
      logErrors: true
    }
  );
}

/**
 * Check if error is a non-critical Supabase error
 */
export function isNonCriticalError(error: any): boolean {
  if (!error) return false;
  
  const nonCriticalCodes = [
    'PGRST116', // No rows found
    '42501',    // Insufficient privilege
    'PGRST301', // Row Level Security violation
    'PGRST301'  // Not Acceptable (406)
  ];
  
  return nonCriticalCodes.includes(error.code);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  switch (error.code) {
    case 'PGRST116':
      return 'No data found';
    case '42501':
      return 'Access denied';
    case 'PGRST301':
      return 'Access restricted';
    default:
      return error.message || 'An error occurred';
  }
}
