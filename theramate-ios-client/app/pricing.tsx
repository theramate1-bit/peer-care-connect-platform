import React from "react";
import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Search } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";

export default function PricingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Pricing" fallbackHref={defaultSignedInProfileHref()} />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">Plans & fees</Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Pricing varies by practitioner and service duration. View therapist cards
          and product options directly in Explore.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          leftIcon={<Search size={18} color="#fff" />}
          onPress={() => router.replace(signedInTabPath("explore") as never)}
        >
          View therapist pricing
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
