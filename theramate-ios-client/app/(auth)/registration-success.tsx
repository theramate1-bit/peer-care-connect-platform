import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";

export default function RegistrationSuccessScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Check your email
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          We sent a verification link. After verifying, continue to sign in.
        </Text>

        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text className="text-white font-semibold">Go to sign in</Text>
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace("/(auth)/verify-email")}
        >
          <Text className="text-charcoal-700 font-medium">
            I already verified
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
