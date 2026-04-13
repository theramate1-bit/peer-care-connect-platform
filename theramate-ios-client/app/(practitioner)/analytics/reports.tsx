import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, FileText } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  fetchMyCustomReports,
  fetchReportDeliveriesForReports,
  type CustomReportRow,
} from "@/lib/api/customReports";
import { getReportExportSignedUrl } from "@/lib/api/reportExports";
import { generateReportExport } from "@/lib/api/reportExport";
import { openHostedWebSession } from "@/lib/openHostedWeb";

function prettyDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString();
}

async function openMaybeUrl(path: string) {
  const p = (path || "").trim();
  if (!p) return;
  if (/^https?:\/\//i.test(p)) {
    openHostedWebSession({ kind: "signed_document", url: p });
    return;
  }

  // Treat as Storage object path in bucket `report-exports`.
  const { url, error } = await getReportExportSignedUrl(p);
  if (url && !error) {
    openHostedWebSession({ kind: "signed_document", url });
    return;
  }

  Alert.alert(
    "Export unavailable",
    "Could not open this export file yet. Generate again and retry from Latest delivery.",
  );
}

export default function PractitionerAnalyticsReportsScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ["custom_reports", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchMyCustomReports(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["report_deliveries", userId, (reportsQuery.data || []).length],
    queryFn: async () => {
      const ids = (reportsQuery.data || []).map((r) => r.id);
      const { data, error } = await fetchReportDeliveriesForReports(ids, 80);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && (reportsQuery.data || []).length > 0,
  });

  const deliveriesByReport = useMemo(() => {
    const m = new Map<string, typeof deliveriesQuery.data>();
    for (const d of deliveriesQuery.data || []) {
      const arr = m.get(d.report_id) || [];
      arr.push(d);
      m.set(d.report_id, arr);
    }
    return m;
  }, [deliveriesQuery.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream[50] }} edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "analytics"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">Reports</Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Deliveries and template workflows are in app.
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={reportsQuery.isFetching || deliveriesQuery.isFetching}
            onRefresh={() => {
              void queryClient.invalidateQueries({ queryKey: ["custom_reports", userId] });
              void queryClient.invalidateQueries({ queryKey: ["report_deliveries", userId] });
            }}
            tintColor={Colors.sage[500]}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Card variant="default" padding="md" className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-charcoal-900 font-semibold">
                Scheduled reports
              </Text>
              <Text className="text-charcoal-500 text-sm mt-1">
                Saved definitions and delivery history. Generate exports below.
              </Text>
            </View>
            <View className="w-10 h-10 rounded-full items-center justify-center bg-cream-100">
              <FileText size={18} color={Colors.charcoal[700]} />
            </View>
          </View>
        </Card>

        <Text className="text-charcoal-900 font-semibold mt-2 mb-2">
          Your reports
        </Text>

        {reportsQuery.isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : (reportsQuery.data || []).length === 0 ? (
          <Text className="text-charcoal-500 py-8">
            No saved reports yet.
          </Text>
        ) : (
          ((reportsQuery.data || []) as CustomReportRow[]).map((r) => {
            const deliveries = deliveriesByReport.get(r.id) || [];
            const latest = deliveries[0];
            return (
              <Card key={r.id} variant="default" padding="md" className="mb-3">
                <Text className="text-charcoal-900 font-semibold">
                  {r.report_name}
                </Text>
                <Text className="text-charcoal-500 text-sm mt-1 capitalize">
                  {r.report_type} · {r.is_active ? "active" : "paused"}
                </Text>
                {r.report_description ? (
                  <Text className="text-charcoal-600 text-sm mt-2">
                    {r.report_description}
                  </Text>
                ) : null}

                <Text className="text-charcoal-400 text-xs mt-3">
                  Last generated: {prettyDate(r.last_generated_at)} · Next:{" "}
                  {prettyDate(r.next_generation_at)}
                </Text>

                <View className="mt-3">
                  <Text className="text-charcoal-700 font-semibold mb-2">
                    Latest delivery
                  </Text>
                  {deliveriesQuery.isLoading ? (
                    <ActivityIndicator color={Colors.sage[500]} />
                  ) : latest ? (
                    <View>
                      <Text className="text-charcoal-600 text-sm capitalize">
                        {latest.delivery_status ?? "generated"} ·{" "}
                        {latest.delivery_method}
                      </Text>
                      <Text className="text-charcoal-400 text-xs mt-1">
                        {prettyDate(latest.delivery_date)}
                      </Text>
                      {latest.file_path ? (
                        <Button
                          variant="outline"
                          className="mt-3"
                          onPress={() => void openMaybeUrl(latest.file_path || "")}
                        >
                          <Text className="text-charcoal-800 font-semibold">
                            Open exported file
                          </Text>
                        </Button>
                      ) : (
                        <Text className="text-charcoal-500 text-sm mt-2">
                          No export file attached.
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text className="text-charcoal-500 text-sm">
                      No deliveries yet.
                    </Text>
                  )}

                  <Button
                    variant="primary"
                    className="mt-3"
                    onPress={() =>
                      void (async () => {
                        const res = await generateReportExport(r.id);
                        if (!res.ok) {
                          Alert.alert(
                            "Could not generate export",
                            res.error?.message || "",
                          );
                          return;
                        }
                        await queryClient.invalidateQueries({
                          queryKey: ["report_deliveries", userId],
                        });
                        if (res.file_path) {
                          const signed = await getReportExportSignedUrl(
                            res.file_path,
                          );
                          if (signed.url && !signed.error) {
                            openHostedWebSession({
                              kind: "signed_document",
                              url: signed.url,
                            });
                            return;
                          }
                        }
                        Alert.alert(
                          "Generated",
                          "A new export was created. Open it from Latest delivery below.",
                        );
                      })()
                    }
                  >
                    <Text className="text-white font-semibold">Generate export now</Text>
                  </Button>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

