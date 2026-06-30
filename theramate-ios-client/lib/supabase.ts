/**
 * Supabase Client Configuration
 * Connects to the same backend as the web app
 */

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { API_CONFIG, APP_CONFIG } from "@/constants/config";
import {
  formatOAuthErrorMessage,
  getOAuthRedirectUrl,
  parseOAuthCallbackUrl,
} from "@/lib/oauthCallback";

export { getOAuthRedirectUrl } from "@/lib/oauthCallback";

/** Dismisses stray auth tabs when Universal Links / deep links complete the same session. */
WebBrowser.maybeCompleteAuthSession();

type OAuthCallbackResult = {
  data: {
    session: import("@supabase/supabase-js").Session | null;
    user: import("@supabase/supabase-js").User | null;
  } | null;
  error: Error | import("@supabase/supabase-js").AuthError | null;
};

let oauthExchangeInFlight: Promise<OAuthCallbackResult> | null = null;

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
      if (value.length > 2048) {
        console.warn(
          "[Supabase auth] SecureStore value exceeds 2048 bytes; session may not persist. Consider AsyncStorage or encrypted storage per Supabase Expo docs.",
        );
      }
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
      // Default in @supabase/auth-js is `implicit`; native OAuth returns `?code=` →
      // `exchangeCodeForSession` needs PKCE + stored code verifier (matches Supabase RN guides).
      flowType: "pkce",
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
          // Allow signup flows to set practitioner vs client; default client.
          user_role: (metadata?.user_role as string | undefined) ?? "client",
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
   * Sign in with OAuth (Google/Apple) via in-app auth session (PKCE).
   */
  signInWithOAuth: async (provider: "google" | "apple") => {
    const redirectTo = getOAuthRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      return { data: null, error };
    }
    if (!data?.url) {
      return {
        data: null,
        error: new Error("No OAuth URL returned from Supabase"),
      };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: false,
    });
    if (result.type === "success" && result.url) {
      return authHelpers.completeOAuthFromUrl(result.url);
    }
    if (result.type === "cancel" || result.type === "dismiss") {
      return { data: null, error: new Error("Sign-in was cancelled") };
    }
    return {
      data: null,
      error: new Error(
        formatOAuthErrorMessage("OAuth sign-in did not complete"),
      ),
    };
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
  completeOAuthFromUrl: async (url: string): Promise<OAuthCallbackResult> => {
    if (oauthExchangeInFlight) {
      return oauthExchangeInFlight;
    }

    const run = async (): Promise<OAuthCallbackResult> => {
      try {
        const {
          code,
          error: callbackError,
          accessToken,
          refreshToken,
        } = parseOAuthCallbackUrl(url);

        if (callbackError) {
          return {
            data: null,
            error: new Error(formatOAuthErrorMessage(callbackError)),
          };
        }

        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            return { data, error };
          }
          // In-app browser + Universal Link can both deliver the same code once.
          const { data: existing } = await supabase.auth.getSession();
          if (existing.session?.user) {
            return {
              data: {
                session: existing.session,
                user: existing.session.user,
              },
              error: null,
            };
          }
          return {
            data: null,
            error: new Error(formatOAuthErrorMessage(error.message)),
          };
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            return {
              data: null,
              error: new Error(formatOAuthErrorMessage(error.message)),
            };
          }
          return { data, error };
        }

        const { data: existing } = await supabase.auth.getSession();
        if (existing.session?.user) {
          return {
            data: {
              session: existing.session,
              user: existing.session.user,
            },
            error: null,
          };
        }

        return {
          data: null,
          error: new Error(
            formatOAuthErrorMessage(
              "No auth code or tokens found in callback URL",
            ),
          ),
        };
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "OAuth callback handling failed";
        return {
          data: null,
          error: new Error(formatOAuthErrorMessage(message)),
        };
      }
    };

    oauthExchangeInFlight = run().finally(() => {
      oauthExchangeInFlight = null;
    });
    return oauthExchangeInFlight;
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
