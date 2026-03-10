import { supabase } from '@/integrations/supabase/client';

/**
 * Shared authentication error handler for consistent error handling across contexts
 */
export class AuthErrorHandler {
  private static isLoggingOut = false;

  /**
   * Performs a silent logout by clearing all auth state and redirecting to login
   * @param showSessionExpiredMessage If true, redirects with ?error=session_expired so Login page shows "Your session has expired"
   */
  static async performSilentLogout(showSessionExpiredMessage = false): Promise<void> {
    // Prevent multiple simultaneous logouts
    if (this.isLoggingOut) {
      return;
    }
    
    this.isLoggingOut = true;
    
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all Supabase auth data
      await supabase.auth.signOut({ scope: 'local' });
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any cached auth data
      if (typeof window !== 'undefined') {
        // Clear all cookies
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
      
      // Redirect to login page; add error param when session expired elsewhere (PRACTITIONER_DASHBOARD #2)
      window.location.href = showSessionExpiredMessage ? '/login?error=session_expired' : '/login';
      
    } catch (error) {
      // Force redirect even if signOut fails
      window.location.href = showSessionExpiredMessage ? '/login?error=session_expired' : '/login';
    }
    // Don't reset flag - we want to prevent any further logouts until page reload
  }

  /**
   * Handles authentication errors by attempting session refresh first
   * @param error The authentication error
   * @returns Promise<boolean> - true if retry is allowed, false if logout was performed
   */
  static async handleAuthError(error: any): Promise<boolean> {
    // For PGRST116 (user not found), skip refresh and logout immediately
    if (error.code === 'PGRST116') {
      await this.performSilentLogout(true);
      return false;
    }
    
    // For other auth errors, try session refresh
    try {
      // Try to refresh the session first
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && data.session) {
        return true; // Retry allowed
      }
      
      // Session refresh failed, perform silent logout with user-facing message
      await this.performSilentLogout(true);
      return false; // No retry
    } catch (refreshError) {
      await this.performSilentLogout(true);
      return false; // No retry
    }
  }

  /**
   * Checks if an error is an authentication error
   * @param error The error to check
   * @returns boolean - true if it's an auth error
   */
  static isAuthenticationError(error: any): boolean {
    // Check for Supabase RLS policy violation
    if (error.code === 'PGRST301') return true;
    
    // Check for HTTP status codes in various properties
    if (error.status === 406 || error.status === 401 || error.status === 403) return true;
    if (error.statusCode === 406 || error.statusCode === 401 || error.statusCode === 403) return true;
    
    // Check for specific Supabase error codes that indicate auth issues
    if (error.code === 'PGRST116') {
      return true; // PGRST116 always indicates auth/data issues
    }
    
    // Check in message as fallback
    const message = error.message?.toLowerCase() || '';
    if (message.includes('406') || message.includes('401') || message.includes('403')) return true;
    if (message.includes('unauthorized') || message.includes('forbidden')) return true;
    if (message.includes('cannot coerce') || message.includes('result contains 0 rows')) return true;
    
    return false;
  }

  /**
   * Logs detailed error information for debugging
   * @param error The error to log
   * @param context Additional context about where the error occurred
   */
  static logErrorDetails(error: any, context: string): void {
    // Only log critical errors in development
    if (process.env.NODE_ENV === 'development' && error.status !== 401 && error.status !== 403) {
      console.error(`❌ ${context} error:`, error.message || error);
    }
  }
}
