import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info, CreditCard, TrendingUp, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PricingTransparencyCardProps {
  servicePrice: number; // in pence
  platformFeePercentage?: number;
  practitionerReceives?: number; // in pence
  pricingRationale?: string;
  className?: string;
}

export const PricingTransparencyCard: React.FC<PricingTransparencyCardProps> = ({
  servicePrice,
  platformFeePercentage = 2, // Total fee: 0.5% platform + 1.5% Stripe = 2%
  practitionerReceives,
  pricingRationale,
  className
}) => {
  const [expanded, setExpanded] = useState(false);

  const priceInPounds = servicePrice / 100;
  const platformFee = (servicePrice * platformFeePercentage) / 100;
  const platformFeePounds = platformFee / 100;
  const practitionerPayout = practitionerReceives || (servicePrice - platformFee);
  const practitionerPayoutPounds = practitionerPayout / 100;
  const totalAmount = servicePrice;
  const totalAmountPounds = totalAmount / 100;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pricing Breakdown
        </CardTitle>
        <CardDescription>
          Transparent pricing with no hidden fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fee Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">Service Price</span>
              <Info className="h-3 w-3 text-muted-foreground ml-1" />
            </div>
            <span className="font-medium">£{priceInPounds.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Platform Fee ({platformFeePercentage}%)</span>
              <Info className="h-3 w-3" />
            </div>
            <span>£{platformFeePounds.toFixed(2)}</span>
          </div>

          <Separator />

          <div className="flex justify-between items-center font-semibold text-lg">
            <span>Total Amount</span>
            <span>£{totalAmountPounds.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Practitioner Receives</span>
            <span className="text-green-600 font-medium">£{practitionerPayoutPounds.toFixed(2)}</span>
          </div>
        </div>

        {/* How is pricing determined? Expandable Section */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full justify-between text-xs h-auto py-2"
          >
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              How is pricing determined?
            </span>
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>

          {expanded && (
            <div className="mt-2 space-y-3 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              {/* Service Price Explanation */}
              <div className="flex items-start gap-2">
                <TrendingUp className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <strong className="text-foreground">Service Price:</strong> Set by the practitioner based on duration, expertise, and market rates. This reflects the value of their time and specialized knowledge.
                </div>
              </div>

              {/* Platform Fee Explanation */}
              <div className="flex items-start gap-2">
                <Shield className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <strong className="text-foreground">Platform Fee ({platformFeePercentage}%):</strong> Covers secure payment processing, platform maintenance, customer support, and booking management tools. This ensures a reliable and safe booking experience.
                </div>
              </div>

              {/* Practitioner Receives Explanation */}
              <div className="flex items-start gap-2">
                <CreditCard className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                <div>
                  <strong className="text-foreground">Practitioner Receives:</strong> {((practitionerPayout / servicePrice) * 100).toFixed(1)}% of the service price goes directly to the practitioner. Payments are processed securely and transferred to their account.
                </div>
              </div>

              {/* Pricing Rationale */}
              {pricingRationale && (
                <Alert className="mt-2">
                  <Info className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    <strong className="text-foreground">Practitioner's Note:</strong> {pricingRationale}
                  </AlertDescription>
                </Alert>
              )}

              {/* Value Proposition */}
              <div className="pt-2 border-t">
                <div className="text-xs">
                  <strong className="text-foreground">Why this pricing?</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Transparent fees with no hidden costs</li>
                    <li>Secure payment processing via Stripe</li>
                    <li>Fair compensation for practitioners</li>
                    <li>Platform investment in booking tools and support</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Comparison Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Fair Pricing:</strong> Our {platformFeePercentage}% platform fee is competitive and covers all payment processing, security, and platform maintenance costs. Practitioners receive {((practitionerPayout / servicePrice) * 100).toFixed(1)}% of the service price.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

