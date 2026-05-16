import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreditCard,
  Calendar,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  Info,
} from "lucide-react";
import {
  getProductById,
  getPriceById,
  calculatePaymentBreakdown,
  calculateMarketplaceFee,
  formatCurrency,
  MARKETPLACE_FEE_DISPLAY,
} from "@/config/payments";

interface PaymentFormProps {
  amount: number;
  currency?: string;
  paymentType: "subscription" | "one_time";
  therapistId?: string;
  projectId?: string;
  sessionId?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  productCategory?: string;
  therapistType?: "sports_therapist" | "massage_therapist" | "osteopath";
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void;
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = "gbp",
  paymentType,
  therapistId,
  projectId,
  sessionId,
  stripeProductId,
  stripePriceId,
  productCategory,
  therapistType,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    PaymentMethod[]
  >([]);
  const [useSavedMethod, setUseSavedMethod] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState<any>(null);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  });

  useEffect(() => {
    if (user) {
      loadSavedPaymentMethods();
    }
  }, [user]);

  useEffect(() => {
    // Calculate fee breakdown for marketplace payments
    if (
      productCategory &&
      ["sports_therapy", "massage_therapy", "osteopath", "general"].includes(
        productCategory,
      )
    ) {
      const breakdown = calculatePaymentBreakdown(amount);
      setFeeBreakdown(breakdown);
    }
  }, [amount, productCategory]);

  const loadSavedPaymentMethods = async () => {
    try {
      // Fetch saved payment methods from Stripe Customer API
      // This would integrate with Stripe to get customer's saved cards
      const { data, error } = await supabase.functions.invoke(
        "stripe-payment",
        {
          body: {
            action: "get-saved-payment-methods",
            customer_id: user?.id,
          },
        },
      );

      if (error) {
        console.error("Error loading payment methods:", error);
        setSavedPaymentMethods([]);
      } else {
        setSavedPaymentMethods(data?.paymentMethods || []);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
      setSavedPaymentMethods([]);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from pence to pounds
  };

  const calculatePlatformFee = () => {
    // Use the new fee breakdown if available, otherwise fallback to old logic
    if (feeBreakdown) {
      return feeBreakdown.marketplaceFee;
    }
    if (paymentType === "one_time") {
      return calculateMarketplaceFee(amount);
    }
    return 0;
  };

  const getTotalAmount = () => {
    return amount; // Total amount is the same, fees are deducted from practitioner payout
  };

  const handleCardInputChange = (field: string, value: string) => {
    setCardDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateCardDetails = () => {
    if (
      !cardDetails.number ||
      !cardDetails.expiry ||
      !cardDetails.cvc ||
      !cardDetails.name
    ) {
      return false;
    }

    // Basic validation
    if (cardDetails.number.length < 13 || cardDetails.number.length > 19) {
      return false;
    }

    if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCardDetails()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all card details correctly",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Capture Endorsely referral ID if present
      const endorselyReferral =
        typeof window !== "undefined" ? window.endorsely_referral : undefined;

      // Create payment intent
      const { data, error } = await supabase.functions.invoke(
        "stripe-payment",
        {
          body: {
            action: "create-payment-intent",
            amount: getTotalAmount(),
            currency: currency.toLowerCase(),
            payment_type: paymentType,
            user_id: user?.id,
            therapist_id: therapistId,
            project_id: projectId,
            session_id: sessionId,
            stripe_product_id: stripeProductId,
            stripe_price_id: stripePriceId,
            product_category: productCategory,
            therapist_type: therapistType,
            endorsely_referral: endorselyReferral,
            metadata: {
              payment_type: paymentType,
              therapist_id: therapistId,
              project_id: projectId,
              session_id: sessionId,
              product_category: productCategory,
              therapist_type: therapistType,
              ...(endorselyReferral && {
                endorsely_referral: endorselyReferral,
              }),
            },
          },
        },
      );

      if (error) throw error;

      // Confirm the payment with Stripe
      const confirmResult = await supabase.functions.invoke("stripe-payment", {
        body: {
          action: "confirm-payment",
          payment_intent_id: data.payment_intent_id,
          payment_method_id: useSavedMethod ? paymentMethod?.id : undefined,
        },
      });

      if (confirmResult.error) throw confirmResult.error;

      toast({
        title: "Payment Successful",
        description: `Payment of ${formatAmount(getTotalAmount())} has been processed successfully`,
      });

      if (onSuccess) {
        onSuccess(data.payment_intent_id);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description:
          "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentTypeLabel = () => {
    switch (paymentType) {
      case "subscription":
        return "Subscription Payment";
      case "one_time":
        return "One-time Payment";
      default:
        return "Payment";
    }
  };

  const getPaymentTypeIcon = () => {
    switch (paymentType) {
      case "subscription":
        return <Calendar className="h-4 w-4" />;
      case "one_time":
        return <Zap className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPaymentTypeIcon()}
            {getPaymentTypeLabel()}
          </CardTitle>
          <CardDescription>
            Complete your payment securely with Stripe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Service Amount:
              </span>
              <span className="font-medium">{formatAmount(amount)}</span>
            </div>

            {/* Marketplace Fee Display */}
            {feeBreakdown && feeBreakdown.marketplaceFee > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">
                      Platform fee ({MARKETPLACE_FEE_DISPLAY}):
                    </span>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="font-medium">
                    {formatCurrency(feeBreakdown.marketplaceFee)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  <div className="flex items-center gap-1 mb-1">
                    <Info className="h-3 w-3" />
                    <span className="font-medium">Fee Breakdown:</span>
                  </div>
                  <div>• You pay: {formatCurrency(amount)}</div>
                  <div>
                    • Practitioner receives:{" "}
                    {formatCurrency(feeBreakdown.practitionerPayout)}
                  </div>
                  <div>
                    • Platform fee:{" "}
                    {formatCurrency(feeBreakdown.marketplaceFee)}
                  </div>
                </div>
              </>
            )}

            <div className="border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Payment:</span>
                <span className="font-bold text-lg">
                  {formatAmount(getTotalAmount())}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          {savedPaymentMethods.length > 0 && (
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={useSavedMethod}
                    onChange={() => setUseSavedMethod(true)}
                    className="text-primary"
                  />
                  <span className="text-sm">Use saved payment method</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={!useSavedMethod}
                    onChange={() => setUseSavedMethod(false)}
                    className="text-primary"
                  />
                  <span className="text-sm">Use new card</span>
                </label>
              </div>
            </div>
          )}

          {/* Saved Payment Methods */}
          {useSavedMethod && savedPaymentMethods.length > 0 && (
            <div className="space-y-3">
              <Label>Select Payment Method</Label>
              <Select
                onValueChange={(value) => {
                  const method = savedPaymentMethods.find(
                    (m) => m.id === value,
                  );
                  setPaymentMethod(method || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a payment method" />
                </SelectTrigger>
                <SelectContent>
                  {savedPaymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>
                          {method.card?.brand?.toUpperCase()} ••••{" "}
                          {method.card?.last4}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New Card Form */}
          {!useSavedMethod && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.number}
                  onChange={(e) =>
                    handleCardInputChange(
                      "number",
                      e.target.value.replace(/\s/g, ""),
                    )
                  }
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={(e) =>
                      handleCardInputChange("expiry", e.target.value)
                    }
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    type="text"
                    placeholder="123"
                    value={cardDetails.cvc}
                    onChange={(e) =>
                      handleCardInputChange("cvc", e.target.value)
                    }
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  type="text"
                  placeholder="John Doe"
                  value={cardDetails.name}
                  onChange={(e) =>
                    handleCardInputChange("name", e.target.value)
                  }
                />
              </div>

              {/* Security Badges */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  <span>256-bit SSL</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !validateCardDetails()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Pay {formatAmount(getTotalAmount())}
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Saved Method Payment */}
          {useSavedMethod && paymentMethod && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">
                    {paymentMethod.card?.brand?.toUpperCase()} ••••{" "}
                    {paymentMethod.card?.last4}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Expires {paymentMethod.card?.exp_month}/
                  {paymentMethod.card?.exp_year}
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Pay {formatAmount(getTotalAmount())}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Cancel Button */}
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          )}

          {/* Payment Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Your payment is processed securely by Stripe</p>
            <p>
              You will receive a confirmation email once payment is complete
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentForm;
