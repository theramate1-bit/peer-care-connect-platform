/**
 * Manual logout utility for development/testing
 * Call this from browser console to force clear all auth data
 */

import { supabase } from '@/integrations/supabase/client';

export const manualLogout = async () => {
  try {
    // Sign out from Supabase with all scopes
    await supabase.auth.signOut();
    await supabase.auth.signOut({ scope: 'local' });
    await supabase.auth.signOut({ scope: 'global' });
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Clear any cached data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Force reload
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error during manual logout:', error);
    // Force reload anyway
    window.location.reload();
  }
};

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).manualLogout = manualLogout;
}
