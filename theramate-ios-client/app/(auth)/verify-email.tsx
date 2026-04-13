import React from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { AuthBackHeader } from "@/components/AuthBackHeader";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { authHelpers } from "@/lib/supabase";

export default function VerifyEmailScreen() {
  const { refreshProfile } = useAuth();
  const [checking, setChecking] = React.useState(false);
  const [autoChecking, setAutoChecking] = React.useState(true);

  const checkNow = React.useCallback(
    async (showAlertOnPending = true) => {
      setChecking(true);
      try {
        const { user, error } = await authHelpers.getUser();
        if (error) {
          if (showAlertOnPending) {
            Alert.alert(
              "Could not check verification",
              error.message || "Please try again.",
            );
          }
          return false;
        }
        if (user?.email_confirmed_at) {
          await refreshProfile();
          router.replace("/onboarding");
          return true;
        }
        if (showAlertOnPending) {
          Alert.alert(
            "Not verified yet",
            "Please open the verification link in your email first.",
          );
        }
        return false;
      } finally {
        setChecking(false);
      }
    },
    [refreshProfile],
  );

  React.useEffect(() => {
    let active = true;
    const timer = setInterval(() => {
      if (!active || !autoChecking) return;
      void checkNow(false);
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [autoChecking, checkNow]);

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="px-6 pt-2 pb-2">
        <AuthBackHeader fallbackHref="/login" label="Sign in" />
      </View>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Verify your email
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Use the link we emailed you. We auto-check every few seconds.
        </Text>
        {autoChecking && (
          <Text className="text-charcoal-400 text-xs text-center mt-2">
            Auto-checking verification status…
          </Text>
        )}

        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => void checkNow(true)}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">
              I verified my email
            </Text>
          )}
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => setAutoChecking((v) => !v)}
        >
          <Text className="text-charcoal-700 font-medium">
            {autoChecking ? "Pause auto-check" : "Resume auto-check"}
          </Text>
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onPress={() => router.replace("/login")}
        >
          <Text className="text-charcoal-700 font-medium">Back to sign in</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
