import React from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function RoleSelectionScreen() {
  const { updateProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = React.useState(false);

  const chooseClient = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({
        user_role: "client",
        onboarding_status: "not_started",
      });
      if (!res.success) {
        Alert.alert("Could not set role", res.error || "Please try again.");
        return;
      }
      await refreshProfile();
      router.replace("/(auth)/onboarding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Choose your role
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Theramate mobile currently supports client journeys.
        </Text>

        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => void chooseClient()}
          disabled={saving}
          isLoading={saving}
        >
          Continue as client
        </Button>
      </View>
    </SafeAreaView>
  );
}
