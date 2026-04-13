/**
 * Practitioner — client list (from sessions).
 * Lives under `(ptabs)` so the bottom tab bar stays visible.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { ChevronRight, Users } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerClients } from "@/hooks/usePractitionerClients";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PRACTITIONER_PTABS_HREF } from "@/lib/navigation";

export default function PractitionerClientsScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePractitionerClients(userId);

  if (!userId) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      >
        <View className="flex-1 px-6 pt-8 items-center justify-center pb-16">
          <Text className="text-charcoal-900 text-xl font-semibold text-center">
            Practitioner sign-in required
          </Text>
          <Text className="text-charcoal-500 text-center mt-3 leading-6">
            Sign in with your practitioner account to view clients you have treated
            and open their profiles.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.push("/login" as never)}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/register" as never)}
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
      <AppStackHeader title="Clients" fallbackHref={PRACTITIONER_PTABS_HREF} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="px-6 py-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error ? error.message : "Could not load clients."}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-2"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor={Colors.sage[500]}
            />
          }
        >
          <Text className="text-charcoal-500 text-xs uppercase font-semibold mb-1">
            Practice
          </Text>
          <Text className="text-charcoal-500 text-sm mb-4">
            People you&apos;ve treated and their session history.
          </Text>

          <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
            In this app
          </Text>
          <View className="flex-row items-center gap-3 mb-6">
            <View className="w-12 h-12 rounded-2xl bg-sage-500/10 items-center justify-center">
              <Users size={24} color={Colors.sage[600]} />
            </View>
            <View>
              <Text className="text-charcoal-900 text-lg font-bold">
                Your clients
              </Text>
              <Text className="text-charcoal-500 text-sm">
                People you have treated (from bookings).
              </Text>
            </View>
          </View>

          {data.length === 0 ? (
            <Text className="text-charcoal-500 text-center py-8">
              No clients yet — sessions will appear here.
            </Text>
          ) : (
            data.map((c) => (
              <TouchableOpacity
                key={c.client_id}
                onPress={() =>
                  router.push(
                    tabPath(tabRoot, `clients/${c.client_id}`) as Href,
                  )
                }
                activeOpacity={0.85}
              >
                <Card variant="default" padding="md" className="mb-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-charcoal-900 font-semibold">
                        {c.name}
                      </Text>
                      {c.email ? (
                        <Text className="text-charcoal-500 text-sm mt-1">
                          {c.email}
                        </Text>
                      ) : null}
                      <Text className="text-charcoal-400 text-xs mt-2">
                        {c.session_count} session(s)
                        {c.last_session_date
                          ? ` · Last ${c.last_session_date}`
                          : ""}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={Colors.charcoal[300]} />
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
