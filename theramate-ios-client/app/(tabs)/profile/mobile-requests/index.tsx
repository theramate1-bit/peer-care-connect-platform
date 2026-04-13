import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, CircleAlert } from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchClientMobileRequests,
  type ClientMobileRequest,
} from "@/lib/api/mobileRequests";
import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { PressableCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { defaultSignedInProfileHref } from "@/lib/navigation";

function StatusPill({ status }: { status: string | null }) {
  const key = (status || "pending").toLowerCase();
  const cfg =
    key === "accepted"
      ? { bg: "bg-success/10", text: "text-success", label: "Accepted" }
      : key === "declined"
        ? { bg: "bg-error/10", text: "text-error", label: "Declined" }
        : key === "expired"
          ? {
              bg: "bg-charcoal-100",
              text: "text-charcoal-500",
              label: "Expired",
            }
          : { bg: "bg-warning/10", text: "text-warning", label: "Pending" };
  return (
    <View className={`px-2 py-1 rounded-full ${cfg.bg}`}>
      <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
    </View>
  );
}

function RequestCard({ item }: { item: ClientMobileRequest }) {
  const tabRoot = useTabRoot();
  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-3"
      onPress={() =>
        router.push(
          tabPath(tabRoot, `profile/mobile-requests/${item.id}`) as never,
        )
      }
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-charcoal-900 font-semibold">
            {item.product_name}
          </Text>
          <Text className="text-charcoal-500 text-sm mt-0.5">
            {item.practitioner_name}
          </Text>
        </View>
        <StatusPill status={item.status} />
      </View>

      <View className="flex-row items-center mt-3">
        <Clock size={14} color={Colors.charcoal[400]} />
        <Text className="text-charcoal-500 text-sm ml-1">
          {format(new Date(`${item.requested_date}T12:00:00`), "EEE d MMM")} ·{" "}
          {item.requested_start_time.slice(0, 5)} ({item.duration_minutes} min)
        </Text>
      </View>
      {item.client_address ? (
        <View className="flex-row items-center mt-1">
          <MapPin size={14} color={Colors.charcoal[400]} />
          <Text className="text-charcoal-500 text-sm ml-1" numberOfLines={1}>
            {item.client_address}
          </Text>
        </View>
      ) : null}
      <Text className="text-sage-600 font-semibold mt-3">
        £{(item.total_price_pence / 100).toFixed(2)}
      </Text>
    </PressableCard>
  );
}

export default function ClientMobileRequestsScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["client_mobile_requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchClientMobileRequests(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Mobile requests" fallbackHref={defaultSignedInProfileHref()} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load mobile requests."}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          className="px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => <RequestCard item={item} />}
          ListEmptyComponent={
            <View className="py-14 items-center">
              <CircleAlert size={42} color={Colors.charcoal[300]} />
              <Text className="text-charcoal-500 text-center mt-3">
                No mobile requests yet.
              </Text>
              <Button
                variant="primary"
                className="mt-4"
                onPress={() =>
                  router.push(tabPath(tabRoot, "explore") as never)
                }
              >
                <Text className="text-white font-semibold">
                  Explore therapists
                </Text>
              </Button>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
