/**
 * Treatment exchange — discover peers, inbox queues, reciprocal slot booking.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPendingExchangeRequestsForRecipient,
  fetchPendingExchangeRequestsSentByRequester,
  cancelExchangeRequestByRequester,
  rescheduleExchangeRequest,
  requestExchangeExtension,
  acceptExchangeRequest,
  fetchAcceptedExchangesNeedingReciprocal,
  fetchAcceptedExchangesAwaitingReciprocalByRequester,
  fetchRecentTerminalExchangeRequestsForParticipant,
  fetchRecentCompletedExchangesForParticipant,
  formatExchangeConflictMessage,
  type ExchangeNeedingReciprocalRow,
  type ExchangeRequestRow,
} from "@/lib/api/practitionerExchange";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";
import { ExchangeDiscoverPanel } from "@/components/practitioner/ExchangeDiscoverPanel";
import { ExchangeReciprocalSlotModal } from "@/components/practitioner/ExchangeReciprocalSlotModal";

function formatExchangeTime(t: string | null | undefined): string {
  if (t == null) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function terminalStatusLabel(
  status: string | null | undefined,
  complete?: boolean,
): string {
  if (complete) return "Complete";
  const s = (status || "").toLowerCase();
  if (s === "declined") return "Different time requested";
  if (s === "cancelled") return "Cancelled";
  if (s === "expired") return "Expired";
  return status || "Closed";
}

function counterpartName(row: ExchangeRequestRow, userId: string): string {
  if (row.requester_id === userId) {
    return row.recipient_name ?? "Practitioner";
  }
  return row.requester_name ?? "Practitioner";
}

type ExchangeSegment = "discover" | "inbox";

export default function PractitionerExchangeScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState<ExchangeSegment>("inbox");
  const [busy, setBusy] = useState<string | null>(null);
  const [slotModal, setSlotModal] = useState<{
    requestId: string;
    label: string;
    durationMinutes: number | null;
  } | null>(null);

  const {
    data: rows = [],
    isLoading: loadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ["exchange_pending", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchPendingExchangeRequestsForRecipient(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const reciprocalQuery = useQuery({
    queryKey: ["exchange_reciprocal_needed", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchAcceptedExchangesNeedingReciprocal(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const sentQuery = useQuery({
    queryKey: ["exchange_sent", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchPendingExchangeRequestsSentByRequester(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const awaitingReciprocalQuery = useQuery({
    queryKey: ["exchange_awaiting_reciprocal", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchAcceptedExchangesAwaitingReciprocalByRequester(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const terminalQuery = useQuery({
    queryKey: ["exchange_terminal_history", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchRecentTerminalExchangeRequestsForParticipant(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const completedQuery = useQuery({
    queryKey: ["exchange_completed_history", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchRecentCompletedExchangesForParticipant(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const inboxLoading =
    loadingPending ||
    reciprocalQuery.isLoading ||
    sentQuery.isLoading ||
    awaitingReciprocalQuery.isLoading ||
    terminalQuery.isLoading ||
    completedQuery.isLoading;

  const [pullRefreshing, setPullRefreshing] = useState(false);

  const onRefreshAll = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        refetchPending(),
        reciprocalQuery.refetch(),
        sentQuery.refetch(),
        awaitingReciprocalQuery.refetch(),
        terminalQuery.refetch(),
        completedQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: ["exchange_eligible", userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["credits", userId] }),
        queryClient.invalidateQueries({
          queryKey: ["exchange_my_tier", userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["practitioner_dashboard", userId],
        }),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [
    userId,
    queryClient,
    refetchPending,
    reciprocalQuery,
    sentQuery,
    awaitingReciprocalQuery,
    terminalQuery,
    completedQuery,
  ]);

  const openSlotModal = (row: ExchangeNeedingReciprocalRow) => {
    setSlotModal({
      requestId: row.exchange_request_id,
      label: row.requester_name,
      durationMinutes: row.duration_minutes,
    });
  };

  const onReciprocalBooked = async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({
      queryKey: ["exchange_reciprocal_needed", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_awaiting_reciprocal", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["practitioner_dashboard", userId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exchange_completed_history", userId],
    });
    void reciprocalQuery.refetch();
    void awaitingReciprocalQuery.refetch();
    void completedQuery.refetch();
  };

  const onCancelSent = (id: string) => {
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
            setBusy(id);
            try {
              const res = await cancelExchangeRequestByRequester({
                requestId: id,
                requesterId: userId,
              });
              if (!res.ok) {
                Alert.alert("Error", res.error?.message ?? "Could not cancel");
                return;
              }
              await queryClient.invalidateQueries({
                queryKey: ["exchange_sent", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["exchange_terminal_history", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["practitioner_dashboard", userId],
              });
              void sentQuery.refetch();
              void terminalQuery.refetch();
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const onRequestExtension = (requestId: string) => {
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
              setBusy(requestId);
              try {
                const res = await requestExchangeExtension({
                  requestId,
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
                await queryClient.invalidateQueries({
                  queryKey: ["exchange_reciprocal_needed", userId],
                });
                await queryClient.invalidateQueries({
                  queryKey: ["exchange_awaiting_reciprocal", userId],
                });
                await queryClient.invalidateQueries({
                  queryKey: ["practitioner_dashboard", userId],
                });
                void reciprocalQuery.refetch();
                void awaitingReciprocalQuery.refetch();
                Alert.alert(
                  "Requested",
                  "They will be notified to approve the extension.",
                );
              } finally {
                setBusy(null);
              }
            })(),
        },
      ],
    );
  };

  const onReschedule = (id: string) => {
    if (!userId) return;
    Alert.alert(
      "Request a different time?",
      "This releases the slot so they can send a new request. Add availability notes on the request detail screen if helpful.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release slot",
          style: "destructive",
          onPress: async () => {
            setBusy(id);
            try {
              const res = await rescheduleExchangeRequest({
                requestId: id,
                recipientId: userId,
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
              await queryClient.invalidateQueries({
                queryKey: ["exchange_pending"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["exchange_terminal_history", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["practitioner_dashboard"],
              });
              void refetchPending();
              void terminalQuery.refetch();
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const onAccept = (id: string) => {
    if (!userId) return;
    Alert.alert(
      "Accept exchange?",
      "This adds their session to your diary and starts the swap. You will still need to book your return session with them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          style: "default",
          onPress: async () => {
            setBusy(id);
            try {
              const res = await acceptExchangeRequest({
                requestId: id,
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
              await queryClient.invalidateQueries({
                queryKey: ["exchange_pending", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["exchange_reciprocal_needed", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["exchange_awaiting_reciprocal", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["practitioner_dashboard", userId],
              });
              void refetchPending();
              void reciprocalQuery.refetch();
              Alert.alert(
                "Accepted",
                "Book your return session below when ready.",
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
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
            Sign in with your practitioner account to manage treatment exchange
            requests and reciprocal bookings.
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
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => void onRefreshAll()}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <ScreenHeader
          className="-mx-6 -mt-4 mb-2"
          eyebrow="Practice"
          title="Treatment exchange"
          subtitle={
            segment === "discover"
              ? "Find peers in your rating tier and send a swap request."
              : "See requests you’ve sent and received, and book return sessions when needed."
          }
        />

        <View className="flex-row mb-4 gap-2">
          <TouchableOpacity
            testID="exchange-segment-discover"
            onPress={() => setSegment("discover")}
            className={`flex-1 py-3 rounded-xl border ${
              segment === "discover"
                ? "bg-sage-100 border-sage-400"
                : "bg-cream-50 border-cream-300"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                segment === "discover"
                  ? "text-charcoal-900"
                  : "text-charcoal-600"
              }`}
            >
              Discover
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSegment("inbox")}
            className={`flex-1 py-3 rounded-xl border ${
              segment === "inbox"
                ? "bg-sage-100 border-sage-400"
                : "bg-cream-50 border-cream-300"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                segment === "inbox" ? "text-charcoal-900" : "text-charcoal-600"
              }`}
            >
              Inbox
            </Text>
          </TouchableOpacity>
        </View>

        {segment === "discover" ? (
          <ExchangeDiscoverPanel userId={userId} />
        ) : (
          <>
            <Text className="text-charcoal-600 leading-6 mb-6">
              Accept or request a different time for incoming swaps, track
              outgoing requests, and book your return session after you accept.
            </Text>

            {inboxLoading ? (
              <ActivityIndicator color={Colors.sage[500]} className="py-6" />
            ) : (
              <>
                {reciprocalQuery.data && reciprocalQuery.data.length > 0 ? (
                  <View className="mb-6">
                    <Text className="text-charcoal-900 font-semibold text-base mb-2">
                      Book your return session
                    </Text>
                    <Text className="text-charcoal-500 text-sm mb-3">
                      These exchanges are accepted — pick a time for your
                      session with the requester (they are the therapist).
                    </Text>
                    {reciprocalQuery.data.map((r) => (
                      <Card
                        key={r.mutual_session_id}
                        variant="default"
                        padding="md"
                        className="mb-3"
                      >
                        <Text className="text-charcoal-900 font-semibold">
                          With {r.requester_name}
                        </Text>
                        {r.their_session_date ? (
                          <Text className="text-charcoal-700 text-sm mt-2">
                            Their session with you: {r.their_session_date}
                            {r.their_start_time
                              ? ` · ${String(r.their_start_time).slice(0, 5)}`
                              : ""}
                          </Text>
                        ) : null}
                        {r.reciprocal_booking_deadline ? (
                          <Text className="text-amber-800 text-xs mt-2">
                            Book by:{" "}
                            {new Date(
                              r.reciprocal_booking_deadline,
                            ).toLocaleString()}
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={() =>
                            router.push(
                              tabPath(
                                tabRoot,
                                `exchange/${r.exchange_request_id}`,
                              ) as Href,
                            )
                          }
                          className="mt-2 self-start"
                        >
                          <Text className="text-sage-600 text-sm font-medium">
                            View request details
                          </Text>
                        </TouchableOpacity>
                        <Button
                          testID="exchange-choose-reciprocal"
                          variant="primary"
                          className="mt-4"
                          disabled={busy === r.exchange_request_id}
                          isLoading={busy === r.exchange_request_id}
                          onPress={() => openSlotModal(r)}
                        >
                          Choose date and time
                        </Button>
                        {r.extension_requested_at ? null : (
                          <Button
                            variant="outline"
                            className="mt-3"
                            disabled={busy === r.exchange_request_id}
                            onPress={() =>
                              onRequestExtension(r.exchange_request_id)
                            }
                          >
                            Request more time (3 days)
                          </Button>
                        )}
                      </Card>
                    ))}
                  </View>
                ) : null}

                {awaitingReciprocalQuery.data &&
                awaitingReciprocalQuery.data.length > 0 ? (
                  <View className="mb-6">
                    <Text className="text-charcoal-900 font-semibold text-base mb-2">
                      Waiting for their return book
                    </Text>
                    <Text className="text-charcoal-500 text-sm mb-3">
                      They accepted your swap — they still need to book their
                      return session with you.
                    </Text>
                    {awaitingReciprocalQuery.data.map((r) => (
                      <Card
                        key={r.mutual_session_id}
                        variant="default"
                        padding="md"
                        className="mb-3 border border-cream-200"
                      >
                        <Text className="text-charcoal-900 font-semibold">
                          With {r.recipient_name}
                        </Text>
                        {r.your_session_date ? (
                          <Text className="text-charcoal-700 text-sm mt-2">
                            Your treatment session: {r.your_session_date}
                            {r.your_session_start_time
                              ? ` · ${String(r.your_session_start_time).slice(0, 5)}`
                              : ""}
                          </Text>
                        ) : null}
                        {r.reciprocal_booking_deadline ? (
                          <Text className="text-charcoal-500 text-xs mt-2">
                            They should book by:{" "}
                            {new Date(
                              r.reciprocal_booking_deadline,
                            ).toLocaleString()}
                          </Text>
                        ) : null}
                        {r.extension_requested_at &&
                        !r.extension_approved_at ? (
                          <Text className="text-amber-800 text-xs mt-2">
                            Extension pending your approval
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={() =>
                            router.push(
                              tabPath(
                                tabRoot,
                                `exchange/${r.exchange_request_id}`,
                              ) as Href,
                            )
                          }
                          className="mt-2 self-start"
                        >
                          <Text className="text-sage-600 text-sm font-medium">
                            View request details
                          </Text>
                        </TouchableOpacity>
                      </Card>
                    ))}
                  </View>
                ) : null}

                <Text className="text-charcoal-900 font-semibold text-base mb-2">
                  Waiting on them
                </Text>
                <Text className="text-charcoal-500 text-sm mb-3">
                  Requests you sent — cancel if you need to propose a different
                  time.
                </Text>
                {sentQuery.data && sentQuery.data.length > 0 ? (
                  sentQuery.data.map((r) => (
                    <Card
                      key={r.id}
                      variant="default"
                      padding="md"
                      className="mb-3"
                    >
                      <Text className="text-charcoal-900 font-semibold">
                        With {r.recipient_name ?? "Practitioner"}
                      </Text>
                      {r.requested_session_date ? (
                        <Text className="text-charcoal-800 text-sm mt-2">
                          Proposed: {r.requested_session_date}
                          {r.requested_start_time
                            ? ` · ${formatExchangeTime(r.requested_start_time)}`
                            : ""}
                          {r.duration_minutes != null
                            ? ` · ${r.duration_minutes} min`
                            : ""}
                        </Text>
                      ) : null}
                      {r.session_type ? (
                        <Text className="text-charcoal-500 text-sm mt-1">
                          {r.session_type}
                        </Text>
                      ) : null}
                      {r.requester_notes ? (
                        <Text className="text-charcoal-600 text-sm mt-2">
                          Your note: {r.requester_notes}
                        </Text>
                      ) : null}
                      <Text className="text-charcoal-400 text-xs mt-2">
                        Sent{" "}
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : ""}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          router.push(
                            tabPath(tabRoot, `exchange/${r.id}`) as Href,
                          )
                        }
                        className="mt-2 self-start"
                      >
                        <Text className="text-sage-600 text-sm font-medium">
                          View request details
                        </Text>
                      </TouchableOpacity>
                      <Button
                        variant="outline"
                        className="mt-4"
                        disabled={busy === r.id}
                        isLoading={busy === r.id}
                        onPress={() => onCancelSent(r.id)}
                      >
                        Cancel request
                      </Button>
                    </Card>
                  ))
                ) : (
                  <Text className="text-charcoal-500 mb-6">
                    No outgoing requests.
                  </Text>
                )}

                <Text className="text-charcoal-900 font-semibold text-base mb-2">
                  Needs your response
                </Text>
                <Text className="text-charcoal-500 text-sm mb-3">
                  Accept or request a different time for swaps others have
                  proposed.
                </Text>
                {rows.length === 0 ? (
                  <Text className="text-charcoal-500">
                    No incoming requests.
                  </Text>
                ) : (
                  rows.map((r) => (
                    <Card
                      key={r.id}
                      variant="default"
                      padding="md"
                      className="mb-3"
                    >
                      <Text className="text-charcoal-900 font-semibold">
                        {r.requester_name ?? "Practitioner"} proposes a swap
                      </Text>
                      {r.requested_session_date ? (
                        <Text className="text-charcoal-800 text-sm mt-2">
                          Their session: {r.requested_session_date}{" "}
                          {r.requested_start_time
                            ? `· ${formatExchangeTime(r.requested_start_time)}`
                            : ""}
                          {r.duration_minutes != null
                            ? ` · ${r.duration_minutes} min`
                            : ""}
                        </Text>
                      ) : null}
                      {r.session_type ? (
                        <Text className="text-charcoal-500 text-sm mt-1">
                          {r.session_type}
                        </Text>
                      ) : null}
                      {r.requester_notes ? (
                        <Text className="text-charcoal-600 text-sm mt-2">
                          Note: {r.requester_notes}
                        </Text>
                      ) : null}
                      <Text className="text-charcoal-400 text-xs mt-2">
                        Received{" "}
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : ""}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          router.push(
                            tabPath(tabRoot, `exchange/${r.id}`) as Href,
                          )
                        }
                        className="mt-2 self-start"
                      >
                        <Text className="text-sage-600 text-sm font-medium">
                          View request details
                        </Text>
                      </TouchableOpacity>
                      <Button
                        testID="exchange-accept"
                        variant="primary"
                        className="mt-4"
                        disabled={busy === r.id}
                        isLoading={busy === r.id}
                        onPress={() => onAccept(r.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        testID="exchange-reschedule"
                        variant="destructive"
                        className="mt-3"
                        disabled={busy === r.id}
                        isLoading={busy === r.id}
                        onPress={() => onReschedule(r.id)}
                      >
                        Request different time
                      </Button>
                    </Card>
                  ))
                )}

                <Text className="text-charcoal-900 font-semibold text-base mt-4 mb-2">
                  Past requests
                </Text>
                <Text className="text-charcoal-500 text-sm mb-3">
                  Declined, cancelled, or expired — open for details.
                </Text>
                {terminalQuery.data && terminalQuery.data.length > 0 ? (
                  terminalQuery.data.map((r) => (
                    <Card
                      key={r.id}
                      variant="default"
                      padding="md"
                      className="mb-3 opacity-90"
                    >
                      <Text className="text-charcoal-900 font-semibold">
                        With{" "}
                        {userId ? counterpartName(r, userId) : "Practitioner"}
                      </Text>
                      <Text className="text-charcoal-600 text-sm mt-1">
                        {terminalStatusLabel(r.status)}
                        {r.requested_session_date
                          ? ` · ${r.requested_session_date}`
                          : ""}
                        {r.requested_start_time
                          ? ` · ${formatExchangeTime(r.requested_start_time)}`
                          : ""}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          router.push(
                            tabPath(tabRoot, `exchange/${r.id}`) as Href,
                          )
                        }
                        className="mt-2 self-start"
                      >
                        <Text className="text-sage-600 text-sm font-medium">
                          View request details
                        </Text>
                      </TouchableOpacity>
                    </Card>
                  ))
                ) : (
                  <Text className="text-charcoal-500 mb-4">
                    No past requests in the last 20 closed items.
                  </Text>
                )}

                <Text className="text-charcoal-900 font-semibold text-base mt-4 mb-2">
                  Completed swaps
                </Text>
                <Text className="text-charcoal-500 text-sm mb-3">
                  Both practitioners booked — credits applied when leg 2
                  confirmed.
                </Text>
                {completedQuery.data && completedQuery.data.length > 0 ? (
                  completedQuery.data.map((r) => (
                    <Card
                      key={r.id}
                      variant="default"
                      padding="md"
                      className="mb-3 opacity-90"
                    >
                      <Text className="text-charcoal-900 font-semibold">
                        With{" "}
                        {userId ? counterpartName(r, userId) : "Practitioner"}
                      </Text>
                      <Text className="text-charcoal-600 text-sm mt-1">
                        {terminalStatusLabel(r.status, true)}
                        {r.requested_session_date
                          ? ` · ${r.requested_session_date}`
                          : ""}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          router.push(
                            tabPath(tabRoot, `exchange/${r.id}`) as Href,
                          )
                        }
                        className="mt-2 self-start"
                      >
                        <Text className="text-sage-600 text-sm font-medium">
                          View request details
                        </Text>
                      </TouchableOpacity>
                    </Card>
                  ))
                ) : (
                  <Text className="text-charcoal-500 mb-4">
                    No completed swaps yet.
                  </Text>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {userId && slotModal ? (
        <ExchangeReciprocalSlotModal
          visible={slotModal != null}
          requestId={slotModal.requestId}
          peerLabel={slotModal.label}
          durationMinutes={slotModal.durationMinutes}
          recipientId={userId}
          onClose={() => setSlotModal(null)}
          onBooked={onReciprocalBooked}
        />
      ) : null}
    </SafeAreaView>
  );
}
