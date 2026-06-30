import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { addDays, format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuthStore } from "@/stores/authStore";
import { fetchClientSessionById } from "@/lib/api/clientSessions";
import {
  canRescheduleClientSession,
  fetchRescheduleAvailableTimes,
  rescheduleClientSession,
} from "@/lib/api/clientReschedule";

export default function RescheduleSessionScreen() {
  const tabRoot = useTabRoot();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const clientId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();

  const [sessionDate, setSessionDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const sessionQuery = useQuery({
    queryKey: ["reschedule_session", clientId, sessionId],
    queryFn: async () => {
      if (!clientId || !sessionId) return null;
      const { data, error } = await fetchClientSessionById({
        clientId,
        sessionId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!sessionId,
  });

  const eligibilityQuery = useQuery({
    queryKey: ["reschedule_eligibility", sessionId],
    queryFn: () => canRescheduleClientSession(sessionId!),
    enabled: !!sessionId,
  });

  React.useEffect(() => {
    if (!sessionQuery.data) return;
    setSessionDate(sessionQuery.data.session_date);
    setStartTime(sessionQuery.data.start_time.slice(0, 5));
  }, [
    sessionQuery.data?.id,
    sessionQuery.data?.session_date,
    sessionQuery.data?.start_time,
  ]);

  const dateOptions = React.useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const d = addDays(new Date(), i);
        return {
          value: format(d, "yyyy-MM-dd"),
          label: format(d, "EEE d MMM"),
        };
      }),
    [],
  );

  const { data: availableTimes = [], isLoading: loadingSlots } = useQuery({
    queryKey: [
      "reschedule_slots",
      sessionQuery.data?.therapist_id,
      sessionDate,
      sessionQuery.data?.duration_minutes,
      sessionId,
    ],
    queryFn: async () => {
      if (!sessionQuery.data?.therapist_id || !sessionDate || !sessionId) {
        return [];
      }
      const { data, error } = await fetchRescheduleAvailableTimes({
        therapistId: sessionQuery.data.therapist_id,
        date: sessionDate,
        durationMinutes: sessionQuery.data.duration_minutes ?? 60,
        excludeSessionId: sessionId,
      });
      if (error) throw error;
      return data;
    },
    enabled:
      !!sessionQuery.data?.therapist_id &&
      !!sessionDate &&
      !!sessionId &&
      eligibilityQuery.data?.canReschedule === true,
  });

  React.useEffect(() => {
    if (availableTimes.length === 0) return;
    if (!availableTimes.includes(startTime)) {
      setStartTime(availableTimes[0]);
    }
  }, [availableTimes, startTime]);

  const onConfirm = async () => {
    if (!clientId || !sessionId) return;
    setSubmitting(true);
    try {
      const res = await rescheduleClientSession({
        sessionId,
        clientId,
        newDate: sessionDate,
        newTime: startTime,
        reason,
      });
      if (!res.ok) {
        Alert.alert("Could not reschedule", res.error);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["client_sessions", clientId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["client_session_detail", clientId, sessionId],
      });
      Alert.alert(
        "Session rescheduled",
        "Your practitioner has been notified by email.",
        [
          {
            text: "OK",
            onPress: () =>
              goBackOrReplace(tabPath(tabRoot, `bookings/${sessionId}`)),
          },
        ],
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!clientId) {
    router.replace("/login");
    return null;
  }

  return (
    <TabScreen>
      <AppStackHeader
        title="Reschedule session"
        fallbackHref={tabPath(tabRoot, `bookings/${sessionId}`)}
      />
      {sessionQuery.isLoading || eligibilityQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : eligibilityQuery.data && !eligibilityQuery.data.canReschedule ? (
        <View className="flex-1 px-6 pt-8">
          <Card variant="default" padding="md">
            <Text className="text-charcoal-800 leading-6">
              {eligibilityQuery.data.reason}
            </Text>
          </Card>
          <Button
            variant="outline"
            className="mt-6"
            onPress={() =>
              goBackOrReplace(tabPath(tabRoot, `bookings/${sessionId}`))
            }
          >
            Back to session
          </Button>
        </View>
      ) : (
        <TabScreenScroll className="flex-1 px-6 pt-4">
          <Text className="text-charcoal-500 text-sm mb-4 leading-5">
            Pick a new date and time with {sessionQuery.data?.therapist_name}.
            You need at least 24 hours before the session starts.
          </Text>

          <Text className="text-charcoal-800 font-semibold mb-2">New date</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {dateOptions.map((d) => (
              <TouchableOpacity
                key={d.value}
                onPress={() => setSessionDate(d.value)}
                className={`px-3 py-2 rounded-lg border ${
                  sessionDate === d.value
                    ? "border-sage-500 bg-sage-500/10"
                    : "border-cream-200 bg-white"
                }`}
              >
                <Text
                  className={
                    sessionDate === d.value
                      ? "text-sage-700 font-medium"
                      : "text-charcoal-700"
                  }
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-charcoal-800 font-semibold mb-2">New time</Text>
          {loadingSlots ? (
            <ActivityIndicator color={Colors.sage[500]} />
          ) : availableTimes.length === 0 ? (
            <Text className="text-charcoal-500 mb-4">
              No open slots on this day. Try another date.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {availableTimes.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setStartTime(t)}
                  className={`px-3 py-2 rounded-lg border ${
                    startTime === t
                      ? "border-sage-500 bg-sage-500/10"
                      : "border-cream-200 bg-white"
                  }`}
                >
                  <Text
                    className={
                      startTime === t
                        ? "text-sage-700 font-medium"
                        : "text-charcoal-700"
                    }
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text className="text-charcoal-800 font-semibold mb-2">
            Reason (optional)
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Let your practitioner know why you're moving the session"
            placeholderTextColor={Colors.charcoal[400]}
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-6"
            multiline
          />

          <Button
            variant="primary"
            onPress={() => void onConfirm()}
            disabled={
              submitting ||
              !sessionDate ||
              !startTime ||
              availableTimes.length === 0
            }
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">
                Confirm reschedule
              </Text>
            )}
          </Button>
        </TabScreenScroll>
      )}
    </TabScreen>
  );
}
