import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  getTherapistTypeProducts,
  getProductById,
  formatCurrency,
  calculatePaymentBreakdown,
  MARKETPLACE_FEE_DISPLAY,
  PaymentProduct,
  PaymentPrice,
} from "@/config/payments";
import { Crown, Star, Zap, Info, User, Calendar, MapPin } from "lucide-react";

interface ServicePackageSelectorProps {
  therapistType: "sports_therapist" | "massage_therapist" | "osteopath";
  onPackageSelect: (packageData: {
    product: PaymentProduct;
    price: PaymentPrice;
    feeBreakdown: any;
  }) => void;
  className?: string;
}

const ServicePackageSelector: React.FC<ServicePackageSelectorProps> = ({
  therapistType,
  onPackageSelect,
  className = "",
}) => {
  const [selectedProduct, setSelectedProduct] = useState<PaymentProduct | null>(
    null,
  );
  const [selectedPrice, setSelectedPrice] = useState<PaymentPrice | null>(null);
  const [availableProducts, setAvailableProducts] = useState<PaymentProduct[]>(
    [],
  );

  useEffect(() => {
    // Load products for the specific therapist type
    const products = getTherapistTypeProducts(therapistType);
    setAvailableProducts(products);

    // Auto-select first product if available
    if (products.length > 0) {
      setSelectedProduct(products[0]);
      if (products[0].prices.length > 0) {
        setSelectedPrice(products[0].prices[0]);
      }
    }
  }, [therapistType]);

  useEffect(() => {
    // Notify parent when selection changes
    if (selectedProduct && selectedPrice) {
      const feeBreakdown = calculatePaymentBreakdown(selectedPrice.amount);
      onPackageSelect({
        product: selectedProduct,
        price: selectedPrice,
        feeBreakdown,
      });
    }
  }, [selectedProduct, selectedPrice, onPackageSelect]);

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "basic":
        return <User className="h-4 w-4" />;
      case "standard":
        return <Star className="h-4 w-4" />;
      case "premium":
        return <Crown className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "basic":
        return "bg-blue-100 text-blue-800";
      case "standard":
        return "bg-purple-100 text-purple-800";
      case "premium":
        return "bg-gold-100 text-gold-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTherapistTypeLabel = () => {
    switch (therapistType) {
      case "sports_therapist":
        return "Sports Therapy";
      case "massage_therapist":
        return "Massage Therapy";
      case "osteopath":
        return "Osteopathy";
      default:
        return "Therapy";
    }
  };

  const calculateFeeBreakdown = (amount: number) => {
    return calculatePaymentBreakdown(amount);
  };

  if (availableProducts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Service Packages</CardTitle>
          <CardDescription>
            No service packages available for {getTherapistTypeLabel()}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Service Type Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getTherapistTypeLabel()} Services
          </CardTitle>
          <CardDescription>
            Choose the service package that best fits your needs
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Product Selection */}
      {availableProducts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedProduct?.id || ""}
              onValueChange={(value) => {
                const product = availableProducts.find((p) => p.id === value);
                if (product) {
                  setSelectedProduct(product);
                  if (product.prices.length > 0) {
                    setSelectedPrice(product.prices[0]);
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Price Selection */}
      {selectedProduct && selectedProduct.prices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Package Options</CardTitle>
            <CardDescription>
              Select the package that best suits your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedPrice?.id || ""}
              onValueChange={(value) => {
                const price = selectedProduct.prices.find(
                  (p) => p.id === value,
                );
                if (price) {
                  setSelectedPrice(price);
                }
              }}
              className="space-y-4"
            >
              {selectedProduct.prices.map((price) => {
                const feeBreakdown = calculateFeeBreakdown(price.amount);
                return (
                  <div key={price.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={price.id} id={price.id} />
                    <Label htmlFor={price.id} className="flex-1 cursor-pointer">
                      <Card className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getTierIcon(price.tier || "")}
                              <div>
                                <div className="font-medium">
                                  {price.description ||
                                    formatCurrency(price.amount)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {price.tier && (
                                    <Badge
                                      variant="secondary"
                                      className={getTierColor(price.tier)}
                                    >
                                      {price.tier.charAt(0).toUpperCase() +
                                        price.tier.slice(1)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {formatCurrency(price.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Practitioner receives:{" "}
                              {formatCurrency(feeBreakdown.practitionerPayout)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Fee Breakdown */}
      {selectedPrice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              Payment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const breakdown = calculateFeeBreakdown(selectedPrice.amount);
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Service Amount:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(breakdown.subtotal)}
                    </span>
                  </div>

                  {breakdown.marketplaceFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Platform fee ({MARKETPLACE_FEE_DISPLAY}):
                      </span>
                      <span className="font-medium">
                        {formatCurrency(breakdown.marketplaceFee)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="font-semibold">You Pay:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(breakdown.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Practitioner Receives:
                    </span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(breakdown.practitionerPayout)}
                    </span>
                  </div>

                  {breakdown.marketplaceFee > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-xs text-blue-700">
                          <div className="font-medium mb-1">
                            About Platform Fees
                          </div>
                          <div>
                            Online bookings include a platform fee of{" "}
                            {MARKETPLACE_FEE_DISPLAY} on the session total (card
                            payments via Stripe). Pay-at-clinic bookings have no
                            platform fee.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServicePackageSelector;
