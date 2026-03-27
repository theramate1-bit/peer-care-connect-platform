/**
 * Auth Hook
 * Convenience hook for auth operations
 */

import { useEffect } from "react";
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

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Computed values
  const isAuthenticated = !!session;
  const isClient = userProfile?.user_role === "client";
  const needsOnboarding = userProfile?.onboarding_status !== "completed";
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
