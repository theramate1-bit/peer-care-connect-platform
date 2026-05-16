import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ServicePackageSelector from "@/components/payments/ServicePackageSelector";
import PaymentForm from "@/components/payments/PaymentForm";
import {
  ALL_PRODUCTS,
  getProductsByCategory,
  formatCurrency,
  MARKETPLACE_FEE_DISPLAY,
} from "@/config/payments";
import { CreditCard, Package, Users, TrendingUp, Info } from "lucide-react";

const PaymentDemo = () => {
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedTherapistType, setSelectedTherapistType] = useState<
    "sports_therapist" | "massage_therapist" | "osteopath"
  >("sports_therapist");

  const handlePackageSelect = (packageData: any) => {
    setSelectedPackage(packageData);
    console.log("Selected package:", packageData);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    console.log("Payment successful:", paymentId);
    setShowPaymentForm(false);
    setSelectedPackage(null);
  };

  const formatProductStats = () => {
    const platformProducts = getProductsByCategory("platform");
    const marketplaceProducts = ALL_PRODUCTS.filter(
      (p) => p.type === "marketplace",
    );

    return {
      total: ALL_PRODUCTS.length,
      platform: platformProducts.length,
      marketplace: marketplaceProducts.length,
      sportsTherapy: getProductsByCategory("sports_therapy").length,
      massageTherapy: getProductsByCategory("massage_therapy").length,
      osteopath: getProductsByCategory("osteopath").length,
    };
  };

  const stats = formatProductStats();

  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Payment System Demo"
        description="Test the synchronized Stripe payment system with marketplace fees"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Payments", href: "/payments" },
          { label: "Demo" },
        ]}
        backTo="/payments"
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Synchronized from Stripe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Platform Plans
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.platform}</div>
              <p className="text-xs text-muted-foreground">
                Subscription models
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Marketplace Services
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.marketplace}</div>
              <p className="text-xs text-muted-foreground">
                {MARKETPLACE_FEE_DISPLAY} platform fee
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Therapist Types
              </CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.sportsTherapy + stats.massageTherapy + stats.osteopath}
              </div>
              <p className="text-xs text-muted-foreground">
                Specialized services
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Marketplace Fee Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Marketplace Fee Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="font-medium text-blue-900">
                  Platform Subscriptions
                </div>
                <div className="text-sm text-blue-700">No marketplace fees</div>
                <div className="text-xs text-blue-600 mt-1">
                  Monthly/yearly subscription plans for practitioners
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="font-medium text-green-900">
                  Custom Services
                </div>
                <div className="text-sm text-green-700">
                  {MARKETPLACE_FEE_DISPLAY} platform fee
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Sports therapy, massage therapy, osteopath sessions
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="font-medium text-purple-900">
                  Payment Processing
                </div>
                <div className="text-sm text-purple-700">Stripe Connect</div>
                <div className="text-xs text-purple-600 mt-1">
                  Automatic fee calculation and practitioner payouts
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Testing Interface */}
        <Tabs defaultValue="packages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="packages">Service Packages</TabsTrigger>
            <TabsTrigger value="products">All Products</TabsTrigger>
            <TabsTrigger value="payment">Payment Test</TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Package Selection</CardTitle>
                <CardDescription>
                  Test the service package selector for different therapist
                  types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={
                        selectedTherapistType === "sports_therapist"
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setSelectedTherapistType("sports_therapist")
                      }
                    >
                      Sports Therapist
                    </Button>
                    <Button
                      variant={
                        selectedTherapistType === "massage_therapist"
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setSelectedTherapistType("massage_therapist")
                      }
                    >
                      Massage Therapist
                    </Button>
                    <Button
                      variant={
                        selectedTherapistType === "osteopath"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setSelectedTherapistType("osteopath")}
                    >
                      Osteopath
                    </Button>
                  </div>

                  <ServicePackageSelector
                    therapistType={selectedTherapistType}
                    onPackageSelect={handlePackageSelect}
                  />

                  {selectedPackage && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-800">
                          Selected Package
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-green-700">
                          <div>
                            <strong>Product:</strong>{" "}
                            {selectedPackage.product.name}
                          </div>
                          <div>
                            <strong>Price:</strong>{" "}
                            {formatCurrency(selectedPackage.price.amount)}
                          </div>
                          <div>
                            <strong>Tier:</strong> {selectedPackage.price.tier}
                          </div>
                          <div>
                            <strong>Marketplace Fee:</strong>{" "}
                            {formatCurrency(
                              selectedPackage.feeBreakdown.marketplaceFee,
                            )}
                          </div>
                          <div>
                            <strong>Practitioner Payout:</strong>{" "}
                            {formatCurrency(
                              selectedPackage.feeBreakdown.practitionerPayout,
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ALL_PRODUCTS.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{product.type}</Badge>
                      {product.category && (
                        <Badge variant="outline">{product.category}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-medium">Pricing Options:</div>
                      {product.prices.map((price) => (
                        <div
                          key={price.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{price.tier || "Standard"}</span>
                          <span className="font-medium">
                            {formatCurrency(price.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Form Test</CardTitle>
                <CardDescription>
                  Test the payment form with marketplace fee calculation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showPaymentForm ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Select a package from the "Service Packages" tab, then
                      click below to test the payment form.
                    </div>
                    <Button
                      onClick={() => setShowPaymentForm(true)}
                      disabled={!selectedPackage}
                    >
                      Test Payment Form
                    </Button>
                    {!selectedPackage && (
                      <div className="text-xs text-muted-foreground">
                        Please select a package first
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-md">
                    <PaymentForm
                      amount={selectedPackage.price.amount}
                      currency="gbp"
                      paymentType="one_time"
                      therapistId="demo-therapist-id"
                      stripeProductId={selectedPackage.product.id}
                      stripePriceId={selectedPackage.price.id}
                      productCategory={selectedPackage.product.category}
                      therapistType={selectedTherapistType}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => setShowPaymentForm(false)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PaymentDemo;
