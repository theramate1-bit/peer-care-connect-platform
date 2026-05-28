import React from "react";
import { View, Text, Alert, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FileText, Globe, Shield } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import {
  buildUsersPreferencesUpdate,
  loadProfilePreferences,
  type ProfilePreferencesViewModel,
} from "@/lib/userPreferences";

function PrivacyRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <Text className="text-charcoal-900 font-medium">{label}</Text>
        <Text className="text-charcoal-500 text-sm mt-0.5">{description}</Text>
      </View>
      <Button variant="outline" onPress={() => onToggle(!value)}>
        {value ? "On" : "Off"}
      </Button>
    </View>
  );
}

export function PrivacySecurityContent() {
  const { signOut, userProfile, updateProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [privacyPrefs, setPrivacyPrefs] = React.useState<
    Pick<ProfilePreferencesViewModel, "profileVisible" | "showContactInfo">
  >({
    profileVisible: true,
    showContactInfo: false,
  });

  React.useEffect(() => {
    const merged = loadProfilePreferences(userProfile?.preferences ?? null);
    setPrivacyPrefs({
      profileVisible: merged.profileVisible,
      showContactInfo: merged.showContactInfo,
    });
  }, [userProfile?.preferences]);

  const signOutEverywhere = async () => {
    Alert.alert(
      "Sign out of this device",
      "You will need to sign in again to continue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/login");
          },
        },
      ],
    );
  };

  const savePrivacyPreferences = async () => {
    if (!userProfile?.id) {
      Alert.alert("Unable to save", "Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const merged = loadProfilePreferences(userProfile.preferences ?? null);
      const nextPreferences = {
        ...merged,
        profileVisible: privacyPrefs.profileVisible,
        showContactInfo: privacyPrefs.showContactInfo,
      };
      const result = await updateProfile({
        preferences: buildUsersPreferencesUpdate(
          nextPreferences,
          userProfile.preferences ?? {},
        ) as any,
      });
      if (!result.success) {
        Alert.alert("Unable to save", result.error ?? "Please try again.");
        return;
      }
      await refreshProfile();
      Alert.alert("Saved", "Privacy preferences updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Privacy & security"
        fallbackHref={defaultSignedInProfileHref()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="default" padding="md" className="mb-4">
          <View className="flex-row items-center">
            <Shield size={18} color={Colors.charcoal[500]} />
            <Text className="text-charcoal-900 font-semibold ml-2">
              Account security
            </Text>
          </View>
          <Text className="text-charcoal-600 mt-2">
            Keep your account secure by using a strong password and signing out
            on shared devices.
          </Text>
        </Card>

        <Button variant="outline" onPress={() => void signOutEverywhere()}>
          Sign out on this device
        </Button>

        <Card variant="default" padding="md" className="mt-4">
          <Text className="text-charcoal-900 font-semibold mb-1">
            Profile privacy
          </Text>
          <Text className="text-charcoal-500 text-sm mb-2">
            Profile visibility is stored on your account and applies across
            devices.
          </Text>
          <PrivacyRow
            label="Profile visible to practitioners"
            description="Allow practitioners you work with to view your profile."
            value={privacyPrefs.profileVisible}
            onToggle={(next) =>
              setPrivacyPrefs((prev) => ({ ...prev, profileVisible: next }))
            }
          />
          <View className="h-px bg-cream-200" />
          <PrivacyRow
            label="Show contact details"
            description="Share your phone and email with your practitioner."
            value={privacyPrefs.showContactInfo}
            onToggle={(next) =>
              setPrivacyPrefs((prev) => ({ ...prev, showContactInfo: next }))
            }
          />
          <Button
            variant="primary"
            className="mt-3"
            onPress={() => void savePrivacyPreferences()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              "Save privacy settings"
            )}
          </Button>
        </Card>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<FileText size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/settings/privacy" as never)}
        >
          Privacy settings hub
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<Globe size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/privacy")}
        >
          Privacy policy (in app)
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<FileText size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/terms")}
        >
          Terms of service
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<FileText size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/cookies")}
        >
          Cookie policy
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<FileText size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/dpa")}
        >
          Data processing (practitioners)
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
