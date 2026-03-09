import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  stripePriceId: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'practitioner',
    name: 'Starter',
    price: 30,
    description: 'Perfect for individual practitioners',
    features: [
      'Professional profile listing',
      'Booking calendar',
      'Client management system',
      'Secure messaging platform',
      'Credit-based exchange system'
    ],
    stripePriceId: 'price_1SGOrXFk77knaVvaCbVM0FZN' // £30/month recurring
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 50,
    description: 'Enhanced features for growing practices',
    features: [
      'Everything in Starter plan',
      'Advanced analytics & insights',
      'AI notes taker',
      'Voice recorder for notes'
    ],
    stripePriceId: 'price_1SGOrgFk77knaVvatu5ksh5y' // £50/month recurring
  }
];

interface OfficialSubscriptionSelectionProps {
  onCheckoutInitiated?: () => void;
}

export const OfficialSubscriptionSelection: React.FC<OfficialSubscriptionSelectionProps> = ({ onCheckoutInitiated }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingPlan) => {
    try {
      setLoading(plan.id);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);
      
      if (!session) {
        toast.error('Please sign in to continue');
        setLoading(null);
        return;
      }

      console.log('Creating checkout with price ID:', plan.stripePriceId);
      
      // Get fresh session for authorization
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        toast.error('Your session has expired. Please refresh the page.');
        setLoading(null);
        return;
      }
      
      // Call the official Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: plan.stripePriceId
        },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`
        }
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Checkout error details:', error);
        toast.error(`Failed: ${error.message || 'Unknown error'}`);
        return;
      }

      if (!data) {
        console.error('No data returned from create-checkout');
        toast.error('No checkout URL received');
        return;
      }

      if (!data.url) {
        console.error('No URL in response:', data);
        toast.error('Checkout session created but no URL');
        return;
      }

      console.log('Redirecting to checkout:', data.url);
      
      // Call onComplete callback to trigger step progression
      if (onCheckoutInitiated) {
        onCheckoutInitiated();
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Select the plan that best fits your practice needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {pricingPlans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="text-3xl font-bold">
                £{plan.price}
                <span className="text-lg font-normal text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={loading === plan.id}
                className="w-full"
                size="lg"
              >
                {loading === plan.id ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

