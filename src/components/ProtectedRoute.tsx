import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole, Permission, hasPermission, isClient, isPractitioner } from '@/types/roles';
import { shouldRedirectToOnboarding, canAccessRoute, getDashboardRoute } from '@/lib/dashboard-routing';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole | UserRole[];
  requirePermission?: Permission;
  requireSubscription?: boolean; // New prop to require active subscription
}

export function ProtectedRoute({ 
  children, 
  requireRole, 
  requirePermission,
  requireSubscription = false
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();

  if (loading || subscriptionLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = userProfile?.user_role as UserRole;

  // Redirect to onboarding if profile is not completed
  if (shouldRedirectToOnboarding(userProfile) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Role-based access control with smart redirects for all user types
  if (requireRole) {
    if (Array.isArray(requireRole)) {
      // Multiple roles allowed
      if (!requireRole.includes(userRole)) {
        // Redirect to appropriate dashboard based on user's actual role
        const correctRoute = getDashboardRoute({ userProfile });
        return <Navigate to={correctRoute} replace />;
      }
    } else {
      // Single role required
      if (userRole !== requireRole) {
        // Redirect to appropriate dashboard based on user's actual role
        const correctRoute = getDashboardRoute({ userProfile });
        return <Navigate to={correctRoute} replace />;
      }
    }
  }

  // Permission-based access control
  if (requirePermission && !hasPermission(userRole, requirePermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Subscription-based access control for practitioners
  if (requireSubscription && isPractitioner(userRole) && !subscribed) {
    return <Navigate to="/pricing" state={{ message: "Active subscription required to access this feature" }} replace />;
  }

  return <>{children}</>;
}