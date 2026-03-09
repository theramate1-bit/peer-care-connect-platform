/**
 * Centralized Dashboard Routing Logic
 * 
 * This utility ensures consistent dashboard redirects based on user roles
 * and onboarding status across the entire application.
 */

import { UserRole } from '@/types/roles';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: UserRole;
  onboarding_status: 'pending' | 'in_progress' | 'completed';
  phone?: string;
  profile_completed: boolean;
  stripe_connect_account_id?: string | null;
}

export interface DashboardRouteOptions {
  userProfile: UserProfile | null;
  intendedRole?: string;
  from?: string;
  defaultRoute?: string;
}

/**
 * Determines the correct dashboard route based on user role and profile status
 */
export function getDashboardRoute(options: DashboardRouteOptions): string {
  const { userProfile, intendedRole, from, defaultRoute } = options;

  // If no user profile, redirect to login
  if (!userProfile) {
    return '/login';
  }

  // SECURITY: Do not use localStorage as role fallback - it's a security risk
  // Roles must come from the database (userProfile.user_role) only
  const effectiveRole = userProfile.user_role;

  // If onboarding is not completed, redirect to onboarding
  if (userProfile.onboarding_status !== 'completed') {
    return '/onboarding';
  }

  // If user has no role, redirect to onboarding
  if (!effectiveRole) {
    return '/onboarding';
  }

  // Determine dashboard based on user role
  switch (effectiveRole) {
    case 'client':
      return '/client/dashboard';
    
    case 'sports_therapist':
    case 'massage_therapist':
    case 'osteopath':
      return '/dashboard';
    
    case 'admin':
      return '/admin/dashboard';
    
    default:
      // Fallback to intended role or default
      if (intendedRole === 'client') {
        return '/client/dashboard';
      } else if (intendedRole === 'professional') {
        return '/dashboard';
      }
      
      // Default to client dashboard for unknown roles to be safe
      return defaultRoute || '/client/dashboard';
  }
}

/**
 * Determines if a user should be redirected to onboarding
 */
export function shouldRedirectToOnboarding(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false;
  
  // Practitioners must complete onboarding and profile before accessing app
  const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
  if (isPractitioner) {
    // Require completed onboarding and completed profile
    // Note: Stripe Connect is NOT required for dashboard access - it's only required for receiving payments
    if (userProfile.onboarding_status !== 'completed' || !userProfile.profile_completed) {
      return true;
    }
    // Practitioners fully completed onboarding
    return false;
  }
  
  // For non-practitioners, retain existing relaxed checks
  if (userProfile.onboarding_status === 'completed') {
    return false;
  }
  if (userProfile.profile_completed) {
    return false;
  }
  
  // Always redirect to onboarding if status is pending or in_progress
  if (userProfile.onboarding_status === 'pending' || userProfile.onboarding_status === 'in_progress') {
    return true;
  }
  
  // Check if user has essential profile data
  const hasEssentialData = userProfile.first_name && 
                          userProfile.last_name && 
                          userProfile.first_name !== 'User' && 
                          userProfile.last_name !== 'User';
  
  // If user doesn't have essential data, they need onboarding
  if (!hasEssentialData) {
    return true;
  }
  
  // If user has essential data but profile is not completed, they need onboarding
  if (!userProfile.profile_completed) {
    return true;
  }
  
  // Otherwise, don't redirect to onboarding
  return false;
}

/**
 * Gets the appropriate onboarding route based on user role
 */
export function getOnboardingRoute(userProfile: UserProfile | null): string {
  if (!userProfile) return '/onboarding';
  
  // SECURITY: Do not use localStorage as role fallback - it's a security risk
  // Roles must come from the database (userProfile.user_role) only
  const effectiveRole = userProfile.user_role;
  
  switch (effectiveRole) {
    case 'client':
      return '/onboarding?type=client';
    case 'sports_therapist':
    case 'massage_therapist':
    case 'osteopath':
      return '/onboarding?type=practitioner';
    default:
      return '/onboarding';
  }
}

/**
 * Validates if a user has access to a specific route
 */
export function canAccessRoute(userProfile: UserProfile | null, route: string): boolean {
  if (!userProfile) return false;
  
  // SECURITY: Do not use localStorage as role fallback - it's a security risk
  // Roles must come from the database (userProfile.user_role) only
  const effectiveRole = userProfile.user_role;
  
  // If user has no role, they can only access public and auth routes
  if (!effectiveRole) {
    const publicRoutes = ['/', '/marketplace', '/how-it-works', '/pricing', '/about', '/contact', '/terms', '/privacy', '/cookies'];
    if (publicRoutes.includes(route)) return true;
    if (route.startsWith('/auth/') || route === '/login' || route === '/register' || route === '/reset-password') {
      return true;
    }
    if (route === '/onboarding') {
      return true;
    }
    return false;
  }
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/marketplace', '/how-it-works', '/pricing', '/about', '/contact', '/terms', '/privacy', '/cookies'];
  if (publicRoutes.includes(route)) return true;
  
  // Auth routes
  if (route.startsWith('/auth/') || route === '/login' || route === '/register' || route === '/reset-password') {
    return true;
  }
  
  // Client routes
  if (route.startsWith('/client/')) {
    return effectiveRole === 'client';
  }
  
  // Practitioner routes
  if (route === '/dashboard' || route.startsWith('/practice/') || route.startsWith('/cpd/')) {
    return ['sports_therapist', 'massage_therapist', 'osteopath'].includes(effectiveRole);
  }
  
  // Admin routes
  if (route.startsWith('/admin/')) {
    return effectiveRole === 'admin';
  }
  
  // Onboarding route - accessible to all authenticated users
  if (route === '/onboarding') {
    return true;
  }
  
  return false;
}
