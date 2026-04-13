import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSessionsClinicalNotesSummary,
  type SessionClinicalNotesSummary,
} from "@/lib/api/practitionerTreatmentNotes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

function SessionRow({ s, onPress }: { s: SessionClinicalNotesSummary; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card variant="default" padding="md" className="mb-3">
        <View className="flex-row justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-charcoal-900 font-semibold">{s.client_name}</Text>
            <Text className="text-charcoal-500 text-sm mt-1">
              {s.session_date} · {s.start_time?.slice(0, 5)}
            </Text>
            <Text className="text-charcoal-400 text-xs mt-1 capitalize">
              {s.has_notes ? "notes saved" : "no notes yet"}
              {s.clinical_attachment_count > 0
                ? ` · ${s.clinical_attachment_count} file${s.clinical_attachment_count === 1 ? "" : "s"}`
                : ""}{" "}
              · {s.status ?? "scheduled"}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.charcoal[300]} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function PractitionerClinicalFilesScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const [showAll, setShowAll] = useState(false);

  const { data = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["practitioner_clinical_files", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchSessionsClinicalNotesSummary({
        therapistId: userId,
        limit: 120,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const visible = useMemo(() => {
    if (showAll) return data;
    return data.filter((s) => s.has_notes || s.clinical_attachment_count > 0);
  }, [data, showAll]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream[50] }} edges={["top"]}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={Colors.sage[500]}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <ScreenHeader
          className="-mx-6 -mt-4 mb-2"
          eyebrow="Practice"
          title="Clinical files"
          subtitle="Session notes and attachments vault."
        />

        <Card variant="default" padding="md" className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-charcoal-900 font-semibold">Notes & files vault</Text>
              <Text className="text-charcoal-500 text-sm mt-1">
                Browse sessions with notes or clinical file attachments. Open a session to
                edit SOAP/DAP or upload files.
              </Text>
            </View>
            <View className="w-10 h-10 rounded-full items-center justify-center bg-cream-100">
              <FileText size={18} color={Colors.charcoal[700]} />
            </View>
          </View>
        </Card>

        <Button variant="outline" className="mb-4" onPress={() => setShowAll((v) => !v)}>
          <Text className="text-charcoal-800 font-semibold">
            {showAll
              ? "Show only sessions with notes or files"
              : "Show all sessions"}
          </Text>
        </Button>

        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : error ? (
          <Text className="text-charcoal-600">
            {error instanceof Error ? error.message : "Could not load clinical files."}
          </Text>
        ) : visible.length === 0 ? (
          <Text className="text-charcoal-500 py-8">
            {showAll ? "No sessions found." : "No saved notes or files yet."}
          </Text>
        ) : (
          visible.map((s) => (
            <SessionRow
              key={s.id}
              s={s}
              onPress={() =>
                router.push(tabPath(tabRoot, `clinical-notes/${s.id}`) as never)
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

