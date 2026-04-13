/**
 * Weekly availability — edits `practitioner_availability.working_hours` on device.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, CalendarClock } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPractitionerAvailability,
  savePractitionerAvailability,
  type WorkingHoursState,
  type DaySchedule,
} from "@/lib/api/practitionerAvailability";
import { Button } from "@/components/ui/Button";

const ORDER: { key: keyof WorkingHoursState; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

function normalizeTime(t: string): string {
  const s = t.trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":").map((x) => Number.parseInt(x, 10));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return s;
}

export default function PractitionerAvailabilityScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [wh, setWh] = useState<WorkingHoursState | null>(null);
  const [tz, setTz] = useState("Europe/London");
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["practitioner_availability", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await fetchPractitionerAvailability(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (q.data?.working_hours) {
      setWh(q.data.working_hours);
      if (q.data.timezone) setTz(q.data.timezone);
    }
  }, [q.data]);

  const updateDay = (key: keyof WorkingHoursState, patch: Partial<DaySchedule>) => {
    setWh((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], ...patch },
      };
    });
  };

  const onSave = async () => {
    if (!userId || !wh) return;
    setSaving(true);
    try {
      const res = await savePractitionerAvailability({
        userId,
        workingHours: wh,
        timezone: tz,
      });
      if (!res.ok) {
        Alert.alert("Could not save", res.error?.message || "");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_availability", userId],
      });
      Alert.alert("Saved", "Your weekly hours are updated.");
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      >
        <View className="flex-1 px-6 pt-8 items-center justify-center pb-16">
          <Text className="text-charcoal-900 text-xl font-semibold text-center">
            Practitioner sign-in required
          </Text>
          <Text className="text-charcoal-500 text-center mt-3 leading-6">
            Sign in with your practitioner account to manage weekly hours and
            scheduler settings.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.push("/login" as never)}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/register" as never)}
          >
            Create practitioner account
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "profile"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Weekly hours
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Booking grid windows for clients. Open the diary for day detail and
            blocks.
          </Text>
        </View>
      </View>

      {q.isLoading || !wh ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
          <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
            In this app
          </Text>
          <Text className="text-charcoal-600 text-sm leading-5 mb-4">
            These hours control the booking grid for clients. Use 24h format (e.g. 09:00).
          </Text>

          <Text className="text-charcoal-700 text-sm mb-1">Timezone</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-6"
            value={tz}
            onChangeText={setTz}
            placeholder="Europe/London"
            placeholderTextColor={Colors.charcoal[400]}
            autoCapitalize="none"
          />

          {ORDER.map(({ key, label }) => {
            const d = wh[key];
            return (
              <View
                key={key}
                className="bg-white border border-cream-200 rounded-xl p-4 mb-3"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-charcoal-900 font-semibold">{label}</Text>
                  <Switch
                    value={d.enabled}
                    onValueChange={(v) => updateDay(key, { enabled: v })}
                  />
                </View>
                {d.enabled ? (
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-charcoal-500 text-xs mb-1">Start</Text>
                      <TextInput
                        className="border border-cream-200 rounded-lg px-3 py-2 text-charcoal-900"
                        value={d.start}
                        onChangeText={(t) =>
                          updateDay(key, { start: normalizeTime(t) })
                        }
                        placeholder="09:00"
                        placeholderTextColor={Colors.charcoal[400]}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-charcoal-500 text-xs mb-1">End</Text>
                      <TextInput
                        className="border border-cream-200 rounded-lg px-3 py-2 text-charcoal-900"
                        value={d.end}
                        onChangeText={(t) =>
                          updateDay(key, { end: normalizeTime(t) })
                        }
                        placeholder="17:00"
                        placeholderTextColor={Colors.charcoal[400]}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          <Button
            variant="primary"
            disabled={saving}
            isLoading={saving}
            onPress={() => void onSave()}
          >
            Save availability
          </Button>

          <Button
            variant="outline"
            className="mt-8"
            leftIcon={<CalendarClock size={18} color={Colors.sage[600]} />}
            onPress={() =>
              router.push(tabPath(tabRoot, "schedule") as never)
            }
          >
            Diary & schedule
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
