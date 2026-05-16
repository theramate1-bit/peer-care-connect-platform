/**
 * Practitioner — client hub (tabs match web /practice/clients).
 */

import React from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import {
  ClientHubScreen,
  parseClientHubTabParam,
} from "@/components/practitioner/ClientHubScreen";
import { supabase } from "@/lib/supabase";

export default function PractitionerClientDetailScreen() {
  const tabRoot = useTabRoot();
  const { clientId, tab: tabParam } = useLocalSearchParams<{
    clientId: string;
    tab?: string | string[];
  }>();
  const initialTab = parseClientHubTabParam(tabParam);
  const { userId } = useAuth();
  const clientsListHref = tabPath(tabRoot, "clients");

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

  if (!userId) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      />
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
      ) : clientId ? (
        <ClientHubScreen
          displayName={name}
          subtitleEmail={clientRow?.email}
          resolvedClientId={clientId}
          initialTab={initialTab}
        />
      ) : null}
    </SafeAreaView>
  );
}
