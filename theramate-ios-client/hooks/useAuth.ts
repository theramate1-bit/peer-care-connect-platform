/**
 * Auth Hook
 * Convenience hook for auth operations
 */

import { isPractitionerPortalRole } from "@/lib/authRoles";
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsClient,
  selectNeedsOnboarding,
} from "@/stores/authStore";

export function useAuth() {
  const {
    session,
    authUser,
    userProfile,
    isLoading,
    isInitialized,
    error,
    initialize,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    clearError,
  } = useAuthStore();

  // Auth boot: `authStore` registers `persist.onFinishHydration` → `initialize()` after AsyncStorage rehydrates.

  // Computed values
  const isAuthenticated = !!session;
  const isClient = userProfile?.user_role === "client";
  const isPractitioner = isPractitionerPortalRole(
    userProfile?.user_role ?? undefined,
  );
  // Only clients use the in-app onboarding screen; practitioners may finish setup elsewhere.
  const needsOnboarding =
    isClient && userProfile?.onboarding_status !== "completed";
  const userId = authUser?.id;

  return {
    // State
    session,
    user: authUser,
    userProfile,
    isLoading,
    isInitialized,
    error,

    // Computed
    isAuthenticated,
    isClient,
    isPractitioner,
    needsOnboarding,
    userId,

    // Actions
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    clearError,
  };
}

// Hook for protected routes
export function useRequireAuth() {
  const { isAuthenticated, isInitialized, isLoading, needsOnboarding } =
    useAuth();

  return {
    isReady: isInitialized && !isLoading,
    isAuthenticated,
    needsOnboarding,
  };
}

export default useAuth;
