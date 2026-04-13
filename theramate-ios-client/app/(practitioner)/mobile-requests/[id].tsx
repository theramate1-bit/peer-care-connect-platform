/**
 * Single mobile request — accept / decline (RPC).
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPractitionerMobileRequests,
  acceptMobileBookingRequest,
  declineMobileBookingRequest,
} from "@/lib/api/practitionerMobileRequests";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

export default function PractitionerMobileRequestDetailScreen() {
  const tabRoot = useTabRoot();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["practitioner_mobile_requests", userId, "pending"],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchPractitionerMobileRequests(
        userId,
        "pending",
      );
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const req = rows.find((r) => r.id === id);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["practitioner_mobile_requests"],
    });
    await queryClient.invalidateQueries({ queryKey: ["practitioner_dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["practitioner_sessions"] });
  };

  const onAccept = () => {
    if (!req?.stripe_payment_intent_id) {
      Alert.alert(
        "Cannot accept",
        "Payment intent is missing. Try again later or open Billing from your profile.",
      );
      return;
    }
    Alert.alert(
      "Accept request",
      "Capture payment and create this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await acceptMobileBookingRequest({
                requestId: req.id,
                stripePaymentIntentId: req.stripe_payment_intent_id!,
              });
              if (!res.ok) {
                Alert.alert("Could not accept", res.error || "");
                return;
              }
              await invalidate();
              Alert.alert("Accepted", "Session created.", [
                {
                  text: "OK",
                  onPress: () =>
                    goBackOrReplace(tabPath(tabRoot, "mobile-requests")),
                },
              ]);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onDecline = () => {
    if (!req) return;
    Alert.alert("Decline request", "Release the hold and notify the client?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            const res = await declineMobileBookingRequest({
              requestId: req.id,
              declineReason: declineReason.trim() || undefined,
            });
            if (!res.ok) {
              Alert.alert("Could not decline", res.error || "");
              return;
            }
            await invalidate();
            goBackOrReplace(tabPath(tabRoot, "mobile-requests"));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      {isLoading || !req ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
          {!isLoading && !req ? (
            <Text className="text-charcoal-500 mt-4 px-6 text-center">
              Request not found or already processed.
            </Text>
          ) : null}
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <ScreenHeader
            className="-mx-6 -mt-4 mb-2"
            eyebrow="Practice"
            title="Mobile request"
            subtitle="Review details and accept or decline."
          />

          <Card variant="elevated" padding="lg" className="mb-4">
            <Text className="text-charcoal-900 text-xl font-bold">
              {req.client_name}
            </Text>
            <Text className="text-charcoal-500 mt-2">{req.client_email}</Text>
          </Card>

          <Card variant="default" padding="md" className="mb-3">
            <Text className="text-charcoal-800 font-semibold">{req.product_name}</Text>
            <Text className="text-charcoal-600 mt-2">
              {req.requested_date} at {String(req.requested_start_time).slice(0, 5)} ·{" "}
              {req.duration_minutes ?? 60} min
            </Text>
            {req.total_price_pence != null ? (
              <Text className="text-sage-600 font-semibold mt-2">
                £{(req.total_price_pence / 100).toFixed(2)}
              </Text>
            ) : null}
          </Card>

          {req.client_address ? (
            <View className="flex-row items-start bg-white border border-cream-200 rounded-xl p-4 mb-4">
              <MapPin size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-700 ml-2 flex-1">{req.client_address}</Text>
            </View>
          ) : null}

          {req.client_notes ? (
            <Card variant="default" padding="md" className="mb-4">
              <Text className="text-charcoal-500 text-sm">Client notes</Text>
              <Text className="text-charcoal-800 mt-2">{req.client_notes}</Text>
            </Card>
          ) : null}

          <Text className="text-charcoal-500 text-sm mb-2">
            Optional decline reason
          </Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-6"
            placeholder="Reason (shown to client if you decline)"
            placeholderTextColor={Colors.charcoal[400]}
            value={declineReason}
            onChangeText={setDeclineReason}
            multiline
          />

          <Button
            variant="primary"
            disabled={busy}
            onPress={onAccept}
          >
            <Text className="text-white font-semibold text-center">
              {busy ? "Please wait…" : "Accept & capture payment"}
            </Text>
          </Button>

          <Button
            variant="outline"
            className="mt-3"
            disabled={busy}
            onPress={onDecline}
          >
            <Text className="text-error font-semibold text-center">Decline</Text>
          </Button>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
