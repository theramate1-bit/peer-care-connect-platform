/**
 * Supabase Debug Utilities
 * Helps diagnose and fix Supabase connection and query issues
 */

import { supabase } from '@/integrations/supabase/client';

export interface DebugInfo {
  isConnected: boolean;
  user: any;
  session: any;
  tables: string[];
  errors: string[];
}

/**
 * Debug Supabase connection and user state
 */
export async function debugSupabaseConnection(): Promise<DebugInfo> {
  const debugInfo: DebugInfo = {
    isConnected: false,
    user: null,
    session: null,
    tables: [],
    errors: []
  };

  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      debugInfo.errors.push('Supabase client not initialized');
      return debugInfo;
    }

    // Check connection
    const { data, error } = await supabase.from('_supabase_migrations').select('*').limit(1);
    if (error) {
      debugInfo.errors.push(`Connection test failed: ${error.message}`);
    } else {
      debugInfo.isConnected = true;
    }

    // Check user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      debugInfo.errors.push(`User check failed: ${userError.message}`);
    } else {
      debugInfo.user = user;
    }

    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      debugInfo.errors.push(`Session check failed: ${sessionError.message}`);
    } else {
      debugInfo.session = session;
    }

    // Test table access
    const tablesToTest = ['users', 'subscribers', 'user_profiles'];
    for (const table of tablesToTest) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          debugInfo.errors.push(`Table ${table} access failed: ${error.message}`);
        } else {
          debugInfo.tables.push(table);
        }
      } catch (err) {
        debugInfo.errors.push(`Table ${table} test failed: ${err}`);
      }
    }

  } catch (error) {
    debugInfo.errors.push(`Debug failed: ${error}`);
  }

  return debugInfo;
}

/**
 * Log debug information to console
 */
export function logDebugInfo(debugInfo: DebugInfo) {
  console.group('🔍 Supabase Debug Information');
  
  console.log('✅ Connected:', debugInfo.isConnected);
  console.log('👤 User:', debugInfo.user ? 'Authenticated' : 'Not authenticated');
  console.log('🔐 Session:', debugInfo.session ? 'Active' : 'No session');
  console.log('📊 Accessible Tables:', debugInfo.tables);
  
  if (debugInfo.errors.length > 0) {
    console.group('❌ Errors:');
    debugInfo.errors.forEach(error => console.error(error));
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * Test specific user queries
 */
export async function testUserQueries(userId: string) {
  console.group('🧪 Testing User Queries');
  
  // Test users table
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Users table query failed:', error);
    } else {
      console.log('✅ Users table query successful:', data);
    }
  } catch (err) {
    console.error('❌ Users table query exception:', err);
  }

  // Test subscribers table
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Subscribers table query failed:', error);
    } else {
      console.log('✅ Subscribers table query successful:', data);
    }
  } catch (err) {
    console.error('❌ Subscribers table query exception:', err);
  }

  // Test user_profiles table
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ User_profiles table query failed:', error);
    } else {
      console.log('✅ User_profiles table query successful:', data);
    }
  } catch (err) {
    console.error('❌ User_profiles table query exception:', err);
  }
  
  console.groupEnd();
}

/**
 * Initialize debug mode
 */
export function initDebugMode() {
  if (import.meta.env.DEV) {
    console.log('🔧 Supabase Debug Mode Enabled');
    
    // Add debug info to window for easy access
    (window as any).debugSupabase = {
      debugConnection: debugSupabaseConnection,
      logDebugInfo,
      testUserQueries
    };
  }
}
