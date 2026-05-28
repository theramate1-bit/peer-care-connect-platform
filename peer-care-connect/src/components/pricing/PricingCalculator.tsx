import { useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formatCurrency = (pence: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pence / 100);

interface PricingCalculatorProps {
  /** Price per session in pence. Updates in real-time as parent changes. */
  priceAmountPence: number;
  className?: string;
}

/**
 * Revenue calculator for practitioners (KAN-72).
 * Shows monthly and yearly projections based on price per session and estimated sessions per month.
 */
export function PricingCalculator({ priceAmountPence, className }: PricingCalculatorProps) {
  const [sessionsPerMonth, setSessionsPerMonth] = useState(10);

  const pricePounds = priceAmountPence / 100;
  const monthlyRevenuePence = Math.round(priceAmountPence * sessionsPerMonth);
  const yearlyRevenuePence = monthlyRevenuePence * 12;

  return (
    <div className={className}>
      <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        Revenue Calculator
      </h4>
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pricing-calc-sessions" className="text-xs">
              Estimated sessions per month
            </Label>
            <Input
              id="pricing-calc-sessions"
              type="number"
              min={1}
              max={200}
              value={sessionsPerMonth}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v) || v < 1) return;
                setSessionsPerMonth(Math.min(200, v));
              }}
              aria-label="Estimated sessions per month"
            />
          </div>
        </div>
        {priceAmountPence > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              At {formatCurrency(priceAmountPence)} per session, with{" "}
              <span className="font-medium text-foreground">{sessionsPerMonth}</span> sessions/month:
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium">
                {formatCurrency(monthlyRevenuePence)}/month
              </span>
              <span className="font-medium">
                {formatCurrency(yearlyRevenuePence)}/year
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a price above to see revenue projections.
          </p>
        )}
      </div>
    </div>
  );
}
