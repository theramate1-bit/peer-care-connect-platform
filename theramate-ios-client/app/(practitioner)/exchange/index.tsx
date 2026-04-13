/**
 * Treatment exchange — pending list, accept/decline, reciprocal booking with slot picker.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CalendarClock } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPendingExchangeRequestsForRecipient,
  declineExchangeRequest,
  acceptExchangeRequest,
  bookExchangeReciprocalSession,
  fetchAcceptedExchangesNeedingReciprocal,
  fetchExchangeReciprocalAvailableSlots,
  type ExchangeNeedingReciprocalRow,
} from "@/lib/api/practitionerExchange";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

export default function PractitionerExchangeScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [slotModal, setSlotModal] = useState<{
    requestId: string;
    label: string;
    durationMinutes: number | null;
  } | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<
    { session_date: string; start_time: string }[]
  >([]);

  const { data: rows = [], isLoading, refetch } = useQuery({
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
      const { data, error } = await fetchAcceptedExchangesNeedingReciprocal(
        userId,
      );
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const loadSlotsFor = useCallback(
    async (requestId: string) => {
      if (!userId) return;
      setSlotsLoading(true);
      setSlots([]);
      try {
        const { data, error } = await fetchExchangeReciprocalAvailableSlots({
          requestId,
          recipientId: userId,
          dayCount: 14,
        });
        if (error) throw error;
        setSlots(data);
      } catch (e) {
        Alert.alert(
          "Slots",
          e instanceof Error ? e.message : "Could not load available times.",
        );
      } finally {
        setSlotsLoading(false);
      }
    },
    [userId],
  );

  const openSlotModal = (row: ExchangeNeedingReciprocalRow) => {
    const label = row.requester_name;
    setSlotModal({
      requestId: row.exchange_request_id,
      label,
      durationMinutes: row.duration_minutes,
    });
    void loadSlotsFor(row.exchange_request_id);
  };

  const onDecline = (id: string) => {
    if (!userId) return;
    Alert.alert("Decline exchange", "Notify the other practitioner?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          setBusy(id);
          try {
            const res = await declineExchangeRequest({
              requestId: id,
              recipientId: userId,
            });
            if (!res.ok) {
              Alert.alert("Error", res.error?.message || "Could not decline");
              return;
            }
            await queryClient.invalidateQueries({ queryKey: ["exchange_pending"] });
            await queryClient.invalidateQueries({ queryKey: ["practitioner_dashboard"] });
            void refetch();
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const onAccept = (id: string) => {
    if (!userId) return;
    Alert.alert(
      "Accept exchange?",
      "This confirms the requested session and starts the exchange. You will then book your return session with the other practitioner.",
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
                Alert.alert("Error", res.error?.message || "Could not accept");
                return;
              }
              await queryClient.invalidateQueries({
                queryKey: ["exchange_pending", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["exchange_reciprocal_needed", userId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["practitioner_dashboard", userId],
              });
              void refetch();
              void reciprocalQuery.refetch();
              Alert.alert("Accepted", "Book your return session below when ready.");
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const bookSlot = (sessionDate: string, startTime: string) => {
    if (!userId || !slotModal) return;
    Alert.alert(
      "Confirm return session",
      `${sessionDate} at ${startTime}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book",
          onPress: () =>
            void (async () => {
              setBusy(slotModal.requestId);
              try {
                const res = await bookExchangeReciprocalSession({
                  requestId: slotModal.requestId,
                  recipientId: userId,
                  sessionDate,
                  startTime,
                  durationMinutes: slotModal.durationMinutes ?? 60,
                });
                if (!res.ok) {
                  Alert.alert(
                    "Error",
                    res.error?.message || "Could not book return session",
                  );
                  return;
                }
                setSlotModal(null);
                await queryClient.invalidateQueries({
                  queryKey: ["exchange_reciprocal_needed", userId],
                });
                await queryClient.invalidateQueries({
                  queryKey: ["practitioner_dashboard", userId],
                });
                void reciprocalQuery.refetch();
                Alert.alert("Booked", "Your return session is scheduled.");
              } finally {
                setBusy(null);
              }
            })(),
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
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenHeader
          className="-mx-6 -mt-4 mb-2"
          eyebrow="Practice"
          title="Treatment exchange"
          subtitle="Accept and decline requests, then book reciprocal sessions."
        />
        <Text className="text-charcoal-600 leading-6 mb-6">
          Review proposed times below. Accept or decline pending requests. After you
          accept, book your return session from slots that match the other
          practitioner&apos;s calendar and your availability.
        </Text>

        {reciprocalQuery.data && reciprocalQuery.data.length > 0 ? (
          <View className="mb-6">
            <Text className="text-charcoal-900 font-semibold text-base mb-2">
              Book your return session
            </Text>
            <Text className="text-charcoal-500 text-sm mb-3">
              These exchanges are accepted — pick a time for your session with the
              requester (they are the therapist).
            </Text>
            {reciprocalQuery.data.map((r) => (
              <Card key={r.mutual_session_id} variant="default" padding="md" className="mb-3">
                <Text className="text-charcoal-900 font-semibold">
                  With {r.requester_name}
                </Text>
                {r.their_session_date ? (
                  <Text className="text-charcoal-700 text-sm mt-2">
                    Their session with you: {r.their_session_date}
                    {r.their_start_time ? ` · ${String(r.their_start_time).slice(0, 5)}` : ""}
                  </Text>
                ) : null}
                {r.reciprocal_booking_deadline ? (
                  <Text className="text-amber-800 text-xs mt-2">
                    Book by:{" "}
                    {new Date(r.reciprocal_booking_deadline).toLocaleString()}
                  </Text>
                ) : null}
                <Button
                  variant="primary"
                  className="mt-4"
                  disabled={busy === r.exchange_request_id}
                  isLoading={busy === r.exchange_request_id}
                  onPress={() => openSlotModal(r)}
                >
                  Choose date and time
                </Button>
              </Card>
            ))}
          </View>
        ) : null}

        <Text className="text-charcoal-900 font-semibold text-base mb-2">
          Pending requests
        </Text>

        {isLoading || reciprocalQuery.isLoading ? (
          <ActivityIndicator color={Colors.sage[500]} />
        ) : rows.length === 0 ? (
          <Text className="text-charcoal-500">No pending exchange requests.</Text>
        ) : (
          rows.map((r) => (
            <Card key={r.id} variant="default" padding="md" className="mb-3">
              <Text className="text-charcoal-900 font-semibold">
                {r.requester_name ?? "Practitioner"} proposes a swap
              </Text>
              {r.requested_session_date ? (
                <Text className="text-charcoal-800 text-sm mt-2">
                  Their session: {r.requested_session_date}{" "}
                  {r.requested_start_time ? `· ${r.requested_start_time}` : ""}
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
                {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
              </Text>
              <Button
                variant="primary"
                className="mt-4"
                disabled={busy === r.id}
                isLoading={busy === r.id}
                onPress={() => onAccept(r.id)}
              >
                Accept
              </Button>
              <Button
                variant="destructive"
                className="mt-3"
                disabled={busy === r.id}
                isLoading={busy === r.id}
                onPress={() => onDecline(r.id)}
              >
                Decline
              </Button>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal
        visible={slotModal != null}
        animationType="slide"
        transparent
        onRequestClose={() => setSlotModal(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setSlotModal(null)}
        >
          <Pressable
            className="bg-cream-50 rounded-t-3xl max-h-[85%] px-4 pt-4 pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="w-12 h-1 bg-cream-300 rounded-full self-center mb-4" />
            <Text className="text-charcoal-900 text-lg font-semibold mb-1">
              Available times
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              {slotModal
                ? `With ${slotModal.label} — slots follow their calendar and avoid conflicts.`
                : ""}
            </Text>
            {slotsLoading ? (
              <ActivityIndicator color={Colors.sage[500]} className="py-8" />
            ) : slots.length === 0 ? (
              <View className="py-4">
                <Text className="text-charcoal-600 leading-6">
                  No open slots in the next two weeks before your deadline. Check
                  your weekly hours, ask the other practitioner to free a time, or
                  extend availability if you can.
                </Text>
                <Button
                  variant="outline"
                  className="mt-4"
                  leftIcon={<CalendarClock size={18} color={Colors.sage[600]} />}
                  onPress={() => {
                    setSlotModal(null);
                    router.push(tabPath(tabRoot, "availability") as never);
                  }}
                >
                  Weekly hours
                </Button>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {slots.map((s, idx) => (
                  <TouchableOpacity
                    key={`${s.session_date}-${s.start_time}-${idx}`}
                    className="py-3 border-b border-cream-200"
                    disabled={busy === slotModal?.requestId}
                    onPress={() => bookSlot(s.session_date, s.start_time)}
                  >
                    <Text className="text-charcoal-900 font-medium">
                      {s.session_date} · {s.start_time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Button variant="outline" className="mt-4" onPress={() => setSlotModal(null)}>
              Close
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
