import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { CreditsContent } from "@/components/profile/CreditsContent";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";

export default function ClientCreditsScreen() {
  const { userId, isAuthenticated, isInitialized } = useAuth();
  const back = defaultSignedInProfileHref();

  if (isInitialized && (!isAuthenticated || !userId)) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
        <AppStackHeader title="Credits" fallbackHref={back} />
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-900 text-xl font-bold">Sign in required</Text>
          <Text className="text-charcoal-500 mt-3 leading-6">
            Sign in to view your credit balance and activity.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.replace("/login" as never)}
          >
            Sign in
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Credits" fallbackHref={back} />
      {userId ? (
        <CreditsContent
          variant="client"
          userId={userId}
          queryEnabled={isAuthenticated}
          refetchOnFocus
        />
      ) : null}
    </SafeAreaView>
  );
}
