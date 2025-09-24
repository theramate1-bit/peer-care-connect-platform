import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute, canAccessRoute, shouldRedirectToOnboarding } from '@/lib/dashboard-routing';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard = ({ children }: RouteGuardProps) => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    
    // Handle password reset URLs with code parameter (token hash) - do this BEFORE auth loading check
    if (searchParams.has('code') && currentPath === '/') {
      console.log('🔄 Password reset token hash detected, redirecting to reset password confirm');
      navigate('/auth/reset-password-confirm', { 
        state: { 
          token_hash: searchParams.get('code'),
          type: 'recovery'
        },
        replace: true 
      });
      return;
    }

    // Don't redirect while auth is loading (but only after handling password reset)
    if (loading) return;
    
    // If user is not authenticated, allow access to public routes
    if (!user || !userProfile) {
      const publicRoutes = ['/', '/marketplace', '/how-it-works', '/pricing', '/about', '/contact', '/terms', '/privacy', '/login', '/register', '/reset-password'];
      const authRoutes = ['/auth/', '/onboarding'];
      
      if (!publicRoutes.includes(currentPath) && !currentPath.startsWith('/auth/')) {
        console.log('🚫 Unauthenticated user accessing protected route, redirecting to login');
        navigate('/login', { replace: true });
      }
      return;
    }

    // User is authenticated - check route access
    console.log('🔍 RouteGuard checking access for:', currentPath);
    console.log('👤 User role:', userProfile.user_role);
    console.log('📋 Onboarding status:', userProfile.onboarding_status);

    // Check if user should be redirected to onboarding
    if (shouldRedirectToOnboarding(userProfile)) {
      console.log('🔄 User needs onboarding, redirecting from:', currentPath);
      navigate('/onboarding', { replace: true });
      return;
    }

    // Check if user has access to current route
    if (!canAccessRoute(userProfile, currentPath)) {
      console.log('🚫 User does not have access to:', currentPath);
      console.log('👤 User role:', userProfile.user_role);
      
      // Redirect to appropriate dashboard
      const correctRoute = getDashboardRoute({ userProfile });
      console.log('✅ Redirecting to correct route:', correctRoute);
      navigate(correctRoute, { replace: true });
      return;
    }

    // Comprehensive dashboard route validation for all user types
    const correctDashboardRoute = getDashboardRoute({ userProfile });
    
    // Check if user is on any dashboard route but it's the wrong one
    const dashboardRoutes = ['/dashboard', '/client/dashboard', '/admin/dashboard'];
    const isOnDashboardRoute = dashboardRoutes.some(route => currentPath.startsWith(route));
    
    if (isOnDashboardRoute && currentPath !== correctDashboardRoute) {
      console.log('🚫 User on wrong dashboard route:', currentPath);
      console.log('👤 User role:', userProfile.user_role);
      console.log('✅ Correct route should be:', correctDashboardRoute);
      navigate(correctDashboardRoute, { replace: true });
      return;
    }

    // Special handling for role-specific routes
    if (userProfile.user_role === 'client') {
      // Clients should not access practitioner routes
      const practitionerRoutes = ['/dashboard', '/practice', '/cpd', '/analytics', '/payments', '/booking'];
      if (practitionerRoutes.some(route => currentPath.startsWith(route))) {
        console.log('🚫 Client accessing practitioner route:', currentPath);
        navigate('/client/dashboard', { replace: true });
        return;
      }
    } else if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role)) {
      // Practitioners should not access client routes
      if (currentPath.startsWith('/client/')) {
        console.log('🚫 Practitioner accessing client route:', currentPath);
        navigate('/dashboard', { replace: true });
        return;
      }
    } else if (userProfile.user_role === 'admin') {
      // Admins should not access client or practitioner dashboards
      if (currentPath === '/client/dashboard' || currentPath === '/dashboard') {
        console.log('🚫 Admin accessing user dashboard:', currentPath);
        navigate('/admin/dashboard', { replace: true });
        return;
      }
    }

    console.log('✅ Route access granted for:', currentPath);
  }, [user, userProfile, loading, location.pathname, navigate]);

  // Show loading while checking authentication (but not for password reset URLs)
  const searchParams = new URLSearchParams(location.search);
  const isPasswordReset = searchParams.has('code') && location.pathname === '/';
  
  if (loading && !isPasswordReset) {
    return <LoadingSpinner fullScreen text="Checking access..." />;
  }

  return <>{children}</>;
};

export default RouteGuard;
