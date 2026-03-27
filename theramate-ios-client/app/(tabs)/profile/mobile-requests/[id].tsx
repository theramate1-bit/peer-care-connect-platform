import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Clock, MapPin, CreditCard } from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import { fetchClientMobileRequestById } from "@/lib/api/mobileRequests";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function statusLabel(status: string | null): string {
  const s = (status || "pending").toLowerCase();
  if (s === "accepted") return "Accepted";
  if (s === "declined") return "Declined";
  if (s === "expired") return "Expired";
  if (s === "cancelled") return "Cancelled";
  return "Pending";
}

export default function MobileRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["client_mobile_request_detail", userId, id],
    queryFn: async () => {
      if (!userId || !id) return null;
      const { data, error } = await fetchClientMobileRequestById({
        clientId: userId,
        requestId: id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!id,
  });

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Request details
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error ? error.message : "Could not load request."}
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
            Request not found.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Card variant="default" padding="lg" className="mb-4">
            <Text className="text-charcoal-900 text-xl font-bold">
              {data.product_name}
            </Text>
            <Text className="text-charcoal-500 mt-1">
              {data.practitioner_name}
            </Text>
            <Text className="text-charcoal-700 font-medium mt-2">
              Status: {statusLabel(data.status)}
            </Text>
          </Card>

          <Card variant="default" padding="md" className="mb-3">
            <View className="flex-row items-center">
              <Clock size={16} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-700 ml-2">
                {format(
                  new Date(`${data.requested_date}T12:00:00`),
                  "EEEE d MMMM yyyy",
                )}{" "}
                · {data.requested_start_time.slice(0, 5)} (
                {data.duration_minutes} min)
              </Text>
            </View>
            <View className="flex-row items-center mt-3">
              <CreditCard size={16} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-700 ml-2">
                £{(data.total_price_pence / 100).toFixed(2)} · Payment{" "}
                {data.payment_status || "pending"}
              </Text>
            </View>
            {data.client_address ? (
              <View className="flex-row items-center mt-3">
                <MapPin size={16} color={Colors.charcoal[500]} />
                <Text className="text-charcoal-700 ml-2 flex-1">
                  {data.client_address}
                </Text>
              </View>
            ) : null}
          </Card>

          {data.client_notes ? (
            <Card variant="default" padding="md" className="mb-3">
              <Text className="text-charcoal-900 font-semibold">
                Your notes
              </Text>
              <Text className="text-charcoal-600 mt-2">
                {data.client_notes}
              </Text>
            </Card>
          ) : null}

          {data.decline_reason ? (
            <Card variant="default" padding="md" className="mb-3">
              <Text className="text-error font-semibold">Decline reason</Text>
              <Text className="text-charcoal-600 mt-2">
                {data.decline_reason}
              </Text>
            </Card>
          ) : null}

          {data.alternate_date && data.alternate_start_time ? (
            <Card variant="default" padding="md" className="mb-3">
              <Text className="text-charcoal-900 font-semibold">
                Alternate time offered
              </Text>
              <Text className="text-charcoal-600 mt-2">
                {format(
                  new Date(`${data.alternate_date}T12:00:00`),
                  "EEEE d MMMM yyyy",
                )}{" "}
                · {data.alternate_start_time.slice(0, 5)}
              </Text>
            </Card>
          ) : null}

          {data.session_id ? (
            <Button
              variant="primary"
              onPress={() => router.push(`/(tabs)/bookings/${data.session_id}`)}
            >
              <Text className="text-white font-semibold">
                View created session
              </Text>
            </Button>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
