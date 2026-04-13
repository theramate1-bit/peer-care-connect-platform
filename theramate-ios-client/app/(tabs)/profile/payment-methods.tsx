import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ShieldCheck, Wallet } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  fetchPaymentAccountSummary,
  fetchPaymentMethodSummaries,
  type PaymentMethodSummary,
} from "@/lib/api/paymentMethods";
import { defaultSignedInProfileHref } from "@/lib/navigation";

function PaymentMethodRow({ item }: { item: PaymentMethodSummary }) {
  return (
    <View className="py-3 border-b border-cream-200 last:border-b-0">
      <Text className="text-charcoal-900 font-medium">{item.value}</Text>
      <Text className="text-charcoal-400 text-xs mt-0.5">
        Source: {item.source}
      </Text>
    </View>
  );
}

export default function PaymentMethodsScreen() {
  const { userId, isAuthenticated, isInitialized } = useAuth();
  const back = defaultSignedInProfileHref();

  const {
    data: account,
    isLoading: loadingAccount,
    isError: accountError,
    error: accountErrObj,
    refetch: refetchAccount,
  } = useQuery({
    queryKey: ["payment_account_summary", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await fetchPaymentAccountSummary(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const {
    data: methods = [],
    isLoading: loadingMethods,
    isError: methodsError,
    error: methodsErrObj,
    refetch: refetchMethods,
  } = useQuery({
    queryKey: ["payment_methods", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchPaymentMethodSummaries(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        void refetchAccount();
        void refetchMethods();
      }
    }, [userId, refetchAccount, refetchMethods]),
  );

  const loading = loadingAccount || loadingMethods;
  const hasError = accountError || methodsError;
  const errorMessage =
    (accountErrObj instanceof Error ? accountErrObj.message : "") ||
    (methodsErrObj instanceof Error ? methodsErrObj.message : "") ||
    "Could not load payment methods.";

  if (isInitialized && (!isAuthenticated || !userId)) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
        <AppStackHeader title="Payment methods" fallbackHref={back} />
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-900 text-xl font-bold">
            Sign in required
          </Text>
          <Text className="text-charcoal-500 mt-3 leading-6">
            Sign in to view saved payment methods and billing details.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.replace("/login" as never)}
          >
            Sign in
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Payment methods" fallbackHref={back} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : hasError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => {
              void refetchAccount();
              void refetchMethods();
            }}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="px-6 pt-4">
          <Card variant="default" padding="md" className="mb-4">
            <View className="flex-row items-center">
              <ShieldCheck size={18} color={Colors.success} />
              <Text className="text-charcoal-900 font-semibold ml-2">
                Stripe account
              </Text>
            </View>
            {account?.stripe_customer_id ? (
              <>
                <Text className="text-charcoal-600 mt-2">
                  Connected customer profile found.
                </Text>
                <Text className="text-charcoal-400 text-xs mt-1">
                  Customer: {account.stripe_customer_id}
                </Text>
                {account.email ? (
                  <Text className="text-charcoal-400 text-xs mt-1">
                    {account.email}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text className="text-charcoal-500 mt-2">
                No dedicated customer profile row found yet. It may be created
                after first completed payment.
              </Text>
            )}
          </Card>

          <Card variant="default" padding="md">
            <View className="flex-row items-center">
              <CreditCard size={18} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-900 font-semibold ml-2">
                Known payment methods
              </Text>
            </View>
            {methods.length === 0 ? (
              <Text className="text-charcoal-500 mt-2">
                No saved payment methods were detected in your current records
                yet.
              </Text>
            ) : (
              <View className="mt-2">
                {methods.map((m, i) => (
                  <PaymentMethodRow key={`${m.value}-${i}`} item={m} />
                ))}
              </View>
            )}
          </Card>

          <Button
            variant="primary"
            className="mt-5"
            leftIcon={<Wallet size={18} color="#fff" />}
            onPress={() => router.push("/stripe-customer-portal" as never)}
          >
            Update cards & billing
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            leftIcon={<CreditCard size={18} color={Colors.sage[600]} />}
            onPress={() => router.push("/settings/subscription" as never)}
          >
            Subscription overview
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
