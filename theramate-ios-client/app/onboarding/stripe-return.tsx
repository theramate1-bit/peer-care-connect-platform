import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { isPractitionerPortalRole } from "@/lib/authRoles";
import { getSignedInTabRoot, signedInTabPath } from "@/lib/signedInRoutes";
import { AppScreen } from "@/components/navigation";

export default function OnboardingStripeReturnScreen() {
  const { userId, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const isPractitioner = isPractitionerPortalRole(userProfile?.user_role);

  React.useEffect(() => {
    if (!userId) return;
    void queryClient.invalidateQueries({
      queryKey: ["stripe_connect_status", userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["connect_status", userId],
    });
  }, [userId, queryClient]);

  const openConnect = () => {
    if (isPractitioner) {
      router.replace(signedInTabPath("stripe-connect") as never);
      return;
    }
    router.replace(getSignedInTabRoot() as never);
  };

  return (
    <AppScreen>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Stripe setup received
        </Text>
        <Text className="text-charcoal-500 text-center mt-3 leading-6">
          {isPractitioner
            ? "Your payout account details were submitted to Stripe. Review status on the next screen."
            : "Your payment setup return was received. Continue account setup or go to your dashboard."}
        </Text>
        {isPractitioner ? (
          <Button
            variant="primary"
            className="mt-8 w-full"
            onPress={openConnect}
          >
            View Stripe Connect status
          </Button>
        ) : (
          <Button
            variant="primary"
            className="mt-8 w-full"
            onPress={() => router.replace("/onboarding")}
          >
            Continue onboarding
          </Button>
        )}
        <Button variant="outline" className="mt-3 w-full" onPress={openConnect}>
          {isPractitioner ? "Go to practice home" : "Go to dashboard"}
        </Button>
      </View>
    </AppScreen>
  );
}
