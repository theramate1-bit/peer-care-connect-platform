import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { getSignedInTabRoot, signedInTabPath } from "@/lib/signedInRoutes";

export default function BookingSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [loading, setLoading] = React.useState(false);
  const [resolvedSessionId, setResolvedSessionId] = React.useState<
    string | null
  >(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkoutSessionId = typeof session_id === "string" ? session_id : "";
    if (!checkoutSessionId) return;

    let mounted = true;
    void (async () => {
      setLoading(true);
      setMessage("Finalizing your booking status...");
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("session_id")
          .eq("checkout_session_id", checkoutSessionId)
          .maybeSingle();
        if (!mounted) return;
        if (error) {
          setMessage(
            error.message ||
              "Payment succeeded. Booking will appear in sessions shortly.",
          );
          return;
        }
        const sid =
          (data as { session_id?: string } | null)?.session_id || null;
        if (sid) {
          setResolvedSessionId(sid);
          setMessage("Payment confirmed and booking created.");
        } else {
          setMessage("Payment confirmed. Booking details are syncing.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session_id]);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Booking confirmed
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Thank you. Your payment was successful.
        </Text>
        {loading ? (
          <ActivityIndicator className="mt-4" color={Colors.sage[500]} />
        ) : null}
        {message ? (
          <View className="mt-4 bg-white border border-cream-200 rounded-xl px-4 py-3 w-full">
            <Text className="text-charcoal-700 text-center">{message}</Text>
          </View>
        ) : null}

        {resolvedSessionId ? (
          <Button
            variant="primary"
            className="mt-8 w-full"
            onPress={() =>
              router.replace(
                signedInTabPath(`bookings/${resolvedSessionId}`) as never,
              )
            }
          >
            View booking details
          </Button>
        ) : (
          <Button
            variant="primary"
            className="mt-8 w-full"
            onPress={() =>
              router.replace(signedInTabPath("bookings") as never)
            }
          >
            Go to sessions
          </Button>
        )}
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace(getSignedInTabRoot() as never)}
        >
          Back to home
        </Button>
      </View>
    </SafeAreaView>
  );
}
