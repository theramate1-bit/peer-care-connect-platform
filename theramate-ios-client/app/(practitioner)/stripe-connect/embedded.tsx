import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { fetchConnectAccountStatus } from "@/lib/api/stripeConnect";
import { openConnectHostedOnboarding } from "@/lib/openConnectHostedOnboarding";

/**
 * Legacy route — redirects to Stripe-hosted Connect onboarding (no publishable key).
 */
export default function StripeConnectEmbeddedScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!userId) {
        router.replace(tabPath(tabRoot, "stripe-connect") as never);
        return;
      }
      const status = await fetchConnectAccountStatus(userId);
      if (cancelled) return;
      if (status.notConnected || !status.data?.stripe_account_id) {
        router.replace(tabPath(tabRoot, "stripe-connect") as never);
        return;
      }
      const hosted = await openConnectHostedOnboarding({
        stripeAccountId: status.data.stripe_account_id,
      });
      if (!hosted.ok) {
        router.replace(tabPath(tabRoot, "stripe-connect") as never);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tabRoot, userId]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color={Colors.sage[500]} />
        <Text className="text-charcoal-600 mt-4 text-center">
          Opening Stripe setup…
        </Text>
      </View>
    </SafeAreaView>
  );
}
