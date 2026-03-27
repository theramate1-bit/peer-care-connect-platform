import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";

import { authHelpers } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [message, setMessage] = React.useState("Completing sign-in...");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const complete = React.useCallback(async () => {
    setErrorMessage(null);
    setMessage("Completing sign-in...");

    if (params.error || params.error_description) {
      setErrorMessage(
        params.error_description ||
          params.error ||
          "Could not complete sign-in.",
      );
      return;
    }

    let callbackUrl: string | null = null;
    if (typeof params.code === "string" && params.code.length > 0) {
      callbackUrl = `${Linking.createURL("/oauth-callback")}?code=${encodeURIComponent(params.code)}`;
    } else {
      callbackUrl = await Linking.getInitialURL();
    }

    if (!callbackUrl) {
      setErrorMessage("Missing callback URL. Please try signing in again.");
      return;
    }

    const { error } = await authHelpers.completeOAuthFromUrl(callbackUrl);
    if (error) {
      setErrorMessage(
        error.message || "Could not complete sign-in. Please try again.",
      );
      return;
    }
    router.replace("/(auth)/oauth-completion");
  }, [params.code, params.error, params.error_description]);

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      await complete();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [complete]);

  const onRetry = async () => {
    setIsRetrying(true);
    try {
      await complete();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color={Colors.sage[500]} />
        <Text className="text-charcoal-600 mt-4 text-center">{message}</Text>
        {errorMessage && (
          <View className="w-full mt-6">
            <View className="bg-errorLight px-4 py-3 rounded-lg mb-3">
              <Text className="text-error text-sm">{errorMessage}</Text>
            </View>
            <Button
              variant="outline"
              onPress={() => void onRetry()}
              isLoading={isRetrying}
            >
              Try again
            </Button>
            <Button
              variant="primary"
              className="mt-3"
              onPress={() => router.replace("/(auth)/login")}
            >
              Back to sign in
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
