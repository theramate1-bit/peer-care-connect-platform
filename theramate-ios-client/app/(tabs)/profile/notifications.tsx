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

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildNotificationPreferencesUpsert,
  buildUsersPreferencesUpdate,
  loadProfilePreferences,
  type ProfilePreferencesViewModel,
} from "@/lib/userPreferences";

type NotificationPrefs = Pick<
  ProfilePreferencesViewModel,
  | "emailNotifications"
  | "smsNotifications"
  | "calendarReminders"
  | "receiveInAppNotifications"
  | "marketingEmails"
  | "platformUpdates"
>;

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

const defaultPrefs: NotificationPrefs = {
  emailNotifications: true,
  smsNotifications: false,
  calendarReminders: true,
  receiveInAppNotifications: true,
  marketingEmails: false,
  platformUpdates: false,
};

export default function NotificationSettingsScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(defaultPrefs);

  React.useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (!userProfile?.id) {
        setPrefs(defaultPrefs);
        return;
      }
      const { data: notificationPrefs } = await supabase
        .from("notification_preferences")
        .select("email, sms, in_app, email_reminders")
        .eq("user_id", userProfile.id)
        .maybeSingle();
      if (canceled) return;
      const merged = loadProfilePreferences(
        userProfile.preferences ?? null,
        notificationPrefs,
      );
      setPrefs({
        emailNotifications: merged.emailNotifications,
        smsNotifications: merged.smsNotifications,
        calendarReminders: merged.calendarReminders,
        receiveInAppNotifications: merged.receiveInAppNotifications,
        marketingEmails: merged.marketingEmails,
        platformUpdates: merged.platformUpdates,
      });
    };
    void load();
    return () => {
      canceled = true;
    };
  }, [userProfile?.id, userProfile?.preferences]);

  const update = (key: keyof NotificationPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      if (!userProfile?.id) {
        Alert.alert("Could not save settings", "Please sign in again.");
        return;
      }
      const merged = loadProfilePreferences(userProfile.preferences ?? null);
      const nextPreferences: ProfilePreferencesViewModel = {
        ...merged,
        emailNotifications: prefs.emailNotifications,
        smsNotifications: prefs.smsNotifications,
        calendarReminders: prefs.calendarReminders,
        receiveInAppNotifications: prefs.receiveInAppNotifications,
        marketingEmails: prefs.marketingEmails,
        platformUpdates: prefs.platformUpdates,
      };
      const result = await updateProfile({
        preferences: buildUsersPreferencesUpdate(
          nextPreferences,
          userProfile.preferences ?? {},
        ) as any,
      });
      if (!result.success) {
        Alert.alert(
          "Could not save settings",
          result.error || "Please try again.",
        );
        return;
      }
      const { error: notificationError } = await supabase
        .from("notification_preferences")
        .upsert(
          buildNotificationPreferencesUpsert({
            userId: userProfile.id,
            preferences: nextPreferences,
            email: userProfile.email ?? null,
            phone: userProfile.phone ?? null,
          }),
          { onConflict: "user_id" },
        );
      if (notificationError) {
        Alert.alert("Could not save settings", notificationError.message);
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
      <AppStackHeader
        title="Notification preferences"
        fallbackHref={defaultSignedInProfileHref()}
      />

      <View className="px-6 pt-4">
        <Card variant="default" padding="md">
          <ToggleRow
            label="Booking updates"
            desc="Changes to bookings, approvals, and cancellations."
            value={prefs.emailNotifications}
            onToggle={() => update("emailNotifications")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="SMS updates"
            desc="Text alerts for key booking changes."
            value={prefs.smsNotifications}
            onToggle={() => update("smsNotifications")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Messages"
            desc="New chat messages from therapists."
            value={prefs.receiveInAppNotifications}
            onToggle={() => update("receiveInAppNotifications")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Session reminders"
            desc="Reminders before upcoming sessions."
            value={prefs.calendarReminders}
            onToggle={() => update("calendarReminders")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Product updates"
            desc="Occasional updates and product announcements."
            value={prefs.marketingEmails}
            onToggle={() => update("marketingEmails")}
          />
          <View className="h-px bg-cream-200" />
          <ToggleRow
            label="Platform updates"
            desc="Product changes and release improvements."
            value={prefs.platformUpdates}
            onToggle={() => update("platformUpdates")}
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
