/**
 * Supabase Client Configuration
 * Connects to the same backend as the web app
 */

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { API_CONFIG, APP_CONFIG } from "@/constants/config";

// Custom storage adapter using Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn("SecureStore getItem error:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn("SecureStore setItem error:", error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn("SecureStore removeItem error:", error);
    }
  },
};

/** Untyped client: `types/database.ts` is partial vs production; use Supabase MCP / dashboard to verify columns. */
export const supabase = createClient(
  API_CONFIG.SUPABASE_URL,
  API_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);

// Auth helper functions
export const authHelpers = {
  /**
   * Sign up a new user
   */
  signUp: async (
    email: string,
    password: string,
    metadata?: Record<string, any>,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...metadata,
          user_role: "client", // Default role for iOS app
        },
      },
    });
    return { data, error };
  },

  /**
   * Sign in with email/password
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Sign in with OAuth (Google/Apple)
   */
  signInWithOAuth: async (provider: "google" | "apple") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${APP_CONFIG.SCHEME}://${APP_CONFIG.OAUTH_CALLBACK_PATH}`,
        skipBrowserRedirect: true,
      },
    });
    if (!error && data?.url) {
      await Linking.openURL(data.url);
    }
    return { data, error };
  },

  /**
   * Sign out
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Request password reset
   */
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_CONFIG.SCHEME}://${APP_CONFIG.RESET_PASSWORD_PATH}`,
    });
    return { data, error };
  },

  /**
   * Complete OAuth callback using either PKCE code or implicit tokens.
   */
  completeOAuthFromUrl: async (url: string) => {
    try {
      // PKCE callbacks: theramate://oauth-callback?code=...
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      const callbackError =
        parsed.searchParams.get("error_description") ||
        parsed.searchParams.get("error");
      if (callbackError) {
        return { data: null, error: new Error(callbackError) };
      }
      if (code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);
        return { data, error };
      }

      // Implicit callbacks may return tokens in the hash.
      const hash = url.includes("#") ? url.split("#")[1] : "";
      const hashParams = new URLSearchParams(hash);
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        return { data, error };
      }

      return {
        data: null,
        error: new Error("No auth code or tokens found in callback URL"),
      };
    } catch (e: any) {
      return {
        data: null,
        error: new Error(e?.message || "OAuth callback handling failed"),
      };
    }
  },

  /**
   * Update password
   */
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  /**
   * Get current user
   */
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  /**
   * Refresh session
   */
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return { session: data.session, error };
  },
};

// Realtime subscription helpers
export const realtimeHelpers = {
  /**
   * Subscribe to changes on a table
   */
  subscribeToTable: (
    table: string,
    filter: string,
    callback: (payload: any) => void,
  ) => {
    return supabase
      .channel(`${table}_changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        callback,
      )
      .subscribe();
  },

  /**
   * Subscribe to messages in a conversation
   */
  subscribeToMessages: (
    conversationId: string,
    callback: (payload: any) => void,
  ) => {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        callback,
      )
      .subscribe();
  },

  /**
   * Subscribe to notifications for a user
   */
  subscribeToNotifications: (
    userId: string,
    callback: (payload: any) => void,
  ) => {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },

  /**
   * Unsubscribe from a channel
   */
  unsubscribe: (channel: ReturnType<typeof supabase.channel>) => {
    supabase.removeChannel(channel);
  },
};

// Storage helpers
export const storageHelpers = {
  /**
   * Upload a file to storage
   */
  uploadFile: async (
    bucket: string,
    path: string,
    file: Blob | ArrayBuffer,
    options?: { upsert?: boolean },
  ) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: options?.upsert ?? false });
    return { data, error };
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Delete a file from storage
   */
  deleteFile: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);
    return { data, error };
  },
};

export default supabase;
