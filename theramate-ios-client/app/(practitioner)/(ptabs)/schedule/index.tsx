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
  Platform,
  StyleSheet,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, type Href } from "expo-router";
import {
  AppScreen,
  AppStackHeader,
  MainTabHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Link2,
  MapPin,
  Plus,
  Settings,
  SlidersHorizontal,
  Trash2,
} from "lucide-react-native";
import {
  addDays,
  addMinutes,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  Calendar as DiaryMonthCalendar,
  type DateData,
} from "react-native-calendars";
import type { MarkedDates } from "react-native-calendars/src/types";

import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerDiaryRealtime } from "@/hooks/usePractitionerDiaryRealtime";
import { usePractitionerSessions } from "@/hooks/usePractitionerSessions";
import { supabase } from "@/lib/supabase";
import {
  fetchPractitionerCalendarEvents,
  deletePractitionerCalendarEvent,
  type CalendarBlockEvent,
} from "@/lib/api/practitionerCalendar";
import {
  getSessionDiaryCategory,
  getSessionStartDate,
  isDiarySessionVisible,
  type DiarySessionCategory,
  type SessionWithClient,
} from "@/lib/api/practitionerSessions";
import { PressableCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BlockTimeManagerContent } from "@/components/practitioner/BlockTimeManagerContent";
import { PractitionerAvailabilityEditor } from "@/components/practitioner/PractitionerAvailabilityEditor";

