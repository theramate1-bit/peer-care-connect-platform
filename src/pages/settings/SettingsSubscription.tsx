import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  ExternalLink, 
  Check, 
  X,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  monthly_credits: number;
  last_credit_allocation: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
  created_at: string;
}

const PLAN_DETAILS = {
  practitioner: {
    name: 'Starter',
    price: '£30',
    credits: 60,
    features: [
      'Professional profile listing',
      'Booking calendar',
      'Client management system',
      'Secure messaging platform',
      'Credit-based exchange system'
    ]
  },
  pro: {
    name: 'Pro',
    price: '£50',
    credits: 120,
    features: [
      'Everything in Starter plan',
      'Advanced analytics & insights',
      'AI notes taker',
      'Voice recorder for notes'
    ]
  }
};

export const SettingsSubscription: React.FC = () => {
  const { userProfile, user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const subscriptionChannelRef = useRef<any>(null);

  // Fetch subscription details
  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchSubscription = async () => {
      try {
        console.log('🔍 Fetching subscription for user:', userProfile.id);
        
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userProfile.id)
          .in('status', ['active', 'trialing', 'incomplete', 'past_due'])
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('🔍 Subscription query result:', { data, error });
        
        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error fetching subscription:', error);
        } else if (data) {
          console.log('✅ Found subscription:', data);
          
          // Derive plan from price_id if not present
          let enrichedData = { ...data } as any;
          
          if (!enrichedData.plan && data.price_id) {
            // Map price_id to plan (same logic as SubscriptionContext)
            if (data.price_id.includes('SGfP1Fk77knaVvan6m5IRRS') || 
                data.price_id.includes('SL6QFFk77knaVvaRMyinzWv')) {
              enrichedData.plan = 'practitioner';
            } else if (data.price_id.includes('SGfPIFk77knaVvaeBxPlhJ9') || 
                       data.price_id.includes('SL6QFFk77knaVvarSHwZKou')) {
              enrichedData.plan = 'pro';
            }
          }
          
          // Derive billing_cycle from price_id if not present
          if (!enrichedData.billing_cycle && data.price_id) {
            if (data.price_id.includes('SL6QF')) {
              enrichedData.billing_cycle = 'yearly';
            } else {
              enrichedData.billing_cycle = 'monthly';
            }
          }
          
          // Derive monthly_credits from plan if not present
          if (!enrichedData.monthly_credits && enrichedData.plan) {
            enrichedData.monthly_credits = enrichedData.plan === 'pro' ? 120 : 60;
          }
          
          console.log('✅ Enriched subscription data:', enrichedData);
          setSubscription(enrichedData);
        } else {
          console.log('⚠️ No subscription found for user:', userProfile.id);
        }
      } catch (error) {
        console.error('❌ Exception loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [userProfile?.id]);

  // Subscribe to Supabase Realtime for subscription updates (webhook-driven)
  useEffect(() => {
    if (!userProfile?.id) return;

    // Set up Realtime subscription to listen for subscription changes
    const channel = supabase
      .channel(`subscription-updates-${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userProfile.id}`
        },
        (payload) => {
          console.log('🔄 Subscription updated via webhook:', payload.new);
          // Re-fetch subscription to get enriched data
          const fetchUpdatedSubscription = async () => {
            const { data, error } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userProfile.id)
              .in('status', ['active', 'trialing', 'incomplete', 'past_due'])
              .order('current_period_end', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (data && !error) {
              // Enrich the subscription data (same logic as fetchSubscription)
              let enrichedData = { ...data } as any;
              
              if (!enrichedData.plan && data.price_id) {
                if (data.price_id.includes('SGfP1Fk77knaVvan6m5IRRS') || 
                    data.price_id.includes('SL6QFFk77knaVvaRMyinzWv')) {
                  enrichedData.plan = 'practitioner';
                } else if (data.price_id.includes('SGfPIFk77knaVvaeBxPlhJ9') || 
                           data.price_id.includes('SL6QFFk77knaVvarSHwZKou')) {
                  enrichedData.plan = 'pro';
                }
              }
              
              if (!enrichedData.billing_cycle && data.price_id) {
                if (data.price_id.includes('SL6QF')) {
                  enrichedData.billing_cycle = 'yearly';
                } else {
                  enrichedData.billing_cycle = 'monthly';
                }
              }
              
              if (!enrichedData.monthly_credits && enrichedData.plan) {
                enrichedData.monthly_credits = enrichedData.plan === 'pro' ? 120 : 60;
              }

              setSubscription(enrichedData);
            }
          };
          fetchUpdatedSubscription();
        }
      )
      .subscribe();

    subscriptionChannelRef.current = channel;

    return () => {
      if (subscriptionChannelRef.current) {
        supabase.removeChannel(subscriptionChannelRef.current);
        subscriptionChannelRef.current = null;
      }
    };
  }, [userProfile?.id]);

  // Note: Billing period updates are handled automatically by Stripe webhooks
  // which update the database, and Supabase Realtime notifies the client.
  // Manual refresh button is available for edge cases only.

  // Handle customer portal redirect
  const handleManageSubscription = async () => {
    try {
      setRedirecting(true);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        toast.error('Authentication error. Please sign in again.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) {
        console.error('Customer portal error:', error);
        toast.error('Failed to open customer portal. Please try again.');
        return;
      }

      if (data?.url) {
        // Open Stripe Customer Portal in new tab
        window.open(data.url, '_blank');
        toast.success('Opening Stripe Customer Portal...');
      } else {
        toast.error('Unable to access customer portal. Please contact support.');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open customer portal');
    } finally {
      setRedirecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'trialing':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'past_due':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'canceled':
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is a practitioner
  const isPractitioner = ['osteopath', 'sports_therapist', 'massage_therapist'].includes(userProfile?.user_role || '');

  if (!isPractitioner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing
          </p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Client Account</AlertTitle>
          <AlertDescription>
            Subscriptions are for practitioners only. As a client, you pay per session when booking treatments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing
          </p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Subscription</AlertTitle>
          <AlertDescription>
            You don't have an active subscription. Visit the <a href="/pricing" className="text-primary underline">pricing page</a> to subscribe.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const planDetails = subscription.plan 
    ? PLAN_DETAILS[subscription.plan as keyof typeof PLAN_DETAILS]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription, billing, and payment methods
        </p>
      </div>

      {/* Current Plan */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {planDetails?.name || subscription.plan || 'Subscription Plan'}
              </CardTitle>
              <CardDescription className="mt-2">
                Your current subscription plan
              </CardDescription>
            </div>
            <Badge className={`${getStatusColor(subscription.status)} border`}>
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{planDetails?.price || 'N/A'}</span>
            <span className="text-muted-foreground">per month</span>
          </div>

          <Separator />

          {/* Plan Features */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Plan Features
            </h4>
            <ul className="space-y-2">
              {planDetails?.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Monthly Credits */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold">Monthly Credit Allocation</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.monthly_credits || 0} credits per month
                </p>
              </div>
            </div>
          </div>

          {/* Manage Subscription Button */}
          <Button 
            onClick={handleManageSubscription} 
            disabled={redirecting}
            className="w-full"
            size="lg"
          >
            {redirecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening Portal...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Subscription & Billing
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Billing Details */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Billing Details
            </CardTitle>
            <CardDescription>
              Your current billing period and payment information
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="font-semibold capitalize">{subscription.billing_cycle || 'monthly'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Period Start</p>
              <p className="font-semibold">
                {format(new Date(subscription.current_period_start), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Period End</p>
              <p className="font-semibold">
                {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-semibold">
                {format(new Date(subscription.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            {subscription.last_credit_allocation && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Last Credit Allocation</p>
                <p className="font-semibold">
                  {format(new Date(subscription.last_credit_allocation), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          {subscription.cancel_at_period_end && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription Cancelling</AlertTitle>
              <AlertDescription>
                Your subscription will be cancelled at the end of the current billing period on{' '}
                {format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default SettingsSubscription;

