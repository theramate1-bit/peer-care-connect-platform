import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Landmark } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fetchConnectAccountStatus } from "@/lib/api/stripeConnect";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PractitionerStripeConnectScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["stripe_connect_status", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, notConnected, error } =
        await fetchConnectAccountStatus(userId);
      if (error) throw error;
      return { data, notConnected };
    },
    enabled: !!userId,
  });

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
            Sign in with your practitioner account to manage Stripe Connect and
            payout setup.
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
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "profile"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Stripe Connect
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Payout account and onboarding status.
          </Text>
        </View>
      </View>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={statusQuery.isFetching}
            onRefresh={() =>
              void queryClient.invalidateQueries({
                queryKey: ["stripe_connect_status", userId],
              })
            }
            tintColor={Colors.sage[500]}
          />
        }
      >
        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Text className="text-charcoal-600 leading-6 mb-4">
          Connect or manage payouts. Use embedded onboarding when you already
          have a Connect account and continue setup directly in app.
        </Text>

        {statusQuery.isLoading ? (
          <Card variant="default" padding="md" className="mb-4">
            <View className="py-2 items-center">
              <ActivityIndicator color={Colors.sage[500]} />
            </View>
            <Text className="text-charcoal-500 text-sm text-center mt-2">
              Loading Stripe Connect status...
            </Text>
          </Card>
        ) : statusQuery.isError ? (
          <Card variant="default" padding="md" className="mb-4 border border-cream-200">
            <Text className="text-charcoal-900 font-semibold">Could not load status</Text>
            <Text className="text-charcoal-600 text-sm mt-2">
              {statusQuery.error instanceof Error
                ? statusQuery.error.message
                : "Please pull to refresh and try again."}
            </Text>
          </Card>
        ) : statusQuery.data?.notConnected ? (
          <Card variant="default" padding="md" className="mb-4">
            <Text className="text-charcoal-900 font-semibold">
              Not connected yet
            </Text>
            <Text className="text-charcoal-600 text-sm mt-2">
              Complete Stripe Connect to take payments and receive payouts.
            </Text>
          </Card>
        ) : statusQuery.data?.data ? (
          <Card variant="default" padding="md" className="mb-4">
            <Text className="text-charcoal-500 text-xs uppercase mb-1">
              Account status
            </Text>
            <Text className="text-charcoal-900 text-lg font-semibold capitalize">
              {statusQuery.data.data.status}
            </Text>
            <Text className="text-charcoal-600 text-sm mt-3">
              Charges:{" "}
              {statusQuery.data.data.chargesEnabled ? "enabled" : "off"}
              {" · "}Payouts:{" "}
              {statusQuery.data.data.payoutsEnabled ? "enabled" : "off"}
              {" · "}Details:{" "}
              {statusQuery.data.data.detailsSubmitted ? "submitted" : "needed"}
            </Text>
            {statusQuery.data.data.isFullyOnboarded ? (
              <Text className="text-sage-600 text-sm mt-2">
                Ready to receive payouts.
              </Text>
            ) : statusQuery.data.data.requirementsCurrentlyDue.length > 0 ? (
              <View className="mt-3">
                <Text className="text-amber-700 text-sm">
                  Stripe still needs details:
                </Text>
                {statusQuery.data.data.requirementsCurrentlyDue
                  .slice(0, 5)
                  .map((req) => (
                    <Text key={req} className="text-charcoal-600 text-xs mt-1">
                      - {req}
                    </Text>
                  ))}
                <Text className="text-charcoal-500 text-xs mt-2">
                  Continue embedded onboarding to submit these items.
                </Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {!statusQuery.data?.notConnected ? (
          <Button
            variant="primary"
            onPress={() =>
              router.push(tabPath(tabRoot, "stripe-connect/embedded") as never)
            }
          >
            Embedded onboarding (native)
          </Button>
        ) : null}

        <Button
          variant={statusQuery.data?.notConnected ? "primary" : "outline"}
          className="mt-3"
          leftIcon={<Landmark size={18} color={statusQuery.data?.notConnected ? "#fff" : Colors.sage[600]} />}
          onPress={() =>
            router.push(tabPath(tabRoot, "stripe-connect") as never)
          }
        >
          Payout account details
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
