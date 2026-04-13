import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchTreatmentPlansForPractitioner } from "@/lib/api/practitionerTreatmentPlans";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function TreatmentPlansListScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const { data = [], isLoading, refetch, isFetching } = useQuery({
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "bookings"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Care plans
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Open a session to create or link plans; this list is for direct links
            only.
          </Text>
        </View>
      </View>

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
    </SafeAreaView>
  );
}
