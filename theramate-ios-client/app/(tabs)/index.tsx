/**
 * Home/Dashboard Screen
 * Upcoming session + suggested practitioners from Supabase.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Redirect } from "expo-router";
import { format, isToday, isTomorrow } from "date-fns";
import {
  Calendar,
  Clock,
  ChevronRight,
  Search,
  Star,
  Heart,
  MessageCircle,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import { MainTabHeader } from "@/components/navigation/AppStackHeader";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { useClientSessions } from "@/hooks/useClientSessions";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import { Button } from "@/components/ui/Button";
import { Card, PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import { SPECIALIZATIONS } from "@/constants/config";
import {
  isSessionUpcoming,
  getSessionStartDate,
  type SessionWithTherapist,
} from "@/lib/api/clientSessions";

function formatSessionWhen(s: SessionWithTherapist): string {
  const d = getSessionStartDate(s);
  const t = format(d, "HH:mm");
  if (isToday(d)) return `Today · ${t}`;
  if (isTomorrow(d)) return `Tomorrow · ${t}`;
  return `${format(d, "EEE d MMM")} · ${t}`;
}

export default function HomeScreen() {
  const tabRoot = useTabRoot();
  const { userProfile, userId, isAuthenticated, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: sessions,
    isLoading: loadingSessions,
    refetch: refetchSessions,
  } = useClientSessions(userId);
  const {
    data: practitioners,
    isPending: marketplacePending,
    refetch: refetchPractitioners,
  } = useMarketplacePractitioners();

  const [refreshing, setRefreshing] = React.useState(false);

  const nextSession = useMemo(() => {
    if (!sessions?.length) return null;
    const upcoming = sessions
      .filter(isSessionUpcoming)
      .sort(
        (a, b) =>
          getSessionStartDate(a).getTime() - getSessionStartDate(b).getTime(),
      );
    return upcoming[0] ?? null;
  }, [sessions]);

  const suggested = useMemo(() => {
    if (!practitioners?.length) return [];
    return [...practitioners]
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(0, 4);
  }, [practitioners]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSessions(),
      refetchPractitioners(),
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] }),
    ]);
    setRefreshing(false);
  }, [refetchSessions, refetchPractitioners, queryClient, userId]);

  if (isInitialized && !isAuthenticated) {
    return <Redirect href="/explore" />;
  }

  const firstName = userProfile?.first_name || "there";
  const loadingHome = loadingSessions && !sessions;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <MainTabHeader title="Home" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-charcoal-500 text-base">Good morning,</Text>
              <Text className="text-charcoal-900 text-2xl font-bold">
                {firstName} 👋
              </Text>
            </View>
            <Avatar
              source={undefined}
              name={`${userProfile?.first_name} ${userProfile?.last_name}`}
              size="lg"
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Card variant="elevated" className="bg-sage-500 p-5">
            <Text className="text-white/80 text-sm mb-2">Next session</Text>
            {loadingHome ? (
              <ActivityIndicator color="#fff" />
            ) : nextSession ? (
              <>
                <View className="flex-row items-center mb-3">
                  <Avatar name={nextSession.therapist_name} size="md" />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-semibold text-lg">
                      {nextSession.therapist_name}
                    </Text>
                    <Text className="text-white/80 text-sm">
                      {nextSession.session_type || "Session"}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center flex-wrap gap-3">
                  <View className="flex-row items-center mr-4">
                    <Calendar size={16} color="white" />
                    <Text className="text-white ml-2 text-sm">
                      {formatSessionWhen(nextSession)}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Clock size={16} color="white" />
                    <Text className="text-white ml-2 text-sm">
                      {nextSession.duration_minutes} min
                    </Text>
                  </View>
                </View>
                <Link href={tabPath(tabRoot, "bookings") as never} asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-white/30"
                  >
                    <Text className="text-white font-medium">
                      View sessions
                    </Text>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Text className="text-white/90 text-base mb-4">
                  You have no upcoming bookings. Explore therapists to get
                  started.
                </Text>
                <Link href={tabPath(tabRoot, "explore") as never} asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/30"
                  >
                    <Text className="text-white font-medium">
                      Find a therapist
                    </Text>
                  </Button>
                </Link>
              </>
            )}
          </Card>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text className="text-charcoal-900 font-semibold text-lg mb-4">
            Quick actions
          </Text>
          <View className="flex-row space-x-3">
            <Link href={tabPath(tabRoot, "explore") as never} asChild>
              <PressableCard
                variant="filled"
                padding="md"
                className="flex-1 items-center"
              >
                <View className="w-12 h-12 bg-sage-500/10 rounded-full items-center justify-center mb-2">
                  <Search size={24} color={Colors.sage[500]} />
                </View>
                <Text className="text-charcoal-700 font-medium text-sm">
                  Find therapist
                </Text>
              </PressableCard>
            </Link>

            <Link href={tabPath(tabRoot, "bookings") as never} asChild>
              <PressableCard
                variant="filled"
                padding="md"
                className="flex-1 items-center"
              >
                <View className="w-12 h-12 bg-terracotta-500/10 rounded-full items-center justify-center mb-2">
                  <Calendar size={24} color={Colors.terracotta[500]} />
                </View>
                <Text className="text-charcoal-700 font-medium text-sm">
                  My sessions
                </Text>
              </PressableCard>
            </Link>

            <Link href={tabPath(tabRoot, "profile") as never} asChild>
              <PressableCard
                variant="filled"
                padding="md"
                className="flex-1 items-center"
              >
                <View className="w-12 h-12 bg-info/10 rounded-full items-center justify-center mb-2">
                  <Heart size={24} color={Colors.info} />
                </View>
                <Text className="text-charcoal-700 font-medium text-sm">
                  Profile
                </Text>
              </PressableCard>
            </Link>
          </View>

          <Link href={tabPath(tabRoot, "messages") as never} asChild>
            <PressableCard
              variant="default"
              padding="md"
              className="mt-3 flex-row items-center border border-cream-200"
            >
              <View className="w-11 h-11 rounded-xl bg-sage-500/10 items-center justify-center">
                <MessageCircle size={22} color={Colors.sage[600]} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-charcoal-900 font-semibold">
                  Messages
                </Text>
                <Text className="text-charcoal-500 text-sm mt-0.5">
                  Chat with your practitioners
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.charcoal[300]} />
            </PressableCard>
          </Link>

        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-charcoal-900 font-semibold text-lg">
              Suggested for you
            </Text>
            <Link href={tabPath(tabRoot, "explore") as never} asChild>
              <Text className="text-sage-500 font-medium">See all</Text>
            </Link>
          </View>

          {marketplacePending ? (
            <ActivityIndicator
              color={Colors.sage[500]}
              style={{ marginTop: 16 }}
            />
          ) : (
            suggested.map((p) => {
              const specLabels =
                p.specializations
                  ?.map(
                    (s) =>
                      SPECIALIZATIONS.find((spec) => spec.value === s)?.label,
                  )
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(", ") ?? "";
              return (
                <Link
                  key={p.id}
                  href={tabPath(tabRoot, `explore/${p.id}`) as never}
                  asChild
                >
                  <PressableCard
                    variant="default"
                    padding="md"
                    className="mb-3"
                  >
                    <View className="flex-row items-center">
                      <Avatar
                        source={p.profile_photo_url ?? undefined}
                        name={`${p.first_name} ${p.last_name}`}
                        size="lg"
                        verified={p.verified}
                      />
                      <View className="flex-1 ml-3">
                        <Text className="text-charcoal-900 font-semibold">
                          {p.first_name} {p.last_name}
                        </Text>
                        {!!specLabels && (
                          <Text className="text-charcoal-500 text-sm">
                            {specLabels}
                          </Text>
                        )}
                        <View className="flex-row items-center mt-1">
                          <Star
                            size={14}
                            color={Colors.warning}
                            fill={Colors.warning}
                          />
                          <Text className="text-charcoal-700 text-sm ml-1">
                            {p.average_rating.toFixed(1)}
                          </Text>
                          <Text className="text-charcoal-400 text-sm ml-1">
                            ({p.total_reviews} reviews)
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color={Colors.charcoal[300]} />
                    </View>
                  </PressableCard>
                </Link>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
