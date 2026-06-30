/**
 * Single treatment exchange request — detail, accept / reschedule / cancel, all statuses.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router, type Href } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchExchangeRequestByIdForParticipant,
  fetchAcceptedExchangesNeedingReciprocal,
  fetchAcceptedExchangesAwaitingReciprocalByRequester,
  rescheduleExchangeRequest,
  requestExchangeExtension,
  approveExchangeExtension,
  acceptExchangeRequest,
  cancelExchangeRequestByRequester,
  formatExchangeConflictMessage,
  type ExchangeRequestDetail,
} from "@/lib/api/practitionerExchange";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExchangeReciprocalSlotModal } from "@/components/practitioner/ExchangeReciprocalSlotModal";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fmtTime(t: string | null | undefined): string {
  if (t == null) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function statusTitle(status: string | null | undefined): string {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "accepted") return "Accepted";
  if (s === "declined") return "Different time requested";
  if (s === "cancelled") return "Cancelled";
  if (s === "expired") return "Expired";
  return status || "Unknown";
}

export default function PractitionerExchangeRequestDetailScreen() {
  const tabRoot = useTabRoot();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [slotModalOpen, setSlotModalOpen] = useState(false);

  const requestId = typeof id === "string" ? id : "";
  const idOk = UUID_RE.test(requestId);

  const {
    data: detail,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["exchange_request_detail", requestId, userId],
    queryFn: async () => {
      if (!userId || !idOk) return null;
      const { data, error: e } = await fetchExchangeRequestByIdForParticipant({
        requestId,
        userId,
      });
      if (e) throw e;
      return data;
    },
    enabled: !!userId && idOk,
  });

  const { data: reciprocalRows = [] } = useQuery({
    queryKey: ["exchange_reciprocal_needed", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error: e } =
        await fetchAcceptedExchangesNeedingReciprocal(userId);
      if (e) throw e;
      return data;
    },
    enabled: !!userId && !!detail && detail.status === "accepted",
  });

  const { data: awaitingAsRequester = [] } = useQuery({
    queryKey: ["exchange_awaiting_reciprocal", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error: e } =
        await fetchAcceptedExchangesAwaitingReciprocalByRequester(userId);
      if (e) throw e;
      return data;
    },
    enabled: !!userId && !!detail && detail.status === "accepted",
  });

  const needsReciprocalBook =
    detail?.viewerRole === "recipient" &&
    detail.status === "accepted" &&
    reciprocalRows.some((r) => r.exchange_request_id === requestId);

  const waitingForTheirReciprocalBook =
    detail?.viewerRole === "requester" &&
    detail.status === "accepted" &&
    awaitingAsRequester.some((r) => r.exchange_request_id === requestId);

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["exchange_pending"] });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_reciprocal_needed", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_sent", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["practitioner_dashboard", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_awaiting_reciprocal", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_request_detail"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_terminal_history", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_completed_history", userId],
    });
  };

  const backToList = () =>
    goBackOrReplace(tabPath(tabRoot, "exchange") as Href);

  const onRequestExtension = (row: ExchangeRequestDetail) => {
    if (!userId) return;
    Alert.alert(
      "Request more time?",
      "Ask for 3 more days to book your return session. The other practitioner must approve.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request extension",
          onPress: () =>
            void (async () => {
              setBusy(true);
              try {
                const res = await requestExchangeExtension({
                  requestId: row.id,
                  recipientId: userId,
                  extensionDays: 3,
                });
                if (!res.ok) {
                  Alert.alert(
                    "Error",
                    res.error?.message || "Could not request extension",
                  );
                  return;
                }
                await invalidateAll();
                void refetch();
                Alert.alert("Requested", "They will be notified to approve.");
              } finally {
                setBusy(false);
              }
            })(),
        },
      ],
    );
  };

  const onApproveExtension = (row: ExchangeRequestDetail) => {
    if (!userId) return;
    Alert.alert(
      "Approve extension?",
      `Grant ${row.extension_days ?? 3} more days to book their return session.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () =>
            void (async () => {
              setBusy(true);
              try {
                const res = await approveExchangeExtension({
                  requestId: row.id,
                  requesterId: userId,
                });
                if (!res.ok) {
                  Alert.alert(
                    "Error",
                    res.error?.message || "Could not approve extension",
                  );
                  return;
                }
                await invalidateAll();
                void refetch();
                Alert.alert("Approved", "Their deadline has been extended.");
              } finally {
                setBusy(false);
              }
            })(),
        },
      ],
    );
  };

  const onReschedule = (row: ExchangeRequestDetail) => {
    if (!userId) return;
    Alert.alert(
      "Request a different time?",
      "Release this slot so they can send a new request with a time that works for you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release slot",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await rescheduleExchangeRequest({
                requestId: row.id,
                recipientId: userId,
                reason: declineReason.trim() || undefined,
              });
              if (!res.ok) {
                const msg = res.error?.message || "Could not reschedule";
                Alert.alert(
                  "Error",
                  msg.includes("RESCHEDULE_CAP_EXCEEDED")
                    ? "You have reached the reschedule limit for this pair. Accept or ask them to send a new request."
                    : formatExchangeConflictMessage(msg),
                );
                return;
              }
              await invalidateAll();
              void refetch();
              backToList();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onAccept = (row: ExchangeRequestDetail) => {
    if (!userId) return;
    Alert.alert(
      "Accept exchange?",
      "This adds their session to your diary. You will still need to book your return session with them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await acceptExchangeRequest({
                requestId: row.id,
                recipientId: userId,
              });
              if (!res.ok) {
                Alert.alert(
                  "Error",
                  formatExchangeConflictMessage(
                    res.error?.message ?? "Could not accept",
                  ),
                );
                return;
              }
              await invalidateAll();
              void refetch();
              Alert.alert(
                "Accepted",
                "Choose date and time below to book your return session.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onCancel = (row: ExchangeRequestDetail) => {
    if (!userId) return;
    Alert.alert(
      "Cancel this request?",
      "The other practitioner will be notified.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await cancelExchangeRequestByRequester({
                requestId: row.id,
                requesterId: userId,
              });
              if (!res.ok) {
                Alert.alert("Error", res.error?.message || "Could not cancel");
                return;
              }
              await invalidateAll();
              void refetch();
              backToList();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const exchangeSubtitle = detail
    ? detail.viewerRole === "recipient"
      ? `From ${detail.requester_name}`
      : `To ${detail.recipient_name}`
    : undefined;

  return (
    <TabScreen>
      <AppStackHeader
        title="Exchange request"
        subtitle={exchangeSubtitle}
        fallbackHref={tabPath(tabRoot, "exchange")}
      />
      {!idOk ? (
        <View className="flex-1 px-6 justify-center">
          <Text className="text-charcoal-600 text-center">
            Invalid request link.
          </Text>
          <Button variant="outline" className="mt-6" onPress={backToList}>
            Back to Treatment exchange
          </Button>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
        </View>
      ) : error ? (
        <View className="flex-1 px-6 justify-center">
          <Text className="text-charcoal-600 text-center">
            {error instanceof Error ? error.message : "Could not load request."}
          </Text>
          <Button
            variant="outline"
            className="mt-6"
            onPress={() => void refetch()}
          >
            Retry
          </Button>
        </View>
      ) : !detail ? (
        <View className="flex-1 px-6 justify-center">
          <Text className="text-charcoal-600 text-center">
            Request not found or you don&apos;t have access.
          </Text>
          <Button variant="outline" className="mt-6" onPress={backToList}>
            Back to Treatment exchange
          </Button>
        </View>
      ) : (
        <TabScreenScroll className="flex-1 px-6 pt-2">
          <Card variant="elevated" padding="md" className="mb-4">
            <Text className="text-charcoal-500 text-xs uppercase font-semibold">
              Status
            </Text>
            <Text className="text-charcoal-900 text-xl font-bold mt-1">
              {statusTitle(detail.status)}
            </Text>
          </Card>

          <Card variant="default" padding="md" className="mb-3">
            <Text className="text-charcoal-800 font-semibold">
              Proposed session
            </Text>
            {detail.requested_session_date ? (
              <Text className="text-charcoal-700 mt-2">
                {detail.requested_session_date}
                {detail.requested_start_time
                  ? ` · ${fmtTime(detail.requested_start_time)}`
                  : ""}
                {detail.duration_minutes != null
                  ? ` · ${detail.duration_minutes} min`
                  : ""}
              </Text>
            ) : (
              <Text className="text-charcoal-500 mt-2">—</Text>
            )}
            {detail.session_type ? (
              <Text className="text-charcoal-500 text-sm mt-2">
                {detail.session_type}
              </Text>
            ) : null}
          </Card>

          {detail.requester_notes ? (
            <Card variant="default" padding="md" className="mb-3">
              <Text className="text-charcoal-500 text-sm">
                {detail.viewerRole === "requester" ? "Your note" : "Their note"}
              </Text>
              <Text className="text-charcoal-800 mt-2">
                {detail.requester_notes}
              </Text>
            </Card>
          ) : null}

          {detail.recipient_notes && detail.status === "declined" ? (
            <Card variant="default" padding="md" className="mb-3">
              <Text className="text-charcoal-500 text-sm">
                Availability note
              </Text>
              <Text className="text-charcoal-800 mt-2">
                {detail.recipient_notes}
              </Text>
            </Card>
          ) : null}

          {detail.reciprocal_booking_deadline &&
          detail.status === "accepted" &&
          needsReciprocalBook ? (
            <Card
              variant="default"
              padding="md"
              className="mb-3 border border-amber-200"
            >
              <Text className="text-amber-900 text-sm font-semibold">
                Book your return session by{" "}
                {new Date(detail.reciprocal_booking_deadline).toLocaleString()}
              </Text>
              <Button
                testID="exchange-choose-reciprocal"
                variant="primary"
                className="mt-3"
                onPress={() => setSlotModalOpen(true)}
              >
                Choose date and time
              </Button>
            </Card>
          ) : null}

          {waitingForTheirReciprocalBook ? (
            <Card variant="default" padding="md" className="mb-3">
              <Text className="text-charcoal-800 text-sm leading-6">
                Waiting for {detail.recipient_name} to book their return session
                with you. You will be notified when the exchange is complete.
              </Text>
              {detail.reciprocal_booking_deadline ? (
                <Text className="text-charcoal-500 text-xs mt-2">
                  Deadline:{" "}
                  {new Date(
                    detail.reciprocal_booking_deadline,
                  ).toLocaleString()}
                </Text>
              ) : null}
            </Card>
          ) : null}

          <Text className="text-charcoal-400 text-xs mt-2 mb-4">
            Created{" "}
            {detail.created_at
              ? new Date(detail.created_at).toLocaleString()
              : "—"}
            {detail.updated_at && detail.updated_at !== detail.created_at
              ? ` · Updated ${new Date(detail.updated_at).toLocaleString()}`
              : ""}
            {detail.accepted_at
              ? ` · Accepted ${new Date(detail.accepted_at).toLocaleString()}`
              : ""}
            {detail.declined_at
              ? ` · Different time requested ${new Date(detail.declined_at).toLocaleString()}`
              : ""}
          </Text>

          {detail.status === "accepted" &&
          detail.viewerRole === "recipient" &&
          needsReciprocalBook &&
          !detail.extension_requested_at ? (
            <Button
              variant="outline"
              className="mb-4"
              disabled={busy}
              onPress={() => onRequestExtension(detail)}
            >
              Request more time (3 days)
            </Button>
          ) : null}

          {detail.status === "accepted" &&
          detail.viewerRole === "requester" &&
          detail.extension_requested_at &&
          !detail.extension_approved_at ? (
            <Button
              variant="primary"
              className="mb-4"
              disabled={busy}
              isLoading={busy}
              onPress={() => onApproveExtension(detail)}
            >
              Approve extension ({detail.extension_days ?? 3} days)
            </Button>
          ) : null}

          {detail.status === "pending" && detail.viewerRole === "recipient" ? (
            <>
              <Text className="text-charcoal-500 text-sm mb-2">
                Suggest when you are available (optional)
              </Text>
              <TextInput
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
                placeholder="e.g. I'm available Tuesdays after 2pm"
                placeholderTextColor={Colors.charcoal[400]}
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
              />
              <Button
                variant="primary"
                disabled={busy}
                isLoading={busy}
                onPress={() => onAccept(detail)}
              >
                Accept
              </Button>
              <Button
                variant="destructive"
                className="mt-3"
                disabled={busy}
                isLoading={busy}
                onPress={() => onReschedule(detail)}
              >
                Request different time
              </Button>
            </>
          ) : null}

          {detail.status === "pending" && detail.viewerRole === "requester" ? (
            <Button
              variant="outline"
              disabled={busy}
              isLoading={busy}
              onPress={() => onCancel(detail)}
            >
              Cancel request
            </Button>
          ) : null}

          {detail.status !== "pending" ? (
            <Button variant="outline" className="mt-4" onPress={backToList}>
              Back to list
            </Button>
          ) : null}
        </TabScreenScroll>
      )}

      {detail && userId && needsReciprocalBook ? (
        <ExchangeReciprocalSlotModal
          visible={slotModalOpen}
          requestId={detail.id}
          peerLabel={detail.requester_name}
          durationMinutes={detail.duration_minutes}
          recipientId={userId}
          onClose={() => setSlotModalOpen(false)}
          onBooked={async () => {
            await invalidateAll();
            void refetch();
          }}
        />
      ) : null}
    </TabScreen>
  );
}
