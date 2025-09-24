import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

/**
 * Simple route protection that ONLY checks subscription status
 * All other auth logic is handled by AuthRouter
 */
export function SimpleProtectedRoute({ 
  children, 
  requireSubscription = false
}: SimpleProtectedRouteProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();

  // Don't show loading if auth is still loading (AuthRouter handles that)
  if (authLoading) {
    return <>{children}</>;
  }

  // If subscription check is loading, show spinner (but skip if user has no role)
  if (requireSubscription && subscriptionLoading && userProfile?.user_role) {
    return <LoadingSpinner fullScreen text="Checking subscription..." />;
  }

  // If user is not authenticated, let AuthRouter handle it
  if (!user || !userProfile) {
    return <>{children}</>;
  }

  // Check subscription requirement (but skip if user has no role)
  if (requireSubscription && userProfile?.user_role) {
    const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
    
    if (isPractitioner && !subscribed) {
      return <Navigate to="/pricing" state={{ 
        message: "Active subscription required to access this feature",
        from: location 
      }} replace />;
    }
  }

  return <>{children}</>;
}
