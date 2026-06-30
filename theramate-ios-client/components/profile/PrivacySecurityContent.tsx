import React from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { FileText, Globe, MapPin, Shield } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { AppStackHeader, AppScreen } from "@/components/navigation";
import {
  buildUsersPreferencesUpdate,
  loadProfilePreferences,
  type ProfilePreferencesViewModel,
} from "@/lib/userPreferences";
import {
  fetchLocationConsent,
  submitDsarRequest,
  withdrawLocationConsent,
} from "@/lib/api/dsar";

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
  const { signOut, userProfile, updateProfile, refreshProfile, user } =
    useAuth();
  const [saving, setSaving] = React.useState(false);
  const [dsarNotes, setDsarNotes] = React.useState("");
  const [dsarLoading, setDsarLoading] = React.useState<
    "access" | "erasure" | "location" | null
  >(null);
  const [locationConsented, setLocationConsented] = React.useState<
    boolean | null
  >(null);
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

  React.useEffect(() => {
    if (!user?.id) {
      setLocationConsented(null);
      return;
    }
    void fetchLocationConsent(user.id).then(({ consented }) => {
      setLocationConsented(consented);
    });
  }, [user?.id]);

  const submitDsar = async (type: "access" | "erasure") => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to submit a request.");
      return;
    }
    setDsarLoading(type);
    try {
      const res = await submitDsarRequest({
        userId: user.id,
        requestType: type,
        notes: dsarNotes,
      });
      if (!res.ok) {
        Alert.alert("Request failed", res.error);
        return;
      }
      setDsarNotes("");
      Alert.alert(
        "Request submitted",
        "We will respond by email. We may contact you to verify your identity.",
      );
    } finally {
      setDsarLoading(null);
    }
  };

  const onWithdrawLocation = () => {
    if (!user?.id) return;
    Alert.alert(
      "Withdraw location consent?",
      "Location-based matching will be disabled. You can still enter addresses manually.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            setDsarLoading("location");
            try {
              const res = await withdrawLocationConsent(user.id);
              if (!res.ok) {
                Alert.alert("Could not withdraw", res.error);
                return;
              }
              setLocationConsented(false);
              Alert.alert(
                "Consent withdrawn",
                "Location tracking has been disabled for your account.",
              );
            } finally {
              setDsarLoading(null);
            }
          },
        },
      ],
    );
  };

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
    <AppScreen>
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

        <Card variant="default" padding="md" className="mt-4">
          <Text className="text-charcoal-900 font-semibold mb-1">
            Your data rights
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3 leading-5">
            Request a copy of your data or account deletion (subject to legal
            exemptions). Optional notes help us locate your records.
          </Text>
          <TextInput
            value={dsarNotes}
            onChangeText={setDsarNotes}
            placeholder="Additional details (optional)"
            placeholderTextColor={Colors.charcoal[400]}
            className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
            multiline
          />
          <Button
            variant="primary"
            className="mb-2"
            disabled={dsarLoading !== null}
            onPress={() => void submitDsar("access")}
          >
            {dsarLoading === "access" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              "Request data export"
            )}
          </Button>
          <Button
            variant="outline"
            disabled={dsarLoading !== null}
            onPress={() => void submitDsar("erasure")}
          >
            {dsarLoading === "erasure" ? (
              <ActivityIndicator color={Colors.sage[500]} />
            ) : (
              "Request account deletion"
            )}
          </Button>
        </Card>

        <Card variant="default" padding="md" className="mt-4">
          <View className="flex-row items-center mb-2">
            <MapPin size={18} color={Colors.charcoal[500]} />
            <Text className="text-charcoal-900 font-semibold ml-2">
              Location consent
            </Text>
          </View>
          <Text className="text-charcoal-500 text-sm mb-3 leading-5">
            {locationConsented === null
              ? "Checking consent status…"
              : locationConsented
                ? "Location consent is active for marketplace matching."
                : "Location consent is not granted. Matching uses manual address entry."}
          </Text>
          {locationConsented === true ? (
            <Button
              variant="outline"
              disabled={dsarLoading !== null}
              onPress={onWithdrawLocation}
            >
              {dsarLoading === "location" ? (
                <ActivityIndicator color={Colors.sage[500]} />
              ) : (
                "Withdraw location consent"
              )}
            </Button>
          ) : null}
        </Card>

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
    </AppScreen>
  );
}
