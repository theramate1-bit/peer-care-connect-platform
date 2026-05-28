import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface PricingProduct {
  id: string;
  name: string;
  price_amount: number; // pence
  duration_minutes?: number;
  currency?: string;
  is_active?: boolean;
}

interface PricingCardProps {
  /** Active products (with price_amount in pence). */
  products: PricingProduct[];
  /** Show credits instead of money (e.g. 1 credit per minute). */
  showCredits?: boolean;
  /** Optional class for the container. */
  className?: string;
  /** Show "View all services" expandable list when multiple products. */
  showAllServices?: boolean;
}

/**
 * Displays prominent pricing for a therapist profile: "Starting from £X.XX" or "Contact for pricing".
 * Shown in the booking card above the Book button. Accessible and handles no products.
 */
export const PricingCard: React.FC<PricingCardProps> = ({
  products,
  showCredits = false,
  className = "",
  showAllServices = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const activeProducts = products.filter((p) => p != null && p.is_active !== false);
  const hasProducts = activeProducts.length > 0;

  const minPricePence = hasProducts
    ? Math.min(...activeProducts.map((p) => p.price_amount))
    : 0;
  const maxPricePence = hasProducts
    ? Math.max(...activeProducts.map((p) => p.price_amount))
    : 0;
  const hasRange = hasProducts && minPricePence !== maxPricePence;

  const formatPrice = (pence: number) => {
    if (showCredits) return `${pence} credits`;
    return `£${(pence / 100).toFixed(2)}`;
  };

  const creditForProduct = (p: PricingProduct) => (p.duration_minutes ?? 0);

  if (!hasProducts) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 ${className}`}
        role="region"
        aria-label="Pricing information"
      >
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Contact for pricing
        </p>
      </div>
    );
  }

  const startingFrom = showCredits
    ? `${Math.min(...activeProducts.map(creditForProduct))} credits`
    : `£${(minPricePence / 100).toFixed(2)}`;

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 ${className}`}
      role="region"
      aria-label="Pricing information"
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Starting from
        </span>
        <p className="text-2xl font-bold text-foreground tabular-nums" aria-live="polite">
          {startingFrom}
        </p>
        {hasRange && (
          <p className="text-sm text-muted-foreground">
            {showCredits
              ? `Up to ${Math.max(...activeProducts.map(creditForProduct))} credits`
              : `Prices up to £${(maxPricePence / 100).toFixed(2)}`}
          </p>
        )}
      </div>

      {showAllServices && activeProducts.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
            aria-expanded={expanded}
            aria-controls="pricing-all-services"
            id="pricing-toggle"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden />
                Hide services
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden />
                View all services and prices
              </>
            )}
          </button>
          <div
            id="pricing-all-services"
            role="region"
            aria-labelledby="pricing-toggle"
            className={expanded ? "mt-2 space-y-2" : "sr-only"}
            hidden={!expanded}
          >
            {expanded &&
              activeProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center text-sm py-1"
                >
                  <span className="text-foreground">{p.name}</span>
                  <span className="font-medium tabular-nums">
                    {showCredits ? `${creditForProduct(p)} credits` : formatPrice(p.price_amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
