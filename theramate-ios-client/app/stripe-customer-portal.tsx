import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { ControlledHostedWebView } from "@/components/web/ControlledHostedWebView";
import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { createCustomerPortalSession } from "@/lib/api/subscription";
import { useAuth } from "@/hooks/useAuth";

export default function StripeCustomerPortalScreen() {
  const { isAuthenticated, isInitialized } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await createCustomerPortalSession();
    if (!res.success) {
      setError(res.error);
      setUrl(null);
    } else {
      setUrl(res.url);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      setLoading(false);
      setError("Sign in to manage billing.");
      return;
    }
    void load();
  }, [isAuthenticated, isInitialized, load]);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Billing & payment methods"
        fallbackHref={defaultSignedInProfileHref()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
          <Text className="text-charcoal-500 mt-4 text-center">
            Opening secure Stripe billing…
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-800 text-center leading-6">{error}</Text>
          <TouchableOpacity
            onPress={() => void load()}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
          <Text className="text-charcoal-400 text-xs text-center mt-8 leading-5">
            If you have not subscribed or paid yet, your Stripe customer record may
            not exist. Complete checkout first, or contact support.
          </Text>
        </View>
      ) : url ? (
        <ControlledHostedWebView
          initialUrl={url}
          kind="stripe_portal"
          showToolbar={false}
          onClose={() => router.back()}
        />
      ) : null}
    </SafeAreaView>
  );
}
