/**
 * Mobile visit requests — pending queue + treatment exchange summary (incoming, outgoing, reciprocal).
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
import { ChevronRight, MapPin, RefreshCw } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerMobileRequests } from "@/hooks/usePractitionerMobileRequests";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAcceptedExchangesNeedingReciprocal,
  fetchPendingExchangeRequestsForRecipient,
  fetchPendingExchangeRequestsSentByRequester,
} from "@/lib/api/practitionerExchange";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

function fmtTime(t: string | null | undefined): string {
  if (t == null) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export default function PractitionerMobileRequestsListScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const {
    data: mobile = [],
    isLoading: loadingM,
    refetch: refetchM,
    isFetching: fetchingM,
  } = usePractitionerMobileRequests(userId, "pending");

  const {
    data: exchanges = [],
    refetch: refetchIncoming,
    isFetching: fetchingIncoming,
  } = useQuery({
    queryKey: ["exchange_pending", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchPendingExchangeRequestsForRecipient(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const {
    data: reciprocal = [],
    refetch: refetchReciprocal,
    isFetching: fetchingReciprocal,
  } = useQuery({
    queryKey: ["exchange_reciprocal_needed", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchAcceptedExchangesNeedingReciprocal(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const {
    data: outgoing = [],
    refetch: refetchOutgoing,
    isFetching: fetchingOutgoing,
  } = useQuery({
    queryKey: ["exchange_sent", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } =
        await fetchPendingExchangeRequestsSentByRequester(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const loading = loadingM;

  const refreshing =
    fetchingM || fetchingIncoming || fetchingReciprocal || fetchingOutgoing;

  const onRefreshAll = () => {
    void refetchM();
    void refetchIncoming();
    void refetchReciprocal();
    void refetchOutgoing();
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      {loading ? (
        <View className="flex-1 px-6 items-center justify-center py-20">
          <Card
            variant="default"
            padding="md"
            className="w-full border border-cream-200"
          >
            <View className="items-center py-2">
              <ActivityIndicator size="large" color={Colors.sage[500]} />
              <Text className="text-charcoal-500 text-sm mt-3">
                Loading mobile requests...
              </Text>
            </View>
          </Card>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshAll}
              tintColor={Colors.sage[500]}
            />
          }
        >
          <ScreenHeader
            className="-mx-6 -mt-4 mb-2"
            eyebrow="Practice"
            title="Mobile requests"
            subtitle="On-location bookings plus a snapshot of treatment exchange activity."
          />

          {reciprocal.length > 0 ? (
            <View className="mb-8">
              <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
                Treatment exchange
              </Text>
              <Text className="text-charcoal-900 font-bold text-lg mb-1">
                Book your return session
              </Text>
              <Text className="text-charcoal-500 text-sm mb-3">
                You accepted these swaps — finish by choosing your reciprocal
                time.
              </Text>
              {reciprocal.map((r) => (
                <Card
                  key={r.mutual_session_id}
                  variant="default"
                  padding="md"
                  className="mb-3 border border-amber-200 bg-amber-50/40"
                >
                  <Text className="text-charcoal-900 font-semibold">
                    With {r.requester_name}
                  </Text>
                  {r.their_session_date ? (
                    <Text className="text-charcoal-700 text-sm mt-2">
                      Their session with you: {r.their_session_date}
                      {r.their_start_time
                        ? ` · ${fmtTime(String(r.their_start_time))}`
                        : ""}
                    </Text>
                  ) : null}
                  {r.reciprocal_booking_deadline ? (
                    <Text className="text-amber-900 text-xs mt-2">
                      Book by:{" "}
                      {new Date(r.reciprocal_booking_deadline).toLocaleString()}
                    </Text>
                  ) : null}
                  <Button
                    variant="primary"
                    className="mt-3"
                    onPress={() =>
                      router.push(tabPath(tabRoot, "exchange") as never)
                    }
                  >
                    Choose time in Treatment exchange
                  </Button>
                </Card>
              ))}
            </View>
          ) : null}

          <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
            In this app
          </Text>
          <Text className="text-charcoal-900 font-bold text-lg mb-1">
            Mobile visit requests
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3">
            {mobile.length} pending request{mobile.length === 1 ? "" : "s"}.
          </Text>
          {mobile.length === 0 ? (
            <Card
              variant="default"
              padding="md"
              className="mb-8 border border-cream-200"
            >
              <Text className="text-charcoal-500">No pending requests.</Text>
            </Card>
          ) : (
            mobile.map((m) => (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(
                    tabPath(tabRoot, `mobile-requests/${m.id}`) as Href,
                  )
                }
              >
                <Card variant="default" padding="md" className="mb-3">
                  <Text className="text-charcoal-900 font-semibold">
                    {m.client_name}
                  </Text>
                  <Text className="text-charcoal-600 text-sm mt-1">
                    {m.product_name} · {m.requested_date}{" "}
                    {String(m.requested_start_time).slice(0, 5)}
                  </Text>
                  {m.client_address ? (
                    <View className="flex-row items-start mt-2">
                      <MapPin size={14} color={Colors.charcoal[400]} />
                      <Text
                        className="text-charcoal-500 text-xs ml-1 flex-1"
                        numberOfLines={2}
                      >
                        {m.client_address}
                      </Text>
                    </View>
                  ) : null}
                  <View className="flex-row justify-end mt-2">
                    <ChevronRight size={18} color={Colors.charcoal[300]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}

          <Text className="text-charcoal-900 font-bold text-lg mt-6 mb-1">
            Exchange — needs your response
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3">
            {exchanges.length} incoming request
            {exchanges.length === 1 ? "" : "s"}.
          </Text>
          {exchanges.length === 0 ? (
            <Card
              variant="default"
              padding="md"
              className="mb-4 border border-cream-200"
            >
              <Text className="text-charcoal-500">None waiting on you.</Text>
            </Card>
          ) : (
            exchanges.map((e) => (
              <Card key={e.id} variant="default" padding="md" className="mb-2">
                <Text className="text-charcoal-900 font-semibold">
                  {e.requester_name ?? "Practitioner"}
                </Text>
                {e.requested_session_date ? (
                  <Text className="text-charcoal-600 text-sm mt-1">
                    {e.requested_session_date}
                    {e.requested_start_time
                      ? ` · ${fmtTime(e.requested_start_time)}`
                      : ""}
                    {e.duration_minutes != null
                      ? ` · ${e.duration_minutes} min`
                      : ""}
                  </Text>
                ) : null}
                <Text className="text-charcoal-500 text-xs mt-2">
                  Accept or decline in Treatment exchange.
                </Text>
                <Button
                  variant="outline"
                  className="mt-3"
                  onPress={() =>
                    router.push(tabPath(tabRoot, `exchange/${e.id}`) as Href)
                  }
                >
                  View request details
                </Button>
              </Card>
            ))
          )}

          <Text className="text-charcoal-900 font-bold text-lg mt-4 mb-1">
            Exchange — waiting on them
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3">
            {outgoing.length} outgoing request{outgoing.length === 1 ? "" : "s"}
            .
          </Text>
          {outgoing.length === 0 ? (
            <Card
              variant="default"
              padding="md"
              className="border border-cream-200"
            >
              <Text className="text-charcoal-500">No outgoing requests.</Text>
            </Card>
          ) : (
            outgoing.map((o) => (
              <Card key={o.id} variant="default" padding="md" className="mb-2">
                <Text className="text-charcoal-800 text-sm">
                  Waiting on {o.recipient_name ?? "practitioner"}
                  {o.requested_session_date
                    ? ` · ${o.requested_session_date}`
                    : ""}
                </Text>
                <Button
                  variant="outline"
                  className="mt-3"
                  onPress={() =>
                    router.push(tabPath(tabRoot, "exchange") as never)
                  }
                >
                  Manage in Treatment exchange
                </Button>
              </Card>
            ))
          )}

          <Button
            variant="outline"
            className="mt-6"
            leftIcon={<RefreshCw size={16} color={Colors.sage[600]} />}
            onPress={onRefreshAll}
          >
            Refresh lists
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
