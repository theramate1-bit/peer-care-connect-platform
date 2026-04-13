/**
 * Mobile visit requests — pending queue + exchange summary link.
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
import { fetchPendingExchangeRequestsForRecipient } from "@/lib/api/practitionerExchange";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

export default function PractitionerMobileRequestsListScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const {
    data: mobile = [],
    isLoading: loadingM,
    refetch: refetchM,
    isFetching: fetchingM,
  } = usePractitionerMobileRequests(userId, "pending");

  const { data: exchanges = [], refetch: refetchE } = useQuery({
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

  const loading = loadingM;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      {loading ? (
        <View className="flex-1 px-6 items-center justify-center py-20">
          <Card variant="default" padding="md" className="w-full border border-cream-200">
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
              refreshing={fetchingM}
              onRefresh={() => {
                void refetchM();
                void refetchE();
              }}
              tintColor={Colors.sage[500]}
            />
          }
        >
          <ScreenHeader
            className="-mx-6 -mt-4 mb-2"
            eyebrow="Practice"
            title="Mobile requests"
            subtitle="Pending on-location booking requests and exchange queue."
          />

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
            <Card variant="default" padding="md" className="mb-8 border border-cream-200">
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
                    {m.product_name} · {m.requested_date} {String(m.requested_start_time).slice(0, 5)}
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
            Treatment exchange (pending)
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3">
            {exchanges.length} pending exchange request{exchanges.length === 1 ? "" : "s"}.
          </Text>
          {exchanges.length === 0 ? (
            <Card variant="default" padding="md" className="border border-cream-200">
              <Text className="text-charcoal-500">No pending exchange requests.</Text>
            </Card>
          ) : (
            exchanges.map((e) => (
              <Card key={e.id} variant="default" padding="md" className="mb-2">
                <Text className="text-charcoal-800 text-sm">
                  Exchange request {e.id.slice(0, 8)}…
                </Text>
                <Text className="text-charcoal-500 text-xs mt-1">
                  Accept, decline, or book return times in Treatment exchange.
                </Text>
                <Button
                  variant="outline"
                  className="mt-3"
                  onPress={() =>
                    router.push(tabPath(tabRoot, "exchange") as never)
                  }
                >
                  Open treatment exchange
                </Button>
              </Card>
            ))
          )}

          <Button
            variant="outline"
            className="mt-6"
            leftIcon={<RefreshCw size={16} color={Colors.sage[600]} />}
            onPress={() => {
              void refetchM();
              void refetchE();
            }}
          >
            Refresh lists
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
