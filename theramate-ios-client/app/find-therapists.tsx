import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";

export default function FindTherapistsRouteScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Find therapists
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Browse therapist profiles, reviews, and booking options.
        </Text>
        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => router.replace("/(tabs)/explore")}
        >
          Open explore
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace("/(tabs)")}
        >
          Back to home
        </Button>
      </View>
    </SafeAreaView>
  );
}
