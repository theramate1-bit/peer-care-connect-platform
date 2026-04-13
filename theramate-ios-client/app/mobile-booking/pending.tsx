import React from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getStashedMobileCheckoutUrl } from "@/lib/mobileCheckoutUrlCache";
import { openHostedWebSession } from "@/lib/openHostedWeb";
export default function MobileBookingPendingScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { requestId, checkoutSessionId, checkoutUrl } = useLocalSearchParams<{
    requestId?: string;
    checkoutSessionId?: string;
    checkoutUrl?: string;
  }>();
  const [checking, setChecking] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const requestIdValue = typeof requestId === "string" ? requestId : "";
  const checkoutSessionIdValue =
    typeof checkoutSessionId === "string" ? checkoutSessionId : "";
  const checkoutUrlValue = typeof checkoutUrl === "string" ? checkoutUrl : "";

  const confirmPayment = async () => {
    if (!requestIdValue || !checkoutSessionIdValue) {
      setStatusMessage(
        "Missing checkout details. Please check your mobile requests list.",
      );
      return;
    }
    setChecking(true);
    setStatusMessage("Verifying payment status...");
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-payment",
        {
          body: {
            action: "confirm-mobile-checkout-session",
            request_id: requestIdValue,
            checkout_session_id: checkoutSessionIdValue,
          },
        },
      );
      if (error) {
        setStatusMessage(error.message || "Could not verify payment yet.");
        return;
      }
      const payload = (data || {}) as {
        success?: boolean;
        error?: string;
        payment_status?: string;
      };
      if (!payload.success) {
        setStatusMessage(
          payload.error ||
            "Payment not confirmed yet. Please try again in a moment.",
        );
        return;
      }
      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: ["client_mobile_requests", userId],
        });
      }
      router.replace(`/profile/mobile-requests/${requestIdValue}`);
    } finally {
      setChecking(false);
    }
  };

  const reopenCheckout = () => {
    const url =
      checkoutUrlValue ||
      (requestIdValue ? getStashedMobileCheckoutUrl(requestIdValue) : "") ||
      "";
    if (!url) {
      Alert.alert(
        "Missing checkout link",
        "Please return to your mobile requests and retry payment.",
      );
      return;
    }
    openHostedWebSession({ kind: "stripe_checkout", url });
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Complete mobile payment
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Finish checkout in the app, then return here to confirm your request
          status.
        </Text>

        {checking ? (
          <ActivityIndicator className="mt-5" color={Colors.sage[500]} />
        ) : null}
        {statusMessage ? (
          <View className="bg-white border border-cream-200 rounded-xl px-4 py-3 mt-5 w-full">
            <Text className="text-charcoal-700 text-center">
              {statusMessage}
            </Text>
          </View>
        ) : null}

        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => void confirmPayment()}
          isLoading={checking}
        >
          I completed payment
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => reopenCheckout()}
          disabled={!checkoutUrlValue}
        >
          Reopen checkout
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace("/profile/mobile-requests")}
        >
          View my mobile requests
        </Button>
      </View>
    </SafeAreaView>
  );
}
