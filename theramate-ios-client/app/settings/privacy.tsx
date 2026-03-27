import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";

export default function SettingsPrivacyRouteScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Privacy & Security
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Manage account privacy controls, legal policies, and sign-out options.
        </Text>
        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => router.replace("/(tabs)/profile/privacy-security")}
        >
          Open privacy settings
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace("/settings")}
        >
          Back
        </Button>
      </View>
    </SafeAreaView>
  );
}
