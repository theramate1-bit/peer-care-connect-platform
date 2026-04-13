import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Goal, ClipboardList, User } from "lucide-react-native";
import { format } from "date-fns";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { useAuth } from "@/hooks/useAuth";
import { fetchTreatmentPlanById } from "@/lib/api/treatmentPlans";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";

function prettyJsonValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function ListBlock({
  title,
  items,
  icon,
}: {
  title: string;
  items: unknown[] | null;
  icon: React.ReactNode;
}) {
  return (
    <Card variant="default" padding="md" className="mb-3">
      <View className="flex-row items-center mb-2">
        {icon}
        <Text className="text-charcoal-900 font-semibold ml-2">{title}</Text>
      </View>
      {!items || items.length === 0 ? (
        <Text className="text-charcoal-500">No items provided.</Text>
      ) : (
        items.map((item, idx) => (
          <View
            key={idx}
            className="py-2 border-b border-cream-200 last:border-b-0"
          >
            <Text className="text-charcoal-700">{prettyJsonValue(item)}</Text>
          </View>
        ))
      )}
    </Card>
  );
}

export default function TreatmentPlanDetailScreen() {
  const tabRoot = useTabRoot();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["treatment_plan_detail", userId, id],
    queryFn: async () => {
      if (!userId || !id) return null;
      const { data, error } = await fetchTreatmentPlanById({
        clientId: userId,
        planId: id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!id,
  });

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Care plan"
        fallbackHref={tabPath(tabRoot, "bookings")}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error ? error.message : "Could not load care plan."}
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
            Care plan not found.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Card variant="default" padding="lg" className="mb-4">
            <Text className="text-charcoal-900 text-xl font-bold">
              {data.title}
            </Text>
            <View className="flex-row items-center mt-2">
              <User size={14} color={Colors.charcoal[400]} />
              <Text className="text-charcoal-500 ml-1">
                {data.practitioner_name}
              </Text>
            </View>
            <Text className="text-charcoal-600 mt-2">
              Status: {(data.status || "active").toLowerCase()}
            </Text>
            {data.created_at ? (
              <Text className="text-charcoal-400 text-xs mt-1">
                Created {format(new Date(data.created_at), "d MMM yyyy")}
              </Text>
            ) : null}
          </Card>

          <ListBlock
            title="Goals"
            items={data.goals}
            icon={<Goal size={16} color={Colors.charcoal[500]} />}
          />
          <ListBlock
            title="Interventions"
            items={data.interventions}
            icon={<ClipboardList size={16} color={Colors.charcoal[500]} />}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
