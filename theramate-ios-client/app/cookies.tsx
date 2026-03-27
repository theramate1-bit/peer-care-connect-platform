import React from "react";
import { View, Text, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { APP_CONFIG } from "@/constants/config";

export default function CookiesRouteScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold">Cookies</Text>
        <Text className="text-charcoal-500 mt-3">
          Cookie policy is managed on our website.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          onPress={() => void Linking.openURL(`${APP_CONFIG.WEB_URL}/cookies`)}
        >
          Open cookie policy
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.back()}
        >
          Back
        </Button>
      </View>
    </SafeAreaView>
  );
}
