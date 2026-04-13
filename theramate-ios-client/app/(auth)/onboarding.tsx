import React from "react";
import { View, Text, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { router } from "expo-router";

import { useAuthStore } from "@/stores/authStore";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { AuthBackHeader } from "@/components/AuthBackHeader";

export default function ClientOnboardingScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const [phone, setPhone] = React.useState(userProfile?.phone || "");
  const [location, setLocation] = React.useState(userProfile?.location || "");
  const [saving, setSaving] = React.useState(false);

  const onComplete = async () => {
    setSaving(true);
    try {
      const result = await updateProfile({
        phone: phone.trim() || null,
        location: location.trim() || null,
        onboarding_status: "completed",
        profile_completed: true,
      });
      if (!result.success) {
        Alert.alert(
          "Could not complete onboarding",
          result.error || "Please try again.",
        );
        return;
      }
      await refreshProfile();
      const role = useAuthStore.getState().userProfile?.user_role;
      router.replace(getMainAppHref(role));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="px-6 pt-2">
        <AuthBackHeader fallbackHref="/role-selection" label="Role" />
      </View>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text className="text-charcoal-900 text-3xl font-bold">
          Complete your profile
        </Text>
        <Text className="text-charcoal-500 mt-2 mb-8">
          A few details help us show the most relevant therapists and sessions.
        </Text>

        <Input
          label="Phone number (optional)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label="Location (optional)"
          value={location}
          onChangeText={setLocation}
        />

        <Button
          variant="primary"
          onPress={() => void onComplete()}
          isLoading={saving}
        >
          Continue to app
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
