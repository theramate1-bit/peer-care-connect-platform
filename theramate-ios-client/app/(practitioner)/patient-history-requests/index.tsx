/**
 * All outgoing patient history transfer requests (web "History requests" list).
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAllMyHistoryRequests,
  cancelPatientHistoryRequest,
  type PatientHistoryRequestListItem,
} from "@/lib/api/patientHistoryRequests";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PRACTITIONER_PTABS_HREF } from "@/lib/navigation";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";

export default function PatientHistoryRequestsScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["patient_history_requests_all", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchAllMyHistoryRequests(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const onCancel = (row: PatientHistoryRequestListItem) => {
    if (!userId) return;
    Alert.alert(
      "Cancel request",
      `Cancel pending request to ${row.previous_practitioner_name}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: () => void doCancel(row.id),
        },
      ],
    );
  };

  const doCancel = async (requestId: string) => {
    if (!userId) return;
    setCancellingId(requestId);
    try {
      const res = await cancelPatientHistoryRequest({
        requestId,
        requestingPractitionerId: userId,
      });
      if (!res.ok) {
        Alert.alert("Could not cancel", res.error?.message || "");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["patient_history_requests_all", userId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["client_history_requests"],
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (!userId) {
    return (
      <TabScreen>
        <View className="flex-1" />
      </TabScreen>
    );
  }

  const rows = q.data || [];

  return (
    <TabScreen>
      <AppStackHeader
        title="History requests"
        fallbackHref={PRACTITIONER_PTABS_HREF}
        onBackPress={() => goBackOrReplace(tabPath(tabRoot, "profile"))}
      />
      {q.isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : q.isError ? (
        <View className="px-6 py-10">
          <Text className="text-charcoal-700 text-center">
            {q.error instanceof Error ? q.error.message : "Could not load."}
          </Text>
        </View>
      ) : (
        <TabScreenScroll
          className="flex-1 px-6 pt-2"
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching && !q.isLoading}
              onRefresh={() => void q.refetch()}
              tintColor={Colors.sage[500]}
            />
          }
        >
          <Text className="text-charcoal-600 text-sm mb-4">
            Outgoing requests to previous practitioners. Approve or deny
            incoming ones on the web app when you are the previous clinician.
          </Text>
          {rows.length === 0 ? (
            <Text className="text-charcoal-500 py-8 text-center">
              No history requests yet.
            </Text>
          ) : (
            rows.map((r) => (
              <Card key={r.id} variant="default" padding="md" className="mb-3">
                <Text className="text-charcoal-900 font-semibold capitalize">
                  {r.status.replace(/_/g, " ")}
                </Text>
                <Text className="text-charcoal-700 text-sm mt-1">
                  Client: {r.client_name || "—"}
                </Text>
                <Text className="text-charcoal-500 text-sm mt-1">
                  Previous practitioner: {r.previous_practitioner_name}
                </Text>
                <Text className="text-charcoal-400 text-xs mt-2">
                  {r.requested_at?.slice(0, 16)?.replace("T", " ") ?? ""}
                </Text>
                {r.status === "pending" ? (
                  <View className="mt-3 self-start">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancellingId === r.id}
                      isLoading={cancellingId === r.id}
                      onPress={() => onCancel(r)}
                    >
                      Cancel request
                    </Button>
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </TabScreenScroll>
      )}
    </TabScreen>
  );
}
