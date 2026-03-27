import React from "react";
import { View, Text, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/constants/config";

export default function LandingScreen() {
  const { isInitialized, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isInitialized]);

  const openWeb = async () => {
    await Linking.openURL(APP_CONFIG.WEB_URL);
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 justify-center">
        <Text className="text-charcoal-900 text-4xl font-bold">Theramate</Text>
        <Text className="text-charcoal-500 mt-3">
          Book trusted therapy sessions, track progress, and manage your care in
          one place.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          onPress={() => router.replace("/(auth)/login")}
        >
          Sign in
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/(auth)/register")}
        >
          Create account
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/(tabs)/explore")}
        >
          Browse practitioners
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => void openWeb()}
        >
          Open website
        </Button>
      </View>
    </SafeAreaView>
  );
}
