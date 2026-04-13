import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";
import {
  fetchLatestSubscription,
  formatBillingCycle,
  formatPlanLabel,
  formatSubscriptionStatus,
} from "@/lib/api/subscription";

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SettingsSubscriptionScreen() {
  const { userId, isAuthenticated, isInitialized } = useAuth();

  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["subscription_summary", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error: err } = await fetchLatestSubscription(userId);
      if (err) throw err;
      return data;
    },
    enabled: !!userId && isAuthenticated,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (userId && isAuthenticated) void refetch();
    }, [userId, isAuthenticated, refetch]),
  );

  const paymentMethodsPath = signedInTabPath("profile/payment-methods");

  const sub = summary?.subscription;
  const isActive =
    sub?.status &&
    ["active", "trialing"].includes(sub.status.trim().toLowerCase());

  const waitingForUser = isAuthenticated && !userId && isInitialized;
  const showBoot =
    !isInitialized ||
    waitingForUser ||
    (isAuthenticated && !!userId && isLoading && !summary);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Subscription & billing"
        fallbackHref={defaultSignedInProfileHref()}
        right={
          isAuthenticated && userId ? (
            <TouchableOpacity
              onPress={() => void refetch()}
              className="p-2"
              disabled={isRefetching}
              accessibilityRole="button"
              accessibilityLabel="Refresh"
            >
              <RefreshCw
                size={22}
                color={Colors.sage[600]}
                style={{ opacity: isRefetching ? 0.4 : 1 }}
              />
            </TouchableOpacity>
          ) : null
        }
      />

      {showBoot ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator color={Colors.sage[500]} />
          <Text className="text-charcoal-500 mt-4">
            {waitingForUser ? "Preparing your account…" : "Loading…"}
          </Text>
        </View>
      ) : !isAuthenticated || !userId ? (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        >
          <Text className="text-charcoal-900 text-2xl font-bold">
            Sign in required
          </Text>
          <Text className="text-charcoal-500 mt-3 leading-6">
            Sign in to view your plan, renewal dates, and payment options.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.replace("/login" as never)}
          >
            Sign in
          </Button>
        </ScrollView>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load subscription."}
          </Text>
          <Button variant="primary" className="mt-6" onPress={() => void refetch()}>
            Retry
          </Button>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {summary?.accessDenied ? (
            <Card variant="default" padding="md" className="mb-4 border border-warning/30">
              <View className="flex-row items-start">
                <AlertCircle size={20} color={Colors.warning} />
                <Text className="text-charcoal-800 ml-2 flex-1 leading-6">
                  We couldn&apos;t load subscription details from your account
                  (permissions). You can still update cards and invoices in the
                  secure billing area, or contact support if this persists.
                </Text>
              </View>
            </Card>
          ) : null}

          {!sub && !summary?.accessDenied ? (
            <Card variant="default" padding="md" className="mb-4">
              <Text className="text-charcoal-900 font-semibold text-lg">
                No subscription on file
              </Text>
              <Text className="text-charcoal-500 mt-2 leading-6">
                When you subscribe to a Theramate plan, your status and renewal
                dates will appear here. You can add or manage cards in the secure
                billing area once you have a Stripe customer record.
              </Text>
            </Card>
          ) : sub ? (
            <Card variant="default" padding="md" className="mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-charcoal-900 font-semibold text-lg">
                  Current plan
                </Text>
                <View
                  className={`px-2 py-1 rounded-lg ${
                    isActive ? "bg-success/15" : "bg-cream-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isActive ? "text-success" : "text-charcoal-600"
                    }`}
                  >
                    {formatSubscriptionStatus(sub.status)}
                  </Text>
                </View>
              </View>
              <Text className="text-charcoal-900 text-xl font-bold mt-2">
                {formatPlanLabel(sub.plan)}
              </Text>
              {formatBillingCycle(sub.billing_cycle) ? (
                <Text className="text-charcoal-500 mt-1">
                  Billing: {formatBillingCycle(sub.billing_cycle)}
                </Text>
              ) : null}
              <View className="mt-4 border-t border-cream-200 pt-4">
                <Text className="text-charcoal-500 text-xs uppercase font-semibold">
                  Billing period
                </Text>
                <Text className="text-charcoal-800 mt-1">
                  {formatDate(sub.current_period_start) ?? "—"}
                  {" → "}
                  {formatDate(sub.current_period_end) ?? "—"}
                </Text>
              </View>
              {sub.stripe_subscription_id ? (
                <Text className="text-charcoal-400 text-xs mt-3">
                  Subscription ID: {sub.stripe_subscription_id}
                </Text>
              ) : null}
            </Card>
          ) : null}

          <Card variant="default" padding="md" className="mb-4">
            <View className="flex-row items-center">
              <ShieldCheck size={18} color={Colors.sage[600]} />
              <Text className="text-charcoal-900 font-semibold ml-2">
                Cards, invoices & plan changes
              </Text>
            </View>
            <Text className="text-charcoal-600 mt-2 leading-6">
              Update saved cards, download invoices, and manage your plan in
              Stripe&apos;s secure billing area (opens inside the app).
            </Text>
            <Button
              variant="primary"
              className="mt-4"
              leftIcon={<CreditCard size={18} color="#fff" />}
              onPress={() => router.push("/stripe-customer-portal" as never)}
            >
              Open secure billing
            </Button>
          </Card>

          <Card variant="default" padding="md" className="mb-4">
            <Text className="text-charcoal-900 font-semibold">
              Payment methods snapshot
            </Text>
            <Text className="text-charcoal-600 mt-2 leading-6">
              See cards and payment history recorded in Theramate from recent
              activity.
            </Text>
            <Button
              variant="outline"
              className="mt-4"
              onPress={() => router.push(paymentMethodsPath as never)}
            >
              View payment methods
            </Button>
          </Card>

          <Button
            variant="outline"
            onPress={() => router.replace("/settings" as never)}
          >
            Back to settings hub
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
