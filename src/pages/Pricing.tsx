import { HeaderClean } from "@/components/landing/HeaderClean";
import { FooterClean } from "@/components/FooterClean";
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
import { Settings, RefreshCw, Check, Users, Building2, ArrowRight, Mail, Phone } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import MetaTags from "@/components/SEO/MetaTags";
import { supabase } from "@/integrations/supabase/client";

const Pricing = () => {
  const { subscribed, subscriptionTier, subscriptionEnd, loading, checkSubscription, manageSubscription, createCheckout } = useSubscription();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("practitioners");

  // Handle URL parameters for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['practitioners', 'enterprise'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Force subscription check for practitioners only (not clients)
  useEffect(() => {
    if (user && userProfile) {
      const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
      if (isPractitioner) {
        // Force a fresh check to prevent stale data
        checkSubscription(true);
      }
    }
  }, [user?.id, userProfile?.id]); // Only depend on IDs, not the full objects

  // Practitioners with incomplete onboarding should finish onboarding first, not stay on pricing.
  useEffect(() => {
    if (!user || !userProfile) return;

    const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
    const needsOnboarding = userProfile.onboarding_status !== 'completed' || !userProfile.profile_completed;

    if (isPractitioner && needsOnboarding) {
      navigate('/onboarding', {
        replace: true,
        state: {
          message: 'Complete onboarding to continue setup.',
          from: '/pricing',
        },
      });
    }
  }, [user?.id, userProfile?.id, userProfile?.user_role, userProfile?.onboarding_status, userProfile?.profile_completed, navigate]);

  // Redirect subscribed practitioners to dashboard to prevent loop
  useEffect(() => {
    if (!loading && subscribed && userProfile) {
      const isPractitioner = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
      if (isPractitioner && userProfile.onboarding_status === 'completed') {
        console.log('✅ Practitioner has active subscription, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loading, subscribed, userProfile?.id, userProfile?.user_role, userProfile?.onboarding_status, navigate]);

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

    await createCheckout(planId, 'monthly');
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

  const practitionerPlans = [
    {
      id: "professional",
      name: "Starter",
      monthlyPrice: 30,
      yearlyPrice: 30,
      description: "Complete platform access for licensed healthcare professionals",
      badge: "",
      features: [
        "Professional profile listing",
        "Booking calendar",
        "Client management system",
        "Secure messaging platform",
        "Credit-based exchange system"
      ],
      buttonText: "Start Starter Plan",
      buttonVariant: "default" as const,
      popular: false
    },
    {
      id: "professional-pro",
      name: "Pro",
      monthlyPrice: 50,
      yearlyPrice: 50,
      description: "Enhanced features for growing practices",
      badge: "Best Value",
      features: [
        "Everything in Starter plan",
        "Advanced analytics & insights",
        "AI notes taker",
        "Voice recorder for notes"
      ],
      buttonText: "Start Pro Plan",
      buttonVariant: "default" as const,
      popular: true
    },
  ];

  return (
    <>
      <MetaTags
        title="Pricing Plans | TheraMate - Professional Plans for Healthcare Practitioners"
        description="Transparent pricing for healthcare practitioners. Professional plans starting at £30/month. Grow your practice with our comprehensive platform and tools."
        keywords="therapy pricing, healthcare professional plans, sports therapy cost, massage therapy rates, osteopathy pricing, therapy platform pricing, practitioner plans"
        canonicalUrl="https://theramate.com/pricing"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Pricing Plans | TheraMate",
          "description": "Professional plans for healthcare practitioners starting at £30/month.",
          "url": "https://theramate.com/pricing",
          "mainEntity": {
            "@type": "ItemList",
            "name": "Healthcare Professional Plans",
            "description": "Pricing plans for healthcare professional subscriptions",
            "itemListElement": [
              {
                "@type": "Offer",
                "name": "Starter Plan",
                "description": "Complete platform access for licensed healthcare professionals",
                "price": "30",
                "priceCurrency": "GBP",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "30",
                  "priceCurrency": "GBP",
                  "unitText": "per month"
                }
              },
              {
                "@type": "Offer",
                "name": "Pro Plan",
                "description": "Enhanced features for growing practices",
                "price": "50",
                "priceCurrency": "GBP",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "50",
                  "priceCurrency": "GBP",
                  "unitText": "per month"
                }
              }
            ]
          }
        }}
      />
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <HeaderClean />
      
      <main className="flex-1 mt-16">
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
                  Professional plans designed for healthcare practitioners. Start growing your practice today with our comprehensive platform and tools.
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-12">
                  <TabsTrigger value="practitioners" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    For Practitioners
                  </TabsTrigger>
                  <TabsTrigger value="enterprise" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Enterprise
                  </TabsTrigger>
                </TabsList>

                {/* Practitioner Pricing */}
                <TabsContent value="practitioners" className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-4">Practitioner Pricing</h3>
                    <p className="text-muted-foreground">
                      Professional plans for healthcare providers to offer services on our platform
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {practitionerPlans.map((plan, index) => {
                      const currentPrice = plan.monthlyPrice;
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
                              <span className="text-muted-foreground">/month</span>
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


      </main>
      
      <FooterClean />
    </div>
    </>
  );
};

export default Pricing;


