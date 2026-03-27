import React from "react";
import { View, Text, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { APP_CONFIG } from "@/constants/config";

export default function SettingsSubscriptionScreen() {
  const openBilling = async () => {
    await Linking.openURL(`${APP_CONFIG.WEB_URL}/settings/subscription`);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold">
          Subscription
        </Text>
        <Text className="text-charcoal-500 mt-3">
          Manage plan, billing details, and renewals.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          onPress={() => void openBilling()}
        >
          Manage subscription
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.replace("/settings")}
        >
          Back to settings
        </Button>
      </View>
    </SafeAreaView>
  );
}
