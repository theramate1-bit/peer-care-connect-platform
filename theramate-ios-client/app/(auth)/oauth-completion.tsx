import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function OAuthCompletionScreen() {
  const { isInitialized } = useAuth();
  const [statusMessage, setStatusMessage] = React.useState(
    "Completing sign-in…",
  );
  const [timedOut, setTimedOut] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [fatalError, setFatalError] = React.useState<string | null>(null);

  const runFlow = React.useCallback(async () => {
    setTimedOut(false);
    setFatalError(null);
    setStatusMessage("Completing sign-in…");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        setFatalError(sessionError?.message || "No active session found.");
        return;
      }

      const userId = sessionData.session.user.id;
      setStatusMessage("Loading your profile…");

      let profile: {
        user_role?: string | null;
        onboarding_status?: string | null;
      } | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { data, error } = await supabase
          .from("users")
          .select("user_role,onboarding_status")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          setFatalError(error.message);
          return;
        }
        if (data) {
          profile = data;
          break;
        }
        await sleep(500);
      }

      if (!profile || !profile.user_role) {
        setStatusMessage("Selecting account role…");
        router.replace("/(auth)/role-selection");
        return;
      }

      if (profile.onboarding_status !== "completed") {
        setStatusMessage("Opening onboarding…");
        router.replace("/(auth)/onboarding");
        return;
      }

      setStatusMessage("Opening your dashboard…");
      router.replace("/(tabs)");
    } catch (e: any) {
      setFatalError(e?.message || "Could not finish sign-in.");
    }
  }, []);

  React.useEffect(() => {
    if (!isInitialized) return;
    void runFlow();
  }, [isInitialized, runFlow]);

  React.useEffect(() => {
    if (fatalError) return;
    const t = setTimeout(() => {
      setTimedOut(true);
      setStatusMessage("Sign-in is taking longer than expected.");
    }, 15000);
    return () => clearTimeout(t);
  }, [fatalError]);

  const onRetry = async () => {
    setIsRetrying(true);
    try {
      await runFlow();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color={Colors.sage[500]} />
        <Text className="text-charcoal-600 mt-4 text-center">
          {statusMessage}
        </Text>

        {fatalError && (
          <View className="w-full mt-6">
            <View className="bg-errorLight px-4 py-3 rounded-lg mb-3">
              <Text className="text-error text-sm">{fatalError}</Text>
            </View>
            <Button
              variant="primary"
              onPress={() => void onRetry()}
              isLoading={isRetrying}
            >
              Retry
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => router.replace("/(auth)/login")}
            >
              Back to sign in
            </Button>
          </View>
        )}

        {!fatalError && timedOut && (
          <View className="w-full mt-6">
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
              <Text className="text-white font-semibold">Back to sign in</Text>
            </Button>
          </View>
        )}

        {!fatalError && !timedOut && isRetrying && (
          <View className="w-full mt-6">
            <Button
              variant="primary"
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text className="text-white font-semibold">Back to sign in</Text>
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