function todayYmd(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type DiaryViewMode = "month" | "week" | "day";

function categoryLabel(cat: DiarySessionCategory): string {
  if (cat === "peer") return "Treatment exchange";
  if (cat === "guest") return "Guest";
  return "Client";
}

function CategoryBadge({ cat }: { cat: DiarySessionCategory }) {
  const label = categoryLabel(cat);
  const bg =
    cat === "peer"
      ? "bg-blue-50 border border-blue-200"
      : cat === "guest"
        ? "bg-charcoal-100 border border-charcoal-200"
        : "bg-sage-500/10 border border-sage-200";
  const text =
    cat === "peer"
      ? "text-blue-800"
      : cat === "guest"
        ? "text-charcoal-800"
        : "text-sage-800";
  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
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
            <View className="flex-row items-center gap-2">
              <CategoryBadge cat={getSessionDiaryCategory(s)} />
              <StatusBadge status={s.status || "scheduled"} />
            </View>
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

  const [blockManagerOpen, setBlockManagerOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [selectedYmd, setSelectedYmd] = useState(() => todayYmd());
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(new Date()),
  );
  /** Default week view matches web `BookingCalendar` therapist default. */
  const [viewMode, setViewMode] = useState<DiaryViewMode>("week");
  const [categoryFilter, setCategoryFilter] = useState<DiarySessionCategory[]>([
    "client",
    "peer",
    "guest",
  ]);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: sessions = [],
    isLoading: loadingSessions,
    refetch: refetchSessions,
    isFetching: fetchingSessions,
  } = usePractitionerSessions(userId);

  usePractitionerDiaryRealtime(userId);

  const bookingSlugQuery = useQuery({
    queryKey: ["practitioner_booking_slug", userId],
    queryFn: async () => {
      if (!userId) return null as string | null;
      const { data, error } = await supabase
        .from("users")
        .select("booking_slug")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const slug = data?.booking_slug;
      return typeof slug === "string" && slug.trim() !== ""
        ? slug.trim()
        : null;
    },
    enabled: !!userId,
  });

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (!isDiarySessionVisible(s)) return false;
      const cat = getSessionDiaryCategory(s);
      if (!categoryFilter.includes(cat)) return false;
      if (!q) return true;
      return (
        s.client_name.toLowerCase().includes(q) ||
        (s.session_type || "").toLowerCase().includes(q) ||
        (s.visit_address || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, categoryFilter, searchQuery]);

  const sessionsForCalendarDots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (!isDiarySessionVisible(s)) return false;
      const cat = getSessionDiaryCategory(s);
      if (!categoryFilter.includes(cat)) return false;
      if (!q) return true;
      return (
        s.client_name.toLowerCase().includes(q) ||
        (s.session_type || "").toLowerCase().includes(q) ||
        (s.visit_address || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, categoryFilter, searchQuery]);

  /** Same idea as web `getCategoryCount` — totals across the loaded list. */
  const categoryCounts = useMemo(() => {
    const base = sessions.filter((s) => isDiarySessionVisible(s));
    return {
      client: base.filter((s) => getSessionDiaryCategory(s) === "client")
        .length,
      peer: base.filter((s) => getSessionDiaryCategory(s) === "peer").length,
      guest: base.filter((s) => getSessionDiaryCategory(s) === "guest").length,
    };
  }, [sessions]);

  const weekRange = useMemo(() => {
    const d = parse(selectedYmd, "yyyy-MM-dd", new Date());
    return {
      start: startOfWeek(d, { weekStartsOn: 1 }),
      end: endOfWeek(d, { weekStartsOn: 1 }),
    };
  }, [selectedYmd]);

  const weekSessionsByDay = useMemo(() => {
    const map = new Map<string, SessionWithClient[]>();
    for (const day of eachDayOfInterval({
      start: weekRange.start,
      end: weekRange.end,
    })) {
      map.set(format(day, "yyyy-MM-dd"), []);
    }
    for (const s of filteredSessions) {
      const list = map.get(s.session_date);
      if (list) list.push(s);
    }
    for (const [, list] of map) {
      list.sort((a, b) =>
        (a.start_time || "").localeCompare(b.start_time || ""),
      );
    }
    return map;
  }, [filteredSessions, weekRange]);

  const toggleCategory = (c: DiarySessionCategory) => {
    setCategoryFilter((prev) => {
      if (prev.includes(c) && prev.length === 1) return prev;
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      return [...prev, c];
    });
  };

  const shiftSelectedDay = (delta: number) => {
    const d = parse(selectedYmd, "yyyy-MM-dd", new Date());
    const n = addDays(d, delta);
    const ymd = format(n, "yyyy-MM-dd");
    setSelectedYmd(ymd);
    setMonthCursor(startOfMonth(n));
  };

  const shiftWeek = (delta: number) => {
    const d = parse(selectedYmd, "yyyy-MM-dd", new Date());
    const n = addWeeks(d, delta);
    const start = startOfWeek(n, { weekStartsOn: 1 });
    setSelectedYmd(format(start, "yyyy-MM-dd"));
    setMonthCursor(startOfMonth(n));
  };

  const goToday = () => {
    const t = todayYmd();
    setSelectedYmd(t);
    setMonthCursor(startOfMonth(parse(t, "yyyy-MM-dd", new Date())));
  };

  const copyBookingLink = async () => {
    const slug = bookingSlugQuery.data;
    if (!slug) {
      Alert.alert(
        "No link yet",
        "Set a booking slug on the web profile first.",
      );
      return;
    }
    const url = `${APP_CONFIG.WEB_URL}/book/${slug}`;
    await Clipboard.setStringAsync(url);
    Alert.alert("Copied", "Your public booking link is on the clipboard.");
  };

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
    for (const s of sessionsForCalendarDots) {
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
  }, [sessionsForCalendarDots, blocks, selectedYmd]);

  const selectedDate = useMemo(
    () => parse(selectedYmd, "yyyy-MM-dd", new Date()),
    [selectedYmd],
  );

  const daySessions = useMemo(() => {
    return filteredSessions
      .filter((s) => s.session_date === selectedYmd)
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [filteredSessions, selectedYmd]);

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

  const openBlockManager = () => setBlockManagerOpen(true);

  const invalidateCalendar = () => {
    void queryClient.invalidateQueries({
      queryKey: ["practitioner_calendar", userId],
    });
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
            const res = await deletePractitionerCalendarEvent({
              eventId: b.id,
            });
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

  const selectedDayContent = loading ? (
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
          <Text className="text-charcoal-500">No sessions on this day.</Text>
        </View>
      ) : (
        daySessions.map((s) => (
          <SessionCard
            key={s.id}
            s={s}
            compactDayHeader
            onPress={() =>
              router.push(tabPath(tabRoot, `bookings/${s.id}`) as Href)
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
        onPress={openBlockManager}
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
                  <View className="flex-row items-center justify-between flex-wrap gap-1">
                    <Text className="text-charcoal-900 font-semibold">
                      {b.title}
                    </Text>
                    <View className="flex-row items-center gap-1 flex-wrap">
                      {(b.event_type || "").toLowerCase() === "unavailable" ? (
                        <View className="px-2 py-0.5 rounded-full bg-charcoal-100">
                          <Text className="text-charcoal-600 text-xs font-medium">
                            Unavailable
                          </Text>
                        </View>
                      ) : null}
                      {prov !== "internal" ? (
                        <View className="px-2 py-1 rounded-full bg-charcoal-100">
                          <Text className="text-charcoal-600 text-xs font-medium capitalize">
                            {prov}
                          </Text>
                        </View>
                      ) : null}
                    </View>
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
  );

  return (
    <TabScreen>
      <TabScreenScroll
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={
              (!loadingSessions && fetchingSessions) ||
              (!blocksInitialLoad && fetchingBlocks)
            }
            onRefresh={() => {
              void refetchSessions();
              void refetchBlocks();
              void queryClient.invalidateQueries({
                queryKey: ["practitioner_booking_slug", userId],
              });
            }}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <MainTabHeader
          eyebrow="Practice"
          title="Diary"
          subtitle="Aligned with web /practice/schedule: week by default, same filters, block time, availability, booking link, plus scheduler & calendar routes."
          right={
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() =>
                  router.push(tabPath(tabRoot, "calendar-sync") as Href)
                }
                className="w-11 h-11 rounded-2xl bg-white border border-cream-200 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Calendar sync (web)"
              >
                <CalendarClock size={22} color={Colors.sage[600]} />
              </TouchableOpacity>
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
            </View>
          }
        />

        <View className="px-6 mt-3">
          <View className="flex-row rounded-2xl bg-white border border-cream-200 p-1 mb-3">
            {(
              [
                ["day", "Day"],
                ["week", "Week"],
                ["month", "Month"],
              ] as const
            ).map(([mode, label]) => {
              const on = viewMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  className={`flex-1 py-2 rounded-xl items-center ${
                    on ? "bg-sage-500" : ""
                  }`}
                  onPress={() => setViewMode(mode)}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      on ? "text-white" : "text-charcoal-600"
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
            placeholder="Search name, session type, address…"
            placeholderTextColor={Colors.charcoal[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text className="text-charcoal-700 text-xs font-semibold mb-2">
            Categories (same as web)
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {(["client", "peer", "guest"] as DiarySessionCategory[]).map(
              (c) => {
                const on = categoryFilter.includes(c);
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => toggleCategory(c)}
                    className={`px-3 py-2 rounded-full border ${
                      on
                        ? "bg-sage-500 border-sage-500"
                        : "bg-white border-cream-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        on ? "text-white" : "text-charcoal-700"
                      }`}
                    >
                      {categoryLabel(c)} ({categoryCounts[c]})
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          <Text className="text-charcoal-700 text-xs font-semibold mb-2">
            Calendar actions (web: Manage Availability, Block Time, Today)
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            <TouchableOpacity
              className="flex-row items-center bg-white border border-cream-200 rounded-xl px-3 py-2.5"
              onPress={() => setAvailabilityModalOpen(true)}
            >
              <Settings size={18} color={Colors.sage[600]} />
              <Text className="text-charcoal-800 font-semibold text-sm ml-2">
                Manage Availability
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-white border border-cream-200 rounded-xl px-3 py-2.5"
              onPress={openBlockManager}
            >
              <Ban size={18} color={Colors.sage[600]} />
              <Text className="text-charcoal-800 font-semibold text-sm ml-2">
                Block Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-sage-500 rounded-xl px-3 py-2.5"
              onPress={goToday}
            >
              <Text className="text-white font-semibold text-sm">Today</Text>
            </TouchableOpacity>
          </View>

          {bookingSlugQuery.data ? (
            <View className="bg-white border border-cream-200 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Link2 size={18} color={Colors.sage[600]} />
                <Text className="text-charcoal-900 font-semibold">
                  Your booking link
                </Text>
              </View>
              <Text
                className="text-charcoal-500 text-xs mb-2"
                numberOfLines={2}
              >
                {`${APP_CONFIG.WEB_URL}/book/${bookingSlugQuery.data}`}
              </Text>
              <TouchableOpacity
                onPress={() => void copyBookingLink()}
                className="flex-row items-center self-start bg-sage-500/10 px-3 py-2 rounded-xl"
              >
                <Copy size={16} color={Colors.sage[700]} />
                <Text className="text-sage-800 font-semibold ml-2">
                  Copy link
                </Text>
              </TouchableOpacity>
            </View>
          ) : bookingSlugQuery.isSuccess && !bookingSlugQuery.data ? (
            <Text className="text-charcoal-500 text-sm mb-4">
              Set a booking slug on the web app to share your direct booking
              link.
            </Text>
          ) : null}

          <Text className="text-charcoal-700 text-xs font-semibold mb-2">
            More tools
          </Text>
          <Text className="text-charcoal-500 text-xs mb-2 leading-5">
            Use native services, diary controls, and inbuilt calendar tools from
            here. Remaining advanced scheduler options are being migrated
            in-app.
          </Text>
          <View className="flex-row gap-2 mb-2">
            <TouchableOpacity
              className="flex-1 bg-white border border-cream-200 rounded-xl py-3 px-2 items-center"
              onPress={() => router.push(tabPath(tabRoot, "services") as Href)}
            >
              <SlidersHorizontal size={20} color={Colors.sage[600]} />
              <Text className="text-charcoal-800 font-semibold text-sm text-center mt-1">
                Services & scheduler
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white border border-cream-200 rounded-xl py-3 px-2 items-center"
              onPress={() =>
                router.push(tabPath(tabRoot, "calendar-sync") as Href)
              }
            >
              <CalendarClock size={20} color={Colors.sage[600]} />
              <Text className="text-charcoal-800 font-semibold text-sm text-center mt-1">
                Calendar tools
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6">
          {viewMode === "month" ? (
            <View>
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
                    style={[
                      styles.legendDot,
                      { backgroundColor: Colors.sage[600] },
                    ]}
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
                    setMonthCursor(
                      startOfMonth(parse(t, "yyyy-MM-dd", new Date())),
                    );
                  }}
                >
                  <Text className="text-charcoal-800 font-semibold">
                    Jump to today
                  </Text>
                </Button>
              ) : null}

              <Text className="text-charcoal-900 font-bold text-lg mt-6 mb-1">
                {format(selectedDate, "EEEE d MMMM yyyy")}
              </Text>
              <Text className="text-charcoal-500 text-sm mb-4">
                Sessions and blocked time for this day
              </Text>

              {selectedDayContent}
            </View>
          ) : viewMode === "week" ? (
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                  onPress={() => shiftWeek(-1)}
                  className="p-2"
                  accessibilityLabel="Previous week"
                >
                  <ChevronLeft size={24} color={Colors.charcoal[800]} />
                </TouchableOpacity>
                <Text className="text-charcoal-900 font-semibold text-center flex-1 px-2">
                  {format(weekRange.start, "d MMM")} –{" "}
                  {format(weekRange.end, "d MMM yyyy")}
                </Text>
                <TouchableOpacity
                  onPress={() => shiftWeek(1)}
                  className="p-2"
                  accessibilityLabel="Next week"
                >
                  <ChevronRight size={24} color={Colors.charcoal[800]} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="large" color={Colors.sage[500]} />
                </View>
              ) : (
                eachDayOfInterval({
                  start: weekRange.start,
                  end: weekRange.end,
                }).map((day) => {
                  const ymd = format(day, "yyyy-MM-dd");
                  const list = weekSessionsByDay.get(ymd) ?? [];
                  const blocksThisDay = blocks
                    .filter(
                      (b) =>
                        format(new Date(b.start_time), "yyyy-MM-dd") === ymd,
                    )
                    .sort(
                      (a, b) =>
                        new Date(a.start_time).getTime() -
                        new Date(b.start_time).getTime(),
                    );
                  return (
                    <View key={ymd} className="mb-6">
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedYmd(ymd);
                          setMonthCursor(startOfMonth(day));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text className="text-charcoal-900 font-bold text-base mb-2">
                          {format(day, "EEEE d MMM")}
                        </Text>
                      </TouchableOpacity>
                      {list.length === 0 ? (
                        <Text className="text-charcoal-500 text-sm mb-1">
                          No sessions
                        </Text>
                      ) : (
                        list.map((s) => (
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
                      {blocksThisDay.length > 0 ? (
                        <>
                          <Text className="text-charcoal-700 text-sm font-semibold mt-3 mb-2">
                            Blocked time
                          </Text>
                          {blocksThisDay.map((b) => {
                            const prov = (
                              b.provider || "internal"
                            ).toLowerCase();
                            return (
                              <View
                                key={b.id}
                                className="bg-white border border-cream-200 rounded-xl px-3 py-2 mb-2"
                              >
                                <Text className="text-charcoal-900 font-medium">
                                  {b.title}
                                  {(b.event_type || "").toLowerCase() ===
                                  "unavailable"
                                    ? " · Unavailable"
                                    : ""}
                                </Text>
                                <Text className="text-charcoal-500 text-xs mt-1">
                                  {format(new Date(b.start_time), "HH:mm")} –{" "}
                                  {format(new Date(b.end_time), "HH:mm")}
                                  {prov !== "internal" ? ` · ${prov}` : ""}
                                </Text>
                              </View>
                            );
                          })}
                        </>
                      ) : null}
                    </View>
                  );
                })
              )}

              <Text className="text-charcoal-500 text-sm mb-2">
                Tap a day to set where new blocks go, or use today’s selection.
              </Text>
              <Button
                variant="outline"
                className="mb-6"
                leftIcon={<Plus size={18} color={Colors.sage[600]} />}
                onPress={openBlockManager}
              >
                <Text className="text-charcoal-800 font-semibold">
                  Add blocked time
                </Text>
              </Button>
            </View>
          ) : (
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                  onPress={() => shiftSelectedDay(-1)}
                  className="p-2"
                  accessibilityLabel="Previous day"
                >
                  <ChevronLeft size={24} color={Colors.charcoal[800]} />
                </TouchableOpacity>
                <Text className="text-charcoal-900 font-semibold text-center flex-1 px-2">
                  {format(selectedDate, "EEEE d MMMM yyyy")}
                </Text>
                <TouchableOpacity
                  onPress={() => shiftSelectedDay(1)}
                  className="p-2"
                  accessibilityLabel="Next day"
                >
                  <ChevronRight size={24} color={Colors.charcoal[800]} />
                </TouchableOpacity>
              </View>
              <Text className="text-charcoal-500 text-sm mb-4">
                Sessions and blocked time for this day
              </Text>
              {selectedDayContent}
            </View>
          )}
        </View>
      </TabScreenScroll>

      <Modal
        visible={availabilityModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAvailabilityModalOpen(false)}
      >
        <AppScreen edges={["top", "bottom"]}>
          <AppStackHeader
            title="Manage Availability"
            subtitle="Configure your working hours and block time for breaks. Tap Save when you're done."
            onBackPress={() => setAvailabilityModalOpen(false)}
          />
          <PractitionerAvailabilityEditor
            showOpenDiaryLink={false}
            onAfterSave={() => {
              invalidateCalendar();
              void refetchBlocks();
              void refetchSessions();
            }}
          />
        </AppScreen>
      </Modal>

      <Modal
        visible={blockManagerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBlockManagerOpen(false)}
      >
        <AppScreen edges={["top", "bottom"]}>
          <AppStackHeader
            title="Block Time"
            subtitle="Block time slots for lunch breaks, personal appointments, or unavailability."
            onBackPress={() => setBlockManagerOpen(false)}
          />
          <View className="flex-1 px-4 pt-2">
            <BlockTimeManagerContent
              embedded
              onChanged={() => {
                invalidateCalendar();
                void refetchBlocks();
              }}
            />
          </View>
        </AppScreen>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
