/**
 * Practitioner — sessions you provide (therapist-scoped).
 */

import React, { useMemo, useState } from "react";
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
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
} from "lucide-react-native";

import { PressableCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerSessions } from "@/hooks/usePractitionerSessions";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";
import {
  isSessionUpcoming,
  type SessionWithClient,
} from "@/lib/api/practitionerSessions";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";

type TabType = "upcoming" | "past";

const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    confirmed: {
      color: "bg-success/10",
      text: "text-success",
      icon: CheckCircle2,
      label: "Confirmed",
    },
    scheduled: {
      color: "bg-info/10",
      text: "text-info",
      icon: AlertCircle,
      label: "Scheduled",
    },
    completed: {
      color: "bg-sage-500/10",
      text: "text-sage-600",
      icon: CheckCircle2,
      label: "Completed",
    },
    cancelled: {
      color: "bg-error/10",
      text: "text-error",
      icon: XCircle,
      label: "Cancelled",
    },
  }[status] || {
    color: "bg-charcoal-100",
    text: "text-charcoal-500",
    icon: AlertCircle,
    label: status,
  };

  const Icon = config.icon;

  return (
    <View
      className={`flex-row items-center px-2 py-1 rounded-full ${config.color}`}
    >
      <Icon
        size={12}
        color={
          config.text.includes("success")
            ? Colors.success
            : config.text.includes("info")
              ? Colors.info
              : config.text.includes("sage")
                ? Colors.sage[600]
                : config.text.includes("error")
                  ? Colors.error
                  : Colors.charcoal[500]
        }
      />
      <Text className={`text-xs font-medium ml-1 ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
};

function SessionCard({
  session,
  isPast,
}: {
  session: SessionWithClient;
  isPast: boolean;
}) {
  const tabRoot = useTabRoot();
  const date = new Date(session.session_date);
  const displayStatus = (session.status || "scheduled").toLowerCase();

  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-3"
      onPress={() =>
        router.push(tabPath(tabRoot, `bookings/${session.id}`) as Href)
      }
    >
      <View className="flex-row items-start">
        <View className="items-center justify-center bg-cream-100 rounded-lg p-3 mr-4">
          <Text className="text-charcoal-400 text-xs uppercase">
            {date.toLocaleDateString("en-GB", { weekday: "short" })}
          </Text>
          <Text className="text-charcoal-900 text-xl font-bold">
            {date.getDate()}
          </Text>
          <Text className="text-charcoal-500 text-xs">
            {date.toLocaleDateString("en-GB", { month: "short" })}
          </Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-charcoal-900 font-semibold">
              {session.client_name}
            </Text>
            <StatusBadge status={displayStatus} />
          </View>

          <Text className="text-charcoal-500 text-sm mb-2">
            {session.session_type || "Session"}
          </Text>

          <View className="flex-row items-center">
            <Clock size={14} color={Colors.charcoal[400]} />
            <Text className="text-charcoal-500 text-sm ml-1">
              {session.start_time} · {session.duration_minutes} min
            </Text>
          </View>

          <View className="flex-row items-center mt-2">
            <MapPin size={12} color={Colors.charcoal[400]} />
            <Text className="text-charcoal-400 text-xs ml-1 flex-1" numberOfLines={2}>
              {(session.appointment_type || "clinic").toLowerCase() === "mobile"
                ? session.visit_address
                  ? `Visit · ${session.visit_address}`
                  : "Mobile visit"
                : "Clinic"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mt-3">
            <Text className="text-sage-600 font-semibold">
              {session.price != null
                ? `£${Number(session.price).toFixed(0)}`
                : "—"}
            </Text>
            {!isPast && (
              <Button
                variant="ghost"
                size="sm"
                rightIcon={
                  <ChevronRight size={16} color={Colors.charcoal[400]} />
                }
                onPress={() =>
                  router.push(
                    tabPath(tabRoot, `bookings/${session.id}`) as Href,
                  )
                }
              >
                View details
              </Button>
            )}
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

export default function PractitionerBookingsScreen() {
  const tabRoot = useTabRoot();
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const { userId } = useAuth();

  const {
    data: allSessions = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePractitionerSessions(userId);

  const { upcoming, past } = useMemo(() => {
    const up: SessionWithClient[] = [];
    const pa: SessionWithClient[] = [];
    for (const s of allSessions) {
      if (isSessionUpcoming(s)) up.push(s);
      else pa.push(s);
    }
    return { upcoming: up, past: pa };
  }, [allSessions]);

  const sessions = activeTab === "upcoming" ? upcoming : past;

  const tabBarInset = useBottomTabBarHeight();
  const tabBarHeight =
    tabBarInset > 0 ? tabBarInset : Platform.OS === "ios" ? 88 : 70;

  if (!userId) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
        <View className="flex-1 px-6 pt-8 items-center justify-center pb-16">
          <Calendar size={48} color={Colors.charcoal[300]} />
          <Text className="text-charcoal-800 text-lg font-semibold text-center mt-6">
            Sessions
          </Text>
          <Text className="text-charcoal-500 text-center mt-3 leading-6">
            Sign in with your practitioner account to see upcoming and past
            appointments, notes, and linked care plans.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.push("/login" as Href)}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/register" as Href)}
          >
            Create practitioner account
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <ScreenHeader
        eyebrow="Practice"
        title="Sessions"
        subtitle="Upcoming and past — open one for notes, care plans, and messages."
        right={
          <TouchableOpacity
            onPress={() =>
              router.push(tabPath(tabRoot, "schedule") as Href)
            }
            className="w-11 h-11 rounded-2xl bg-white border border-cream-200 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Diary"
          >
            <Calendar size={22} color={Colors.sage[600]} />
          </TouchableOpacity>
        }
      />

      <View className="px-6 pt-2 pb-2">
        <View className="flex-row bg-cream-100 p-1 rounded-xl">
          {(["upcoming", "past"] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2.5 rounded-lg ${
                activeTab === tab ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === tab ? "text-charcoal-900" : "text-charcoal-500"
                }`}
              >
                {tab === "upcoming" ? "Upcoming" : "Past"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
          <Text className="text-charcoal-500 mt-4">Loading sessions…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 py-8">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load sessions."}
          </Text>
          <TouchableOpacity
            onPress={() => {
              void refetch();
            }}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
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
          {sessions.length === 0 ? (
            <View className="items-center justify-center py-16 px-2">
              <Calendar size={48} color={Colors.charcoal[300]} />
              <Text className="text-charcoal-500 mt-4 text-center">
                No {activeTab} sessions
              </Text>
              {activeTab === "upcoming" ? (
                <Button
                  variant="primary"
                  className="mt-6"
                  onPress={() =>
                    router.push(tabPath(tabRoot, "schedule") as Href)
                  }
                >
                  Open diary
                </Button>
              ) : null}
            </View>
          ) : (
            sessions.map((s) => (
              <View key={s.id}>
                <SessionCard session={s} isPast={activeTab === "past"} />
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
