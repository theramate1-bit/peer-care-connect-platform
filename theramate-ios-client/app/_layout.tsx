/**
 * Root Layout
 * App-wide providers and configuration
 */

import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import * as Linking from "expo-linking";
import { useAuthStore } from "@/stores/authStore";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { authHelpers } from "@/lib/supabase";
import { API_CONFIG } from "@/constants/config";
import { Colors } from "@/constants/colors";
import {
  getNavigationFromDeepLink,
  isOAuthCallbackUrl,
  isPasswordResetUrl,
} from "@/lib/deepLinking";

import "../global.css";

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

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
  const [isReady, setIsReady] = React.useState(false);
  const initialize = useAuthStore((state) => state.initialize);
  usePushNotifications();

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          "Outfit-Regular": require("../assets/fonts/Outfit-Regular.ttf"),
          "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
          "Outfit-SemiBold": require("../assets/fonts/Outfit-SemiBold.ttf"),
          "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
        });

        // Initialize auth
        await initialize();
      } catch (e) {
        console.warn("App preparation error:", e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [initialize]);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url) return;
      if (isOAuthCallbackUrl(url)) {
        const { error } = await authHelpers.completeOAuthFromUrl(url);
        if (!error) {
          router.replace("/(auth)/oauth-completion");
        }
        return;
      }
      if (isPasswordResetUrl(url)) {
        router.replace("/(auth)/reset-password-confirm");
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

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StripeProvider
            publishableKey={API_CONFIG.STRIPE_PUBLISHABLE_KEY}
            merchantIdentifier={API_CONFIG.STRIPE_MERCHANT_ID}
            urlScheme="theramate"
          >
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
            </Stack>
          </StripeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
