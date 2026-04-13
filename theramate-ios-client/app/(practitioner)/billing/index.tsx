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
import { router } from "expo-router";
import { ChevronRight, Wallet } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";
import { fetchConnectAccountStatus } from "@/lib/api/stripeConnect";
import { fetchMyPayouts } from "@/lib/api/payouts";
import {
  fetchPaymentsReceivedByTherapist,
  formatMinorCurrency,
  practitionerDisplayMinor,
  type PractitionerPaymentRow,
} from "@/lib/api/practitionerPayments";

export default function PractitionerBillingScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const connectQuery = useQuery({
    queryKey: ["connect_status", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, notConnected, error } = await fetchConnectAccountStatus(userId);
      if (error) throw error;
      return { data, notConnected };
    },
    enabled: !!userId,
  });

  const payoutsQuery = useQuery({
    queryKey: ["payouts", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchMyPayouts({ userId, limit: 25 });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const paymentsQuery = useQuery({
    queryKey: ["practitioner_payments_received", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchPaymentsReceivedByTherapist({
        therapistId: userId,
        limit: 30,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const onOpenPayment = (p: PractitionerPaymentRow) => {
    if (!p.session_id) return;
    router.push(tabPath(tabRoot, `bookings/${p.session_id}`) as never);
  };

  const paymentSubtitle = (p: PractitionerPaymentRow) => {
    const gross = p.amount;
    const net = practitionerDisplayMinor(p);
    if (gross != null && gross > 0 && net !== gross) {
      return `Client paid ${formatMinorCurrency(gross, p.currency)} · your share ${formatMinorCurrency(net, p.currency)}`;
    }
    return null;
  };

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
            Sign in with your practitioner account to view payouts, payment activity,
            and Stripe Connect status.
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
      <ScrollView
        className="flex-1 px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={
              connectQuery.isFetching ||
              payoutsQuery.isFetching ||
              paymentsQuery.isFetching
            }
            onRefresh={() => {
              void connectQuery.refetch();
              void payoutsQuery.refetch();
              void paymentsQuery.refetch();
            }}
            tintColor={Colors.sage[500]}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <ScreenHeader
          className="-mx-6 -mt-4 mb-2"
          eyebrow="Business"
          title="Billing & payouts"
          subtitle="Payments, payouts, and Stripe Connect status."
        />

        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Card variant="elevated" padding="lg" className="mb-4">
          <Text className="text-charcoal-900 font-semibold">Stripe Connect</Text>
          {connectQuery.isLoading ? (
            <View className="py-4">
              <ActivityIndicator color={Colors.sage[500]} />
            </View>
          ) : connectQuery.data?.notConnected ? (
            <>
              <Text className="text-charcoal-500 text-sm mt-2">
                Not connected yet. Start Stripe Connect onboarding in the app to
                receive payouts.
              </Text>
              <Button
                variant="primary"
                className="mt-4"
                onPress={() =>
                  router.push(tabPath(tabRoot, "stripe-connect") as never)
                }
              >
                Set up Stripe Connect
              </Button>
            </>
          ) : connectQuery.data?.data ? (
            <View className="mt-2">
              <Text className="text-charcoal-700 text-sm">
                Status: {connectQuery.data.data.status}
              </Text>
              <Text className="text-charcoal-700 text-sm mt-1">
                Charges: {connectQuery.data.data.chargesEnabled ? "enabled" : "disabled"} · Payouts:{" "}
                {connectQuery.data.data.payoutsEnabled ? "enabled" : "disabled"}
              </Text>
              {!connectQuery.data.data.isFullyOnboarded ? (
                <Button
                  variant="primary"
                  className="mt-4"
                  onPress={() =>
                    router.push(tabPath(tabRoot, "stripe-connect") as never)
                  }
                >
                  Finish Stripe setup
                </Button>
              ) : null}
            </View>
          ) : (
            <Text className="text-charcoal-500 text-sm mt-2">
              Could not load Connect status.
            </Text>
          )}
        </Card>

        <Text className="text-charcoal-900 font-semibold mb-2">
          Recent payments received
        </Text>
        {paymentsQuery.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : paymentsQuery.data?.length ? (
          <View className="mb-6">
            {paymentsQuery.data.map((p) => {
              const net = practitionerDisplayMinor(p);
              const sub = paymentSubtitle(p);
              return (
                <TouchableOpacity
                  key={p.id}
                  disabled={!p.session_id}
                  activeOpacity={p.session_id ? 0.75 : 1}
                  onPress={() => {
                    if (p.session_id) onOpenPayment(p);
                  }}
                >
                  <Card variant="default" padding="md" className="mb-2">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-charcoal-900 font-semibold capitalize">
                          {(p.payment_status ?? "unknown").replace(/_/g, " ")}
                          {p.payment_type
                            ? ` · ${String(p.payment_type).replace(/_/g, " ")}`
                            : ""}
                        </Text>
                        <Text className="text-charcoal-500 text-sm mt-1">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleString()
                            : "—"}
                        </Text>
                        {sub ? (
                          <Text className="text-charcoal-400 text-xs mt-1">{sub}</Text>
                        ) : null}
                        {p.session_id ? (
                          <Text className="text-sage-700 text-xs mt-2">
                            Tap to open session
                          </Text>
                        ) : null}
                      </View>
                      <View className="items-end">
                        <Text className="text-charcoal-900 font-semibold">
                          {formatMinorCurrency(net, p.currency)}
                        </Text>
                        {p.session_id ? (
                          <ChevronRight
                            size={16}
                            color={Colors.charcoal[400]}
                            style={{ marginTop: 4 }}
                          />
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text className="text-charcoal-500 mb-6">
            No payment records linked to your practitioner account yet.
          </Text>
        )}

        <Text className="text-charcoal-900 font-semibold mb-2">Recent payouts</Text>
        {payoutsQuery.isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : payoutsQuery.data?.length ? (
          <View className="mb-6">
            {payoutsQuery.data.map((p) => (
              <Card key={p.id} variant="default" padding="md" className="mb-2">
                <View className="flex-row justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-charcoal-900 font-semibold capitalize">
                      {p.status ?? "pending"}
                    </Text>
                    <Text className="text-charcoal-500 text-sm mt-1">
                      Arrival: {p.arrival_date ? new Date(p.arrival_date).toLocaleDateString() : "—"}
                    </Text>
                  </View>
                  <Text className="text-charcoal-900 font-semibold">
                    {(p.amount / 100).toFixed(2)} {(p.currency ?? "gbp").toUpperCase()}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Text className="text-charcoal-500 mb-6">
            No payouts recorded yet.
          </Text>
        )}

        <Text className="text-charcoal-600 leading-6 mb-4">
          Invoices, tax forms, and Stripe documents open in a secure in-app view when
          you continue from billing or Connect.
        </Text>
        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          Related
        </Text>
        <Button
          variant="outline"
          leftIcon={<Wallet size={18} color={Colors.sage[600]} />}
          onPress={() => router.push(tabPath(tabRoot, "profile") as never)}
        >
          Practice profile
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push(tabPath(tabRoot, "stripe-connect") as never)}
        >
          Stripe Connect (in app)
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push(tabPath(tabRoot, "analytics") as never)}
        >
          Business analytics (native)
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push(tabPath(tabRoot, "credits") as never)}
        >
          Credits and peer treatment (native)
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push(tabPath(tabRoot, "schedule") as never)}
        >
          Diary and availability (native)
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/settings/subscription" as never)}
        >
          Subscription and plan (in app)
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
