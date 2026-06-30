import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { verifyPlatformSubscriptionCheckout } from "@/lib/api/platformSubscriptionCheckout";
import { AppScreen } from "@/components/navigation";

export default function SubscriptionSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [loading, setLoading] = React.useState(true);
  const [ok, setOk] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkoutSessionId =
      typeof session_id === "string" ? session_id.trim() : "";
    if (!checkoutSessionId) {
      setLoading(false);
      setMessage("Missing checkout session. Open Subscription from settings.");
      return;
    }

    let mounted = true;
    void (async () => {
      const res = await verifyPlatformSubscriptionCheckout(checkoutSessionId);
      if (!mounted) return;
      setOk(res.success);
      setMessage(
        res.success
          ? "Your Theramate plan is active."
          : (res.error ??
              "We could not verify checkout yet. Try Verify in settings."),
      );
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [session_id]);

  return (
    <AppScreen>
      <View className="flex-1 px-6 justify-center">
        {loading ? (
          <>
            <ActivityIndicator size="large" color={Colors.sage[500]} />
            <Text className="text-charcoal-500 text-center mt-4">
              Activating your subscription…
            </Text>
          </>
        ) : (
          <>
            <Text className="text-charcoal-900 text-xl font-bold text-center">
              {ok ? "Subscription active" : "Almost there"}
            </Text>
            <Text className="text-charcoal-600 text-center mt-3 leading-6">
              {message}
            </Text>
            <Button
              variant="primary"
              className="mt-8"
              onPress={() => router.replace("/settings/subscription" as never)}
            >
              Subscription & billing
            </Button>
          </>
        )}
      </View>
    </AppScreen>
  );
}
