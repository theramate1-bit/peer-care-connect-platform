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
import { ClipboardList } from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchTreatmentPlans,
  type TreatmentPlan,
} from "@/lib/api/treatmentPlans";
import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { PressableCard } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";

function StatusPill({ status }: { status: string | null }) {
  const key = (status || "active").toLowerCase();
  const cfg =
    key === "completed"
      ? { bg: "bg-success/10", text: "text-success", label: "Completed" }
      : key === "paused"
        ? { bg: "bg-warning/10", text: "text-warning", label: "Paused" }
        : { bg: "bg-info/10", text: "text-info", label: "Active" };
  return (
    <View className={`px-2 py-1 rounded-full ${cfg.bg}`}>
      <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
    </View>
  );
}

function PlanCard({ plan }: { plan: TreatmentPlan }) {
  const tabRoot = useTabRoot();
  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-3"
      onPress={() =>
        router.push(
          tabPath(tabRoot, `profile/treatment-plans/${plan.id}`) as never,
        )
      }
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-charcoal-900 font-semibold">{plan.title}</Text>
          <Text className="text-charcoal-500 text-sm mt-0.5">
            {plan.practitioner_name}
          </Text>
        </View>
        <StatusPill status={plan.status} />
      </View>
      <Text className="text-charcoal-500 text-sm mt-2">
        {plan.goals?.length || 0} goal
        {(plan.goals?.length || 0) === 1 ? "" : "s"} ·{" "}
        {plan.interventions?.length || 0} intervention
        {(plan.interventions?.length || 0) === 1 ? "" : "s"}
      </Text>
      {!!plan.created_at && (
        <Text className="text-charcoal-400 text-xs mt-1">
          Created {format(new Date(plan.created_at), "d MMM yyyy")}
        </Text>
      )}
    </PressableCard>
  );
}

export default function TreatmentPlansScreen() {
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
    queryKey: ["treatment_plans", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchTreatmentPlans(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Care plans"
        fallbackHref={tabPath(tabRoot, "bookings")}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load care plans."}
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
          renderItem={({ item }) => <PlanCard plan={item} />}
          ListEmptyComponent={
            <View className="py-14 items-center">
              <ClipboardList size={42} color={Colors.charcoal[300]} />
              <Text className="text-charcoal-500 text-center mt-3">
                No care plans yet.
              </Text>
              <Text className="text-charcoal-400 text-center text-sm mt-2 px-4">
                In the app, open a session to see plans linked to that visit.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
