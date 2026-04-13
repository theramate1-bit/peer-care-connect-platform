import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { getSignedInTabRoot } from "@/lib/signedInRoutes";

export default function OnboardingStripeReturnScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Setup complete
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Your onboarding payment/setup return was received. Continue to finish
          account setup.
        </Text>
        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => router.replace("/onboarding")}
        >
          Continue onboarding
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace(getSignedInTabRoot() as never)}
        >
          Go to dashboard
        </Button>
      </View>
    </SafeAreaView>
  );
}
