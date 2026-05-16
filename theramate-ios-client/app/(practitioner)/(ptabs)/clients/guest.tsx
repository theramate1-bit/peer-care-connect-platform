/**
 * Guest / email-only client — same tab shell as registered clients when a user id exists.
 */

import React, { useMemo } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerSessions } from "@/hooks/usePractitionerSessions";
import {
  ClientHubScreen,
  parseClientHubTabParam,
} from "@/components/practitioner/ClientHubScreen";
import { normalizeClientEmail } from "@/lib/api/practitionerClients";

export default function PractitionerGuestClientScreen() {
  const tabRoot = useTabRoot();
  const { email: emailParam, tab: tabParam } = useLocalSearchParams<{
    email?: string;
    tab?: string | string[];
  }>();
  const initialTab = parseClientHubTabParam(tabParam);
  const { userId } = useAuth();
  const clientsListHref = tabPath(tabRoot, "clients");

  const decoded = emailParam ? decodeURIComponent(emailParam) : "";
  const norm = decoded ? normalizeClientEmail(decoded) : "";

  const { data: sessions = [], isLoading } = usePractitionerSessions(userId);

  const resolvedClientId = useMemo(() => {
    if (!norm) return null;
    for (const s of sessions) {
      if (!s.client_email) continue;
      if (normalizeClientEmail(s.client_email) !== norm) continue;
      if (s.client_id) return s.client_id;
    }
    return null;
  }, [sessions, norm]);

  const displayName = useMemo(() => {
    if (!norm) return "Guest client";
    const row = sessions.find(
      (s) => s.client_email && normalizeClientEmail(s.client_email) === norm,
    );
    return row?.client_name?.trim() || "Guest client";
  }, [sessions, norm]);

  if (!userId) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      />
    );
  }

  if (!decoded || !norm) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      >
        <AppStackHeader title="Client" fallbackHref={clientsListHref} />
        <View className="px-6 py-8">
          <Text className="text-charcoal-600">
            Missing email. Go back to the client list.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <AppStackHeader title={displayName} fallbackHref={clientsListHref} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : (
        <ClientHubScreen
          displayName={displayName}
          subtitleEmail={decoded}
          resolvedClientId={resolvedClientId}
          emailNorm={norm}
          initialTab={initialTab}
        />
      )}
    </SafeAreaView>
  );
}
