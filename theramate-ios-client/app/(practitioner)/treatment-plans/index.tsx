import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, type Href } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchTreatmentPlansForPractitioner } from "@/lib/api/practitionerTreatmentPlans";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";

export default function TreatmentPlansListScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const {
    data = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["treatment_plans", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchTreatmentPlansForPractitioner(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <TabScreen>
      <AppStackHeader
        title="Care plans"
        subtitle="Open a session to create or link plans; this list is for direct links only."
        fallbackHref={tabPath(tabRoot, "bookings")}
      />
      <View className="px-6 pt-4 pb-2">
        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} color="#fff" />}
          className="mb-4"
          onPress={() =>
            router.push(tabPath(tabRoot, "treatment-plans/new") as Href)
          }
        >
          New care plan
        </Button>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center py-20">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor={Colors.sage[500]}
            />
          }
        >
          {data.length === 0 ? (
            <Text className="text-charcoal-500 py-8 text-center">
              No care plans yet. Create one for a client.
            </Text>
          ) : (
            data.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() =>
                  router.push(
                    tabPath(tabRoot, `treatment-plans/${p.id}`) as Href,
                  )
                }
              >
                <Card variant="default" padding="md" className="mb-3">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="text-charcoal-900 font-semibold">
                        {p.title}
                      </Text>
                      <Text className="text-charcoal-500 text-sm mt-1 capitalize">
                        {p.status}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.charcoal[300]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </TabScreen>
  );
}
