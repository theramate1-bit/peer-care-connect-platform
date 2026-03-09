import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { shouldRedirectToOnboarding } from '@/lib/dashboard-routing';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

/**
 * Simple route protection that checks onboarding AND subscription status
 * Onboarding check happens first - practitioners cannot bypass onboarding
 * All other auth logic is handled by AuthRouter
 */
export function SimpleProtectedRoute({ 
  children, 
  requireSubscription = false
}: SimpleProtectedRouteProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { subscribed, loading: subscriptionLoading, practitionerAccess } = useSubscription();
  const location = useLocation();

  // Don't show loading if auth is still loading (AuthRouter handles that)
  if (authLoading) {
    return <>{children}</>;
  }

  // If user is not authenticated, let AuthRouter handle it
  // Only check for user, not userProfile (profile might be loading)
  if (!user) {
    return <>{children}</>;
  }

  // CRITICAL: Check onboarding status FIRST - prevents bypass
  // This check must happen before subscription check to prevent practitioners from accessing routes
  // BUT: Skip this check if user is on role-selection page - they need to select a role first
  if (userProfile && shouldRedirectToOnboarding(userProfile)) {
    // Skip redirect if user is already on onboarding page OR role-selection page
    if (location.pathname !== '/onboarding' && 
        !location.pathname.startsWith('/onboarding/') &&
        location.pathname !== '/auth/role-selection') {
      console.log('🚫 Practitioner attempting to bypass onboarding, redirecting to onboarding');
      console.log('📋 Onboarding status:', userProfile.onboarding_status);
      console.log('📋 Profile completed:', userProfile.profile_completed);
      return <Navigate to="/onboarding" replace />;
    }
    
    // If on role-selection page, allow it to render (user needs to select role first)
    if (location.pathname === '/auth/role-selection') {
      console.log('ℹ️ User on role-selection page - allowing render despite onboarding status');
      console.log('📋 Onboarding status:', userProfile.onboarding_status);
      console.log('📋 Profile completed:', userProfile.profile_completed);
      console.log('📋 User role:', userProfile.user_role);
    }
  }

  // If subscription check is loading, show spinner (but skip if user has no role)
  if (requireSubscription && subscriptionLoading && userProfile?.user_role) {
    return <LoadingSpinner fullScreen text="Checking subscription..." />;
  }

  // Check subscription requirement (but skip if user has no role)
  if (requireSubscription && userProfile?.user_role) {
    const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
    
    // For dashboard access, practitioners only need subscription
    // Stripe Connect is NOT required for dashboard access - it's only required for receiving payments
    // (which is checked in payment-specific components/routes)
    const hasRequiredAccess = subscribed; // All users just need subscription for general access
    
    if (isPractitioner) {
      // If subscription check has completed (!subscriptionLoading) and missing access, redirect
      if (!subscriptionLoading && !hasRequiredAccess) {
        console.log('🚫 Practitioner missing subscription - redirecting to onboarding subscription step');
        // UX rule: practitioners should complete onboarding (including payment step) rather than being hard-routed to pricing.
        return <Navigate to="/onboarding" state={{
          message: "Complete onboarding to activate your practitioner account.",
          from: location
        }} replace />;
      }
      
      // If subscription check is still loading, wait for it
      if (subscriptionLoading) {
        return <LoadingSpinner fullScreen text="Checking subscription..." />;
      }
      
      // If subscription check failed or returned false, redirect to pricing
      if (!hasRequiredAccess) {
        console.log('🚫 Practitioner subscription check failed - redirecting to onboarding');
        return <Navigate to="/onboarding" state={{
          message: "Complete onboarding to activate your practitioner account.",
          from: location
        }} replace />;
      }
    } else {
      // Non-practitioners: just check subscription
      if (!subscriptionLoading && !subscribed) {
        console.log('🚫 User without subscription attempting to access protected route, redirecting to pricing');
        return <Navigate to="/pricing" state={{ 
          message: "Active subscription required to access this feature",
          from: location 
        }} replace />;
      }
      
      if (subscriptionLoading) {
        return <LoadingSpinner fullScreen text="Checking subscription..." />;
      }
      
      if (!subscribed) {
        console.log('🚫 Subscription check failed or returned false, redirecting to pricing');
        return <Navigate to="/pricing" state={{ 
          message: "Active subscription required to access this feature",
          from: location 
        }} replace />;
      }
    }
  }

  return <>{children}</>;
}
