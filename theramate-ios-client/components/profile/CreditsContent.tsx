import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ChevronRight, RefreshCw } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";
import { useCreditsQueries } from "@/hooks/useCreditsQueries";
import type { CreditTransactionRow } from "@/lib/api/credits";

function CreditTransactionRows({
  rows,
  onSessionPress,
}: {
  rows: CreditTransactionRow[];
  onSessionPress: (sessionId: string) => void;
}) {
  if (!rows.length) {
    return (
      <Text className="text-charcoal-500 mb-6">No credit transactions yet.</Text>
    );
  }
  return (
    <>
      {rows.map((t) => {
        const debit =
          t.amount < 0 ||
          ["session_payment", "spend", "deduction"].includes(t.transaction_type);
        const Row = t.session_id ? TouchableOpacity : View;
        return (
          <Row
            key={t.id}
            {...(t.session_id
              ? {
                  onPress: () => onSessionPress(t.session_id!),
                  activeOpacity: 0.75,
                }
              : {})}
          >
            <Card variant="default" padding="md" className="mb-2">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 pr-3">
                  <Text className="text-charcoal-900 font-semibold capitalize">
                    {t.transaction_type.replace(/_/g, " ")}
                  </Text>
                  <Text className="text-charcoal-500 text-sm mt-1">
                    {t.description || "—"}
                  </Text>
                  <Text className="text-charcoal-400 text-xs mt-1">
                    {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                  </Text>
                  {t.session_id ? (
                    <Text className="text-sage-700 text-xs mt-1">
                      Tap to open session
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-charcoal-900 font-semibold">
                    {debit ? `-${Math.abs(t.amount)}` : `+${t.amount}`}
                  </Text>
                  {t.session_id ? (
                    <ChevronRight size={16} color={Colors.charcoal[400]} />
                  ) : null}
                </View>
              </View>
            </Card>
          </Row>
        );
      })}
    </>
  );
}

export type CreditsContentVariant = "client" | "practitioner";

type CreditsContentProps = {
  variant: CreditsContentVariant;
  userId: string;
  /** When false, queries do not run (e.g. signed-out client). */
  queryEnabled?: boolean;
  /** Client: refetch when screen gains focus. */
  refetchOnFocus?: boolean;
};

/**
 * Shared balance + transaction list for client profile credits and practitioner credits tab.
 */
export function CreditsContent({
  variant,
  userId,
  queryEnabled = true,
  refetchOnFocus = false,
}: CreditsContentProps) {
  const tabRoot = useTabRoot();
  const {
    creditsQuery,
    txQuery,
    loading,
    hasError,
    errMsg,
    refetchAll,
  } = useCreditsQueries(userId, queryEnabled);

  useFocusEffect(
    React.useCallback(() => {
      if (refetchOnFocus && userId && queryEnabled) {
        refetchAll();
      }
    }, [refetchOnFocus, userId, queryEnabled, refetchAll]),
  );

  const onSessionPress = (sessionId: string) => {
    router.push(tabPath(tabRoot, `bookings/${sessionId}`) as never);
  };

  const refreshControl = (
    <RefreshControl
      refreshing={creditsQuery.isFetching || txQuery.isFetching}
      onRefresh={() => refetchAll()}
      tintColor={Colors.sage[500]}
    />
  );

  if (variant === "client") {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      );
    }
    if (hasError) {
      return (
        <View className="flex-1 px-6 pt-6">
          <Text className="text-charcoal-700 text-center">{errMsg}</Text>
          <Button variant="primary" className="mt-6" onPress={() => refetchAll()}>
            Retry
          </Button>
        </View>
      );
    }
    return (
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={refreshControl}
      >
        <Text className="text-charcoal-600 leading-6 mb-4">
          Theramate credits for peer treatment and promotions. Sessions linked below
          open in your bookings.
        </Text>

        <Card variant="elevated" padding="lg" className="mb-4">
          <Text className="text-charcoal-500 text-sm">Current balance</Text>
          <Text className="text-charcoal-900 text-3xl font-bold mt-1">
            {creditsQuery.data?.current_balance ?? creditsQuery.data?.balance ?? 0}
          </Text>
          <Text className="text-charcoal-500 text-sm mt-2">
            Earned: {creditsQuery.data?.total_earned ?? 0} · Spent:{" "}
            {creditsQuery.data?.total_spent ?? 0}
          </Text>
        </Card>

        <Button
          variant="outline"
          className="mb-6"
          leftIcon={<RefreshCw size={16} color={Colors.sage[600]} />}
          onPress={() => refetchAll()}
        >
          Refresh
        </Button>

        <Text className="text-charcoal-900 font-semibold mb-2">Recent activity</Text>
        <CreditTransactionRows
          rows={txQuery.data ?? []}
          onSessionPress={onSessionPress}
        />

        <Button
          variant="outline"
          className="mt-2"
          onPress={() =>
            router.push(tabPath(tabRoot, "profile/help-centre") as never)
          }
        >
          Help with credits
        </Button>
      </ScrollView>
    );
  }

  /* practitioner */
  return (
    <ScrollView
      className="flex-1 px-6 pt-4"
      refreshControl={refreshControl}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <ScreenHeader
        className="-mx-6 -mt-4 mb-2"
        eyebrow="Business"
        title="Credits"
        subtitle="Balance, activity, and exchange shortcuts."
      />

      <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
        In this app
      </Text>
      <Card variant="elevated" padding="lg" className="mb-4">
        <Text className="text-charcoal-500 text-sm">Current balance</Text>
        {creditsQuery.isLoading ? (
          <View className="py-4">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : (
          <Text className="text-charcoal-900 text-3xl font-bold mt-1">
            {creditsQuery.data?.current_balance ?? creditsQuery.data?.balance ?? 0}
          </Text>
        )}
        <Text className="text-charcoal-500 text-sm mt-2">
          Earned: {creditsQuery.data?.total_earned ?? 0} · Spent:{" "}
          {creditsQuery.data?.total_spent ?? 0}
        </Text>
        <Button
          variant="outline"
          className="mt-4"
          onPress={() => router.push(tabPath(tabRoot, "exchange") as never)}
        >
          Treatment exchange
        </Button>
      </Card>

      <Text className="text-charcoal-900 font-semibold mb-2">Recent activity</Text>
      {txQuery.isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : (
        <View className="mb-6">
          <CreditTransactionRows
            rows={txQuery.data ?? []}
            onSessionPress={onSessionPress}
          />
        </View>
      )}

      {hasError ? (
        <Text className="text-charcoal-600 text-sm mb-4">{errMsg}</Text>
      ) : null}

      <Text className="text-charcoal-600 leading-6 mb-4">
        Use treatment exchange for peer swaps; subscription and billing are under
        Subscription & billing.
      </Text>
      <Button
        variant="outline"
        leftIcon={<RefreshCw size={16} color={Colors.sage[600]} />}
        onPress={() => refetchAll()}
      >
        Refresh balance & activity
      </Button>
      <Button
        variant="outline"
        className="mt-3"
        onPress={() => router.push("/settings/subscription" as never)}
      >
        Subscription & billing
      </Button>
    </ScrollView>
  );
}
