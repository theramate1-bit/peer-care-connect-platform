import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Calendar,
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const clientId = session?.user?.id;
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = React.useState(false);

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

  if (!clientId) {
    router.replace("/(auth)/login");
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
    if (error || !conversation?.id) {
      Alert.alert("Could not open chat", error?.message || "Please try again.");
      return;
    }
    router.push(`/(tabs)/messages/${conversation.id}`);
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
                Alert.alert(
                  "Could not cancel",
                  res.error?.message || "Please try again.",
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
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Session details
        </Text>
      </View>

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
        <ScrollView
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
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

            {(data.status || "").toLowerCase() === "completed" && (
              <Button
                variant="outline"
                className="mt-3"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/bookings/review",
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
