import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CalendarPlus,
  Clock,
  User,
  CreditCard,
  StickyNote,
  MessageCircle,
} from "lucide-react-native";
import { format } from "date-fns";

import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  fetchClientSessionById,
  cancelClientSession,
  isSessionUpcoming,
} from "@/lib/api/clientSessions";
import { canRescheduleClientSession } from "@/lib/api/clientReschedule";
import { addSessionToDeviceCalendar } from "@/lib/calendar/sessionCalendar";
import { getOrCreateConversation } from "@/lib/api/messages";

function statusLabel(status: string | null): string {
  const key = (status || "scheduled").toLowerCase();
  if (key === "pending_payment") return "Pending Payment";
  if (key === "pending_approval") return "Pending Approval";
  if (key === "no_show") return "No Show";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function paymentLabel(status: string | null): string {
  const key = (status || "pending").toLowerCase();
  if (key === "paid") return "Paid";
  if (key === "held") return "Held (authorization)";
  if (key === "refunded") return "Refunded";
  if (key === "failed") return "Failed";
  return "Pending";
}

export default function BookingDetailScreen() {
  const tabRoot = useTabRoot();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const clientId = session?.user?.id;
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = React.useState(false);
  const [addingToCalendar, setAddingToCalendar] = React.useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["client_session_detail", clientId, id],
    queryFn: async () => {
      if (!clientId || !id) return null;
      const { data: row, error } = await fetchClientSessionById({
        clientId,
        sessionId: id,
      });
      if (error) throw error;
      return row;
    },
    enabled: !!clientId && !!id,
  });

  const rescheduleEligibility = useQuery({
    queryKey: ["reschedule_eligibility", id],
    queryFn: () => canRescheduleClientSession(id!),
    enabled: !!id && !!data,
  });

  if (!clientId) {
    router.replace("/login");
    return null;
  }

  const onMessageTherapist = async () => {
    if (!data?.therapist_id || !clientId) {
      Alert.alert(
        "Unavailable",
        "Therapist is not available for messaging for this session.",
      );
      return;
    }
    const { data: conversation, error } = await getOrCreateConversation(
      clientId,
      data.therapist_id,
    );
    if (error || !conversation) {
      Alert.alert("Could not open chat", error?.message || "Please try again.");
      return;
    }
    router.push(tabPath(tabRoot, `messages/${conversation}`) as never);
  };

  const onAddToCalendar = async () => {
    if (!data) return;
    setAddingToCalendar(true);
    try {
      const res = await addSessionToDeviceCalendar({
        title: `${data.session_type || "Session"} with ${data.therapist_name}`,
        sessionDate: data.session_date,
        startTime: data.start_time,
        durationMinutes: data.duration_minutes ?? 60,
      });
      if (!res.ok) {
        Alert.alert("Calendar", res.error);
        return;
      }
      Alert.alert("Added", "Session added to your device calendar.");
    } finally {
      setAddingToCalendar(false);
    }
  };

  const onRebook = () => {
    if (!data?.therapist_id) {
      Alert.alert("Unavailable", "No therapist linked to this session.");
      return;
    }
    router.push({
      pathname: "/booking",
      params: {
        practitionerId: data.therapist_id,
        initialDate: data.session_date,
        initialTime: data.start_time.slice(0, 5),
      },
    });
  };

  const onCancel = () => {
    if (!data || !clientId) return;
    Alert.alert(
      "Cancel session?",
      "This will cancel the booking. You may need to contact support for refunds depending on policy.",
      [
        { text: "Keep session", style: "cancel" },
        {
          text: "Cancel session",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await cancelClientSession({
                clientId,
                sessionId: data.id,
              });
              if (!res.ok) {
                const late = res.errorCode === "CANCEL_WINDOW_CLOSED";
                Alert.alert(
                  late ? "Cancellation window closed" : "Could not cancel",
                  res.error?.message ||
                    (late
                      ? "Sessions must be cancelled at least 24 hours in advance. Contact your practitioner if you need a late change."
                      : "Please try again."),
                );
                return;
              }
              await queryClient.invalidateQueries({
                queryKey: ["client_sessions", clientId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["client_session_detail", clientId, id],
              });
              void refetch();
              Alert.alert(
                "Session cancelled",
                "Your session has been cancelled.",
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  return (
    <TabScreen>
      <AppStackHeader
        title="Session details"
        fallbackHref={tabPath(tabRoot, "bookings")}
      />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error ? error.message : "Could not load session."}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-charcoal-500 text-center">
            Session not found or you do not have access to it.
          </Text>
        </View>
      ) : (
        <TabScreenScroll className="flex-1 px-6 pt-4">
          <Card variant="default" padding="lg" className="mb-4">
            <Text className="text-charcoal-900 text-xl font-bold">
              {data.session_type || "Session"}
            </Text>
            <Text className="text-charcoal-500 mt-1">
              {data.therapist_name}
            </Text>
          </Card>

          <Card variant="default" padding="md" className="mb-3">
            <View className="flex-row items-center">
              <Calendar size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-800 font-medium ml-2">
                {format(
                  new Date(`${data.session_date}T12:00:00`),
                  "EEEE d MMMM yyyy",
                )}
              </Text>
            </View>
            <View className="flex-row items-center mt-3">
              <Clock size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-800 font-medium ml-2">
                {data.start_time} ({data.duration_minutes} min)
              </Text>
            </View>
          </Card>

          <Card variant="default" padding="md" className="mb-3">
            <View className="flex-row items-center">
              <User size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-800 font-medium ml-2">
                Status: {statusLabel(data.status)}
              </Text>
            </View>
            <View className="flex-row items-center mt-3">
              <CreditCard size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-800 font-medium ml-2">
                Payment: {paymentLabel(data.payment_status)}
              </Text>
            </View>
          </Card>

          <Card variant="default" padding="md">
            <View className="flex-row items-center">
              <StickyNote size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-800 font-medium ml-2">Price</Text>
            </View>
            <Text className="text-charcoal-900 text-lg font-semibold mt-2">
              {data.price != null ? `£${Number(data.price).toFixed(2)}` : "—"}
            </Text>
          </Card>

          <View className="mt-5">
            <Button variant="primary" onPress={() => void onMessageTherapist()}>
              <View className="flex-row items-center">
                <MessageCircle size={18} color="#fff" />
                <Text className="text-white font-semibold ml-2">
                  Message therapist
                </Text>
              </View>
            </Button>

            <Button variant="outline" className="mt-3" onPress={onRebook}>
              <Text className="text-charcoal-700 font-medium">
                Rebook similar session
              </Text>
            </Button>

            {isSessionUpcoming(data) &&
              (data.status || "").toLowerCase() !== "cancelled" && (
                <Button
                  variant="outline"
                  className="mt-3"
                  onPress={() => void onAddToCalendar()}
                  disabled={addingToCalendar}
                >
                  <View className="flex-row items-center justify-center">
                    <CalendarPlus size={18} color={Colors.charcoal[700]} />
                    <Text className="text-charcoal-700 font-medium ml-2">
                      {addingToCalendar ? "Adding…" : "Add to calendar"}
                    </Text>
                  </View>
                </Button>
              )}

            {rescheduleEligibility.data?.canReschedule ? (
              <Button
                variant="outline"
                className="mt-3"
                onPress={() =>
                  router.push({
                    pathname: tabPath(tabRoot, "bookings/reschedule") as any,
                    params: { sessionId: data.id },
                  })
                }
              >
                <Text className="text-charcoal-700 font-medium">
                  Reschedule session
                </Text>
              </Button>
            ) : null}

            {(data.status || "").toLowerCase() === "completed" && (
              <Button
                variant="outline"
                className="mt-3"
                onPress={() =>
                  router.push({
                    pathname: tabPath(tabRoot, "bookings/review") as any,
                    params: { sessionId: data.id },
                  })
                }
              >
                <Text className="text-sage-500 font-medium">Leave review</Text>
              </Button>
            )}

            {isSessionUpcoming(data) &&
              (data.status || "").toLowerCase() !== "cancelled" && (
                <Button
                  variant="destructive"
                  className="mt-3"
                  onPress={onCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">
                      Cancel this session
                    </Text>
                  )}
                </Button>
              )}
          </View>
        </TabScreenScroll>
      )}
    </TabScreen>
  );
}
