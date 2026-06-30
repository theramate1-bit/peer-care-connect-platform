import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { fetchGoals } from "@/lib/api/progress";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import {
  AppStackHeader,
  TabScreen,
  TabScreenList,
} from "@/components/navigation";

function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase();
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

/** Client view — goals are assigned by practitioners; read-only list. */
export default function ProgressGoalsScreen() {
  const { userId } = useAuth();

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["progress_goals", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchGoals(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <TabScreen>
      <AppStackHeader
        title="Progress & goals"
        fallbackHref={defaultSignedInProfileHref()}
      />

      <View className="px-6 pt-4 pb-2">
        <Text className="text-charcoal-500 text-sm leading-5">
          Goals shared by your care team. You can view progress here; your
          practitioner updates goals in session.
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error ? error.message : "Could not load goals."}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TabScreenList
          data={data}
          keyExtractor={(item) => item.id}
          className="px-6 pt-2"
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <Card variant="default" padding="md" className="mb-3">
              <View className="flex-row items-start justify-between">
                <Text className="text-charcoal-900 font-semibold flex-1 mr-3">
                  {item.goal_title}
                </Text>
                <StatusPill status={item.status} />
              </View>
              <Text className="text-charcoal-600 mt-1">
                {item.goal_description}
              </Text>
              <View className="flex-row items-center mt-2">
                <Target size={14} color={Colors.charcoal[500]} />
                <Text className="text-charcoal-500 text-sm ml-1">
                  Target: {item.target_value} {item.target_unit} by{" "}
                  {format(new Date(item.target_date), "d MMM yyyy")}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View className="py-14">
              <Text className="text-charcoal-500 text-center">
                No goals yet.
              </Text>
              <Text className="text-charcoal-400 text-center text-sm mt-2 px-4">
                When your practitioner sets goals for you, they will appear
                here.
              </Text>
            </View>
          }
        />
      )}
    </TabScreen>
  );
}
