import React from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Search } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import {
  MARKETPLACE_FEE_DISPLAY,
  PLATFORM_PLANS,
  formatCurrency,
} from "@/constants/payments";
import { useAuth } from "@/hooks/useAuth";
import { isPractitionerPortalRole } from "@/lib/authRoles";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";
import {
  fetchLatestSubscription,
  formatPlanLabel,
  formatSubscriptionStatus,
} from "@/lib/api/subscription";
import { createPlatformSubscriptionCheckout } from "@/lib/api/platformSubscriptionCheckout";
import { openHostedWebSession } from "@/lib/openHostedWeb";

export default function PricingScreen() {
  const { userId, isAuthenticated, userProfile } = useAuth();
  const isPractitioner = isPractitionerPortalRole(userProfile?.user_role);
  const showAccountBilling = isAuthenticated && !!userId;

  const subQuery = useQuery({
    queryKey: ["subscription_summary", userId, "pricing"],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await fetchLatestSubscription(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isPractitioner,
  });

  const sub = subQuery.data?.subscription;
  const [subscribingPriceId, setSubscribingPriceId] = React.useState<
    string | null
  >(null);

  const startSubscribe = async (priceId: string) => {
    if (!isAuthenticated || !userId) {
      router.replace("/login" as never);
      return;
    }
    setSubscribingPriceId(priceId);
    try {
      const res = await createPlatformSubscriptionCheckout(priceId);
      if (!res.success) {
        Alert.alert("Checkout", res.error);
        return;
      }
      openHostedWebSession({
        kind: "stripe_checkout",
        url: res.checkoutUrl,
      });
    } finally {
      setSubscribingPriceId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Pricing"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">
          Plans & fees
        </Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Session prices are set per practitioner. Platform fees and
          practitioner subscriptions are listed below — same information as the
          web pricing page.
        </Text>

        <Card variant="default" padding="md" className="mt-6 mb-4">
          <Text className="text-charcoal-900 font-semibold">
            Session pricing
          </Text>
          <Text className="text-charcoal-600 mt-2 text-sm leading-5">
            Online card payments: platform fee of{" "}
            <Text className="font-semibold">{MARKETPLACE_FEE_DISPLAY}</Text> on
            the session total. Pay-at-clinic bookings have no platform fee when
            enabled.
          </Text>
        </Card>

        <Button
          variant="primary"
          leftIcon={<Search size={18} color="#fff" />}
          onPress={() => router.replace(signedInTabPath("explore") as never)}
        >
          View therapist pricing
        </Button>

        {showAccountBilling && isPractitioner ? (
          <Card variant="default" padding="md" className="mt-6 mb-4">
            <Text className="text-charcoal-900 font-semibold text-lg">
              Your subscription
            </Text>
            {subQuery.isLoading ? (
              <Text className="text-charcoal-500 mt-2 text-sm">Loading…</Text>
            ) : sub ? (
              <Text className="text-charcoal-700 mt-2 text-sm">
                {formatPlanLabel(sub.plan)} ·{" "}
                {formatSubscriptionStatus(sub.status)}
              </Text>
            ) : (
              <Text className="text-charcoal-500 mt-2 text-sm leading-5">
                No subscription record found. Complete onboarding or contact
                support if you already pay by invoice.
              </Text>
            )}
            <Button
              variant="outline"
              className="mt-4"
              leftIcon={<CreditCard size={18} color={Colors.sage[600]} />}
              onPress={() => router.push("/stripe-customer-portal" as never)}
            >
              Manage billing (Stripe)
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => router.push("/(practitioner)/billing" as never)}
            >
              Practice payouts
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => router.push("/settings/subscription" as never)}
            >
              Subscription overview
            </Button>
          </Card>
        ) : showAccountBilling ? (
          <Button
            variant="outline"
            className="mt-6"
            leftIcon={<CreditCard size={18} color={Colors.sage[600]} />}
            onPress={() => router.push("/settings/subscription" as never)}
          >
            Your payment & billing
          </Button>
        ) : null}

        <Text className="text-charcoal-900 font-semibold text-lg mt-6 mb-3">
          Practitioner platform plans
        </Text>
        {PLATFORM_PLANS.map((plan) => (
          <Card key={plan.id} variant="default" padding="md" className="mb-3">
            <Text className="text-charcoal-900 font-semibold">{plan.name}</Text>
            <Text className="text-charcoal-600 mt-2 text-sm leading-5">
              {plan.description}
            </Text>
            <View className="mt-3 gap-1">
              {plan.prices.map((price) => (
                <Text
                  key={price.id}
                  className="text-charcoal-700 text-sm leading-5"
                >
                  •{" "}
                  {price.description ??
                    formatCurrency(price.amount, price.currency)}
                  {price.interval ? ` / ${price.interval}` : ""}
                </Text>
              ))}
            </View>
            {showAccountBilling && isPractitioner ? (
              <Button
                variant="primary"
                className="mt-4"
                disabled={subscribingPriceId !== null}
                onPress={() => void startSubscribe(plan.prices[0]?.id ?? "")}
              >
                {subscribingPriceId === plan.prices[0]?.id
                  ? "Opening checkout…"
                  : `Subscribe — ${plan.name}`}
              </Button>
            ) : null}
          </Card>
        ))}

        <Text className="text-charcoal-400 text-xs mt-4 leading-5 text-center">
          New practitioner checkout uses hosted Stripe on production. Contact
          support to change plan tier.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
