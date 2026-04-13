import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  User,
  CreditCard,
  StickyNote,
  MessageCircle,
  MapPin,
  ClipboardList,
} from "lucide-react-native";
import { format } from "date-fns";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";
import { fetchPractitionerSessionById } from "@/lib/api/practitionerSessions";
import { getOrCreateConversation } from "@/lib/api/messages";
import {
  fetchTreatmentPlansForClient,
  fetchTreatmentPlanLinksForSession,
  linkSessionToTreatmentPlan,
} from "@/lib/api/practitionerTreatmentPlans";

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

export default function PractitionerBookingDetailScreen() {
  const tabRoot = useTabRoot();
  /** Absolute tab bar would cover the last actions without extra scroll padding. */
  const tabBarInset = useBottomTabBarHeight();
  const tabBarHeight =
    tabBarInset > 0
      ? tabBarInset
      : Platform.OS === "ios"
        ? 88
        : 70;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [linkingPlan, setLinkingPlan] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["practitioner_session_detail", userId, id],
    queryFn: async () => {
      if (!userId || !id) return null;
      const { data: row, error: err } = await fetchPractitionerSessionById({
        therapistId: userId,
        sessionId: id,
      });
      if (err) throw err;
      return row;
    },
    enabled: !!userId && !!id,
  });

  const { data: planLinks = [] } = useQuery({
    queryKey: ["treatment_plan_session_links", id],
    queryFn: async () => {
      if (!id) return [];
      const { data: rows, error: err } =
        await fetchTreatmentPlanLinksForSession(id);
      if (err) throw err;
      return rows;
    },
    enabled: !!id && !!data,
  });

  const clientId = data?.client_id ?? null;

  const { data: clientPlans = [] } = useQuery({
    queryKey: ["treatment_plans_for_session", userId, clientId],
    queryFn: async () => {
      if (!userId || !clientId) return [];
      const { data: rows, error: err } = await fetchTreatmentPlansForClient({
        practitionerId: userId,
        clientId,
      });
      if (err) throw err;
      return rows;
    },
    enabled: !!userId && !!clientId && !!data,
  });

  const linkedPlanIds = useMemo(
    () => new Set(planLinks.map((l) => l.plan_id)),
    [planLinks],
  );

  const plansToLink = useMemo(
    () => clientPlans.filter((p) => !linkedPlanIds.has(p.id)),
    [clientPlans, linkedPlanIds],
  );

  const onLinkPlan = async (planId: string) => {
    if (!id) return;
    setLinkingPlan(true);
    try {
      const { data: linkId, error: linkErr } = await linkSessionToTreatmentPlan({
        planId,
        sessionId: id,
      });
      if (linkErr || !linkId) {
        Alert.alert(
          "Could not link",
          linkErr?.message || "Try again or check the care plan.",
        );
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["treatment_plan_session_links", id],
      });
      await queryClient.invalidateQueries({ queryKey: ["treatment_plans"] });
      await queryClient.invalidateQueries({
        queryKey: ["treatment_plan_linked_sessions"],
      });
      setPlanModalOpen(false);
    } finally {
      setLinkingPlan(false);
    }
  };

  const onMessageClient = async () => {
    if (!data?.client_id || !userId) {
      Alert.alert("Unavailable", "Client is not linked for messaging.");
      return;
    }
    const { data: conversation, error: convErr } = await getOrCreateConversation(
      data.client_id,
      userId,
    );
    if (convErr || !conversation) {
      Alert.alert("Could not open chat", convErr?.message || "Please try again.");
      return;
    }
    router.push(tabPath(tabRoot, `messages/${conversation}`) as never);
  };

  if (!userId) {
    router.replace("/login");
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
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
          contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        >
          <ScreenHeader
            className="-mx-6 -mt-4 mb-2"
            eyebrow="Practice"
            title="Session details"
            subtitle="Message, notes, and care plans — diary is one tap away."
            right={
              <TouchableOpacity
                onPress={() =>
                  router.push(tabPath(tabRoot, "schedule") as Href)
                }
                className="w-11 h-11 rounded-2xl bg-white border border-cream-200 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Diary"
              >
                <Calendar size={22} color={Colors.sage[600]} />
              </TouchableOpacity>
            }
          />

          <Card variant="default" padding="lg" className="mb-4">
            <Text className="text-charcoal-900 text-xl font-bold">
              {data.session_type || "Session"}
            </Text>
            <Text className="text-charcoal-500 mt-1">{data.client_name}</Text>
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
              <MapPin size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-800 font-medium ml-2">
                {(data.appointment_type || "clinic").toLowerCase() === "mobile"
                  ? "Mobile visit"
                  : "Clinic"}
              </Text>
            </View>
            {data.visit_address ? (
              <Text className="text-charcoal-600 text-sm mt-2">
                {data.visit_address}
              </Text>
            ) : null}
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
            <Button variant="primary" onPress={() => void onMessageClient()}>
              <View className="flex-row items-center">
                <MessageCircle size={18} color="#fff" />
                <Text className="text-white font-semibold ml-2">
                  Message client
                </Text>
              </View>
            </Button>

            <Button
              variant="outline"
              className="mt-3"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, `clinical-notes/${data.id}`) as never,
                )
              }
            >
              <View className="flex-row items-center justify-center">
                <StickyNote size={18} color={Colors.sage[600]} />
                <Text className="text-sage-600 font-semibold ml-2">
                  Clinical notes (SOAP)
                </Text>
              </View>
            </Button>

            <Button
              variant="outline"
              className="mt-3"
              onPress={() => {
                if (data.client_id) {
                  router.push(
                    tabPath(tabRoot, `clients/${data.client_id}`) as never,
                  );
                }
              }}
            >
              <Text className="text-charcoal-700 font-medium">
                View client record
              </Text>
            </Button>
          </View>

          {clientId ? (
            <Card variant="default" padding="md" className="mt-5">
              <View className="flex-row items-center mb-2">
                <ClipboardList size={18} color={Colors.charcoal[500]} />
                <Text className="text-charcoal-800 font-medium ml-2">
                  Care plans
                </Text>
              </View>
              {planLinks.length === 0 ? (
                <Text className="text-charcoal-500 text-sm">
                  No care plan linked to this session yet.
                </Text>
              ) : (
                <View className="gap-2">
                  {planLinks.map((l) => (
                    <TouchableOpacity
                      key={l.link_id}
                      onPress={() =>
                        router.push(
                          tabPath(
                            tabRoot,
                            `treatment-plans/${l.plan_id}`,
                          ) as never,
                        )
                      }
                      className="bg-cream-100 rounded-xl px-3 py-2"
                    >
                      <Text className="text-charcoal-900 font-medium">
                        {l.plan_title}
                      </Text>
                      <Text className="text-sage-600 text-xs mt-0.5">Open</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View className="flex-row flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  className="flex-1 min-w-[140px]"
                  onPress={() => setPlanModalOpen(true)}
                  disabled={plansToLink.length === 0 || linkingPlan}
                >
                  <Text className="text-charcoal-800 font-medium text-center">
                    Link to plan
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-w-[140px]"
                  onPress={() =>
                    router.push(
                      tabPath(
                        tabRoot,
                        `treatment-plans/new?clientId=${encodeURIComponent(clientId)}`,
                      ) as never,
                    )
                  }
                >
                  <Text className="text-charcoal-800 font-medium text-center">
                    New care plan
                  </Text>
                </Button>
              </View>
              {plansToLink.length === 0 && clientPlans.length > 0 ? (
                <Text className="text-charcoal-500 text-xs mt-2">
                  This session is already linked to all care plans for this
                  client.
                </Text>
              ) : null}
            </Card>
          ) : (
            <Card variant="default" padding="md" className="mt-5">
              <Text className="text-charcoal-600 text-sm">
                Care plans can be linked once a client is attached to this
                session.
              </Text>
            </Card>
          )}
        </ScrollView>
      )}

      <Modal
        visible={planModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPlanModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-cream-200">
            <Text className="text-charcoal-900 text-lg font-semibold">
              Link session to plan
            </Text>
            <TouchableOpacity onPress={() => setPlanModalOpen(false)}>
              <Text className="text-sage-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
          {linkingPlan ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={Colors.sage[500]} />
            </View>
          ) : (
            <FlatList
              data={plansToLink}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                padding: 24,
                paddingBottom: Math.max(insets.bottom, 16) + 24,
              }}
              ListEmptyComponent={
                <Text className="text-charcoal-500 text-center">
                  No plans to link. Create a care plan first.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => void onLinkPlan(item.id)}
                  className="bg-white border border-cream-200 rounded-xl px-4 py-4 mb-3"
                >
                  <Text className="text-charcoal-900 font-semibold">
                    {item.title}
                  </Text>
                  <Text className="text-charcoal-500 text-sm mt-1">
                    Tap to link this session
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
