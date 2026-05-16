import React from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AuthBackHeader } from "@/components/AuthBackHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function RoleSelectionScreen() {
  const { updateProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [savingPractitioner, setSavingPractitioner] = React.useState(false);

  const chooseClient = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({
        user_role: "client",
        onboarding_status: "pending",
      });
      if (!res.success) {
        Alert.alert("Could not set role", res.error || "Please try again.");
        return;
      }
      await refreshProfile();
      router.replace("/onboarding");
    } finally {
      setSaving(false);
    }
  };

  const choosePractitioner = async () => {
    setSavingPractitioner(true);
    try {
      const res = await updateProfile({
        user_role: "sports_therapist",
        onboarding_status: "pending",
      });
      if (!res.success) {
        Alert.alert("Could not set role", res.error || "Please try again.");
        return;
      }
      await refreshProfile();
      router.replace("/practitioner-onboarding");
    } finally {
      setSavingPractitioner(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="px-6 pt-2">
        <AuthBackHeader fallbackHref="/hero" label="Home" />
      </View>
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-charcoal-900 text-3xl font-bold text-center">
          Choose your role
        </Text>
        <Text className="text-charcoal-500 text-center mt-3">
          Choose whether you book sessions as a client or run your practice as a
          practitioner (same roles as the web app).
        </Text>

        <Button
          variant="primary"
          className="mt-8 w-full"
          onPress={() => void chooseClient()}
          disabled={saving || savingPractitioner}
          isLoading={saving}
        >
          Continue as client
        </Button>

        <Button
          variant="outline"
          className="mt-4 w-full"
          onPress={() => void choosePractitioner()}
          disabled={saving || savingPractitioner}
          isLoading={savingPractitioner}
        >
          Continue as practitioner
        </Button>
      </View>
    </SafeAreaView>
  );
}
