/**
 * Native calendar tools only (Google sync disabled).
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";

export default function PractitionerCalendarSyncScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const statusQuery = useQuery({
    queryKey: ["calendar_internal_events_status", userId],
    queryFn: async () => {
      if (!userId) return null;
      const [eventsRes, blocksRes] = await Promise.all([
        supabase
          .from("calendar_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("calendar_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("provider", "internal"),
      ]);
      if (eventsRes.error) throw eventsRes.error;
      if (blocksRes.error) throw blocksRes.error;
      const lastEventRes = await supabase
        .from("calendar_events")
        .select("start_time")
        .eq("user_id", userId)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastEventRes.error) throw lastEventRes.error;
      return {
        totalEvents: eventsRes.count ?? 0,
        internalEvents: blocksRes.count ?? 0,
        latestEventAt: lastEventRes.data?.start_time ?? null,
      };
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
          onPress={() => goBackOrReplace(tabPath(tabRoot, "schedule"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Calendar tools
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Inbuilt calendar only
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text className="text-charcoal-600 leading-6 mb-5">
          Google Calendar sync is currently disabled. Use Theramate's inbuilt
          diary, blocked-time tools, and availability settings as the single
          source of truth.
        </Text>

        <Card
          variant="default"
          padding="md"
          className="mb-4 border border-cream-200"
        >
          <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
            Status in app
          </Text>
          {statusQuery.isLoading ? (
            <ActivityIndicator color={Colors.sage[500]} />
          ) : statusQuery.isError ? (
            <Text className="text-charcoal-600">
              Could not load calendar status.
            </Text>
          ) : (
            <View>
              <Text className="text-charcoal-900 font-medium">
                Inbuilt calendar active
              </Text>
              <Text className="text-charcoal-500 text-sm mt-2">
                Total calendar events: {statusQuery.data?.totalEvents ?? 0}
              </Text>
              <Text className="text-charcoal-500 text-sm mt-1">
                Internal events/blocks: {statusQuery.data?.internalEvents ?? 0}
              </Text>
              {statusQuery.data?.latestEventAt ? (
                <Text className="text-charcoal-500 text-sm mt-2">
                  Latest event:{" "}
                  {new Date(statusQuery.data.latestEventAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
