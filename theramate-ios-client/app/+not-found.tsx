import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { getMainAppHref } from "@/lib/postAuthRoute";

/**
 * Shown when navigation targets a route that does not exist (stale links, bad push payloads, etc.).
 * Prefer recovering to app root instead of leaving users on a blank screen.
 */
export default function NotFoundScreen() {
  const { isAuthenticated, userProfile } = useAuth();

  const goHome = () => {
    if (isAuthenticated) {
      router.replace(getMainAppHref(userProfile?.user_role) as never);
      return;
    }
    router.replace("/hero");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "fade" }} />
      <SafeAreaView
        className="flex-1 bg-cream-50 px-6"
        edges={["top", "bottom"]}
      >
        <View className="flex-1 justify-center">
          <Text className="text-charcoal-900 text-xl font-bold text-center">
            Screen not found
          </Text>
          <Text className="text-charcoal-500 text-center mt-3 leading-6">
            This link or route is not available in the app. Return home and try
            again from the menu.
          </Text>
          <Pressable
            onPress={goHome}
            className="mt-8 bg-sage-500 py-4 rounded-2xl items-center active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel="Go to app home"
          >
            <Text className="text-white font-semibold text-base">
              Go to home
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}
