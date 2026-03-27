import React from "react";
import { View, Text, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/constants/config";

export default function GuestReviewEntryScreen() {
  const { sessionId, token } = useLocalSearchParams<{
    sessionId?: string;
    token?: string;
  }>();
  const { isAuthenticated } = useAuth();

  const openWebReview = async () => {
    const qs = new URLSearchParams();
    if (sessionId) qs.set("sessionId", sessionId);
    if (token) qs.set("token", token);
    const url = `${APP_CONFIG.WEB_URL}/review${qs.toString() ? `?${qs.toString()}` : ""}`;
    await Linking.openURL(url);
  };

  const openInAppReview = () => {
    if (!sessionId) {
      router.push("/(tabs)/bookings");
      return;
    }
    router.push({ pathname: "/(tabs)/bookings/review", params: { sessionId } });
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-900 text-2xl font-bold">
          Leave a review
        </Text>
        <Text className="text-charcoal-500 mt-2">
          You can leave feedback for your session. If you opened a guest email
          link, we will route you to the secure web flow.
        </Text>

        {isAuthenticated ? (
          <Button variant="primary" className="mt-6" onPress={openInAppReview}>
            Continue in app
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              className="mt-6"
              onPress={() => void openWebReview()}
            >
              Continue securely on web
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => router.replace("/(auth)/login")}
            >
              Sign in to continue in app
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
