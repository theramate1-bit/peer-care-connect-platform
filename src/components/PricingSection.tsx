import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Star, Heart, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { createCheckout, subscribed, subscriptionTier } = useSubscription();
  const { user, userProfile } = useAuth();

  const plans = [
    {
      id: "client",
      name: "Starter Plan",
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: "Free plan for clients to book sessions with practitioners. Perfect for getting started on the platform.",
      badge: "Free Forever",
      features: [
        "Browse unlimited healthcare professional profiles",
        "Direct messaging with practitioners",
        "Easy booking system",
        "Session history tracking",
        "Review and rating system",
        "Email notifications",
        "Community access",
        "No hidden fees or charges",
        "Perfect for patients and wellness seekers"
      ],
      buttonText: "Start Free as Client",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      id: "practitioner",
      name: "Practitioner Plan", 
      monthlyPrice: 29,
      yearlyPrice: 26.10,
      description: "Monthly subscription for individual practitioners to offer services on the platform with booking management and client tools.",
      badge: "Most Popular",
      features: [
        "Basic scheduling tools",
        "Client profile management", 
        "Messaging system",
        "Basic analytics",
        "Email support",
        "Up to 50 clients"
      ],
      buttonText: "Start as Professional",
      buttonVariant: "hero" as const,
      popular: true
    },
    {
      id: "clinic",
      name: "Clinic Plan",
      monthlyPrice: 99,
      yearlyPrice: 89.10,
      description: "Comprehensive plan for clinics and wellness centers with multiple practitioners, advanced analytics, and team collaboration tools.",
      badge: "Best Value", 
      features: [
        "Advanced scheduling & calendar",
        "Comprehensive client management",
        "Advanced analytics & reporting",
        "Marketing tools & templates",
        "Priority support",
        "Up to 200 clients",
        "Custom branding"
      ],
      buttonText: "Start Clinic Plan",
      buttonVariant: "wellness" as const,
      popular: false
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    // Only allow practitioners to subscribe to practitioner plans
    if (planId !== 'client' && userProfile?.user_role === 'client') {
      alert('Subscription plans are only available for healthcare professionals. Clients can book sessions for free.');
      return;
    }

    // Only allow clients to access client features
    if (planId === 'client' && userProfile?.user_role !== 'client') {
      alert('This plan is for clients only. Healthcare professionals should use the practitioner plans.');
      return;
    }

    const billing = isYearly ? 'yearly' : 'monthly';
    await createCheckout(planId, billing);
  };

  // Filter plans based on user role
  const availablePlans = userProfile?.user_role === 'client' 
    ? plans.filter(plan => plan.id === 'client')
    : userProfile?.user_role && ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role)
    ? plans.filter(plan => plan.id !== 'client')
    : plans; // Show all plans for unauthenticated users

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your
            <span className="block text-primary">TheraMate Plan</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Choose the right plan for your role: <strong>Free access for clients seeking care</strong> or 
            <strong> professional plans for healthcare providers</strong>. Clear pricing for clear value.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
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

        {/* Pricing Cards */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">For Clients Seeking Care</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">For Healthcare Professionals</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {availablePlans.map((plan, index) => {
            const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const isCurrentPlan = subscribed && subscriptionTier === plan.id;
            
            return (
              <Card 
                key={index}
                className={`shadow-wellness hover:shadow-wellness-medium transition-wellness relative ${
                  plan.popular ? 'ring-2 ring-primary shadow-wellness-strong scale-105' : ''
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

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <Card className="text-center p-6 shadow-wellness">
            <div className="inline-flex items-center justify-center w-12 h-12 wellness-gradient rounded-lg mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-2">Free Forever for Clients</h4>
            <p className="text-sm text-muted-foreground">
              No hidden fees or charges. Browse, book, and connect with healthcare professionals completely free.
            </p>
          </Card>
          
          <Card className="text-center p-6 shadow-wellness">
            <div className="inline-flex items-center justify-center w-12 h-12 wellness-gradient rounded-lg mb-4">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-2">AI-Powered Features</h4>
            <p className="text-sm text-muted-foreground">
              Practitioner Pro includes advanced AI for SOAP notes, transcription, and practice management.
            </p>
          </Card>
          
          <Card className="text-center p-6 shadow-wellness">
            <div className="inline-flex items-center justify-center w-12 h-12 wellness-gradient rounded-lg mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-2">Credit Exchange System</h4>
            <p className="text-sm text-muted-foreground">
              Professionals earn credits by providing services and spend them on their own wellness needs.
            </p>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Questions about our marketplace? Our team is here to help.
          </p>
          <Button variant="outline" size="lg" asChild>
            <Link to="/contact">
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};