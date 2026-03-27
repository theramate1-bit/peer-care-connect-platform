import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function MobileBookingSuccessScreen() {
  const { sessionId, mobile_request_id, mobile_checkout_session_id } =
    useLocalSearchParams<{
      sessionId?: string;
      mobile_request_id?: string;
      mobile_checkout_session_id?: string;
    }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = React.useState(false);
  const [verificationMessage, setVerificationMessage] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    const requestId =
      typeof mobile_request_id === "string" ? mobile_request_id : "";
    const checkoutSessionId =
      typeof mobile_checkout_session_id === "string"
        ? mobile_checkout_session_id
        : "";
    if (!requestId || !checkoutSessionId) return;

    let mounted = true;
    void (async () => {
      setVerifying(true);
      setVerificationMessage("Verifying your mobile request payment...");
      try {
        const { data, error } = await supabase.functions.invoke(
          "stripe-payment",
          {
            body: {
              action: "confirm-mobile-checkout-session",
              request_id: requestId,
              checkout_session_id: checkoutSessionId,
            },
          },
        );
        if (!mounted) return;
        if (error) {
          setVerificationMessage(
            error.message || "Could not confirm payment yet.",
          );
          return;
        }
        const payload = (data || {}) as {
          success?: boolean;
          status?: string;
          payment_status?: string;
          error?: string;
        };
        if (payload.success) {
          setVerificationMessage(
            `Mobile request confirmed (${payload.payment_status || payload.status || "held"}).`,
          );
          if (userId) {
            await queryClient.invalidateQueries({
              queryKey: ["client_mobile_requests", userId],
            });
          }
        } else {
          setVerificationMessage(
            payload.error || "Payment confirmation is still pending.",
          );
        }
      } finally {
        if (mounted) setVerifying(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [mobile_checkout_session_id, mobile_request_id, queryClient, userId]);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Payment received
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Your booking has been submitted. You can view status and updates in
          your sessions.
        </Text>

        {verificationMessage ? (
          <View className="mt-4 bg-white border border-cream-200 rounded-xl px-4 py-3 w-full">
            {verifying ? <ActivityIndicator color={Colors.sage[500]} /> : null}
            <Text className="text-charcoal-700 text-center mt-2">
              {verificationMessage}
            </Text>
          </View>
        ) : null}

        {sessionId ? (
          <Button
            variant="primary"
            className="mt-8 w-full"
            onPress={() => router.replace(`/(tabs)/bookings/${sessionId}`)}
          >
            View booking details
          </Button>
        ) : (
          <Button
            variant="primary"
            className="mt-8 w-full"
            onPress={() => router.replace("/(tabs)/bookings")}
          >
            Go to sessions
          </Button>
        )}

        {mobile_request_id ? (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onPress={() =>
              router.replace(
                `/(tabs)/profile/mobile-requests/${mobile_request_id}`,
              )
            }
          >
            View mobile request
          </Button>
        ) : null}

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
