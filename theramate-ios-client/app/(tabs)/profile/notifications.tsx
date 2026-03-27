import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type NotificationPrefs = {
  notify_booking_updates: boolean;
  notify_messages: boolean;
  notify_reminders: boolean;
  notify_marketing: boolean;
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

function getInitialPrefs(raw: unknown): NotificationPrefs {
  const base: NotificationPrefs = {
    notify_booking_updates: true,
    notify_messages: true,
    notify_reminders: true,
    notify_marketing: false,
  };
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  return {
    notify_booking_updates:
      typeof src.notify_booking_updates === "boolean"
        ? src.notify_booking_updates
        : base.notify_booking_updates,
    notify_messages:
      typeof src.notify_messages === "boolean"
        ? src.notify_messages
        : base.notify_messages,
    notify_reminders:
      typeof src.notify_reminders === "boolean"
        ? src.notify_reminders
        : base.notify_reminders,
    notify_marketing:
      typeof src.notify_marketing === "boolean"
        ? src.notify_marketing
        : base.notify_marketing,
  };
}

export default function NotificationSettingsScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(
    getInitialPrefs(userProfile?.preferences ?? null),
  );

  React.useEffect(() => {
    setPrefs(getInitialPrefs(userProfile?.preferences ?? null));
  }, [userProfile?.preferences]);

  const update = (key: keyof NotificationPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const existing =
        userProfile?.preferences && typeof userProfile.preferences === "object"
          ? (userProfile.preferences as Record<string, unknown>)
          : {};
      const result = await updateProfile({
        preferences: {
          ...existing,
          ...prefs,
        } as any,
      });
      if (!result.success) {
        Alert.alert(
          "Could not save settings",
          result.error || "Please try again.",
        );
        return;
      }
      await refreshProfile();
      Alert.alert("Saved", "Notification preferences updated.");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Notifications
        </Text>
      </View>

      <View className="px-6 pt-4">
        <Card variant="default" padding="md">
          <ToggleRow
            label="Booking updates"
            desc="Changes to bookings, approvals, and cancellations."
            value={prefs.notify_booking_updates}
            onToggle={() => update("notify_booking_updates")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Messages"
            desc="New chat messages from therapists."
            value={prefs.notify_messages}
            onToggle={() => update("notify_messages")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Session reminders"
            desc="Reminders before upcoming sessions."
            value={prefs.notify_reminders}
            onToggle={() => update("notify_reminders")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Product updates"
            desc="Occasional updates and product announcements."
            value={prefs.notify_marketing}
            onToggle={() => update("notify_marketing")}
          />
        </Card>

        <Button
          variant="primary"
          className="mt-5"
          onPress={() => void onSave()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Save preferences</Text>
          )}
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/notifications")}
        >
          Open notifications inbox
        </Button>
      </View>
    </SafeAreaView>
  );
}
