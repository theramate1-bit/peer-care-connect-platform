import { TabScreenScroll } from "@/components/navigation";
/**
 * Client hub — tabs aligned with web /practice/clients (Sessions, Progress, Goals,
 * Exercise programs, History requests). Treatment notes: same route as web hub modal
 * (`clinical-notes/[sessionId]`, presented modally in `clinical-notes/_layout.tsx`).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  Calendar,
  CheckCircle,
  Dumbbell,
  History,
  MapPin,
  MessageCircle,
  Plus,
  StickyNote,
  Target,
  TrendingUp,
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { getSessionLocation } from "@/lib/sessionLocation";
import { getDisplaySessionStatusLabel } from "@/lib/sessionDisplayStatus";
import { fetchPractitionerSessionNoteStatuses } from "@/lib/api/practitionerSessionNoteStatus";
import {
  calculatePractitionerClientSessionNumber,
  type SessionWithClient,
} from "@/lib/api/practitionerSessions";
import { usePractitionerSessions } from "@/hooks/usePractitionerSessions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { normalizeClientEmail } from "@/lib/api/practitionerClients";
import {
  fetchGoals,
  fetchProgressMetricsForClient,
  createGoal,
  type GoalItem,
  type ProgressMetricRow,
} from "@/lib/api/progress";
import {
  fetchHomeExercisePrograms,
  type HomeExerciseProgram,
} from "@/lib/api/exercises";
import {
  getPreviousPractitionersForClient,
  createPatientHistoryRequest,
  fetchMyHistoryRequestsForClient,
  cancelPatientHistoryRequest,
  type PreviousPractitioner,
  type PatientHistoryRequestListItem,
} from "@/lib/api/patientHistoryRequests";
import { getOrCreateConversation } from "@/lib/api/messages";

export type ClientHubTab =
  | "sessions"
  | "progress"
  | "goals"
  | "exercises"
  | "history";

type SessionFilter = "all" | "past" | "upcoming";

type Props = {
  displayName: string;
  subtitleEmail?: string | null;
  /** Registered client user id — required for messaging, history request, progress DB rows */
  resolvedClientId: string | null;
  /** Guest roster: match sessions by email when client_id is absent on some rows */
  emailNorm?: string | null;
  /** Deep link: sessions | progress | goals | exercises | history */
  initialTab?: ClientHubTab;
};

const VALID_TABS: ClientHubTab[] = [
  "sessions",
  "progress",
  "goals",
  "exercises",
  "history",
];

export function parseClientHubTabParam(
  raw: string | string[] | undefined,
): ClientHubTab | undefined {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return undefined;
  if (VALID_TABS.includes(s as ClientHubTab)) return s as ClientHubTab;
  /** Web `/practice/clients?tab=` uses these ids — map to native hub tabs. */
  if (s === "exercise-programs") return "exercises";
  if (s === "history-requests") return "history";
  if (s === "treatment-notes") return "sessions";
  return undefined;
}

function tabLabel(t: ClientHubTab): string {
  switch (t) {
    case "sessions":
      return "Sessions";
    case "progress":
      return "Progress";
    case "goals":
      return "Goals";
    case "exercises":
      return "Exercises";
    case "history":
      return "History";
  }
}

function TabIcon({ tab, focused }: { tab: ClientHubTab; focused: boolean }) {
  const c = focused ? Colors.sage[600] : Colors.charcoal[400];
  const size = 16;
  switch (tab) {
    case "sessions":
      return <Calendar size={size} color={c} />;
    case "progress":
      return <TrendingUp size={size} color={c} />;
    case "goals":
      return <Target size={size} color={c} />;
    case "exercises":
      return <Dumbbell size={size} color={c} />;
    case "history":
      return <History size={size} color={c} />;
  }
}

function preAssessmentLabel(s: SessionWithClient): string {
  if (s.pre_assessment_completed === true) return "Form completed";
  if (s.pre_assessment_required === true) return "No form";
  return "Optional";
}

