/**
 * Practitioner home — dashboard: today, metrics, action queue.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  Bell,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
} from "lucide-react-native";

import { useAuth } from "@/hooks/useAuth";
import { usePractitionerDashboard } from "@/hooks/usePractitionerDashboard";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { PressableCard } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";
import type { SessionWithClient } from "@/lib/api/practitionerSessions";

function SessionRow({
  s,
  onPress,
}: {
  s: SessionWithClient;
  onPress: () => void;
}) {
  const loc =
    (s.appointment_type || "clinic").toLowerCase() === "mobile"
      ? "Mobile"
      : "Clinic";
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View className="flex-row items-center py-3 border-b border-cream-100">
        <View className="w-12 h-12 rounded-xl bg-sage-500/10 items-center justify-center mr-3">
          <Clock size={20} color={Colors.sage[600]} />
        </View>
        <View className="flex-1">
          <Text className="text-charcoal-900 font-semibold">{s.client_name}</Text>
          <Text className="text-charcoal-500 text-sm">
            {s.session_type || "Session"} · {s.start_time?.slice(0, 5)} ·{" "}
            {s.duration_minutes} min
          </Text>
          <View className="flex-row items-center mt-1">
            <MapPin size={12} color={Colors.charcoal[400]} />
            <Text className="text-charcoal-400 text-xs ml-1">{loc}</Text>
          </View>
        </View>
        <ChevronRight size={18} color={Colors.charcoal[300]} />
      </View>
    </TouchableOpacity>
  );
}

export default function PractitionerHomeScreen() {
  const { userProfile, userId } = useAuth();
  const tabRoot = useTabRoot();
  const practitionerId = userId;
  const name =
    userProfile?.first_name ||
    userProfile?.full_name?.split(" ")[0] ||
    "there";

  const {
    data: dash,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePractitionerDashboard(practitionerId);

  const pendingTotal =
    (dash?.pendingMobileRequestsCount ?? 0) +
    (dash?.pendingExchangeCount ?? 0);

  const tabBarInset = useBottomTabBarHeight();
  const tabBarHeight =
    tabBarInset > 0 ? tabBarInset : Platform.OS === "ios" ? 88 : 70;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <ScreenHeader
          eyebrow="Practice"
          title={`Hello, ${name}`}
          subtitle="Today's work first — diary and clients are one tap away in the tab bar."
          right={
            !isLoading && !isError && dash ? (
              <TouchableOpacity
                onPress={() => router.push("/notifications" as Href)}
                className="w-11 h-11 rounded-2xl bg-white border border-cream-200 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={
                  dash.unreadNotificationsCount > 0
                    ? `Notifications, ${dash.unreadNotificationsCount} unread`
                    : "Notifications"
                }
              >
                <Bell size={22} color={Colors.sage[600]} />
                {dash.unreadNotificationsCount > 0 ? (
                  <View
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-sage-500 items-center justify-center px-1"
                  >
                    <Text className="text-white text-[10px] font-bold">
                      {dash.unreadNotificationsCount > 99
                        ? "99+"
                        : dash.unreadNotificationsCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : null
          }
        />

        <View className="px-6">
          {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color={Colors.sage[500]} />
          </View>
        ) : isError ? (
          <Text className="text-charcoal-600 mt-6">
            {error instanceof Error ? error.message : "Could not load dashboard."}
          </Text>
        ) : dash ? (
          <>
            {pendingTotal > 0 ? (
              <PressableCard
                variant="elevated"
                padding="md"
                className="mt-4"
                onPress={() =>
                  router.push(
                    tabPath(tabRoot, "mobile-requests") as Href,
                  )
                }
              >
                <Text className="text-charcoal-900 font-semibold">
                  Action required
                </Text>
                <Text className="text-charcoal-600 text-sm mt-1">
                  {dash.pendingMobileRequestsCount > 0
                    ? `${dash.pendingMobileRequestsCount} mobile visit request(s). `
                    : ""}
                  {dash.pendingExchangeCount > 0
                    ? `${dash.pendingExchangeCount} treatment exchange(s). `
                    : ""}
                </Text>
                <Text className="text-sage-600 text-sm font-medium mt-2">
                  Review →
                </Text>
              </PressableCard>
            ) : null}

            <View className={pendingTotal > 0 ? "mt-6" : "mt-4"}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-charcoal-900 text-lg font-bold">
                  Today
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push(tabPath(tabRoot, "schedule") as Href)
                  }
                >
                  <Text className="text-sage-600 font-medium text-sm">
                    Full diary
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="bg-white border border-cream-200 rounded-2xl px-4">
                {dash.todaySessions.length === 0 ? (
                  <Text className="text-charcoal-500 py-6 text-center">
                    No sessions in your diary today.
                  </Text>
                ) : (
                  dash.todaySessions.map((s) => (
                    <SessionRow
                      key={s.id}
                      s={s}
                      onPress={() =>
                        router.push(
                          tabPath(tabRoot, `bookings/${s.id}`) as Href,
                        )
                      }
                    />
                  ))
                )}
              </View>
            </View>

            <Text className="text-charcoal-500 text-xs uppercase font-semibold mt-8 mb-2">
              This month
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="bg-white border border-cream-200 rounded-2xl p-4 flex-1 min-w-[140px]">
                <Text className="text-charcoal-500 text-xs uppercase">
                  Sessions
                </Text>
                <Text className="text-charcoal-900 text-2xl font-bold mt-1">
                  {dash.monthSessionCount}
                </Text>
              </View>
              <View className="bg-white border border-cream-200 rounded-2xl p-4 flex-1 min-w-[140px]">
                <Text className="text-charcoal-500 text-xs uppercase">
                  Est. revenue
                </Text>
                <Text className="text-charcoal-900 text-2xl font-bold mt-1">
                  £{(dash.monthRevenuePence / 100).toFixed(0)}
                </Text>
              </View>
            </View>

            <PressableCard
              variant="default"
              padding="md"
              className="mt-4 flex-row items-center border border-cream-200"
              onPress={() =>
                router.push(tabPath(tabRoot, "messages") as Href)
              }
            >
              <View className="w-11 h-11 rounded-xl bg-sage-500/10 items-center justify-center">
                <MessageCircle size={22} color={Colors.sage[600]} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-charcoal-900 font-semibold">
                  Messages
                </Text>
                <Text className="text-charcoal-500 text-sm mt-0.5">
                  Client conversations
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.charcoal[300]} />
            </PressableCard>
          </>
        ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
