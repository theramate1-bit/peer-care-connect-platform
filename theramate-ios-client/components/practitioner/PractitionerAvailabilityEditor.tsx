/**
 * Shared weekly availability + blocked time editor (web parity: `AvailabilitySettings`
 * opened from practice schedule as a modal).
 */

import React, { useEffect, useMemo, useState } from "react";
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
import { router } from "expo-router";
import { Ban, Clock, CalendarClock } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPractitionerAvailability,
  savePractitionerAvailability,
  DEFAULT_SESSION_DEFAULTS,
  type WorkingHoursState,
  type DaySchedule,
  type SessionDefaults,
} from "@/lib/api/practitionerAvailability";
import { Button } from "@/components/ui/Button";
import { BlockTimeManagerContent } from "@/components/practitioner/BlockTimeManagerContent";

const QUICK_PRESETS = [
  { label: "9 AM – 5 PM", start: "09:00", end: "17:00" },
  { label: "8 AM – 6 PM", start: "08:00", end: "18:00" },
  { label: "10 AM – 6 PM", start: "10:00", end: "18:00" },
  { label: "9 AM – 1 PM", start: "09:00", end: "13:00" },
  { label: "2 PM – 6 PM", start: "14:00", end: "18:00" },
] as const;

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

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

function isValidTimeHHMM(t: string): boolean {
  const s = normalizeTime(t);
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(":").map((x) => Number.parseInt(x, 10));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export type PractitionerAvailabilityEditorProps = {
  /** When false, omit footer “Open diary” (modal from schedule). */
  showOpenDiaryLink?: boolean;
  /** After successful save (e.g. refresh diary calendar). */
  onAfterSave?: () => void;
};

export function PractitionerAvailabilityEditor({
  showOpenDiaryLink = true,
  onAfterSave,
}: PractitionerAvailabilityEditorProps) {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [wh, setWh] = useState<WorkingHoursState | null>(null);
  const [tz, setTz] = useState("Europe/London");
  const [sessionDefaults, setSessionDefaults] = useState<SessionDefaults>(
    DEFAULT_SESSION_DEFAULTS,
  );
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<"hours" | "blocks">("hours");

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
      setSessionDefaults({
        default_session_time: q.data.default_session_time,
        default_duration_minutes: q.data.default_duration_minutes,
        default_session_type: q.data.default_session_type,
      });
    }
  }, [q.data]);

  const updateDay = (
    key: keyof WorkingHoursState,
    patch: Partial<DaySchedule>,
  ) => {
    setWh((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], ...patch },
      };
    });
  };

  const applyPresetToWeekdays = (preset: (typeof QUICK_PRESETS)[number]) => {
    setWh((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      const weekdays: (keyof WorkingHoursState)[] = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
      for (const d of weekdays) {
        next[d] = {
          ...next[d],
          start: preset.start,
          end: preset.end,
          enabled: true,
        };
      }
      return next;
    });
  };

  const durationChips = useMemo(() => {
    const m = sessionDefaults.default_duration_minutes;
    const set = new Set<number>([...DURATION_OPTIONS, m]);
    return Array.from(set).sort((a, b) => a - b);
  }, [sessionDefaults.default_duration_minutes]);

  const onSave = async () => {
    if (!userId || !wh) return;
    if (!isValidTimeHHMM(sessionDefaults.default_session_time)) {
      Alert.alert(
        "Check default start time",
        "Use 24-hour format with hours 00–23 and minutes 00–59 (e.g. 10:00).",
      );
      return;
    }
    const trimmedType = sessionDefaults.default_session_type.trim();
    if (!trimmedType) {
      Alert.alert(
        "Session type",
        "Enter a label for the default session type.",
      );
      return;
    }
    setSaving(true);
    try {
      const res = await savePractitionerAvailability({
        userId,
        workingHours: wh,
        timezone: tz,
        sessionDefaults: {
          ...sessionDefaults,
          default_session_time: normalizeTime(
            sessionDefaults.default_session_time,
          ),
          default_session_type: trimmedType,
        },
      });
      if (!res.ok) {
        Alert.alert("Could not save", res.error?.message || "");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_availability", userId],
      });
      onAfterSave?.();
      Alert.alert(
        "Saved",
        "Your weekly hours and session defaults are updated.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <View className="flex-1 bg-cream-50">
      <View className="flex-row px-4 pt-2 pb-2 gap-2 border-b border-cream-200">
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border ${
            section === "hours"
              ? "bg-sage-500 border-sage-500"
              : "bg-white border-cream-200"
          }`}
          onPress={() => setSection("hours")}
        >
          <Clock
            size={18}
            color={section === "hours" ? Colors.white : Colors.sage[600]}
          />
          <Text
            className={`font-semibold ${
              section === "hours" ? "text-white" : "text-charcoal-800"
            }`}
          >
            Working hours
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border ${
            section === "blocks"
              ? "bg-sage-500 border-sage-500"
              : "bg-white border-cream-200"
          }`}
          onPress={() => setSection("blocks")}
        >
          <Ban
            size={18}
            color={section === "blocks" ? Colors.white : Colors.sage[600]}
          />
          <Text
            className={`font-semibold ${
              section === "blocks" ? "text-white" : "text-charcoal-800"
            }`}
          >
            Blocked time
          </Text>
        </TouchableOpacity>
      </View>

      {section === "blocks" ? (
        <View className="flex-1 px-4 pt-2">
          <BlockTimeManagerContent
            embedded
            onChanged={() => {
              void queryClient.invalidateQueries({
                queryKey: ["practitioner_calendar"],
              });
            }}
          />
        </View>
      ) : null}

      {section === "hours" && (q.isLoading || !wh) ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : null}

      {section === "hours" && wh && !q.isLoading ? (
        <ScrollView
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
            Quick presets (weekdays)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ gap: 8 }}
          >
            {QUICK_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                className="bg-white border border-cream-200 rounded-xl px-3 py-2"
                onPress={() => applyPresetToWeekdays(preset)}
              >
                <Text className="text-charcoal-800 font-medium text-sm">
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text className="text-charcoal-600 text-sm leading-5 mb-4">
            Recurring weekly schedule for bookings. Use 24h format (e.g. 09:00).
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

          <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
            Default for new bookings
          </Text>
          <Text className="text-charcoal-600 text-sm leading-5 mb-3">
            Used as defaults when creating sessions; kept in sync with the web
            availability screen.
          </Text>

          <Text className="text-charcoal-700 text-sm mb-1">
            Default start time
          </Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
            value={sessionDefaults.default_session_time}
            onChangeText={(t) =>
              setSessionDefaults((s) => ({
                ...s,
                default_session_time: t,
              }))
            }
            placeholder="10:00"
            placeholderTextColor={Colors.charcoal[400]}
            keyboardType="numbers-and-punctuation"
          />

          <Text className="text-charcoal-700 text-sm mb-2">
            Default duration
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {durationChips.map((mins) => {
              const selected =
                sessionDefaults.default_duration_minutes === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  className={`px-3 py-2 rounded-xl border ${
                    selected
                      ? "bg-sage-500 border-sage-500"
                      : "bg-white border-cream-200"
                  }`}
                  onPress={() =>
                    setSessionDefaults((s) => ({
                      ...s,
                      default_duration_minutes: mins,
                    }))
                  }
                >
                  <Text
                    className={`font-medium ${
                      selected ? "text-white" : "text-charcoal-800"
                    }`}
                  >
                    {mins} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-charcoal-700 text-sm mb-1">
            Session type label
          </Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-6"
            value={sessionDefaults.default_session_type}
            onChangeText={(t) =>
              setSessionDefaults((s) => ({
                ...s,
                default_session_type: t,
              }))
            }
            placeholder="Treatment Session"
            placeholderTextColor={Colors.charcoal[400]}
          />

          {ORDER.map(({ key, label }) => {
            const d = wh[key];
            return (
              <View
                key={key}
                className="bg-white border border-cream-200 rounded-xl p-4 mb-3"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-charcoal-900 font-semibold">
                    {label}
                  </Text>
                  <Switch
                    value={d.enabled}
                    onValueChange={(v) => updateDay(key, { enabled: v })}
                  />
                </View>
                {d.enabled ? (
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-charcoal-500 text-xs mb-1">
                        Start
                      </Text>
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
                      <Text className="text-charcoal-500 text-xs mb-1">
                        End
                      </Text>
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

          {showOpenDiaryLink ? (
            <Button
              variant="outline"
              className="mt-8"
              leftIcon={<CalendarClock size={18} color={Colors.sage[600]} />}
              onPress={() => router.push(tabPath(tabRoot, "schedule") as never)}
            >
              Open diary
            </Button>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}
