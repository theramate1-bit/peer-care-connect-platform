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
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    // ========================================
    // STEP 1: Handle Special URLs (highest priority)
    // ========================================
    
    // OAuth callback redirected to homepage - redirect to proper callback
    if (searchParams.has('code') && currentPath === '/' && !searchParams.has('type')) {
      console.log('🔄 OAuth callback detected on homepage, redirecting to auth callback...');
      navigate(`/auth/callback${window.location.search}`, { replace: true });
      return;
    }

    // Password reset URLs with token hash - be more specific
    if (searchParams.has('code') && currentPath === '/' && searchParams.has('type') && searchParams.get('type') === 'recovery') {
      console.log('🔄 Password reset detected, redirecting...');
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
      console.log('🔄 Email verification tokens detected in URL hash');
      // Let UrlFragmentHandler handle this
      return;
    }

    // ========================================
    // STEP 2: Wait for auth to load
    // ========================================
    if (loading) {
      return; // Show loading spinner below
    }

    // ========================================
    // STEP 3: Define route categories
    // ========================================
    const publicRoutes = [
      '/', '/marketplace', '/how-it-works', '/pricing', '/about', 
      '/contact', '/help', '/terms', '/privacy'
    ];

    const authRoutes = [
      '/login', '/register', '/reset-password', 
      '/auth/verify-email', '/auth/reset-password-confirm', 
      '/auth/registration-success', '/auth/role-selection', '/onboarding'
    ];

    const protectedRoutes = {
      onboarding: ['/onboarding'],
      client: ['/client/dashboard', '/client/booking', '/client/profile', '/client/sessions'],
      practitioner: ['/dashboard', '/practice', '/cpd', '/analytics', '/payments', '/booking', '/credits'],
      admin: ['/admin/verification'],
      universal: ['/profile', '/auth/callback', '/auth/oauth-completion', '/auth/role-selection']
    };

    // ========================================
    // STEP 4: Handle unauthenticated users
    // ========================================
    if (!user || !userProfile) {
      // Allow public and auth routes
      if (publicRoutes.includes(currentPath) || 
          authRoutes.some(route => currentPath.startsWith(route.split('/').slice(0, -1).join('/') || route))) {
        console.log('✅ Public/auth route access granted:', currentPath);
        return;
      }

      // Redirect protected routes to login
      console.log('🚫 Unauthenticated access to protected route, redirecting to login');
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    // ========================================
    // STEP 5: Handle authenticated users
    // ========================================
    console.log('👤 Authenticated user:', {
      role: userProfile.user_role,
      onboarding: userProfile.onboarding_status,
      currentPath
    });

    // Check if user needs role selection (user_role is null)
    if (!userProfile.user_role) {
      if (currentPath !== '/auth/role-selection') {
        console.log('🔄 User needs role selection, redirecting...');
        navigate('/auth/role-selection', { replace: true });
        return;
      }
      // User is on role selection page and needs to be there
      console.log('✅ User on role selection page (required)');
      return;
    }

    // Check if user needs onboarding
    if (shouldRedirectToOnboarding(userProfile)) {
      if (currentPath !== '/onboarding') {
        console.log('🔄 User needs onboarding, redirecting...');
        navigate('/onboarding', { replace: true });
        return;
      }
      // User is on onboarding page and needs to be there
      console.log('✅ User on onboarding page (required)');
      return;
    }

    // Check subscription requirements for practitioner routes
    const practitionerRoutes = ['/dashboard', '/practice', '/cpd', '/analytics', '/payments', '/booking'];
    const isPractitionerRoute = practitionerRoutes.some(route => currentPath.startsWith(route));
    const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
    
    if (isPractitionerRoute && isPractitioner) {
      // Check if user has subscription (this will be handled by SimpleProtectedRoute)
      // For now, just allow the route and let SimpleProtectedRoute handle subscription check
      console.log('✅ Practitioner route access granted (subscription check handled by SimpleProtectedRoute)');
      return;
    }

    // User has completed onboarding - check route access
    
    // Allow universal protected routes
    if (protectedRoutes.universal.some(route => currentPath.startsWith(route))) {
      console.log('✅ Universal protected route access granted:', currentPath);
      return;
    }

    // Check role-specific routes
    const userRole = userProfile.user_role;
    
    if (userRole === 'client') {
      if (protectedRoutes.client.some(route => currentPath.startsWith(route))) {
        console.log('✅ Client route access granted:', currentPath);
        return;
      }
      
      // Client accessing non-client route - redirect to client dashboard
      if (!publicRoutes.includes(currentPath) && !authRoutes.some(route => currentPath.startsWith(route))) {
        console.log('🔄 Client on wrong route, redirecting to client dashboard');
        navigate('/client/dashboard', { replace: true });
        return;
      }
    } 
    
    else if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userRole)) {
      if (protectedRoutes.practitioner.some(route => currentPath.startsWith(route))) {
        console.log('✅ Practitioner route access granted:', currentPath);
        return;
      }
      
      // Practitioner accessing non-practitioner route - redirect to practitioner dashboard
      if (!publicRoutes.includes(currentPath) && !authRoutes.some(route => currentPath.startsWith(route))) {
        console.log('🔄 Practitioner on wrong route, redirecting to practitioner dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }
    } 
    
    else if (userRole === 'admin') {
      if (protectedRoutes.admin.some(route => currentPath.startsWith(route))) {
        console.log('✅ Admin route access granted:', currentPath);
        return;
      }
      
      // Admin accessing non-admin route - redirect to admin dashboard
      if (!publicRoutes.includes(currentPath) && !authRoutes.some(route => currentPath.startsWith(route))) {
        console.log('🔄 Admin on wrong route, redirecting to admin dashboard');
        navigate('/admin/verification', { replace: true });
        return;
      }
    }

    // Fallback: if user is on a public/auth route, allow it
    if (publicRoutes.includes(currentPath) || authRoutes.some(route => currentPath.startsWith(route))) {
      console.log('✅ Fallback - public/auth route access granted:', currentPath);
      return;
    }

    // Final fallback: redirect to appropriate dashboard
    console.log('🔄 Fallback redirect to dashboard');
    const dashboardRoute = getDashboardRoute({ userProfile });
    navigate(dashboardRoute, { replace: true });

  }, [user, userProfile, loading, location.pathname, location.search, location.hash, navigate]);

  // Show loading spinner while auth is loading (except for special URLs)
  const searchParams = new URLSearchParams(location.search);
  const isSpecialUrl = searchParams.has('code') && location.pathname === '/';
  
  // Add timeout for authentication loading
  const [showAuthTimeout, setShowAuthTimeout] = useState(false);
  
  useEffect(() => {
    if (loading && !isSpecialUrl) {
      const timeout = setTimeout(() => {
        setShowAuthTimeout(true);
      }, 15000); // 15 second timeout
      
      return () => clearTimeout(timeout);
    } else {
      setShowAuthTimeout(false);
    }
  }, [loading, isSpecialUrl]);
  
  if (loading && !isSpecialUrl) {
    // Allow direct access to login page even when stuck on authentication
    if (location.pathname === '/login') {
      console.log('🚪 Bypassing auth loading for login page');
      return <>{children}</>;
    }
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground mb-4">
            {showAuthTimeout ? "Authentication is taking longer than expected." : "Authenticating..."}
          </p>
          {showAuthTimeout && (
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
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRouter;
