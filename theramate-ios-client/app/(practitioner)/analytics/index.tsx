/**
 * Business analytics — summary from dashboard and in-app reports.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FileText, LayoutList } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerDashboard } from "@/hooks/usePractitionerDashboard";
import { router } from "expo-router";
import {
  fetchMyEngagementAnalyticsLastNDays,
  fetchMyFinancialAnalyticsThisMonth,
  fetchMyLatestPerformanceMetrics,
} from "@/lib/api/analytics";
import {
  fetchTherapistPaymentsMonthToDate,
  formatMinorCurrency,
} from "@/lib/api/practitionerPayments";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

export default function PractitionerAnalyticsScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { data: dash, isLoading } = usePractitionerDashboard(userId);

  const financialQuery = useQuery({
    queryKey: ["financial_analytics_month", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await fetchMyFinancialAnalyticsThisMonth(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const engagementQuery = useQuery({
    queryKey: ["engagement_analytics_30d", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchMyEngagementAnalyticsLastNDays({
        userId,
        days: 30,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const performanceQuery = useQuery({
    queryKey: ["performance_metrics_latest", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await fetchMyLatestPerformanceMetrics(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const livePaymentsMonthQuery = useQuery({
    queryKey: ["analytics_live_payments_month", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await fetchTherapistPaymentsMonthToDate(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const engagementTotals = React.useMemo(() => {
    const rows = engagementQuery.data || [];
    let messages = 0;
    let uploads = 0;
    let reviews = 0;
    for (const r of rows) {
      messages += r.messages_sent ?? 0;
      uploads += r.documents_uploaded ?? 0;
      reviews += r.reviews_submitted ?? 0;
    }
    return { messages, uploads, reviews };
  }, [engagementQuery.data]);

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
            Sign in with your practitioner account to view business analytics,
            reports, and payout trends.
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
              isLoading ||
              financialQuery.isFetching ||
              engagementQuery.isFetching ||
              performanceQuery.isFetching ||
              livePaymentsMonthQuery.isFetching
            }
            onRefresh={() => {
              void queryClient.invalidateQueries({
                queryKey: ["practitioner_dashboard", userId],
              });
              void queryClient.invalidateQueries({
                queryKey: ["financial_analytics_month", userId],
              });
              void queryClient.invalidateQueries({
                queryKey: ["engagement_analytics_30d", userId],
              });
              void queryClient.invalidateQueries({
                queryKey: ["performance_metrics_latest", userId],
              });
              void queryClient.invalidateQueries({
                queryKey: ["analytics_live_payments_month", userId],
              });
            }}
            tintColor={Colors.sage[500]}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <ScreenHeader
          className="-mx-6 -mt-4 mb-2"
          eyebrow="Business"
          title="Analytics"
          subtitle="Revenue, engagement, and performance — live in this app."
        />

        {isLoading ? (
          <ActivityIndicator color={Colors.sage[500]} className="py-10" />
        ) : dash ? (
          <View className="flex-row flex-wrap gap-3 mb-4">
            <Card variant="default" padding="md" className="flex-1 min-w-[140px]">
              <Text className="text-charcoal-500 text-xs uppercase">Month sessions</Text>
              <Text className="text-charcoal-900 text-2xl font-bold mt-1">
                {dash.monthSessionCount}
              </Text>
            </Card>
            <Card variant="default" padding="md" className="flex-1 min-w-[140px]">
              <Text className="text-charcoal-500 text-xs uppercase">Est. revenue</Text>
              <Text className="text-charcoal-900 text-2xl font-bold mt-1">
                £{(dash.monthRevenuePence / 100).toFixed(0)}
              </Text>
            </Card>
          </View>
        ) : null}

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-1">
            This month (live payments)
          </Text>
          <Text className="text-charcoal-400 text-xs mb-2">
            From Supabase `payments` this calendar month (excludes failed, cancelled,
            refunded). Session-linked rows included.
          </Text>
          {livePaymentsMonthQuery.isLoading ? (
            <ActivityIndicator color={Colors.sage[500]} className="py-4" />
          ) : livePaymentsMonthQuery.data ? (
            <View className="gap-2 mt-1">
              <Text className="text-charcoal-700">
                Payments: {livePaymentsMonthQuery.data.paymentCount}
              </Text>
              <Text className="text-charcoal-700">
                Gross charged:{" "}
                {formatMinorCurrency(
                  livePaymentsMonthQuery.data.grossPence,
                  livePaymentsMonthQuery.data.currency,
                )}
              </Text>
              <Text className="text-charcoal-700">
                Your share (net):{" "}
                {formatMinorCurrency(
                  livePaymentsMonthQuery.data.netPence,
                  livePaymentsMonthQuery.data.currency,
                )}
              </Text>
            </View>
          ) : (
            <Text className="text-charcoal-500 text-sm mt-2">
              Could not load live payment totals.
            </Text>
          )}
        </Card>

        <Button
          variant="outline"
          className="mb-4"
          onPress={() => router.push(tabPath(tabRoot, "billing") as never)}
        >
          <Text className="text-charcoal-800 font-semibold">
            View payments & payouts
          </Text>
        </Button>

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-1">
            This month (computed)
          </Text>
          {financialQuery.isLoading ? (
            <ActivityIndicator color={Colors.sage[500]} className="py-4" />
          ) : financialQuery.data ? (
            <View className="gap-2 mt-2">
              <Text className="text-charcoal-700">
                Revenue: £{Number(financialQuery.data.total_revenue ?? 0).toFixed(0)}
              </Text>
              <Text className="text-charcoal-700">
                Net profit: £{Number(financialQuery.data.net_profit ?? 0).toFixed(0)}{" "}
                {financialQuery.data.profit_margin != null
                  ? `(${Number(financialQuery.data.profit_margin).toFixed(1)}%)`
                  : ""}
              </Text>
              <Text className="text-charcoal-700">
                Outstanding invoices: £{Number(financialQuery.data.outstanding_invoices ?? 0).toFixed(0)}
              </Text>
            </View>
          ) : (
            <Text className="text-charcoal-500 text-sm mt-2">
              No financial analytics row yet — data may appear after activity is recorded.
            </Text>
          )}
        </Card>

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-1">
            Engagement (last 30 days)
          </Text>
          {engagementQuery.isLoading ? (
            <ActivityIndicator color={Colors.sage[500]} className="py-4" />
          ) : (
            <View className="gap-2 mt-2">
              <Text className="text-charcoal-700">
                Messages sent: {engagementTotals.messages}
              </Text>
              <Text className="text-charcoal-700">
                Documents uploaded: {engagementTotals.uploads}
              </Text>
              <Text className="text-charcoal-700">
                Reviews submitted: {engagementTotals.reviews}
              </Text>
            </View>
          )}
        </Card>

        <Card variant="default" padding="md" className="mb-6">
          <Text className="text-charcoal-900 font-semibold mb-1">
            Quality & performance
          </Text>
          {performanceQuery.isLoading ? (
            <ActivityIndicator color={Colors.sage[500]} className="py-4" />
          ) : performanceQuery.data ? (
            <View className="gap-2 mt-2">
              <Text className="text-charcoal-700">
                Satisfaction score:{" "}
                {performanceQuery.data.client_satisfaction_score != null
                  ? Number(performanceQuery.data.client_satisfaction_score).toFixed(2)
                  : "—"}
              </Text>
              <Text className="text-charcoal-700">
                Avg response time:{" "}
                {performanceQuery.data.response_time_hours != null
                  ? `${Number(performanceQuery.data.response_time_hours).toFixed(1)}h`
                  : "—"}
              </Text>
              <Text className="text-charcoal-700">
                Projects completed: {performanceQuery.data.total_projects_completed ?? "—"}
              </Text>
            </View>
          ) : (
            <Text className="text-charcoal-500 text-sm mt-2">
              No performance metrics row yet.
            </Text>
          )}
        </Card>

        <Text className="text-charcoal-600 leading-6 mb-4">
          Advanced reports and exports are available in app reports.
        </Text>
        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Button
          variant="outline"
          className="mb-2"
          leftIcon={<FileText size={16} color={Colors.sage[600]} />}
          onPress={() =>
            router.push(tabPath(tabRoot, "analytics/reports") as never)
          }
        >
          Custom reports
        </Button>
        <Button
          variant="outline"
          className="mb-4"
          leftIcon={<LayoutList size={16} color={Colors.sage[600]} />}
          onPress={() => router.push(tabPath(tabRoot, "billing") as never)}
        >
          Billing and payouts
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
