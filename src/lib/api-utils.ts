/**
 * Centralized API Utilities
 * 
 * This utility provides consistent data fetching patterns,
 * error handling, and loading states across the application.
 */

import { supabase } from '@/integrations/supabase/client';
import { handleApiError, createLoadingState } from './error-handling';

export interface ApiResponse<T> {
  data: T | null;
  error: any;
  loading: boolean;
}

export interface ApiOptions {
  retries?: number;
  timeout?: number;
  showLoading?: boolean;
  showErrors?: boolean;
}

/**
 * Standardized Supabase query wrapper
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { retries = 0, timeout = 10000, showErrors = true } = options;
  
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);
      
      if (result.error) {
        lastError = result.error;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
      
      return {
        data: result.data,
        error: result.error,
        loading: false
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  
  if (showErrors && lastError) {
    handleApiError(lastError, 'API request');
  }
  
  return {
    data: null,
    error: lastError,
    loading: false
  };
}

/**
 * Standardized single record fetch
 */
export async function fetchSingle<T>(
  table: string,
  filters: Record<string, any>,
  select = '*',
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return executeQuery(async () => {
    const query = supabase
      .from(table)
      .select(select)
      .single();
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query.eq(key, value);
    });
    
    return await query;
  }, options);
}

/**
 * Standardized single record fetch (nullable)
 */
export async function fetchSingleOrNull<T>(
  table: string,
  filters: Record<string, any>,
  select = '*',
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return executeQuery(async () => {
    const query = supabase
      .from(table)
      .select(select)
      .maybeSingle();
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query.eq(key, value);
    });
    
    const result = await query;
    
    // Handle PGRST116 (no rows returned) as success with null
    if (result.error && result.error.code === 'PGRST116') {
      return { data: null, error: null };
    }
    
    return result;
  }, options);
}

/**
 * Standardized multiple records fetch
 */
export async function fetchMultiple<T>(
  table: string,
  filters: Record<string, any> = {},
  select = '*',
  orderBy?: { column: string; ascending?: boolean },
  limit?: number,
  options: ApiOptions = {}
): Promise<ApiResponse<T[]>> {
  return executeQuery(async () => {
    let query = supabase
      .from(table)
      .select(select);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value !== null) {
        // Handle range queries like { gte: '2023-01-01', lte: '2023-12-31' }
        Object.entries(value).forEach(([op, val]) => {
          query = query[op](key, val);
        });
      } else {
        query = query.eq(key, value);
      }
    });
    
    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    const result = await query;
    return {
      data: result.data || [],
      error: result.error
    };
  }, options);
}

/**
 * Standardized insert operation
 */
export async function insertRecord<T>(
  table: string,
  data: Partial<T>,
  select = '*',
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return executeQuery(async () => {
    const result = await supabase
      .from(table)
      .insert(data)
      .select(select)
      .single();
    
    return result;
  }, options);
}

/**
 * Standardized upsert operation
 */
export async function upsertRecord<T>(
  table: string,
  data: Partial<T>,
  select = '*',
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return executeQuery(async () => {
    const result = await supabase
      .from(table)
      .upsert(data)
      .select(select)
      .single();
    
    return result;
  }, options);
}

/**
 * Standardized update operation
 */
export async function updateRecord<T>(
  table: string,
  filters: Record<string, any>,
  data: Partial<T>,
  select = '*',
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return executeQuery(async () => {
    let query = supabase
      .from(table)
      .update(data)
      .select(select);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const result = await query.single();
    return result;
  }, options);
}

/**
 * Standardized delete operation
 */
export async function deleteRecord(
  table: string,
  filters: Record<string, any>,
  options: ApiOptions = {}
): Promise<ApiResponse<null>> {
  return executeQuery(async () => {
    let query = supabase
      .from(table)
      .delete();
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const result = await query;
    return {
      data: null,
      error: result.error
    };
  }, options);
}

/**
 * Standardized count operation
 */
export async function countRecords(
  table: string,
  filters: Record<string, any> = {},
  options: ApiOptions = {}
): Promise<ApiResponse<number>> {
  return executeQuery(async () => {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([op, val]) => {
          query = query[op](key, val);
        });
      } else {
        query = query.eq(key, value);
      }
    });
    
    const result = await query;
    return {
      data: result.count || 0,
      error: result.error
    };
  }, options);
}

/**
 * Standardized RPC call
 */
export async function callRPC<T>(
  functionName: string,
  params: Record<string, any> = {},
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return executeQuery(async () => {
    const result = await supabase.rpc(functionName, params);
    return {
      data: result.data,
      error: result.error
    };
  }, options);
}

/**
 * Batch operations utility
 */
export async function executeBatch<T>(
  operations: Array<() => Promise<{ data: T | null; error: any }>>,
  options: ApiOptions = {}
): Promise<ApiResponse<T[]>> {
  return executeQuery(async () => {
    const results = await Promise.all(operations.map(op => op()));
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      return {
        data: null,
        error: errors[0].error
      };
    }
    
    return {
      data: results.map(r => r.data).filter(Boolean) as T[],
      error: null
    };
  }, options);
}

/**
 * Real-time subscription utility
 */
export function createSubscription<T>(
  table: string,
  filters: Record<string, any> = {},
  callback: (payload: any) => void,
  options: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*' } = {}
) {
  let query = supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', {
      event: options.event || '*',
      schema: 'public',
      table: table,
      filter: Object.keys(filters).length > 0 ? 
        Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join(',') : 
        undefined
    }, callback);
  
  return query.subscribe();
}

/**
 * Utility to create consistent loading states
 */
export function createApiLoadingState(message?: string) {
  return createLoadingState(message || 'Loading...');
}

/**
 * Utility to handle API errors consistently
 */
export function handleApiResponse<T>(
  response: ApiResponse<T>,
  context?: string
): T | null {
  if (response.error) {
    handleApiError(response.error, context);
    return null;
  }
  
  return response.data;
}
