import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, CreditCard, Shield, Users, BarChart3, Headphones } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PRACTITIONER_PLANS } from '@/config/pricing';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number; // Add yearly price
  originalPrice?: number;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
  marketplaceFee: string;
  monthlyStripePriceId: string; // Rename for clarity
  yearlyStripePriceId: string; // Add yearly price ID
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'practitioner',
    name: 'Starter',
    price: 30,
    yearlyPrice: 26.10, // 13% discount
    description: 'Complete platform access for licensed healthcare professionals',
    features: [
      'Professional profile listing',
      'Booking calendar',
      'Client management system',
      'Secure messaging platform',
      'Credit-based exchange system'
    ],
    icon: <Shield className="h-6 w-6" />,
    marketplaceFee: '0.5%',
    monthlyStripePriceId: PRACTITIONER_PLANS.practitioner.monthly,
    yearlyStripePriceId: PRACTITIONER_PLANS.practitioner.yearly || PRACTITIONER_PLANS.practitioner.monthly
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 50,
    yearlyPrice: 43.50, // 13% discount
    description: 'Enhanced features for growing practices',
    features: [
      'Everything in Starter plan',
      'Advanced analytics & insights',
      'AI notes taker',
      'Voice recorder for notes'
    ],
    popular: true,
    icon: <Star className="h-6 w-6" />,
    marketplaceFee: '0.5%',
    monthlyStripePriceId: PRACTITIONER_PLANS.pro.monthly,
    yearlyStripePriceId: PRACTITIONER_PLANS.pro.yearly || PRACTITIONER_PLANS.pro.monthly
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
  const { user, session } = useAuth();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      setSelectedPlan(plan.id);
      
      // Debug: Check authentication state
      console.log('🔵 SUBSCRIPTION SELECTION: Payment button clicked');
      console.log('Plan:', plan.id);
      console.log('Billing:', billingCycle);
      console.log('User from useAuth:', user ? 'EXISTS' : 'NULL');
      console.log('Session from useAuth:', session ? 'EXISTS' : 'NULL');
      
      // Critical: Check if user is authenticated before payment
      if (!user || !session) {
        console.error('❌ SUBSCRIPTION SELECTION: No user or session!');
        toast.error('Your session has expired. Please refresh the page and try again.');
        setSelectedPlan(null);
        return;
      }
      
      console.log('✅ User and session verified in component');
      
      // CRITICAL: Check if user already has active subscription (SECURITY FIX)
      console.log('🔍 Checking for existing subscriptions...');
      const { data: existingSubscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();
      
      if (subError && subError.code !== 'PGRST116') {
        console.error('❌ Error checking subscription:', subError);
        toast.error('Could not verify subscription status. Please try again.');
        setSelectedPlan(null);
        return;
      }
      
      if (existingSubscription) {
        console.warn('⚠️ User already has active subscription:', existingSubscription);
        toast.error(`You already have an active ${existingSubscription.plan} subscription. Please manage your existing subscription instead.`);
        setSelectedPlan(null);
        return;
      }
      
      console.log('✅ No existing subscription found, proceeding with checkout');
      
      // Show loading toast
      toast.info('Redirecting to secure payment...', {
        duration: 3000
      });
      
      // Create Stripe checkout session and redirect
      // This will redirect the user to Stripe Checkout
      // After payment, user will be redirected back to verify subscription
      console.log('🔵 Calling createCheckout...');
      await createCheckout(plan.id, billingCycle);
      console.log('✅ createCheckout completed (or redirect happened)');
      
      // NOTE: Do NOT call onSubscriptionSelected here
      // It will be called after successful payment verification
      // when user returns from Stripe Checkout
      
    } catch (error) {
      console.error('Error creating subscription:', error);
      
      // Show specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Payment Error: ${errorMessage}. Please try again or contact support.`, {
        duration: 5000
      });
      
    } finally {
      // Always reset loading state, whether success or error
      setSelectedPlan(null);
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      return plan.yearlyPrice; // Use the yearly price from the plan
    }
    return plan.price;
  };

  const getBillingText = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      return `£${getPrice(plan)}/month (billed yearly) - Save 13%`;
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
          </Button>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {subscriptionPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative cursor-pointer transition-[border-color,background-color] duration-200 ease-out ${
              plan.popular 
                ? 'ring-2 ring-primary shadow-lg scale-105' 
                : ''
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
                {selectedPlan === plan.id ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Redirecting to Payment...
                  </div>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Continue to Payment
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
      </div>
    </div>
  );
};
