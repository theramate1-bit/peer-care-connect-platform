import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute, shouldRedirectToOnboarding } from '@/lib/dashboard-routing';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthRouterProps {
  children: React.ReactNode;
}

/**
 * Unified authentication and routing logic
 * Handles all auth flows, redirects, and special cases in one place
 */
const AuthRouter = ({ children }: AuthRouterProps) => {
  const { user, userProfile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectCount, setRedirectCount] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Loading timeout protection - increased to 15 seconds since we removed artificial delays
  useEffect(() => {
    if (loading || profileLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
        console.error('⏱️ Loading timeout - auth took too long (15s)');
      }, 15000); // 15 second timeout (was 10s, but we removed timeout fallbacks so queries take real time)
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, profileLoading]);

  useEffect(() => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    // Prevent infinite redirects
    if (redirectCount > 5) {
      console.error('🚫 Too many redirects detected, stopping to prevent infinite loop');
      return;
    }

    // ========================================
    // STEP 1: Handle Special URLs (highest priority)
    // ========================================
    
    // OAuth callback redirected to homepage - redirect to proper callback
    if (searchParams.has('code') && currentPath === '/' && !searchParams.has('type')) {
      setRedirectCount(prev => prev + 1);
      navigate(`/auth/callback${window.location.search}`, { replace: true });
      return;
    }

    // Password reset URLs with token hash - be more specific
    if (searchParams.has('code') && currentPath === '/' && searchParams.has('type') && searchParams.get('type') === 'recovery') {
      setRedirectCount(prev => prev + 1);
      navigate('/auth/reset-password-confirm', { 
        state: { 
          token_hash: searchParams.get('code'),
          type: 'recovery'
        },
        replace: true 
      });
      return;
    }

    // Email verification URLs (handled by UrlFragmentHandler, but just in case)
    if (location.hash && (location.hash.includes('access_token') || location.hash.includes('error'))) {
      // Let UrlFragmentHandler handle this
      return;
    }

    // ========================================
    // STEP 2: Define route categories FIRST (before auth checks)
    // ========================================
    const publicRoutes = [
      '/', '/marketplace', '/explore', '/how-it-works', '/pricing', '/about',
      '/contact', '/help', '/terms', '/privacy', '/cookies', '/booking-success',
      '/mobile-booking/success', '/guest/mobile-requests'
    ];

    const authRoutes = [
      '/login', '/register', '/reset-password', 
      '/auth/verify-email', '/auth/reset-password-confirm', 
      '/auth/registration-success', '/auth/role-selection', '/onboarding'
    ];

    // Check if route is a public therapist profile FIRST
    // Match pattern: /therapist/:therapistId/public (with or without trailing slash)
    const isPublicTherapistProfile = /^\/therapist\/[^/]+\/public\/?$/.test(currentPath);
    const isPublicTherapistProfileAlt = currentPath.startsWith('/therapist/') && currentPath.includes('/public');
    const isPublicProfile = isPublicTherapistProfile || isPublicTherapistProfileAlt;
    
    // Check if route is a direct booking link
    // Match pattern: /book/:slug (with or without trailing slash)
    const isDirectBookingLink = /^\/book\/[^/]+\/?$/.test(currentPath);
    const isGuestBookingViewRoute = /^\/booking\/view\/[^/]+\/?$/.test(currentPath);
    
    // If this is a public profile route or direct booking link, allow it immediately (before any auth checks)
    if (isPublicProfile || isDirectBookingLink || isGuestBookingViewRoute) {
      console.log('✅ AuthRouter - Allowing public route:', currentPath);
      setRedirectCount(0);
      return;
    }

    // ========================================
    // STEP 3: Wait for auth to load (only for non-public routes)
    // On profile/setup routes we allow rendering without blocking (handled below)
    // ========================================
    const isProfileOrSetupPath = ['/onboarding', '/auth/role-selection', '/profile'].some(
      (route) => currentPath === route || currentPath.startsWith(route + '/')
    );
    if ((loading || profileLoading) && !loadingTimeout && !isProfileOrSetupPath) {
      return; // Show loading spinner below
    }

    const protectedRoutes = {
      onboarding: ['/onboarding'],
      client: ['/client/dashboard', '/client/booking', '/client/profile', '/client/sessions', '/client/progress', '/client/goals', '/client/exercises', '/client/messages', '/client/notes', '/client/favorites'],
      practitioner: ['/dashboard', '/practice', '/cpd', '/analytics', '/booking', '/credits'],
      admin: ['/admin/verification'],
      universal: ['/profile', '/client/profile', '/auth/callback', '/auth/oauth-completion', '/auth/role-selection', '/messages']
    };
    
    // Debug logging
    if (currentPath.includes('/therapist/')) {
      console.log('🔍 AuthRouter - Checking therapist route:', currentPath);
      console.log('🔍 isPublicProfile:', isPublicProfile);
      console.log('🔍 user:', user ? 'exists' : 'null');
      console.log('🔍 userProfile:', userProfile ? 'exists' : 'null');
    }

    // ========================================
    // STEP 4: Handle unauthenticated users
    // ========================================
    // Check if user is null/undefined (not authenticated)
    if (!user) {
      // Allow public and auth routes, including direct booking links
      if (publicRoutes.includes(currentPath) || 
          isDirectBookingLink ||
          isGuestBookingViewRoute ||
          authRoutes.some(route => currentPath.startsWith(route.split('/').slice(0, -1).join('/') || route))) {
        console.log('✅ AuthRouter - Allowing public route (unauthenticated):', currentPath);
        setRedirectCount(0); // Reset counter on successful access
        return;
      }

      console.log('🚫 AuthRouter - Blocking route, redirecting to login:', currentPath);
      console.log('🚫 publicRoutes.includes:', publicRoutes.includes(currentPath));
      console.log('🚫 isDirectBookingLink:', isDirectBookingLink);
      // Redirect protected routes to login
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }
    
    // If user exists but profile is still loading, wait
    if (user && !userProfile && (loading || profileLoading)) {
      return; // Stay on current page while profile loads
    }

    // ========================================
    // STEP 5: Handle authenticated users
    // ========================================
    
    // CRITICAL: Redirect authenticated users away from login/register pages
    if (user && (currentPath === '/login' || currentPath === '/register')) {
      // Wait for profile to load before redirecting
      if (!userProfile) {
        return; // Wait for profile to load
      }
      
      // Check if user needs role selection
      if (!userProfile.user_role) {
        console.log('🔄 Authenticated user on login page - redirecting to role-selection');
        navigate('/auth/role-selection', { replace: true });
        return;
      }
      
      // Check if user needs onboarding
      const needsOnboarding = shouldRedirectToOnboarding(userProfile);
      if (needsOnboarding) {
        console.log('🔄 Authenticated user on login page - redirecting to onboarding');
        navigate('/onboarding', { replace: true });
        return;
      }
      
      // User is fully set up, redirect to appropriate dashboard
      console.log('🔄 Authenticated user on login page - redirecting to dashboard');
      const dashboardRoute = getDashboardRoute({ userProfile });
      navigate(dashboardRoute, { replace: true });
      return;
    }
    
    // If userProfile hasn't loaded yet, don't make routing decisions
    if (!userProfile) {
      return; // Wait for profile to load
    }

    // Check if user needs role selection (user_role is null)
    if (!userProfile.user_role) {
      if (currentPath !== '/auth/role-selection') {
        console.log('🔄 User has no role - redirecting to role-selection');
        navigate('/auth/role-selection', { replace: true });
        return;
      }
      // User is on role selection page and needs to be there
      console.log('ℹ️ User on role-selection page with no role - allowing to stay');
      return;
    }

    // CRITICAL: If user is on role-selection page, allow them to stay regardless of other status
    // This prevents redirects away from role-selection when userProfile loads with partial data
    if (currentPath === '/auth/role-selection') {
      console.log('ℹ️ User on role-selection page - preventing redirects away');
      console.log('📋 User role:', userProfile.user_role);
      console.log('📋 Onboarding status:', userProfile.onboarding_status);
      return; // Stay on role-selection page
    }

    // Check if user needs onboarding
    const needsOnboarding = shouldRedirectToOnboarding(userProfile);
    
    if (needsOnboarding) {
      if (currentPath !== '/onboarding') {
        console.log('🔄 User needs onboarding - redirecting to onboarding');
        navigate('/onboarding', { replace: true });
        return;
      }
      // User is on onboarding page and needs to be there
      return;
    }

    // Check subscription requirements for practitioner routes
    const practitionerRoutes = ['/dashboard', '/practice', '/cpd', '/analytics', '/booking'];
    const isPractitionerRoute = practitionerRoutes.some(route => currentPath.startsWith(route));
    const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
    
    if (isPractitionerRoute && isPractitioner) {
      // Check if user has subscription (this will be handled by SimpleProtectedRoute)
      // For now, just allow the route and let SimpleProtectedRoute handle subscription check
      return;
    }

    // User has completed onboarding - check route access
    
    // Allow universal protected routes
    if (protectedRoutes.universal.some(route => currentPath.startsWith(route))) {
      return;
    }

    // Check role-specific routes
    const userRole = userProfile.user_role;
    
    if (userRole === 'client') {
      if (protectedRoutes.client.some(route => currentPath.startsWith(route))) {
        setRedirectCount(0); // Reset counter on successful access
        return;
      }
      
      // Client accessing non-client route - redirect to client dashboard
      if (!publicRoutes.includes(currentPath) && !authRoutes.some(route => currentPath.startsWith(route)) && !isPublicProfile && !isGuestBookingViewRoute) {
        setRedirectCount(prev => prev + 1);
        navigate('/client/dashboard', { replace: true });
        return;
      }
    } 
    
    else if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userRole)) {
      if (protectedRoutes.practitioner.some(route => currentPath.startsWith(route))) {
        setRedirectCount(0); // Reset counter on successful access
        return;
      }
      
      // Practitioner accessing non-practitioner route - redirect to practitioner dashboard
      if (!publicRoutes.includes(currentPath) && !authRoutes.some(route => currentPath.startsWith(route)) && !isPublicProfile && !isGuestBookingViewRoute) {
        setRedirectCount(prev => prev + 1);
        navigate('/dashboard', { replace: true });
        return;
      }
    } 
    
    else if (userRole === 'admin') {
      if (protectedRoutes.admin.some(route => currentPath.startsWith(route))) {
        setRedirectCount(0); // Reset counter on successful access
        return;
      }
      
      // Admin accessing non-admin route - redirect to admin dashboard
      if (!publicRoutes.includes(currentPath) && !authRoutes.some(route => currentPath.startsWith(route)) && !isPublicProfile && !isGuestBookingViewRoute) {
        setRedirectCount(prev => prev + 1);
        navigate('/admin/verification', { replace: true });
        return;
      }
    }

    // Fallback: if user is on a public/auth route, allow it
    if (publicRoutes.includes(currentPath) || authRoutes.some(route => currentPath.startsWith(route)) || isPublicProfile || isGuestBookingViewRoute) {
      setRedirectCount(0); // Reset counter on successful access
      return;
    }

    // Final fallback: redirect to appropriate dashboard
    setRedirectCount(prev => prev + 1);
    const dashboardRoute = getDashboardRoute({ userProfile });
    navigate(dashboardRoute, { replace: true });

  }, [user, userProfile, loading, profileLoading, location.pathname, location.search, location.hash]);

  // Show loading spinner while auth is loading (except for special URLs and profile/setup routes)
  // Official practice: do not block profile setup or onboarding with full-page auth spinner;
  // let those pages render and show their own loading state to avoid "glitchy" constant refresh.
  const searchParams = new URLSearchParams(location.search);
  const isSpecialUrl = searchParams.has('code') && location.pathname === '/';
  const isProfileOrSetupRoute = ['/onboarding', '/auth/role-selection', '/profile'].some(
    (route) => location.pathname === route || location.pathname.startsWith(route + '/')
  );

  if ((loading || profileLoading) && !isSpecialUrl && !loadingTimeout && !isProfileOrSetupRoute) {
    // Allow direct access to login page even when stuck on authentication
    if (location.pathname === '/login') {
      console.log('🚪 Bypassing auth loading for login page');
      return <>{children}</>;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground mb-4">Authenticating...</p>
        </div>
      </div>
    );
  }
  
  // Show error state if loading timed out
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="mb-4 text-4xl">⏱️</div>
          <h2 className="text-2xl font-bold mb-2">Loading Timeout</h2>
          <p className="text-muted-foreground mb-6">
            Authentication is taking longer than expected. This might be due to a slow connection or a temporary issue.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try one of these options:</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRouter;
