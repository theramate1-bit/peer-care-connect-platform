import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, RefreshCw, Check, Star, Heart, TrendingUp, User, Users, Building2, ArrowRight, Mail, Phone, MessageSquare } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";
import MetaTags from "@/components/SEO/MetaTags";
import { supabase } from "@/integrations/supabase/client";

const Pricing = () => {
  const { subscribed, subscriptionTier, subscriptionEnd, loading, checkSubscription, manageSubscription, createCheckout } = useSubscription();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isYearly, setIsYearly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");

  // Handle URL parameters for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['clients', 'practitioners', 'enterprise'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePlanSelect = async (planId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (planId !== 'client' && userProfile?.user_role === 'client') {
      toast({
        title: "Access Restricted",
        description: "Subscription plans are only available for healthcare professionals. Clients can book sessions for free.",
        variant: "destructive"
      });
      return;
    }

    if (planId === 'client' && userProfile?.user_role !== 'client') {
      toast({
        title: "Access Restricted", 
        description: "This plan is for clients only. Healthcare professionals should use the practitioner plans.",
        variant: "destructive"
      });
      return;
    }

    const billing = isYearly ? 'yearly' : 'monthly';
    await createCheckout(planId, billing);
  };

  const handleCustomPricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const customPricingData = {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        company: formData.get('company'),
        organization_type: formData.get('organizationType'),
        team_size: formData.get('teamSize'),
        message: formData.get('message'),
        type: 'custom_pricing',
        status: 'new',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('contact_messages')
        .insert([customPricingData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Custom Pricing Inquiry Sent!",
        description: "We'll get back to you within 24 hours with a personalized solution.",
      });

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error submitting custom pricing form:', error);
      toast({
        title: "Error sending inquiry",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientFeatures = [
    "Browse unlimited healthcare professional profiles",
    "Direct messaging with practitioners", 
    "Easy booking system with real-time availability",
    "Session history and progress tracking",
    "Review and rating system",
    "Email notifications and reminders",
    "Community access and support",
    "No hidden fees or charges",
    "Secure payment processing"
  ];

  const practitionerPlans = [
    {
      id: "professional",
      name: "For Healthcare Professionals",
      monthlyPrice: 30,
      yearlyPrice: 27,
      description: "Complete platform access for licensed healthcare professionals",
      badge: "",
      features: [
        "Professional profile listing",
        "Advanced booking calendar",
        "Client management system",
        "Credit-based exchange system",
        "Marketing tools & analytics",
        "Priority search placement",
        "Video consultation support",
        "Professional verification badge",
        "Custom availability settings",
        "Secure messaging platform"
      ],
      buttonText: "Start as Professional",
      buttonVariant: "default" as const,
      popular: false
    },
    {
      id: "professional-pro",
      name: "For Healthcare Professionals Pro",
      monthlyPrice: 50,
      yearlyPrice: 45,
      description: "AI-powered features for enhanced professional practice management",
      badge: "Best Value",
      features: [
        "Everything in Healthcare Professional plan",
        "AI-powered SOAP notes recording",
        "Voice-to-text transcription",
        "Automated session documentation",
        "Smart appointment scheduling",
        "Advanced analytics & insights",
        "Client progress tracking",
        "Custom treatment plans",
        "Priority customer support",
        "Advanced reporting tools"
      ],
      buttonText: "Start Pro Plan",
      buttonVariant: "default" as const,
      popular: true
    },
  ];

  return (
    <>
      <MetaTags
        title="Pricing Plans | TheraMate - Affordable Therapy Services"
        description="Transparent pricing for therapy services. Free client access, professional plans starting at £30/month. Book sessions with qualified healthcare professionals."
        keywords="therapy pricing, healthcare professional plans, sports therapy cost, massage therapy rates, osteopathy pricing, therapy platform pricing, affordable therapy"
        canonicalUrl="https://theramate.com/pricing"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Pricing Plans | TheraMate",
          "description": "Transparent pricing for therapy services. Free client access, professional plans starting at £30/month.",
          "url": "https://theramate.com/pricing",
          "mainEntity": {
            "@type": "ItemList",
            "name": "Therapy Service Plans",
            "description": "Pricing plans for therapy services and healthcare professional subscriptions",
            "itemListElement": [
              {
                "@type": "Offer",
                "name": "Client Access",
                "description": "Free access with pay-per-session model",
                "price": "0",
                "priceCurrency": "GBP",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "0",
                  "priceCurrency": "GBP",
                  "unitText": "per month"
                }
              },
              {
                "@type": "Offer",
                "name": "Professional Practitioner Plan",
                "description": "Advanced tools for established practitioners - 3% marketplace fee",
                "price": "79.99",
                "priceCurrency": "GBP",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "79.99",
                  "priceCurrency": "GBP",
                  "unitText": "per month"
                }
              },
              {
                "@type": "Offer",
                "name": "Premium Practitioner Plan",
                "description": "Complete suite for top practitioners - 1% marketplace fee",
                "price": "199.99",
                "priceCurrency": "GBP",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "199.99",
                  "priceCurrency": "GBP",
                  "unitText": "per month"
                }
              }
            ]
          }
        }}
      />
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Back Button */}
        <section className="py-8 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <BackButton />
            </div>
          </div>
        </section>

        {/* Current Subscription Status */}
        {user && (
          <section className="py-8 bg-muted/50">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Subscription Status
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkSubscription}
                        disabled={loading}
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        {subscribed ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                              <span className="font-medium capitalize">
                                {subscriptionTier} Plan
                              </span>
                            </div>
                            {subscriptionEnd && (
                              <p className="text-sm text-muted-foreground">
                                Renews on {formatDate(subscriptionEnd)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Badge variant="outline">No Active Subscription</Badge>
                            <p className="text-sm text-muted-foreground">
                              Choose a plan below to get started
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {subscribed && (
                        <Button onClick={manageSubscription} variant="outline">
                          Manage Subscription
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
        
        {/* Pricing Tabs */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Choose Your
                  <span className="block text-primary">TheraMate Plan</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Clear pricing for every role: <strong>Free access for clients seeking care</strong> or 
                  <strong> professional plans for healthcare providers</strong>. Plus custom enterprise solutions.
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-12">
                  <TabsTrigger value="clients" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    For Clients
                  </TabsTrigger>
                  <TabsTrigger value="practitioners" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    For Practitioners
                  </TabsTrigger>
                  <TabsTrigger value="enterprise" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Enterprise
                  </TabsTrigger>
                </TabsList>

                {/* Client Pricing */}
                <TabsContent value="clients" className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-4">Client Pricing</h3>
                    <p className="text-muted-foreground">
                      Access to qualified healthcare professionals completely free. You only pay for the sessions you book.
                    </p>
                  </div>

                  {/* Explicit notice: clients don't need subscriptions or packages */}
                  <div className="max-w-3xl mx-auto">
                    <div className="p-3 md:p-4 rounded-md border bg-blue-50 border-blue-200 text-blue-900 text-sm">
                      <strong className="font-medium">No subscriptions or fixed packages for clients.</strong>
                      <span className="ml-1">You only pay per session at the price set by each practitioner.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Client Plan */}
                    <Card className="shadow-lg border-2 border-green-200">
                      <CardHeader className="text-center pb-6">
                        <Badge className="w-fit mx-auto mb-4 bg-green-100 text-green-800">
                          Free Forever
                        </Badge>
                        <CardTitle className="text-2xl mb-2">Client Access</CardTitle>
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-green-600">Free</span>
                          <span className="text-muted-foreground">/forever</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          Complete access to browse, book, and connect with healthcare professionals. 
                          You only pay for the sessions you book with practitioners.
                        </p>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        <ul className="space-y-3">
                          {clientFeatures.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                         
                        <Button 
                          variant="default" 
                          className="w-full" 
                          size="lg"
                          onClick={() => handlePlanSelect('client')}
                        >
                          Start Free as Client
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Session Pricing Info */}
                    <Card className="shadow-lg">
                      <CardHeader className="text-center pb-6">
                        <CardTitle className="text-2xl mb-2">Session Pricing</CardTitle>
                        <p className="text-muted-foreground">
                          Pay only for the sessions you book with practitioners
                        </p>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="font-medium">60-minute session</span>
                            <Badge className="bg-blue-100 text-blue-700">£60-120</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="font-medium">90-minute session</span>
                            <Badge className="bg-blue-100 text-blue-700">£90-180</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="font-medium">Initial consultation</span>
                            <Badge className="bg-blue-100 text-blue-700">£80-150</Badge>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-4">
                            Pricing varies by practitioner and service type
                          </p>
                          <Button variant="outline" size="lg" asChild>
                            <Link to="/marketplace">
                              Browse Practitioners
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Practitioner Pricing */}
                <TabsContent value="practitioners" className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-4">Practitioner Pricing</h3>
                    <p className="text-muted-foreground">
                      Professional plans for healthcare providers to offer services on our platform
                    </p>
                    
                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <span className={`text-sm ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        Monthly
                      </span>
                      <Switch
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className={`text-sm ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        Yearly
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        Save 10%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {practitionerPlans.map((plan, index) => {
                      const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                      const isCurrentPlan = subscribed && subscriptionTier === plan.id;
                      
                      return (
                        <Card 
                          key={index}
                          className={`shadow-lg relative ${
                            plan.popular ? 'ring-2 ring-primary scale-105' : ''
                          } ${isCurrentPlan ? 'ring-2 ring-green-500 bg-green-50/50' : ''}`}
                        >
                          {plan.badge && !isCurrentPlan && (
                            <Badge 
                              className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1"
                            >
                              {plan.badge}
                            </Badge>
                          )}
                          
                          {isCurrentPlan && (
                            <Badge 
                              className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-1"
                            >
                              Your Plan
                            </Badge>
                          )}
                          
                          <CardHeader className="text-center pb-6">
                            <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                            <div className="mb-4">
                              <span className="text-4xl font-bold text-primary">£{currentPrice}</span>
                              <span className="text-muted-foreground">/{isYearly ? 'month' : 'month'}</span>
                              {isYearly && (
                                <div className="text-sm text-muted-foreground">
                                  Billed annually (£{(currentPrice * 12).toFixed(0)}/year)
                                </div>
                              )}
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                              {plan.description}
                            </p>
                          </CardHeader>
                          
                          <CardContent className="space-y-6">
                            <ul className="space-y-3">
                              {plan.features.map((feature, featureIndex) => (
                                <li key={featureIndex} className="flex items-start gap-3">
                                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{feature}</span>
                                </li>
                              ))}
                            </ul>
                             
                            <Button 
                              variant={isCurrentPlan ? "outline" : plan.buttonVariant} 
                              className="w-full" 
                              size="lg"
                              onClick={() => handlePlanSelect(plan.id)}
                              disabled={isCurrentPlan}
                            >
                              {isCurrentPlan ? "Current Plan" : plan.buttonText}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Enterprise Pricing */}
                <TabsContent value="enterprise" className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-4">Enterprise Solutions</h3>
                    <p className="text-muted-foreground">
                      Custom solutions for healthcare organizations, clinics, and large practices
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Custom Pricing Card */}
                    <Card className="shadow-lg border-2 border-purple-200">
                      <CardHeader className="text-center pb-6">
                        <Badge className="w-fit mx-auto mb-4 bg-purple-100 text-purple-800">
                          Custom Pricing
                        </Badge>
                        <CardTitle className="text-2xl mb-2">Enterprise Plan</CardTitle>
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-purple-600">Custom</span>
                          <span className="text-muted-foreground">/pricing</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          Tailored solutions for your organization's specific needs, 
                          including custom integrations, dedicated support, and volume discounts.
                        </p>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Custom integrations with your existing systems</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Dedicated account management</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Priority support and training</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Custom branding and white-labeling</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Advanced analytics and reporting</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Volume discounts and flexible billing</span>
                          </li>
                        </ul>
                         
                        <Button 
                          variant="default" 
                          className="w-full" 
                          size="lg"
                          asChild
                        >
                          <Link to="/contact">
                            Get Custom Quote
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Contact Form */}
                    <Card className="shadow-lg">
                      <CardHeader className="text-center pb-6">
                        <CardTitle className="text-2xl mb-2">Request Custom Pricing</CardTitle>
                        <p className="text-muted-foreground">
                          Tell us about your organization and we'll create a custom solution for you.
                        </p>
                      </CardHeader>
                      
                      <CardContent>
                        <form onSubmit={handleCustomPricingSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="firstName">First Name *</Label>
                              <Input id="firstName" required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName">Last Name *</Label>
                              <Input id="lastName" required />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="email">Business Email *</Label>
                              <Input id="email" type="email" required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone Number</Label>
                              <Input id="phone" type="tel" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="company">Organization Name *</Label>
                            <Input id="company" required />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="organizationType">Organization Type *</Label>
                              <Select required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hospital">Hospital/Health System</SelectItem>
                                  <SelectItem value="clinic">Private Clinic</SelectItem>
                                  <SelectItem value="spa">Spa/Wellness Center</SelectItem>
                                  <SelectItem value="sports">Sports Medicine Facility</SelectItem>
                                  <SelectItem value="rehab">Rehabilitation Center</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="teamSize">Team Size</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="small">1-10 therapists</SelectItem>
                                  <SelectItem value="medium">11-50 therapists</SelectItem>
                                  <SelectItem value="large">51-200 therapists</SelectItem>
                                  <SelectItem value="enterprise">200+ therapists</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="message">Tell us about your needs *</Label>
                            <Textarea 
                              id="message" 
                              rows={3} 
                              placeholder="Describe your current challenges and what you're hoping to achieve..."
                              required 
                            />
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Sending..." : "Request Custom Pricing"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>

                          <p className="text-xs text-muted-foreground text-center">
                            We'll contact you within 24 hours to discuss your custom solution.
                          </p>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Trust Indicators - Hidden on Enterprise tab */}
        {activeTab !== "enterprise" && (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Card className="text-center p-6 shadow-lg">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                      <Heart className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Free Forever for Clients</h4>
                    <p className="text-sm text-muted-foreground">
                      No hidden fees or charges. Browse, book, and connect with healthcare professionals completely free.
                    </p>
                  </Card>
                  
                  <Card className="text-center p-6 shadow-lg">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                      <Star className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold mb-2">AI-Powered Features</h4>
                    <p className="text-sm text-muted-foreground">
                      Advanced AI for SOAP notes, transcription, and practice management included in professional plans.
                    </p>
                  </Card>
                  
                  <Card className="text-center p-6 shadow-lg">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Flexible Pricing</h4>
                    <p className="text-sm text-muted-foreground">
                      From free client access to custom enterprise solutions, we have pricing for every need.
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">Questions About Pricing?</h2>
                <p className="text-muted-foreground mb-8">
                Our team is here to help you choose the right plan for your needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" size="lg" asChild>
                  <Link to="/contact">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/help">
                    <Phone className="w-4 h-4 mr-2" />
                    Help Center
                  </Link>
                </Button>
              </div>
              </div>
            </div>
          </section>
      </main>
      
      <Footer />
    </div>
    </>
  );
};

export default Pricing;