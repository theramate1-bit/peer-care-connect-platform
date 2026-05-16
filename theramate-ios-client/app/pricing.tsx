import React from "react";
import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CreditCard, Search } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";

export default function PricingScreen() {
  const { userId, isAuthenticated } = useAuth();
  const showAccountBilling = isAuthenticated && !!userId;

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Pricing"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">
          Plans & fees
        </Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Session prices are set per practitioner and product. For online card
          payments, Theramate applies a platform fee of 1.95% of the session
          total plus 20p (pay-at-clinic bookings have no platform fee). Browse
          Explore for each therapist&apos;s services and prices.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          leftIcon={<Search size={18} color="#fff" />}
          onPress={() => router.replace(signedInTabPath("explore") as never)}
        >
          View therapist pricing
        </Button>
        {showAccountBilling ? (
          <Button
            variant="outline"
            className="mt-3"
            leftIcon={<CreditCard size={18} color={Colors.sage[600]} />}
            onPress={() => router.push("/settings/subscription" as never)}
          >
            Your subscription & billing
          </Button>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
