/**
 * Root Layout
 * App-wide providers and configuration
 */

import React, { useEffect, useLayoutEffect } from "react";
import { InteractionManager } from "react-native";
import { Stack, router, useRootNavigationState } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { useAuthStore } from "@/stores/authStore";
import { authHelpers } from "@/lib/supabase";
import { API_CONFIG } from "@/constants/config";
import { Colors } from "@/constants/colors";
import {
  getNavigationFromDeepLink,
  isOAuthCallbackUrl,
  isPasswordResetUrl,
} from "@/lib/deepLinking";

import "../global.css";

// Do not call preventAutoHideAsync() here — expo-router uses internalPreventAutoHideAsync.
// Hide aggressively: early JS hide() can run before native splash is attached (no-op); we also
// hide after layout, after interactions, when navigation state exists, and on a long fallback.

function hideSplash() {
  try {
    void ExpoSplashScreen.hideAsync();
  } catch {
    ExpoSplashScreen.hide();
  }
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const rootNavigation = useRootNavigationState();

  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);

  useLayoutEffect(() => {
    hideSplash();
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      hideSplash();
    });
    return () => task.cancel?.();
  }, []);

  useEffect(() => {
    if (rootNavigation?.key == null) return;
    hideSplash();
  }, [rootNavigation?.key]);

  useEffect(() => {
    const t = setTimeout(() => hideSplash(), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url) return;
      if (isOAuthCallbackUrl(url)) {
        const { error } = await authHelpers.completeOAuthFromUrl(url);
        if (!error) {
          router.replace("/oauth-completion");
        }
        return;
      }
      if (isPasswordResetUrl(url)) {
        router.replace("/reset-password-confirm");
        return;
      }

      const nav = getNavigationFromDeepLink(url);
      if (nav) {
        const p = nav as {
          pathname: string;
          params?: Record<string, string | undefined>;
        };
        const raw = p.params;
        const cleanParams =
          raw &&
          Object.fromEntries(
            Object.entries(raw).filter(([, v]) => v !== undefined && v !== ""),
          );
        if (cleanParams && Object.keys(cleanParams).length > 0) {
          router.replace({
            pathname: p.pathname,
            params: cleanParams,
          } as never);
        } else {
          router.replace(p.pathname as never);
        }
        return;
      }

      // Legacy: any URL containing booking-success path segments not caught above
      if (url.includes("/booking-success")) {
        try {
          const u = new URL(url);
          const sessionId = u.searchParams.get("session_id");
          router.replace({
            pathname: "/booking-success",
            params: sessionId ? { session_id: sessionId } : {},
          });
        } catch {
          /* ignore */
        }
      }
    };

    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    void Linking.getInitialURL().then((initial) => {
      if (initial) void handleUrl(initial);
    });

    return () => {
      sub.remove();
    };
  }, []);

  const stripeKeyRaw = API_CONFIG.STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const useStripe =
    stripeKeyRaw.length > 0 &&
    (stripeKeyRaw.startsWith("pk_test_") || stripeKeyRaw.startsWith("pk_live_"));
  const appTree = (
    <>
      <StatusBar style="dark" />
      <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.cream[50] },
                animation: "slide_from_right",
              }}
            >
              {/* Auth Group */}
              <Stack.Screen
                name="(auth)"
                options={{
                  headerShown: false,
                }}
              />

              {/* Main App Tabs */}
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="(practitioner)"
                options={{
                  headerShown: false,
                }}
              />

              {/* Modal Screens */}
              <Stack.Screen
                name="booking"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="book/[slug]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="therapist/[id]/public"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="guest/mobile-requests"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="review" options={{ headerShown: false }} />
              <Stack.Screen
                name="booking-success"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="mobile-booking/success"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="mobile-booking/pending"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="how-it-works"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="pricing" options={{ headerShown: false }} />
              <Stack.Screen name="contact" options={{ headerShown: false }} />
              <Stack.Screen name="privacy" options={{ headerShown: false }} />
              <Stack.Screen name="terms" options={{ headerShown: false }} />
              <Stack.Screen name="help" options={{ headerShown: false }} />
              <Stack.Screen name="cookies" options={{ headerShown: false }} />
              <Stack.Screen
                name="diagnostics"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="notifications"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen
                name="settings/privacy"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="settings/subscription"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="stripe-customer-portal"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="subscription-success"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="onboarding/stripe-return"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="find-therapists"
                options={{ headerShown: false }}
              />

              {/* OAuth return targets (Universal Links + custom scheme); must exist or deep links show unmatched */}
              <Stack.Screen
                name="oauth-callback"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="auth/callback"
                options={{ headerShown: false }}
              />

              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
    </>
  );

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            {useStripe ? (
              <StripeProvider
                publishableKey={stripeKeyRaw}
                merchantIdentifier={API_CONFIG.STRIPE_MERCHANT_ID}
                urlScheme="theramate"
              >
                {appTree}
              </StripeProvider>
            ) : (
              appTree
            )}
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
