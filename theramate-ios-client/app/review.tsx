import React from "react";
import { View, Text, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { signedInTabPath } from "@/lib/signedInRoutes";
import { AppScreen, AppStackHeader } from "@/components/navigation";

export default function GuestReviewEntryScreen() {
  const { sessionId, token } = useLocalSearchParams<{
    sessionId?: string;
    token?: string;
  }>();
  const { isAuthenticated } = useAuth();

  const openInAppReview = () => {
    if (!sessionId) {
      router.push(signedInTabPath("bookings") as never);
      return;
    }
    router.push({
      pathname: signedInTabPath("bookings/review") as any,
      params: { sessionId },
    });
  };

  return (
    <AppScreen>
      <AppStackHeader title="Leave a review" fallbackHref="/find-therapists" />
      <ScrollView
        className="flex-1 px-6 pt-2"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-500">
          You can leave feedback for your session directly in app.
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
              onPress={() => router.replace("/login")}
            >
              Sign in to continue
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => router.replace("/login")}
            >
              Back to sign in
            </Button>
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}
