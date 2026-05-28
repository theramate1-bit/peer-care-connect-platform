import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate, useLocation } from 'react-router-dom';
import { resolveRouteGuard, type AccessProfile } from '@/lib/access-policy';
import { AuthLoadingShell } from '@/components/auth/AuthLoadingShell';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

/**
 * Per-route guard: onboarding + optional subscription.
 * Global navigation is handled by AuthRouter + resolveAccess().
 */
export function SimpleProtectedRoute({
  children,
  requireSubscription = false,
}: SimpleProtectedRouteProps) {
  const { user, userProfile, loading: authLoading, profileSyncing } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();

  const decision = resolveRouteGuard({
    pathname: location.pathname,
    user,
    userProfile: userProfile as AccessProfile | null,
    authLoading,
    requireSubscription,
    subscribed,
    subscriptionLoading,
  });

  if (decision.action === 'wait') {
    const msg =
      decision.reason === 'subscription'
        ? 'Checking subscription…'
        : profileSyncing
          ? 'Syncing your account…'
          : 'Loading your profile…';
    return <AuthLoadingShell message={msg} compact />;
  }

  if (decision.action === 'redirect') {
    return (
      <Navigate
        to={decision.to}
        replace
        state={
          decision.to === '/pricing'
            ? { message: 'Active subscription required to access this feature', from: location }
            : decision.to === '/onboarding'
              ? { message: 'Complete onboarding to activate your practitioner account.', from: location }
              : undefined
        }
      />
    );
  }

  return <>{children}</>;
}
