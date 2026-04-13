import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";

type AppPrefs = {
  dark_mode: boolean;
  haptics_enabled: boolean;
  analytics_opt_in: boolean;
};

function ToggleRow({
  label,
  desc,
  value,
  onToggle,
}: {
  label: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity className="flex-row items-center py-4" onPress={onToggle}>
      <View className="flex-1 pr-4">
        <Text className="text-charcoal-900 font-medium">{label}</Text>
        <Text className="text-charcoal-500 text-sm mt-0.5">{desc}</Text>
      </View>
      <View
        className={`w-12 h-7 rounded-full px-1 justify-center ${
          value ? "bg-sage-500 items-end" : "bg-cream-300 items-start"
        }`}
      >
        <View className="w-5 h-5 rounded-full bg-white" />
      </View>
    </TouchableOpacity>
  );
}

function initialPrefs(raw: unknown): AppPrefs {
  const defaults: AppPrefs = {
    dark_mode: false,
    haptics_enabled: true,
    analytics_opt_in: true,
  };
  if (!raw || typeof raw !== "object") return defaults;
  const src = raw as Record<string, unknown>;
  return {
    dark_mode:
      typeof src.dark_mode === "boolean" ? src.dark_mode : defaults.dark_mode,
    haptics_enabled:
      typeof src.haptics_enabled === "boolean"
        ? src.haptics_enabled
        : defaults.haptics_enabled,
    analytics_opt_in:
      typeof src.analytics_opt_in === "boolean"
        ? src.analytics_opt_in
        : defaults.analytics_opt_in,
  };
}

export default function AppSettingsScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [prefs, setPrefs] = React.useState<AppPrefs>(
    initialPrefs(userProfile?.preferences ?? null),
  );

  React.useEffect(() => {
    setPrefs(initialPrefs(userProfile?.preferences ?? null));
  }, [userProfile?.preferences]);

  const toggle = (key: keyof AppPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const existing =
        userProfile?.preferences && typeof userProfile.preferences === "object"
          ? (userProfile.preferences as Record<string, unknown>)
          : {};
      const res = await updateProfile({
        preferences: {
          ...existing,
          ...prefs,
        } as any,
      });
      if (!res.success) {
        Alert.alert(
          "Could not save settings",
          res.error || "Please try again.",
        );
        return;
      }
      await refreshProfile();
      Alert.alert("Saved", "App settings updated.");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="App preferences" fallbackHref={defaultSignedInProfileHref()} />

      <View className="px-6 pt-4">
        <Card variant="default" padding="md">
          <ToggleRow
            label="Dark mode preference"
            desc="Stores your preferred theme setting."
            value={prefs.dark_mode}
            onToggle={() => toggle("dark_mode")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Haptics"
            desc="Enable subtle tactile feedback."
            value={prefs.haptics_enabled}
            onToggle={() => toggle("haptics_enabled")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Analytics"
            desc="Help improve the app with anonymized usage data."
            value={prefs.analytics_opt_in}
            onToggle={() => toggle("analytics_opt_in")}
          />
        </Card>

        <Button
          variant="primary"
          className="mt-5"
          onPress={() => void save()}
          isLoading={saving}
        >
          Save settings
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/diagnostics")}
        >
          Open diagnostics
        </Button>
      </View>
    </SafeAreaView>
  );
}
