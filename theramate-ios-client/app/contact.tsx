import React from "react";
import { View, Text, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { APP_CONFIG } from "@/constants/config";

export default function ContactScreen() {
  const openContact = async () => {
    await Linking.openURL(`${APP_CONFIG.WEB_URL}/contact`);
  };
  const emailSupport = async () => {
    await Linking.openURL(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold">Contact</Text>
        <Text className="text-charcoal-500 mt-3">
          Need help with a booking or payment? Contact support directly.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          onPress={() => void openContact()}
        >
          Open contact page
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => void emailSupport()}
        >
          Email support
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
