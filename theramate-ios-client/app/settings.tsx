import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";

export default function SettingsRouteScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Settings
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Open app settings to manage preferences, notifications, and account
          tools.
        </Text>
        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => router.replace("/(tabs)/profile/settings")}
        >
          Open app settings
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.push("/settings/privacy")}
        >
          Privacy & tools
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.push("/settings/subscription")}
        >
          Subscription
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace("/(tabs)/profile")}
        >
          Back to profile
        </Button>
      </View>
    </SafeAreaView>
  );
}
