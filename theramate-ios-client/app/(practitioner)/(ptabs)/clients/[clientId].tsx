/**
 * Practitioner — single client summary + link to message.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerSessions } from "@/hooks/usePractitionerSessions";
import { getOrCreateConversation } from "@/lib/api/messages";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export default function PractitionerClientDetailScreen() {
  const tabRoot = useTabRoot();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { userId } = useAuth();
  const clientsListHref = tabPath(tabRoot, "clients");

  const { data: sessions = [] } = usePractitionerSessions(userId);

  const clientSessions = useMemo(
    () =>
      sessions.filter((s) => s.client_id === clientId).sort(
        (a, b) => b.session_date.localeCompare(a.session_date),
      ),
    [sessions, clientId],
  );

  const { data: clientRow, isLoading } = useQuery({
    queryKey: ["user_public", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
    },
    enabled: !!clientId,
  });

  const name = clientRow
    ? `${clientRow.first_name || ""} ${clientRow.last_name || ""}`.trim() ||
      "Client"
    : "Client";

  const onMessage = async () => {
    if (!userId || !clientId) return;
    const { data: conversation, error } = await getOrCreateConversation(
      userId,
      clientId,
    );
    if (error || !conversation) {
      Alert.alert("Could not open chat", error?.message || "Try again.");
      return;
    }
    router.push(tabPath(tabRoot, `messages/${conversation}`) as never);
  };

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
            Sign in with your practitioner account to view this client and
            sessions.
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
      <AppStackHeader title={name} fallbackHref={clientsListHref} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-2"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <Text className="text-charcoal-500 text-sm mb-4">
            Session history and communication. Care plans are opened from each
            session.
          </Text>

          <Card variant="elevated" padding="lg" className="mb-4">
            <Text className="text-charcoal-900 text-xl font-bold">{name}</Text>
            {clientRow?.email ? (
              <Text className="text-charcoal-500 mt-2">{clientRow.email}</Text>
            ) : null}
          </Card>

          <Button variant="primary" onPress={() => void onMessage()}>
            <View className="flex-row items-center justify-center">
              <MessageCircle size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">Message</Text>
            </View>
          </Button>

          <Card variant="default" padding="md" className="mt-4">
            <Text className="text-charcoal-700 text-sm leading-6">
              Care plans are managed from Sessions. Open a booking below to link
              an existing plan, create a new one, or edit details.
            </Text>
          </Card>

          <Text className="text-charcoal-900 font-bold text-lg mt-8 mb-3">
            Sessions
          </Text>
          {clientSessions.length === 0 ? (
            <Text className="text-charcoal-500">No sessions yet.</Text>
          ) : (
            clientSessions.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() =>
                  router.push(tabPath(tabRoot, `bookings/${s.id}`) as never)
                }
              >
                <Card variant="default" padding="md" className="mb-2">
                  <Text className="text-charcoal-900 font-medium">
                    {s.session_date} · {s.start_time?.slice(0, 5)}
                  </Text>
                  <Text className="text-charcoal-500 text-sm mt-1">
                    {s.session_type || "Session"} · {(s.status || "").replace(
                      /_/g,
                      " ",
                    )}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
