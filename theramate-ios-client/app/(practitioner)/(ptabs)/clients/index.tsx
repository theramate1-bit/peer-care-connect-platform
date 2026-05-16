/**
 * Practitioner — client list (from sessions).
 * Lives under `(ptabs)` so the bottom tab bar stays visible.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
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
import type { ClientEngagementStatus } from "@/lib/api/practitionerClients";

type StatusFilter = "all" | ClientEngagementStatus;

export default function PractitionerClientsScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePractitionerClients(userId);

  const filtered = useMemo(() => {
    let rows = data;
    if (statusFilter !== "all") {
      rows = rows.filter((c) => c.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)),
    );
  }, [data, search, statusFilter]);

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
            Sign in with your practitioner account to view clients you have
            treated and open their profiles.
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
            Roster from paid client sessions only; excludes cancelled, no-show,
            and peer exchange rows.
          </Text>

          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
            placeholder="Search by name or email"
            placeholderTextColor={Colors.charcoal[400]}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text className="text-charcoal-700 text-xs font-semibold mb-2">
            Status (engagement)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ gap: 8 }}
          >
            {(["all", "active", "new", "inactive"] as const).map((key) => {
              const on = statusFilter === key;
              const label =
                key === "all"
                  ? "All"
                  : key === "active"
                    ? "Active"
                    : key === "new"
                      ? "New"
                      : "Inactive";
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setStatusFilter(key)}
                  className={`px-3 py-2 rounded-xl border ${
                    on
                      ? "bg-sage-500 border-sage-500"
                      : "bg-white border-cream-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      on ? "text-white" : "text-charcoal-800"
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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
              No clients yet — they appear here after paid sessions.
            </Text>
          ) : filtered.length === 0 ? (
            <Text className="text-charcoal-500 text-center py-8">
              No matches for your search or status filter.
            </Text>
          ) : (
            filtered.map((c) => (
              <TouchableOpacity
                key={c.key}
                onPress={() => {
                  if (c.client_id) {
                    router.push(
                      tabPath(tabRoot, `clients/${c.client_id}`) as Href,
                    );
                  } else if (c.email) {
                    router.push(
                      `${tabPath(
                        tabRoot,
                        "clients/guest",
                      )}?email=${encodeURIComponent(c.email)}` as Href,
                    );
                  }
                }}
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
                        <Text className="capitalize">{c.status}</Text>
                        {" · "}
                        {c.session_count} session(s)
                        {` · £${c.total_spent.toFixed(2)} total`}
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
