import React from "react";
import { View, Text, ScrollView, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { APP_CONFIG } from "@/constants/config";

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

async function openUrl(url: string) {
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert("Cannot open URL", url);
    return;
  }
  await Linking.openURL(url);
}

export default function DiagnosticsScreen() {
  const fakeCheckoutSession = randomId("cs_test");
  const fakeMobileRequest = randomId("mbr");

  const deepLinks = [
    `${APP_CONFIG.SCHEME}://booking-success?session_id=${fakeCheckoutSession}`,
    `${APP_CONFIG.SCHEME}://mobile-booking/success?mobile_request_id=${fakeMobileRequest}&mobile_checkout_session_id=${fakeCheckoutSession}`,
    `${APP_CONFIG.SCHEME}://review?sessionId=${randomId("sess")}`,
    `${APP_CONFIG.SCHEME}://booking/view/${randomId("sess")}?token=${randomId("tok")}`,
  ];

  const webLinks = [
    `${APP_CONFIG.WEB_URL}/booking-success?session_id=${fakeCheckoutSession}`,
    `${APP_CONFIG.WEB_URL}/mobile-booking/success?mobile_request_id=${fakeMobileRequest}&mobile_checkout_session_id=${fakeCheckoutSession}`,
    `${APP_CONFIG.WEB_URL}/review?sessionId=${randomId("sess")}`,
  ];

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-900 text-2xl font-bold">
          Diagnostics
        </Text>
        <Text className="text-charcoal-500 mt-2">
          Use this screen to validate deep-link return routes on device builds.
        </Text>

        <Text className="text-charcoal-800 font-semibold mt-6 mb-2">
          App-scheme deep links
        </Text>
        {deepLinks.map((url) => (
          <Button
            key={url}
            variant="outline"
            className="mt-2"
            onPress={() => void openUrl(url)}
          >
            <Text className="text-charcoal-700 text-xs" numberOfLines={2}>
              {url}
            </Text>
          </Button>
        ))}

        <Text className="text-charcoal-800 font-semibold mt-6 mb-2">
          Website callback links
        </Text>
        {webLinks.map((url) => (
          <Button
            key={url}
            variant="outline"
            className="mt-2"
            onPress={() => void openUrl(url)}
          >
            <Text className="text-charcoal-700 text-xs" numberOfLines={2}>
              {url}
            </Text>
          </Button>
        ))}

        <Button
          variant="primary"
          className="mt-8"
          onPress={() => router.back()}
        >
          Back
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
