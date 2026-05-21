/**
 * Bottom sheet — pick reciprocal return session from requester's available slots.
 */

import React, { useCallback, useEffect, useState } from "react";
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

import { Colors } from "@/constants/colors";
import {
  bookExchangeReciprocalSession,
  fetchExchangeReciprocalAvailableSlots,
  formatExchangeConflictMessage,
} from "@/lib/api/practitionerExchange";
import { Button } from "@/components/ui/Button";

export type ExchangeReciprocalSlotModalProps = {
  visible: boolean;
  requestId: string;
  peerLabel: string;
  durationMinutes: number | null;
  recipientId: string;
  onClose: () => void;
  onBooked: () => void | Promise<void>;
};

export function ExchangeReciprocalSlotModal({
  visible,
  requestId,
  peerLabel,
  durationMinutes,
  recipientId,
  onClose,
  onBooked,
}: ExchangeReciprocalSlotModalProps) {
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [slots, setSlots] = useState<
    { session_date: string; start_time: string }[]
  >([]);

  const loadSlots = useCallback(async () => {
    if (!recipientId || !requestId) return;
    setSlotsLoading(true);
    setSlots([]);
    try {
      const { data, error } = await fetchExchangeReciprocalAvailableSlots({
        requestId,
        recipientId,
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
  }, [recipientId, requestId]);

  useEffect(() => {
    if (visible && requestId) {
      void loadSlots();
    }
  }, [visible, requestId, loadSlots]);

  const bookSlot = (sessionDate: string, startTime: string) => {
    Alert.alert("Confirm return session", `${sessionDate} at ${startTime}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Book",
        onPress: () =>
          void (async () => {
            setBooking(true);
            try {
              const res = await bookExchangeReciprocalSession({
                requestId,
                recipientId,
                sessionDate,
                startTime,
                durationMinutes: durationMinutes ?? 60,
              });
              if (!res.ok) {
                Alert.alert(
                  "Error",
                  formatExchangeConflictMessage(
                    res.error?.message ?? "Could not book return session",
                  ),
                );
                return;
              }
              onClose();
              await onBooked();
              Alert.alert("Booked", "Your return session is scheduled.");
            } finally {
              setBooking(false);
            }
          })(),
      },
    ]);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-cream-50 rounded-t-3xl max-h-[85%] px-4 pt-4 pb-8"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="w-12 h-1 bg-cream-300 rounded-full self-center mb-4" />
          <Text className="text-charcoal-900 text-lg font-semibold mb-1">
            Available times
          </Text>
          <Text className="text-charcoal-500 text-sm mb-4">
            With {peerLabel} — slots follow their calendar and avoid conflicts.
          </Text>
          {slotsLoading ? (
            <ActivityIndicator color={Colors.sage[500]} className="py-8" />
          ) : slots.length === 0 ? (
            <View className="py-4">
              <Text className="text-charcoal-600 leading-6">
                No open slots on {peerLabel}&apos;s calendar in the next two
                weeks before your deadline. Ask them to free a time or update
                their weekly hours, or request more time from the exchange
                request.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {slots.map((s, idx) => (
                <TouchableOpacity
                  testID={idx === 0 ? "exchange-reciprocal-slot" : undefined}
                  key={`${s.session_date}-${s.start_time}-${idx}`}
                  className="py-3 border-b border-cream-200"
                  disabled={booking}
                  onPress={() => bookSlot(s.session_date, s.start_time)}
                >
                  <Text className="text-charcoal-900 font-medium">
                    {s.session_date} · {s.start_time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <Button variant="outline" className="mt-4" onPress={onClose}>
            Close
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
