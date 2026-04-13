/**
 * Practitioner diary — month calendar + day detail and blocks.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  MapPin,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react-native";
import {
  addDays,
  endOfMonth,
  format,
  parse,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { Calendar as DiaryMonthCalendar, type DateData } from "react-native-calendars";
import type { MarkedDates } from "react-native-calendars/src/types";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerSessions } from "@/hooks/usePractitionerSessions";
import {
  fetchPractitionerCalendarEvents,
  insertPractitionerCalendarBlock,
  deletePractitionerCalendarEvent,
  type CalendarBlockEvent,
} from "@/lib/api/practitionerCalendar";
import {
  getSessionStartDate,
  isDiarySessionVisible,
  type SessionWithClient,
} from "@/lib/api/practitionerSessions";
import { PressableCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

function parseLocalDateTime(dateYmd: string, timeHm: string): Date | null {
  if (!DATE_RE.test(dateYmd) || !TIME_RE.test(timeHm)) return null;
  const [Y, M, D] = dateYmd.split("-").map(Number);
  const [hs, ms] = timeHm.split(":");
  const h = parseInt(hs, 10);
  const min = parseInt(ms, 10);
  if (M < 1 || M > 12 || D < 1 || D > 31 || h > 23 || min > 59) return null;
  return new Date(Y, M - 1, D, h, min, 0, 0);
}

function todayYmd(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const StatusBadge = ({ status }: { status: string }) => {
  const key = (status || "scheduled").toLowerCase();
  const config = {
    confirmed: {
      color: "bg-success/10",
      text: "text-success",
      icon: Clock,
      label: "Confirmed",
    },
    scheduled: {
      color: "bg-info/10",
      text: "text-info",
      icon: Clock,
      label: "Scheduled",
    },
    in_progress: {
      color: "bg-warning/10",
      text: "text-warning",
      icon: Clock,
      label: "In progress",
    },
    completed: {
      color: "bg-sage-500/10",
      text: "text-sage-600",
      icon: Clock,
      label: "Completed",
    },
    cancelled: {
      color: "bg-error/10",
      text: "text-error",
      icon: Clock,
      label: "Cancelled",
    },
  }[key] || {
    color: "bg-charcoal-100",
    text: "text-charcoal-500",
    icon: Clock,
    label: (status || "scheduled").replace(/_/g, " "),
  };

  const Icon = config.icon;
  return (
    <View
      className={`flex-row items-center px-2 py-1 rounded-full ${config.color}`}
    >
      <Icon size={12} color={Colors.charcoal[500]} />
      <Text className={`text-xs font-medium ml-1 ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
};

function SessionCard({
  s,
  onPress,
  compactDayHeader,
}: {
  s: SessionWithClient;
  onPress: () => void;
  compactDayHeader?: boolean;
}) {
  const start = getSessionStartDate(s);
  const loc =
    (s.appointment_type || "clinic").toLowerCase() === "mobile"
      ? "Mobile"
      : "Clinic";
  const time = s.start_time?.slice(0, 5) || "";
  const meta = compactDayHeader
    ? `${time} · ${s.duration_minutes} min`
    : `${format(start, "EEE d MMM")} · ${time} · ${s.duration_minutes} min`;
  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-3"
      onPress={onPress}
    >
      <View className="flex-row items-start">
        <View className="w-12 h-12 rounded-xl bg-sage-500/10 items-center justify-center mr-3">
          <Clock size={20} color={Colors.sage[600]} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-charcoal-900 font-semibold">
              {s.client_name}
            </Text>
            <StatusBadge status={s.status || "scheduled"} />
          </View>
          <Text className="text-charcoal-500 text-sm mt-1">{meta}</Text>
          <Text className="text-charcoal-600 text-sm mt-1">
            {s.session_type || "Session"}
          </Text>
          <View className="flex-row items-center mt-2">
            <MapPin size={14} color={Colors.charcoal[400]} />
            <Text className="text-charcoal-400 text-xs ml-1">{loc}</Text>
            {s.visit_address ? (
              <Text
                className="text-charcoal-400 text-xs ml-2 flex-1"
                numberOfLines={1}
              >
                {s.visit_address}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

export default function PractitionerScheduleScreen() {
  const { userId } = useAuth();
  const tabRoot = useTabRoot();
  const queryClient = useQueryClient();

  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [blockTitle, setBlockTitle] = useState("Blocked");
  const [blockDate, setBlockDate] = useState(() => todayYmd());
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockSaving, setBlockSaving] = useState(false);
  const [selectedYmd, setSelectedYmd] = useState(() => todayYmd());
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));

  const {
    data: sessions = [],
    isLoading: loadingSessions,
    refetch: refetchSessions,
    isFetching: fetchingSessions,
  } = usePractitionerSessions(userId);

  const range = useMemo(() => {
    const padStart = startOfDay(addDays(monthCursor, -21));
    const padEnd = addDays(endOfMonth(monthCursor), 21);
    return {
      startIso: padStart.toISOString(),
      endIso: padEnd.toISOString(),
    };
  }, [monthCursor]);

  const blocksQuery = useQuery({
    queryKey: ["practitioner_calendar", userId, range.startIso, range.endIso],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchPractitionerCalendarEvents({
        userId,
        rangeStart: range.startIso,
        rangeEnd: range.endIso,
      });
      if (error) throw error;
      return data.filter((e) =>
        ["block", "unavailable"].includes((e.event_type || "").toLowerCase()),
      );
    },
    enabled: !!userId,
  });

  const blocks = blocksQuery.data ?? [];
  const refetchBlocks = blocksQuery.refetch;
  const fetchingBlocks = blocksQuery.isFetching;
  const blocksInitialLoad = blocksQuery.isLoading;

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: Colors.white,
      calendarBackground: Colors.white,
      textSectionTitleColor: Colors.charcoal[600],
      selectedDayBackgroundColor: Colors.sage[500],
      selectedDayTextColor: Colors.white,
      todayTextColor: Colors.sage[700],
      dayTextColor: Colors.charcoal[900],
      textDisabledColor: Colors.charcoal[300],
      dotColor: Colors.sage[600],
      selectedDotColor: Colors.white,
      arrowColor: Colors.sage[600],
      monthTextColor: Colors.charcoal[900],
      textDayFontWeight: "500" as const,
      textMonthFontWeight: "700" as const,
      textDayHeaderFontWeight: "600" as const,
      textDayFontSize: 15,
      textMonthFontSize: 17,
      textDayHeaderFontSize: 12,
    }),
    [],
  );

  const markedDates = useMemo((): MarkedDates => {
    const sessionCount = new Map<string, number>();
    for (const s of sessions) {
      if (!isDiarySessionVisible(s)) continue;
      sessionCount.set(
        s.session_date,
        (sessionCount.get(s.session_date) ?? 0) + 1,
      );
    }
    const blockCount = new Map<string, number>();
    for (const b of blocks) {
      const k = format(new Date(b.start_time), "yyyy-MM-dd");
      blockCount.set(k, (blockCount.get(k) ?? 0) + 1);
    }
    const keys = new Set<string>([
      ...sessionCount.keys(),
      ...blockCount.keys(),
      selectedYmd,
    ]);
    const out: MarkedDates = {};
    for (const ymd of keys) {
      const hasS = (sessionCount.get(ymd) ?? 0) > 0;
      const hasB = (blockCount.get(ymd) ?? 0) > 0;
      const dots: { color: string }[] = [];
      if (hasS) dots.push({ color: Colors.sage[600] });
      if (hasB) dots.push({ color: Colors.charcoal[400] });
      const selected = ymd === selectedYmd;
      out[ymd] = {
        ...(dots.length > 0 ? { dots, marked: true } : {}),
        ...(selected
          ? {
              selected: true,
              selectedColor: Colors.sage[500],
              selectedTextColor: Colors.white,
            }
          : {}),
      };
    }
    return out;
  }, [sessions, blocks, selectedYmd]);

  const selectedDate = useMemo(
    () => parse(selectedYmd, "yyyy-MM-dd", new Date()),
    [selectedYmd],
  );

  const daySessions = useMemo(() => {
    return sessions
      .filter((s) => isDiarySessionVisible(s) && s.session_date === selectedYmd)
      .sort((a, b) =>
        (a.start_time || "").localeCompare(b.start_time || ""),
      );
  }, [sessions, selectedYmd]);

  const dayBlocks = useMemo(() => {
    return blocks
      .filter(
        (b) => format(new Date(b.start_time), "yyyy-MM-dd") === selectedYmd,
      )
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
  }, [blocks, selectedYmd]);

  const loading = loadingSessions;

  const openAddBlockModal = () => {
    setBlockTitle("Blocked");
    setBlockDate(selectedYmd);
    setBlockStart("12:00");
    setBlockEnd("13:00");
    setAddBlockOpen(true);
  };

  const invalidateCalendar = () => {
    void queryClient.invalidateQueries({
      queryKey: ["practitioner_calendar", userId],
    });
  };

  const onSaveBlock = async () => {
    if (!userId) return;
    const startD = parseLocalDateTime(blockDate, blockStart);
    const endD = parseLocalDateTime(blockDate, blockEnd);
    if (!startD || !endD) {
      Alert.alert(
        "Check date and times",
        "Use date YYYY-MM-DD and 24h times like 09:00 and 17:30.",
      );
      return;
    }
    if (endD.getTime() <= startD.getTime()) {
      Alert.alert("Invalid range", "End time must be after start time.");
      return;
    }
    setBlockSaving(true);
    try {
      const res = await insertPractitionerCalendarBlock({
        userId,
        title: blockTitle,
        startTimeIso: startD.toISOString(),
        endTimeIso: endD.toISOString(),
      });
      if (!res.ok) {
        Alert.alert("Could not save", res.error?.message ?? "");
        return;
      }
      setAddBlockOpen(false);
      invalidateCalendar();
      void refetchBlocks();
    } finally {
      setBlockSaving(false);
    }
  };

  const onDeleteBlock = (b: CalendarBlockEvent) => {
    const prov = (b.provider || "internal").toLowerCase();
    if (prov !== "internal") {
      Alert.alert(
        "Synced block",
        "Remove this block from your connected calendar in app settings.",
      );
      return;
    }
    Alert.alert("Remove blocked time?", b.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void (async () => {
            const res = await deletePractitionerCalendarEvent({ eventId: b.id });
            if (!res.ok) {
              Alert.alert("Error", res.error?.message ?? "");
              return;
            }
            invalidateCalendar();
            void refetchBlocks();
          })(),
      },
    ]);
  };

  const onMonthChange = (m: DateData) => {
    setMonthCursor(new Date(m.year, m.month - 1, 1));
  };

  const onDayPress = (d: DateData) => {
    setSelectedYmd(d.dateString);
    setMonthCursor(new Date(d.year, d.month - 1, 1));
  };

  const tabBarInset = useBottomTabBarHeight();
  const tabBarHeight =
    tabBarInset > 0 ? tabBarInset : Platform.OS === "ios" ? 88 : 70;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={
              (!loadingSessions && fetchingSessions) ||
              (!blocksInitialLoad && fetchingBlocks)
            }
            onRefresh={() => {
              void refetchSessions();
              void refetchBlocks();
            }}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <ScreenHeader
          eyebrow="Practice"
          title="Diary"
          subtitle="Swipe the month, tap a day — then sessions, blocks, and weekly hours."
          right={
            <TouchableOpacity
              onPress={() =>
                router.push(tabPath(tabRoot, "services") as Href)
              }
              className="w-11 h-11 rounded-2xl bg-white border border-cream-200 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Services and availability"
            >
              <SlidersHorizontal size={22} color={Colors.sage[600]} />
            </TouchableOpacity>
          }
        />

        <View className="px-6">
        <View className="mt-4 rounded-2xl border border-cream-200 bg-white overflow-hidden">
          <DiaryMonthCalendar
            markingType="multi-dot"
            firstDay={1}
            enableSwipeMonths
            current={format(monthCursor, "yyyy-MM-dd")}
            markedDates={markedDates}
            onMonthChange={onMonthChange}
            onDayPress={onDayPress}
            theme={calendarTheme}
          />
        </View>

        <View className="flex-row items-center gap-4 mt-3 mb-1">
          <View className="flex-row items-center gap-1.5">
            <View
              style={[styles.legendDot, { backgroundColor: Colors.sage[600] }]}
            />
            <Text className="text-charcoal-600 text-xs">Sessions</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View
              style={[
                styles.legendDot,
                { backgroundColor: Colors.charcoal[400] },
              ]}
            />
            <Text className="text-charcoal-600 text-xs">Blocked</Text>
          </View>
        </View>

          {selectedYmd !== todayYmd() ? (
            <Button
              variant="outline"
              className="mt-3 self-start"
              onPress={() => {
                const t = todayYmd();
                setSelectedYmd(t);
                setMonthCursor(startOfMonth(parse(t, "yyyy-MM-dd", new Date())));
              }}
            >
              <Text className="text-charcoal-800 font-semibold">Jump to today</Text>
            </Button>
          ) : null}

          <Text className="text-charcoal-900 font-bold text-lg mt-6 mb-1">
            {format(selectedDate, "EEEE d MMMM yyyy")}
          </Text>
          <Text className="text-charcoal-500 text-sm mb-4">
            Sessions and blocked time for this day
          </Text>

          {loading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color={Colors.sage[500]} />
            </View>
          ) : (
            <>
              <Text className="text-charcoal-900 font-bold text-lg mt-5 mb-3">
                Sessions
              </Text>
              {daySessions.length === 0 ? (
                <View className="bg-white border border-cream-200 rounded-2xl p-4">
                  <Text className="text-charcoal-500">
                    No sessions on this day.
                  </Text>
                </View>
              ) : (
                daySessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    s={s}
                    compactDayHeader
                    onPress={() =>
                      router.push(
                        tabPath(tabRoot, `bookings/${s.id}`) as Href,
                      )
                    }
                  />
                ))
              )}

              <View className="flex-row items-center justify-between mt-8 mb-3">
                <Text className="text-charcoal-900 font-bold text-lg">
                  Blocked time
                </Text>
              </View>
              <Button
                variant="outline"
                className="mb-4"
                leftIcon={<Plus size={18} color={Colors.sage[600]} />}
                onPress={openAddBlockModal}
              >
                <Text className="text-charcoal-800 font-semibold">
                  Add blocked time
                </Text>
              </Button>
              {dayBlocks.length === 0 ? (
                <View className="bg-white border border-cream-200 rounded-2xl p-4">
                  <Text className="text-charcoal-500">
                    No blocked time on this day.
                  </Text>
                </View>
              ) : (
                dayBlocks.map((b) => {
                  const prov = (b.provider || "internal").toLowerCase();
                  const canDelete = prov === "internal";
                  return (
                    <PressableCard
                      key={b.id}
                      variant="default"
                      padding="md"
                      className="mb-2"
                    >
                      <View className="flex-row items-start">
                        <View className="w-12 h-12 rounded-xl bg-charcoal-50 items-center justify-center mr-3">
                          <Clock size={20} color={Colors.charcoal[500]} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-charcoal-900 font-semibold">
                              {b.title}
                            </Text>
                            {prov !== "internal" ? (
                              <View className="px-2 py-1 rounded-full bg-charcoal-100">
                                <Text className="text-charcoal-600 text-xs font-medium capitalize">
                                  {prov}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text className="text-charcoal-500 text-sm mt-1">
                            {format(new Date(b.start_time), "d MMM, HH:mm")} –{" "}
                            {format(new Date(b.end_time), "HH:mm")}
                          </Text>
                        </View>
                        {canDelete ? (
                          <TouchableOpacity
                            className="p-2 -mr-2"
                            onPress={() => onDeleteBlock(b)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={18} color={Colors.charcoal[500]} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </PressableCard>
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={addBlockOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddBlockOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black/40 justify-end"
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setAddBlockOpen(false)}
          />
          <View className="bg-cream-50 rounded-t-3xl px-5 pt-4 pb-8">
            <Text className="text-charcoal-900 text-lg font-semibold mb-1">
              New blocked time
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              Saved to your diary as an internal block.
            </Text>
            <Text className="text-charcoal-700 text-sm mb-1">Title</Text>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              placeholderTextColor={Colors.charcoal[400]}
              value={blockTitle}
              onChangeText={setBlockTitle}
            />
            <Text className="text-charcoal-700 text-sm mb-1">Date (YYYY-MM-DD)</Text>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              placeholderTextColor={Colors.charcoal[400]}
              value={blockDate}
              onChangeText={setBlockDate}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-charcoal-700 text-sm mb-1">Start (HH:mm)</Text>
                <TextInput
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
                  placeholderTextColor={Colors.charcoal[400]}
                  value={blockStart}
                  onChangeText={setBlockStart}
                  autoCapitalize="none"
                />
              </View>
              <View className="flex-1">
                <Text className="text-charcoal-700 text-sm mb-1">End (HH:mm)</Text>
                <TextInput
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
                  placeholderTextColor={Colors.charcoal[400]}
                  value={blockEnd}
                  onChangeText={setBlockEnd}
                  autoCapitalize="none"
                />
              </View>
            </View>
            <Button
              variant="primary"
              disabled={blockSaving}
              onPress={() => void onSaveBlock()}
            >
              <Text className="text-white font-semibold">
                {blockSaving ? "Saving…" : "Save block"}
              </Text>
            </Button>
            <Button variant="outline" className="mt-3" onPress={() => setAddBlockOpen(false)}>
              <Text className="text-charcoal-800 font-semibold">Cancel</Text>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
