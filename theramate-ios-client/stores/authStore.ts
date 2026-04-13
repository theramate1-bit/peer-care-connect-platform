/**
 * Auth Store - Zustand
 * Manages authentication state
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, authHelpers } from "@/lib/supabase";
import {
  clearPendingOAuthSignupRole,
  setPendingOAuthSignupRole,
} from "@/lib/oauthPendingRole";
import type { SignupRole } from "@/lib/oauthPendingRole";
import type { User, UserRole } from "@/types/database";
import type { Session, User as AuthUser } from "@supabase/supabase-js";

interface AuthState {
  // State
  session: Session | null;
  authUser: AuthUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    userRole?: SignupRole,
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithOAuth: (
    provider: "google" | "apple",
    options?: { signupRole?: SignupRole },
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (
    updates: Partial<User>,
  ) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

/** Single flight + one auth listener — avoids duplicate inits from root layout + useAuth. */
let authInitInFlight: Promise<void> | null = null;
let authSubscriptionAttached = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      authUser: null,
      userProfile: null,
      isLoading: true,
      isInitialized: false,
      error: null,

      // Initialize auth state
      initialize: async () => {
        if (get().isInitialized) return;
        if (authInitInFlight) {
          await authInitInFlight;
          return;
        }

        authInitInFlight = (async () => {
          const watchdog = setTimeout(() => {
            if (!get().isInitialized) {
              console.warn(
                "[Auth] Watchdog: forcing isInitialized (Supabase/session path hung)",
              );
              set({ isLoading: false, isInitialized: true });
            }
          }, 10_000);

          try {
            set({ isLoading: true });

            // Bad URL / offline / hung SDK — do not block first paint longer than this
            const sessionTimeoutMs = 4_000;
            const { session, error: sessionError } = await Promise.race([
              authHelpers.getSession(),
              new Promise<Awaited<ReturnType<typeof authHelpers.getSession>>>(
                (resolve) =>
                  setTimeout(
                    () => resolve({ session: null, error: null }),
                    sessionTimeoutMs,
                  ),
              ),
            ]);

            if (sessionError) {
              console.error("Session error:", sessionError);
              set({ isLoading: false, isInitialized: true });
              return;
            }

            if (session) {
              const profileQuery = supabase
                .from("users")
                .select("*")
                .eq("id", session.user.id)
                .single();

              const profileTimeoutMs = 4_000;
              const { data: profile } = await Promise.race([
                profileQuery,
                new Promise<{ data: null }>((resolve) =>
                  setTimeout(() => resolve({ data: null }), profileTimeoutMs),
                ),
              ]);

              set({
                session,
                authUser: session.user,
                userProfile: profile,
                isLoading: false,
                isInitialized: true,
              });
            } else {
              set({ isLoading: false, isInitialized: true });
            }

            if (!authSubscriptionAttached) {
              authSubscriptionAttached = true;
              supabase.auth.onAuthStateChange(async (event, session) => {
                console.log("Auth state changed:", event);

                if (session) {
                  const { data: profile } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();

                  set({
                    session,
                    authUser: session.user,
                    userProfile: profile,
                  });
                } else {
                  set({
                    session: null,
                    authUser: null,
                    userProfile: null,
                  });
                }
              });
            }
          } catch (error) {
            console.error("Auth initialization error:", error);
            set({ isLoading: false, isInitialized: true });
          } finally {
            clearTimeout(watchdog);
            authInitInFlight = null;
          }
        })();

        await authInitInFlight;
      },

      // Sign up
      signUp: async (email, password, firstName, lastName, userRole) => {
        try {
          set({ isLoading: true, error: null });

          const role: UserRole =
            userRole === "client"
              ? "client"
              : userRole === "practitioner"
                ? "sports_therapist"
                : "client";

          const { data, error } = await authHelpers.signUp(email, password, {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            user_role: role,
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          // Merge into profile row: `handle_new_user` trigger usually inserts first, so plain
          // `.insert()` fails with duplicate id and `user_role` never gets set.
          if (data.user) {
            const { error: profileError } = await supabase.from("users").upsert(
              {
                id: data.user.id,
                email,
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                user_role: role,
                onboarding_status: "pending",
              },
              { onConflict: "id" },
            );

            if (profileError) {
              console.error("Profile creation error:", profileError);
            }
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Sign in
      signIn: async (email, password) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await authHelpers.signIn(email, password);

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          const authUser = data.user;
          if (!authUser) {
            set({ isLoading: false, error: "No user returned" });
            return { success: false, error: "No user returned" };
          }

          // Fetch user profile
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single();

          set({
            session: data.session,
            authUser,
            userProfile: profile,
            isLoading: false,
          });

          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Sign in with OAuth
      signInWithOAuth: async (provider, options) => {
        try {
          set({ isLoading: true, error: null });

          if (options?.signupRole === "client" || options?.signupRole === "practitioner") {
            await setPendingOAuthSignupRole(options.signupRole);
          } else {
            await clearPendingOAuthSignupRole();
          }

          const { error } = await authHelpers.signInWithOAuth(provider);

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Sign out
      signOut: async () => {
        try {
          set({ isLoading: true });
          await authHelpers.signOut();
          set({
            session: null,
            authUser: null,
            userProfile: null,
            isLoading: false,
          });
        } catch (error) {
          console.error("Sign out error:", error);
          set({ isLoading: false });
        }
      },

      // Reset password
      resetPassword: async (email) => {
        try {
          set({ isLoading: true, error: null });

          const { error } = await authHelpers.resetPassword(email);

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Update password
      updatePassword: async (newPassword) => {
        try {
          set({ isLoading: true, error: null });
          const { error } = await authHelpers.updatePassword(newPassword);
          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }
          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        try {
          const { userProfile } = get();
          if (!userProfile) {
            return { success: false, error: "No user profile" };
          }

          set({ isLoading: true, error: null });

          const { data, error } = await supabase
            .from("users")
            .update(updates)
            .eq("id", userProfile.id)
            .select()
            .single();

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          set({ userProfile: data, isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Refresh profile
      refreshProfile: async () => {
        try {
          let userId = get().authUser?.id;
          if (!userId) {
            const { data: sessionData } = await supabase.auth.getSession();
            userId = sessionData.session?.user?.id;
          }
          if (!userId) return;

          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

          if (profile) {
            set({ userProfile: profile });
          }
        } catch (error) {
          console.error("Profile refresh error:", error);
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: "theramate-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist non-sensitive data
        userProfile: state.userProfile,
      }),
    },
  ),
);

// Run after AsyncStorage rehydration so persisted `userProfile` is merged before Supabase/session sync.
useAuthStore.persist.onFinishHydration(() => {
  void useAuthStore.getState().initialize();
});

// Selectors
export const selectIsAuthenticated = (state: AuthState) => !!state.session;
export const selectIsClient = (state: AuthState) =>
  state.userProfile?.user_role === "client";
export const selectNeedsOnboarding = (state: AuthState) =>
  state.userProfile?.user_role === "client" &&
  state.userProfile?.onboarding_status !== "completed";
