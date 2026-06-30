import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Landmark } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import {
  createConnectAccount,
  fetchConnectAccountStatus,
} from "@/lib/api/stripeConnect";
import { openConnectHostedOnboarding } from "@/lib/openConnectHostedOnboarding";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";

export default function PractitionerStripeConnectScreen() {
  const tabRoot = useTabRoot();
  const { userId, user, userProfile } = useAuth();
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

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const email = user?.email?.trim();
      if (!email) {
        throw new Error(
          "Your account has no email on file. Add one in profile settings.",
        );
      }
      const res = await createConnectAccount({
        email,
        firstName: userProfile?.first_name,
        lastName: userProfile?.last_name,
        businessType: "individual",
      });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: ["stripe_connect_status", userId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["connect_status", userId],
      });
      const hosted = await openConnectHostedOnboarding({
        stripeAccountId: res.stripe_account_id ?? undefined,
      });
      if (!hosted.ok) {
        Alert.alert("Stripe Connect", hosted.error);
      }
    },
    onError: (e: Error) => {
      Alert.alert("Stripe Connect", e.message);
    },
  });

  if (!userId) {
    return (
      <TabScreen>
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
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <AppStackHeader
        title="Stripe Connect"
        subtitle="Payout account and onboarding status."
        fallbackHref={tabPath(tabRoot, "profile")}
      />
      <TabScreenScroll
        className="flex-1 px-6 pt-4"
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
          Connect or manage payouts. Verification opens on Stripe&apos;s secure
          hosted page inside the app (no card SDK keys in the app).
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
          <Card
            variant="default"
            padding="md"
            className="mb-4 border border-cream-200"
          >
            <Text className="text-charcoal-900 font-semibold">
              Could not load status
            </Text>
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
              Create a payout account, then finish verification on Stripe&apos;s
              hosted onboarding page.
            </Text>
            <Button
              variant="primary"
              className="mt-4"
              disabled={createAccountMutation.isPending}
              isLoading={createAccountMutation.isPending}
              onPress={() => createAccountMutation.mutate()}
            >
              Create account & continue setup
            </Button>
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
                  Continue hosted onboarding on Stripe to submit these items.
                </Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {!statusQuery.data?.notConnected ? (
          <Button
            variant="primary"
            onPress={() => {
              void (async () => {
                const hosted = await openConnectHostedOnboarding({
                  stripeAccountId:
                    statusQuery.data?.data?.stripe_account_id ?? undefined,
                });
                if (!hosted.ok) {
                  Alert.alert("Stripe Connect", hosted.error);
                }
              })();
            }}
          >
            Continue setup on Stripe
          </Button>
        ) : null}

        {!statusQuery.data?.notConnected ? (
          <Button
            variant="outline"
            className="mt-3"
            leftIcon={<Landmark size={18} color={Colors.sage[600]} />}
            onPress={() => router.push(tabPath(tabRoot, "billing") as never)}
          >
            Billing & payouts
          </Button>
        ) : null}
      </TabScreenScroll>
    </TabScreen>
  );
}
