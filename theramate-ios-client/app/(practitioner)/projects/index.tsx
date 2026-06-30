import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { fetchProjectsForTherapistUser } from "@/lib/api/practitionerProjects";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AppStackHeader, TabScreen } from "@/components/navigation";

export default function PractitionerProjectsListScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const {
    data = [],
    isLoading,
    refetch,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["legacy_projects", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error: err } = await fetchProjectsForTherapistUser(userId);
      if (err) throw err;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <TabScreen>
      <AppStackHeader
        title="Projects"
        subtitle="Long-form therapy project tracking and status."
        fallbackHref={tabPath(tabRoot, "profile")}
      />
      <ScrollView
        className="flex-1 px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <Text className="text-charcoal-600 leading-6 mb-4">
          Long-form therapy projects: edit details and phases here; data stays
          on your practice account.
        </Text>
        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.sage[500]} className="py-10" />
        ) : error ? (
          <Text className="text-charcoal-600">
            {error instanceof Error
              ? error.message
              : "Could not load projects."}
          </Text>
        ) : data.length === 0 ? (
          <Text className="text-charcoal-500 py-8">
            No projects linked to your therapist profile yet.
          </Text>
        ) : (
          data.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() =>
                router.push(tabPath(tabRoot, `projects/${p.id}`) as never)
              }
            >
              <Card variant="default" padding="md" className="mb-3">
                <View className="flex-row justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-charcoal-900 font-semibold">
                      {p.project_name}
                    </Text>
                    <Text className="text-charcoal-500 text-sm mt-1">
                      {p.client_name}
                    </Text>
                    <Text className="text-charcoal-400 text-xs mt-0.5 capitalize">
                      {p.project_status || p.project_type}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.charcoal[300]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </TabScreen>
  );
}
