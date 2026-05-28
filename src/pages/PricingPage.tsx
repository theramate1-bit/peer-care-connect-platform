import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Search } from "lucide-react";
import { toast } from "sonner";

import PricingInfo from "@/components/PricingInfo";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  PLATFORM_PLANS,
  MARKETPLACE_FEE_DISPLAY,
  formatCurrency,
} from "@/config/payments";
import {
  createCustomerPortalSession,
  fetchLatestSubscription,
  formatPlanLabel,
  formatSubscriptionStatus,
} from "@/lib/subscription";
import { createPlatformSubscriptionCheckout } from "@/lib/platformSubscriptionCheckout";

const PRACTITIONER_ROLES = new Set([
  "sports_therapist",
  "massage_therapist",
  "osteopath",
]);

/**
 * Plans & fees — parity with app `pricing.tsx` + platform plan cards.
 */
const PricingPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const isPractitioner =
    !!userProfile?.user_role && PRACTITIONER_ROLES.has(userProfile.user_role);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscribingPriceId, setSubscribingPriceId] = useState<string | null>(
    null,
  );
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [subPlan, setSubPlan] = useState<string | null>(null);

  const loadSub = useCallback(async () => {
    if (!user?.id || !isPractitioner) return;
    const { data } = await fetchLatestSubscription(user.id);
    const sub = data?.subscription;
    if (sub) {
      setSubPlan(formatPlanLabel(sub.plan));
      setSubStatus(formatSubscriptionStatus(sub.status));
    } else {
      setSubPlan(null);
      setSubStatus(null);
    }
  }, [user?.id, isPractitioner]);

  useEffect(() => {
    void loadSub();
  }, [loadSub]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await createCustomerPortalSession();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      window.location.href = res.url;
    } finally {
      setPortalLoading(false);
    }
  };

  const startSubscribe = async (priceId: string) => {
    if (!priceId) return;
    if (!user) {
      toast.error("Sign in to subscribe to a practitioner plan.");
      return;
    }
    if (!isPractitioner) {
      toast.error("Platform plans are for practitioner accounts.");
      return;
    }
    setSubscribingPriceId(priceId);
    try {
      const res = await createPlatformSubscriptionCheckout(priceId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      window.location.href = res.checkoutUrl;
    } finally {
      setSubscribingPriceId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Plans & fees"
        description="Session prices are set per practitioner. Platform fees and practitioner subscriptions are listed below."
      />

      <PricingInfo />

      <p className="text-sm text-muted-foreground mb-6">
        Online card payments: platform fee of{" "}
        <strong>{MARKETPLACE_FEE_DISPLAY}</strong> on the session total.
        Pay-at-clinic bookings have no platform fee when enabled.
      </p>

      <Button className="mb-8" asChild>
        <Link to="/marketplace">
          <Search className="h-4 w-4 mr-2" />
          View therapist pricing
        </Link>
      </Button>

      {isPractitioner && user ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Your subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subPlan ? (
              <p className="text-sm">
                <Badge variant="secondary" className="mr-2">
                  {subPlan}
                </Badge>
                {subStatus ?? "—"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active subscription row found. Subscribe via onboarding or
                contact support if you already pay by invoice.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void openPortal()}
                disabled={portalLoading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {portalLoading ? "Opening portal…" : "Manage billing (Stripe)"}
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/practice/billing">Practice billing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <h2 className="text-lg font-semibold mb-3">
        Practitioner platform plans
      </h2>
      <div className="space-y-4">
        {PLATFORM_PLANS.filter((p) => p.id !== "prod_T2FzrvauPGxL7r").map(
          (plan) => {
            const primaryPrice =
              plan.prices.find((p) => p.amount > 0) ?? plan.prices[0];
            const canSubscribe =
              isPractitioner &&
              !!user &&
              !!primaryPrice?.id &&
              primaryPrice.amount > 0;

            return (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-muted-foreground">{plan.description}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {plan.prices.map((price) => (
                      <li key={price.id}>
                        {price.description ??
                          formatCurrency(price.amount, price.currency)}
                        {price.interval
                          ? ` / ${price.interval}`
                          : price.amount > 0
                            ? ""
                            : " — free"}
                      </li>
                    ))}
                  </ul>
                  {canSubscribe ? (
                    <Button
                      className="mt-3"
                      disabled={subscribingPriceId !== null}
                      onClick={() => void startSubscribe(primaryPrice.id)}
                    >
                      {subscribingPriceId === primaryPrice.id
                        ? "Opening checkout…"
                        : `Subscribe — ${plan.name}`}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        Practitioner checkout uses hosted Stripe. After payment you return to
        subscription success, then your dashboard. Contact support to change
        plan tier on invoice.
      </p>
    </div>
  );
};

export default PricingPage;