export function ClientHubScreen({
  displayName,
  subtitleEmail,
  resolvedClientId,
  emailNorm,
  initialTab,
}: Props) {
  const tabRoot = useTabRoot();
  const { userId: practitionerId, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const defaultTab = initialTab ?? "sessions";
  const [tab, setTab] = useState<ClientHubTab>(() => defaultTab);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [sessionSearch, setSessionSearch] = useState("");

  useEffect(() => {
    if (!resolvedClientId && tab !== "sessions") {
      setTab("sessions");
    }
  }, [resolvedClientId, tab]);

  const { data: allSessions = [], isLoading: loadingSessions } =
    usePractitionerSessions(practitionerId);

  const clientSessions = useMemo(() => {
    return allSessions.filter((s) => {
      if (resolvedClientId && s.client_id === resolvedClientId) return true;
      if (emailNorm && s.client_email) {
        return normalizeClientEmail(s.client_email) === emailNorm;
      }
      return false;
    });
  }, [allSessions, resolvedClientId, emailNorm]);

  const practitionerLocation = useMemo(() => {
    const ext = userProfile as {
      location?: string | null;
      clinic_address?: string | null;
    } | null;
    return {
      location: ext?.location ?? null,
      clinic_address: ext?.clinic_address ?? null,
    };
  }, [userProfile]);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const q = sessionSearch.trim().toLowerCase();
    let rows = [...clientSessions];

    rows = rows.filter((s) => {
      const loc = getSessionLocation(s, practitionerLocation);
      const statusLabel = getDisplaySessionStatusLabel(s).toLowerCase();
      const pre = preAssessmentLabel(s).toLowerCase();
      const t = [
        s.session_date,
        s.session_type || "",
        s.status || "",
        s.client_name || "",
        s.notes || "",
        statusLabel,
        loc.sessionLocation,
        loc.locationLabel,
        pre,
        String(calculatePractitionerClientSessionNumber(s, allSessions) || ""),
      ]
        .join(" ")
        .toLowerCase();
      return !q || t.includes(q);
    });

    const toTime = (s: (typeof rows)[0]) =>
      new Date(
        `${s.session_date}T${(s.start_time || "12:00").slice(0, 5)}:00`,
      ).getTime();

    rows.sort((a, b) => toTime(b) - toTime(a));

    if (sessionFilter === "past") {
      rows = rows.filter((s) => toTime(s) < now.getTime());
    } else if (sessionFilter === "upcoming") {
      rows = rows.filter((s) => toTime(s) >= now.getTime());
      rows.sort((a, b) => toTime(a) - toTime(b));
    }

    return rows;
  }, [
    allSessions,
    clientSessions,
    practitionerLocation,
    sessionFilter,
    sessionSearch,
  ]);

  const clientHubSessionIdsKey = useMemo(() => {
    return [...clientSessions]
      .map((s) => s.id)
      .sort()
      .join("|");
  }, [clientSessions]);

  const sessionNoteStatusQuery = useQuery({
    queryKey: [
      "client_hub_session_note_status",
      practitionerId,
      clientHubSessionIdsKey,
    ],
    queryFn: async () => {
      if (!practitionerId || clientSessions.length === 0) {
        return { withNotesIds: [] as string[], completedIds: [] as string[] };
      }
      const { data, error } = await fetchPractitionerSessionNoteStatuses(
        practitionerId,
        clientSessions.map((s) => s.id),
      );
      if (error) throw error;
      return data;
    },
    enabled:
      !!practitionerId && clientSessions.length > 0 && tab === "sessions",
  });

  useFocusEffect(
    useCallback(() => {
      if (!practitionerId || tab !== "sessions") return;
      void queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "client_hub_session_note_status" &&
          q.queryKey[1] === practitionerId,
      });
    }, [practitionerId, queryClient, tab]),
  );

  const goalsQuery = useQuery({
    queryKey: ["client_hub_goals", resolvedClientId],
    queryFn: async () => {
      if (!resolvedClientId) return [];
      const { data, error } = await fetchGoals(resolvedClientId);
      if (error) throw error;
      return data;
    },
    enabled: !!resolvedClientId && tab === "goals",
  });

  const metricsQuery = useQuery({
    queryKey: ["client_hub_metrics", resolvedClientId, practitionerId],
    queryFn: async () => {
      if (!resolvedClientId || !practitionerId) return [];
      const { data, error } = await fetchProgressMetricsForClient({
        clientId: resolvedClientId,
        practitionerId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!resolvedClientId && !!practitionerId && tab === "progress",
  });

  const hepQuery = useQuery({
    queryKey: ["client_hub_hep", resolvedClientId],
    queryFn: async () => {
      if (!resolvedClientId) return [];
      const { data, error } = await fetchHomeExercisePrograms(resolvedClientId);
      if (error) throw error;
      return data;
    },
    enabled: !!resolvedClientId && tab === "exercises",
  });

  const prevPractitionersQuery = useQuery({
    queryKey: ["prev_practitioners", resolvedClientId, practitionerId],
    queryFn: async () => {
      if (!resolvedClientId || !practitionerId) return [];
      const { data, error } = await getPreviousPractitionersForClient({
        clientId: resolvedClientId,
        excludePractitionerId: practitionerId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!resolvedClientId && !!practitionerId && tab === "history",
  });

  const historyRequestsQuery = useQuery({
    queryKey: ["client_history_requests", practitionerId, resolvedClientId],
    queryFn: async () => {
      if (!practitionerId || !resolvedClientId) return [];
      const { data, error } = await fetchMyHistoryRequestsForClient({
        practitionerId,
        clientId: resolvedClientId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!resolvedClientId && !!practitionerId && tab === "history",
  });

  const onMessage = async () => {
    if (!practitionerId || !resolvedClientId) return;
    const { data: conversation, error } = await getOrCreateConversation(
      practitionerId,
      resolvedClientId,
    );
    if (error || !conversation) {
      Alert.alert("Could not open chat", error?.message || "Try again.");
      return;
    }
    router.push(tabPath(tabRoot, `messages/${conversation}`) as never);
  };

  const onBookAnother = () => {
    if (resolvedClientId) {
      router.push(
        `${tabPath(tabRoot, "bookings/new")}?clientId=${encodeURIComponent(resolvedClientId)}` as never,
      );
    } else {
      router.push(tabPath(tabRoot, "bookings/new") as never);
    }
  };

  const tabs: ClientHubTab[] = resolvedClientId
    ? ["sessions", "progress", "goals", "exercises", "history"]
    : ["sessions"];

  return (
    <View className="flex-1">
      <Card variant="elevated" padding="lg" className="mx-6 mb-3">
        <Text className="text-charcoal-900 text-xl font-bold">
          {displayName}
        </Text>
        {subtitleEmail ? (
          <Text className="text-charcoal-500 mt-1">{subtitleEmail}</Text>
        ) : null}
        {!resolvedClientId ? (
          <Text className="text-charcoal-500 text-sm mt-2">
            This contact has no linked user id yet — open sessions below.
            Register the client to unlock progress, goals, and history transfer.
          </Text>
        ) : null}

        <View className="flex-row flex-wrap gap-2 mt-4">
          {resolvedClientId ? (
            <Button variant="primary" onPress={() => void onMessage()}>
              <View className="flex-row items-center">
                <MessageCircle size={16} color="#fff" />
                <Text className="text-white font-semibold ml-2">Message</Text>
              </View>
            </Button>
          ) : null}
          <Button variant="outline" onPress={onBookAnother}>
            <View className="flex-row items-center">
              <Plus size={16} color={Colors.sage[600]} />
              <Text className="text-sage-600 font-semibold ml-2">
                Book session
              </Text>
            </View>
          </Button>
        </View>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-2"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
      >
        {tabs.map((t) => {
          const on = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-row items-center px-3 py-2 rounded-xl border ${
                on ? "bg-sage-500 border-sage-500" : "bg-white border-cream-200"
              }`}
            >
              <TabIcon tab={t} focused={on} />
              <Text
                className={`ml-1.5 text-sm font-semibold ${
                  on ? "text-white" : "text-charcoal-800"
                }`}
              >
                {tabLabel(t)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TabScreenScroll className="flex-1 px-6">
        {tab === "sessions" ? (
          <SessionsTabContent
            loading={loadingSessions}
            sessionFilter={sessionFilter}
            onFilter={setSessionFilter}
            sessionSearch={sessionSearch}
            onSearch={setSessionSearch}
            sessions={filteredSessions}
            allPractitionerSessions={allSessions}
            practitionerLocation={practitionerLocation}
            sessionsWithNotes={
              new Set(sessionNoteStatusQuery.data?.withNotesIds ?? [])
            }
            completedSessions={
              new Set(sessionNoteStatusQuery.data?.completedIds ?? [])
            }
            noteStatusLoading={sessionNoteStatusQuery.isLoading}
          />
        ) : null}

        {tab === "progress" && resolvedClientId ? (
          <ProgressTabContent
            loading={metricsQuery.isLoading}
            rows={(metricsQuery.data || []) as ProgressMetricRow[]}
          />
        ) : null}

        {tab === "goals" && resolvedClientId && practitionerId ? (
          <GoalsTabContent
            clientId={resolvedClientId}
            practitionerId={practitionerId}
            goals={(goalsQuery.data || []) as GoalItem[]}
            loading={goalsQuery.isLoading}
            onRefresh={() =>
              void queryClient.invalidateQueries({
                queryKey: ["client_hub_goals", resolvedClientId],
              })
            }
          />
        ) : null}

        {tab === "exercises" && resolvedClientId ? (
          <ExercisesTabContent
            programs={(hepQuery.data || []) as HomeExerciseProgram[]}
            loading={hepQuery.isLoading}
            onOpenProgram={(id) =>
              router.push(tabPath(tabRoot, `profile/exercises/${id}`) as never)
            }
          />
        ) : null}

        {tab === "history" && resolvedClientId && practitionerId ? (
          <HistoryTabContent
            clientId={resolvedClientId}
            practitionerId={practitionerId}
            clientName={displayName}
            practitioners={
              (prevPractitionersQuery.data || []) as PreviousPractitioner[]
            }
            loadingPrev={prevPractitionersQuery.isLoading}
            existingRequests={
              (historyRequestsQuery.data ||
                []) as PatientHistoryRequestListItem[]
            }
            loadingRequests={historyRequestsQuery.isLoading}
            onAfterMutation={() => {
              void historyRequestsQuery.refetch();
              void prevPractitionersQuery.refetch();
              void queryClient.invalidateQueries({
                queryKey: ["patient_history_requests_all", practitionerId],
              });
            }}
          />
        ) : null}
      </TabScreenScroll>
    </View>
  );
}

function SessionsTabContent({
  loading,
  sessionFilter,
  onFilter,
  sessionSearch,
  onSearch,
  sessions,
  allPractitionerSessions,
  practitionerLocation,
  sessionsWithNotes,
  completedSessions,
  noteStatusLoading,
}: {
  loading: boolean;
  sessionFilter: SessionFilter;
  onFilter: (f: SessionFilter) => void;
  sessionSearch: string;
  onSearch: (s: string) => void;
  sessions: SessionWithClient[];
  allPractitionerSessions: SessionWithClient[];
  practitionerLocation: {
    location: string | null;
    clinic_address: string | null;
  };
  sessionsWithNotes: Set<string>;
  completedSessions: Set<string>;
  noteStatusLoading: boolean;
}) {
  const tr = useTabRoot();
  if (loading) {
    return <ActivityIndicator color={Colors.sage[500]} className="py-8" />;
  }

  return (
    <View>
      <Text className="text-charcoal-600 text-sm mb-3">
        Location, booking notes, treatment-note status, and pre-assessment on
        each session. Open a row for booking details; use Treatment notes for
        SOAP / DAP.
      </Text>

      <View className="flex-row flex-wrap gap-2 mb-3">
        {(["all", "past", "upcoming"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => onFilter(f)}
            className={`px-3 py-2 rounded-lg border ${
              sessionFilter === f
                ? "bg-sage-500/15 border-sage-500"
                : "bg-white border-cream-200"
            }`}
          >
            <Text
              className={`text-sm font-medium capitalize ${
                sessionFilter === f ? "text-sage-700" : "text-charcoal-600"
              }`}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
        placeholder="Search sessions…"
        placeholderTextColor={Colors.charcoal[400]}
        value={sessionSearch}
        onChangeText={onSearch}
      />

      {noteStatusLoading && sessions.length > 0 ? (
        <ActivityIndicator color={Colors.sage[500]} className="py-2 mb-2" />
      ) : null}

      {sessions.length === 0 ? (
        <Text className="text-charcoal-500 py-6">No sessions match.</Text>
      ) : (
        sessions.map((s) => {
          const sessionNum = calculatePractitionerClientSessionNumber(
            s,
            allPractitionerSessions,
          );
          const { sessionLocation, locationLabel, directionsUrl } =
            getSessionLocation(s, practitionerLocation);
          const hasNotes = sessionsWithNotes.has(s.id);
          const isCompleted = completedSessions.has(s.id);
          const noteLine = !hasNotes
            ? "Not started"
            : isCompleted
              ? "Completed"
              : "In progress";

          return (
            <Card key={s.id} variant="default" padding="md" className="mb-2">
              <TouchableOpacity
                onPress={() =>
                  router.push(tabPath(tr, `bookings/${s.id}`) as never)
                }
              >
                <Text className="text-charcoal-900 font-semibold">
                  {s.session_date} · {(s.start_time || "").slice(0, 5)}
                </Text>
                {sessionNum > 0 ? (
                  <Text className="text-charcoal-800 font-medium text-sm mt-1">
                    Session #{sessionNum}
                  </Text>
                ) : null}
                {s.notes ? (
                  <Text
                    className="text-charcoal-500 text-sm mt-1"
                    numberOfLines={2}
                  >
                    {s.notes}
                  </Text>
                ) : null}
                <Text className="text-charcoal-500 text-sm mt-2">
                  {s.session_type || "Session"} ·{" "}
                  {getDisplaySessionStatusLabel(s)}
                </Text>
                <TouchableOpacity
                  activeOpacity={directionsUrl ? 0.7 : 1}
                  disabled={!directionsUrl}
                  onPress={() => {
                    if (directionsUrl) void Linking.openURL(directionsUrl);
                  }}
                  className="flex-row items-start mt-2"
                >
                  <MapPin size={14} color={Colors.charcoal[400]} />
                  <View className="ml-1 flex-1">
                    <Text className="text-charcoal-400 text-xs">
                      {locationLabel}
                    </Text>
                    <Text className="text-charcoal-700 text-sm">
                      {sessionLocation || "—"}
                    </Text>
                    {directionsUrl ? (
                      <Text className="text-sage-600 text-xs mt-0.5">
                        Open in Maps
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <View className="flex-row items-center flex-wrap mt-2">
                  <StickyNote size={14} color={Colors.charcoal[400]} />
                  <Text className="text-charcoal-600 text-sm ml-1">Note:</Text>
                  {isCompleted ? (
                    <View className="flex-row items-center ml-1">
                      <CheckCircle size={14} color={Colors.sage[600]} />
                      <Text className="text-teal-700 font-medium text-sm ml-1">
                        Completed
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className={`text-sm ml-1 ${
                        hasNotes
                          ? "text-amber-700 font-medium"
                          : "text-charcoal-500"
                      }`}
                    >
                      {noteLine}
                    </Text>
                  )}
                </View>
                <Text className="text-charcoal-600 text-sm mt-1">
                  Pre-assessment:{" "}
                  <Text className="font-medium text-charcoal-800">
                    {preAssessmentLabel(s)}
                  </Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center mt-3 pt-3 border-t border-cream-100"
                onPress={() =>
                  router.push(tabPath(tr, `clinical-notes/${s.id}`) as never)
                }
              >
                <StickyNote size={16} color={Colors.sage[600]} />
                <Text className="text-sage-600 font-medium ml-2">
                  Treatment notes (SOAP / DAP)
                </Text>
              </TouchableOpacity>
            </Card>
          );
        })
      )}
    </View>
  );
}

function ProgressTabContent({
  loading,
  rows,
}: {
  loading: boolean;
  rows: ProgressMetricRow[];
}) {
  if (loading) {
    return <ActivityIndicator color={Colors.sage[500]} className="py-8" />;
  }
  if (rows.length === 0) {
    return (
      <Text className="text-charcoal-500 py-6">
        No progress metrics yet. They appear when recorded from session
        workflows for this client.
      </Text>
    );
  }
  return (
    <View>
      {rows.map((m) => (
        <Card key={m.id} variant="default" padding="md" className="mb-2">
          <Text className="text-charcoal-900 font-semibold">
            {m.metric_name}
          </Text>
          <Text className="text-charcoal-600 text-sm mt-1">
            {m.metric_value} {m.metric_unit} · {m.session_date}
          </Text>
          {m.notes ? (
            <Text className="text-charcoal-500 text-sm mt-2">{m.notes}</Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

function GoalsTabContent({
  clientId,
  practitionerId,
  goals,
  loading,
  onRefresh,
}: {
  clientId: string;
  practitionerId: string;
  goals: GoalItem[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Missing", "Add title and description.");
      return;
    }
    setSaving(true);
    try {
      const res = await createGoal({
        clientId,
        practitionerId,
        title: title.trim(),
        description: description.trim(),
        targetValue: 6,
        targetUnit: "sessions",
        targetDate: format(new Date(), "yyyy-MM-dd"),
      });
      if (!res.ok) {
        Alert.alert("Could not save", res.error?.message || "");
        return;
      }
      setTitle("");
      setDescription("");
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator color={Colors.sage[500]} className="py-8" />;
  }

  return (
    <View>
      <Text className="text-charcoal-600 text-sm mb-3">
        Goals for this client — stored on your practice account.
      </Text>
      <TextInput
        className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-2"
        placeholder="Goal title"
        placeholderTextColor={Colors.charcoal[400]}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3 min-h-[80px]"
        placeholder="Description"
        placeholderTextColor={Colors.charcoal[400]}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Button variant="outline" disabled={saving} onPress={() => void submit()}>
        Add goal
      </Button>

      <Text className="text-charcoal-900 font-bold mt-6 mb-2">Existing</Text>
      {goals.length === 0 ? (
        <Text className="text-charcoal-500">No goals yet.</Text>
      ) : (
        goals.map((g) => (
          <Card key={g.id} variant="default" padding="md" className="mb-2">
            <Text className="text-charcoal-900 font-semibold">
              {g.goal_title}
            </Text>
            <Text className="text-charcoal-500 text-sm mt-1">
              {g.goal_description}
            </Text>
            <Text className="text-charcoal-400 text-xs mt-2">{g.status}</Text>
          </Card>
        ))
      )}
    </View>
  );
}

function ExercisesTabContent({
  programs,
  loading,
  onOpenProgram,
}: {
  programs: HomeExerciseProgram[];
  loading: boolean;
  onOpenProgram: (id: string) => void;
}) {
  if (loading) {
    return <ActivityIndicator color={Colors.sage[500]} className="py-8" />;
  }
  if (programs.length === 0) {
    return (
      <Text className="text-charcoal-500 py-6">
        No home exercise programs for this client yet.
      </Text>
    );
  }
  return (
    <View>
      {programs.map((p) => (
        <TouchableOpacity key={p.id} onPress={() => onOpenProgram(p.id)}>
          <Card variant="default" padding="md" className="mb-2">
            <Text className="text-charcoal-900 font-semibold">{p.title}</Text>
            <Text className="text-charcoal-500 text-sm mt-1">
              {(p.status || "active").replace(/_/g, " ")}
            </Text>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function HistoryTabContent({
  clientId,
  practitionerId,
  clientName,
  practitioners,
  loadingPrev,
  existingRequests,
  loadingRequests,
  onAfterMutation,
}: {
  clientId: string;
  practitionerId: string;
  clientName: string;
  practitioners: PreviousPractitioner[];
  loadingPrev: boolean;
  existingRequests: PatientHistoryRequestListItem[];
  loadingRequests: boolean;
  onAfterMutation: () => void;
}) {
  const tabRoot = useTabRoot();
  const [selected, setSelected] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const submit = async () => {
    if (!selected) {
      Alert.alert("Choose practitioner", "Select a previous practitioner.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createPatientHistoryRequest({
        clientId,
        requestingPractitionerId: practitionerId,
        previousPractitionerId: selected,
        requestNotes: notes.trim() || undefined,
      });
      if (!res.ok) {
        Alert.alert("Could not send", res.error?.message || "");
        return;
      }
      Alert.alert("Sent", "History request submitted.");
      setNotes("");
      setSelected("");
      onAfterMutation();
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = (requestId: string) => {
    Alert.alert("Cancel request", "Stop this pending history request?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: () => void doCancel(requestId),
      },
    ]);
  };

  const doCancel = async (requestId: string) => {
    setCancellingId(requestId);
    try {
      const res = await cancelPatientHistoryRequest({
        requestId,
        requestingPractitionerId: practitionerId,
      });
      if (!res.ok) {
        Alert.alert("Could not cancel", res.error?.message || "");
        return;
      }
      onAfterMutation();
    } finally {
      setCancellingId(null);
    }
  };

  if (loadingPrev || loadingRequests) {
    return <ActivityIndicator color={Colors.sage[500]} className="py-8" />;
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() =>
          router.push(tabPath(tabRoot, "patient-history-requests") as never)
        }
        className="mb-4"
      >
        <Text className="text-sage-600 font-semibold text-sm">
          View all outgoing history requests →
        </Text>
      </TouchableOpacity>

      <Text className="text-charcoal-800 font-semibold mb-2">
        Requests for {clientName}
      </Text>
      {existingRequests.length === 0 ? (
        <Text className="text-charcoal-500 text-sm mb-4">
          No requests yet for this client.
        </Text>
      ) : (
        <View className="mb-6">
          {existingRequests.map((r) => (
            <Card key={r.id} variant="default" padding="md" className="mb-2">
              <Text className="text-charcoal-900 font-medium capitalize">
                {r.status.replace(/_/g, " ")}
              </Text>
              <Text className="text-charcoal-500 text-sm mt-1">
                To: {r.previous_practitioner_name}
              </Text>
              <Text className="text-charcoal-400 text-xs mt-1">
                {r.requested_at?.slice(0, 10) ?? ""}
              </Text>
              {r.status === "pending" ? (
                <View className="mt-3 self-start">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancellingId === r.id}
                    isLoading={cancellingId === r.id}
                    onPress={() => onCancel(r.id)}
                  >
                    Cancel request
                  </Button>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      <Text className="text-charcoal-800 font-semibold mb-2">New request</Text>
      <Text className="text-charcoal-600 text-sm mb-3">
        Ask a previous practitioner to transfer records for {clientName}.
      </Text>
      {practitioners.length === 0 ? (
        <Text className="text-charcoal-500">
          No other practitioners found on this client&apos;s session history.
        </Text>
      ) : (
        <>
          {practitioners.map((p) => {
            const label = `${p.first_name} ${p.last_name}`.trim() || p.email;
            const sel = selected === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelected(p.id)}
                className={`mb-2 p-3 rounded-xl border ${
                  sel
                    ? "border-sage-500 bg-sage-500/10"
                    : "border-cream-200 bg-white"
                }`}
              >
                <Text className="text-charcoal-900 font-medium">{label}</Text>
                <Text className="text-charcoal-500 text-xs mt-1">
                  {p.session_count} session(s)
                  {p.last_session_date ? ` · last ${p.last_session_date}` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mt-2 min-h-[72px]"
            placeholder="Optional message to previous practitioner"
            placeholderTextColor={Colors.charcoal[400]}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Button
            variant="primary"
            className="mt-4"
            disabled={submitting || !selected}
            onPress={() => void submit()}
          >
            Send request
          </Button>
        </>
      )}
    </View>
  );
}
