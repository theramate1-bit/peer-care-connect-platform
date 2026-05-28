import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  marketplaceFeeFlatPenceDisplay,
  marketplaceFeePercentDisplay,
  PRACTITIONER_PLANS,
  annualDiscountPercent,
  smsOutboundUnitPricePenceDisplay,
  type PlanId,
} from "@/config/pricing-display";

interface TheraMatePricingGridProps {
  subscribed: boolean;
  subscriptionTier: string | null;
  onCheckout: (planId: PlanId, billing: "monthly" | "yearly") => void;
}

function formatMoney(n: number) {
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

export function TheraMatePricingGrid({
  subscribed,
  subscriptionTier,
  onCheckout,
}: TheraMatePricingGridProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const price = (monthly: number) =>
    billing === "annual" ? monthly * (1 - annualDiscountPercent / 100) : monthly;

  return (
    <div id="plans" className="space-y-10">
      <div className="flex flex-col items-center gap-2">
        <div
          className="inline-flex rounded-full border border-border bg-muted/60 p-1"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              billing === "annual"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual · −{annualDiscountPercent}%
          </button>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              billing === "monthly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 md:items-stretch">
        {PRACTITIONER_PLANS.map((plan) => {
          const active = subscribed && subscriptionTier === plan.id;
          const display = price(plan.monthlyPrice);

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col border-border/80 bg-card shadow-[var(--shadow-soft)]",
                plan.popular && "ring-2 ring-primary"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most popular
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4 flex flex-wrap items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    £{formatMoney(display)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month · per practitioner</span>
                </div>
                {billing === "annual" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Billed once per year (£{(display * 12).toFixed(0)} / yr)
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Billed monthly</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-0">
                <ul className="mb-6 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={active}
                  onClick={() =>
                    onCheckout(plan.id, billing === "annual" ? "yearly" : "monthly")
                  }
                >
                  {active ? "Current plan" : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <Card className="border-border/80 bg-muted/30">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Email reminders</p>
            <p className="mt-1 text-sm text-muted-foreground">Included in your plan.</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-muted/30">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">SMS reminders</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {smsOutboundUnitPricePenceDisplay}p / text, billed monthly.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mx-auto max-w-2xl border-border/80 bg-muted/30">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-center text-sm font-semibold text-foreground">Paid bookings</h3>
          <div className="mt-6 text-center">
            <p className="text-3xl font-bold tabular-nums text-primary">{marketplaceFeePercentDisplay}% + {marketplaceFeeFlatPenceDisplay}p</p>
            <p className="mt-2 text-sm font-medium text-foreground">TheraMate commission on each paid session</p>
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
              Applied as platform commission via Stripe Connect at checkout.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
