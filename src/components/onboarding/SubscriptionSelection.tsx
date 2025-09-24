import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, CreditCard, Shield, Users, BarChart3, Headphones } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
  marketplaceFee: string;
  stripePriceId: string;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'practitioner',
    name: 'Professional Plan',
    price: 79.99,
    description: 'Advanced tools for established practitioners - 3% marketplace fee',
    features: [
      'Professional profile listing',
      'Advanced booking calendar',
      'Client management system',
      'Credit-based exchange system',
      'Marketing tools & analytics',
      'Priority search placement',
      'Video consultation support',
      'Professional verification badge',
      'Custom availability settings',
      'Secure messaging platform'
    ],
    icon: <Shield className="h-6 w-6" />,
    marketplaceFee: '3%',
    stripePriceId: 'price_1S7eAKFk77knaVvaWcHSypjx' // Professional Practitioner Plan
  },
  {
    id: 'clinic',
    name: 'Premium Plan',
    price: 199.99,
    description: 'Complete suite for top practitioners - 1% marketplace fee',
    features: [
      'Everything in Professional Plan',
      'AI-powered SOAP notes recording',
      'Voice-to-text transcription',
      'Automated session documentation',
      'Smart appointment scheduling',
      'Advanced analytics & insights',
      'Client progress tracking',
      'Custom treatment plans',
      'Priority customer support',
      'Advanced reporting tools'
    ],
    popular: true,
    icon: <Star className="h-6 w-6" />,
    marketplaceFee: '1%',
    stripePriceId: 'price_1S7eANFk77knaVva8L3m7l2Y' // Premium Practitioner Plan
  }
];

interface SubscriptionSelectionProps {
  onSubscriptionSelected: (planId: string) => void;
  onBack: () => void;
  loading?: boolean;
}

export const SubscriptionSelection: React.FC<SubscriptionSelectionProps> = ({
  onSubscriptionSelected,
  onBack,
  loading = false
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { createCheckout } = useSubscription();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      setSelectedPlan(plan.id);
      
      // Get the correct price ID based on billing cycle
      let priceId = plan.stripePriceId;
      if (billingCycle === 'yearly') {
        if (plan.id === 'practitioner') {
          priceId = 'price_1S7eAKFk77knaVvaWcHSypjx'; // Use monthly price for yearly billing
        } else if (plan.id === 'clinic') {
          priceId = 'price_1S7eANFk77knaVva8L3m7l2Y'; // Use monthly price for yearly billing
        }
      }
      
      // Create Stripe checkout session
      await createCheckout(plan.id, billingCycle);
      
      // Only call the callback if checkout was successful (user will be redirected to Stripe)
      // onSubscriptionSelected(plan.id); // This should only be called after successful payment
      
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to start subscription process');
      setSelectedPlan(null);
      // Don't call onSubscriptionSelected on error
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      // Calculate yearly price based on plan (matching Edge Function)
      if (plan.id === 'practitioner') {
        return 71.99; // £71.99/month when billed yearly
      } else if (plan.id === 'clinic') {
        return 179.99; // £179.99/month when billed yearly
      }
    }
    return plan.price;
  };

  const getBillingText = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      return `£${getPrice(plan)}/month (billed yearly)`;
    }
    return `£${getPrice(plan)}/month`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Practice Plan</h2>
        <p className="text-muted-foreground">
          Select the plan that best fits your practice needs. You can upgrade or downgrade at any time.
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="bg-muted p-1 rounded-lg">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs">
              Save 20%
            </Badge>
          </Button>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative cursor-pointer transition-all duration-200 ${
              plan.popular 
                ? 'ring-2 ring-primary shadow-lg scale-105' 
                : 'hover:shadow-md'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  {plan.icon}
                </div>
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription className="text-sm">
                {plan.description}
              </CardDescription>
              <div className="mt-4">
                <div className="text-3xl font-bold">£{getPrice(plan)}</div>
                <div className="text-sm text-muted-foreground">
                  {getBillingText(plan)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Marketplace fee: {plan.marketplaceFee}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => handleSubscribe(plan)}
                disabled={loading || selectedPlan === plan.id}
              >
                {loading && selectedPlan === plan.id ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Subscribe Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Information */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Secure Payment & Billing</p>
            <p className="text-muted-foreground">
              All payments are processed securely through Stripe. You can cancel or change your plan at any time. 
              No setup fees or hidden charges.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <div className="flex-1 text-center text-sm text-muted-foreground flex items-center justify-center">
          <Users className="h-4 w-4 mr-2" />
          Join 500+ practitioners already on TheraMate
        </div>
      </div>
    </div>
  );
};
