/**
 * Auth Store - Zustand
 * Manages authentication state
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, authHelpers } from "@/lib/supabase";
import type { User } from "@/types/database";
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
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithOAuth: (
    provider: "google" | "apple",
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
        try {
          set({ isLoading: true });

          // Get current session
          const { session, error: sessionError } =
            await authHelpers.getSession();

          if (sessionError) {
            console.error("Session error:", sessionError);
            set({ isLoading: false, isInitialized: true });
            return;
          }

          if (session) {
            // Fetch user profile
            const { data: profile } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();

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

          // Listen for auth changes
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
        } catch (error) {
          console.error("Auth initialization error:", error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Sign up
      signUp: async (email, password, firstName, lastName) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await authHelpers.signUp(email, password, {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          // Create user profile
          if (data.user) {
            const { error: profileError } = await supabase
              .from("users")
              .insert({
                id: data.user.id,
                email,
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                user_role: "client",
                onboarding_status: "not_started",
              });

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
      signInWithOAuth: async (provider) => {
        try {
          set({ isLoading: true, error: null });

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
          const { authUser } = get();
          if (!authUser) return;

          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
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

// Selectors
export const selectIsAuthenticated = (state: AuthState) => !!state.session;
export const selectIsClient = (state: AuthState) =>
  state.userProfile?.user_role === "client";
export const selectNeedsOnboarding = (state: AuthState) =>
  state.userProfile?.onboarding_status !== "completed";
