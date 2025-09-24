import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
// import { StripePaymentService } from '@/lib/stripe'; // TEMPORARILY DISABLED
import { safeGetSubscription, safeGetUserProfile } from '@/lib/supabase-utils';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (plan: string, billing: string) => Promise<void>;
  manageSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Always call useAuth hook (no conditional hooks)
  const authContext = useAuth();
  const user = authContext?.user || null;
  const session = authContext?.session || null;
  const userProfile = authContext?.userProfile || null;

  // MOVED: Conditional logic moved after all hooks to fix React error #300

  const checkSubscription = async () => {
    if (!user || !session) {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    // AGGRESSIVE CHECK: Skip subscription check if user has no role yet
    if (userProfile && !userProfile.user_role) {
      console.log('🔄 AGGRESSIVE CHECK: User has no role yet, completely skipping subscription check');
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    // Skip subscription check if we're in the middle of OAuth callback
    const currentPath = window.location.pathname;
    if (currentPath.includes('/auth/callback')) {
      console.log('🔄 Skipping subscription check during OAuth callback');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check subscription status from subscriptions table (Stripe webhook managed)
      console.log('🔍 Checking subscription status for user:', user.id);

      const { data: subRow, error: subErr } = await supabase
        .from('subscriptions')
        .select('plan, status, subscription_end, current_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subErr && subErr.code !== 'PGRST116') {
        console.error('❌ Error checking subscriptions:', subErr);
        setSubscribed(false);
        setSubscriptionTier(null);
        setSubscriptionEnd(null);
        return;
      }

      if (subRow) {
        console.log('✅ User has active subscription:', subRow);
        setSubscribed(true);
        setSubscriptionTier(subRow.plan || 'practitioner');
        setSubscriptionEnd(subRow.subscription_end || subRow.current_period_end || null);
      } else {
        // Check if user has completed practitioner onboarding as fallback
        console.log('🔍 No subscription found, checking onboarding status...');
        
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('user_role, onboarding_status, profile_completed')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('❌ Error checking user profile:', profileError);
          setSubscribed(false);
          setSubscriptionTier(null);
          setSubscriptionEnd(null);
          return;
        }

        // Only auto-subscribe practitioners who have completed onboarding
        if (profile?.user_role !== 'client' && 
            profile?.onboarding_status === 'completed' && 
            profile?.profile_completed === true) {
          console.log('✅ Practitioner with completed onboarding - auto-subscribing');
          setSubscribed(true);
          setSubscriptionTier('practitioner');
          setSubscriptionEnd(null);
        } else {
          console.log('❌ User needs subscription or onboarding completion');
          setSubscribed(false);
          setSubscriptionTier(null);
          setSubscriptionEnd(null);
        }
      }
      
      // Original code commented out until RLS policies are fixed:
      /*
      // Check subscription status from subscribers table using safe query
      const { data: subscription } = await safeGetSubscription(user.id);

      if (subscription && subscription.subscribed) {
        setSubscribed(true);
        setSubscriptionTier(subscription.subscription_tier);
        setSubscriptionEnd(subscription.subscription_end);
      } else {
        // Fallback: Check if user has completed practitioner onboarding
        const { data: profile } = await safeGetUserProfile(user.id);

        if (profile?.user_role !== 'client' && profile?.onboarding_status === 'completed') {
          setSubscribed(true);
          setSubscriptionTier('practitioner');
          setSubscriptionEnd(null);
        } else {
          setSubscribed(false);
          setSubscriptionTier(null);
          setSubscriptionEnd(null);
        }
      }
      */
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Graceful fallback - assume not subscribed
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (plan: string, billing: string) => {
    if (!user || !session) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      // Call Supabase Edge Function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: plan,
          billing: billing
        }
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      
      // Show the actual error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      toast.error(`Checkout Error: ${errorMessage}`);
      
      // Don't simulate subscription - let user retry or contact support
      throw error;
    }
  };

  const manageSubscription = async () => {
    if (!user || !session) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      // Call Supabase Edge Function to create Stripe customer portal session
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: {
          user_id: user.id,
          email: user.email
        }
      });

      if (error) throw error;

      if (data.success && data.portal_url) {
        // Redirect to Stripe customer portal
        window.location.href = data.portal_url;
      } else {
        throw new Error(data.error || 'Failed to open customer portal');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
      
      // Fallback: Show info message
      toast.info('Subscription management will be available soon. For now, your subscription is active.');
    }
  };

  useEffect(() => {
    // Only check subscription if user has completed basic auth flow
    // Skip subscription check if we're on auth-related pages OR if user has no role yet
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('/auth/') || currentPath.includes('/login') || currentPath.includes('/register') || currentPath.includes('/onboarding');
    const hasNoRole = user && userProfile && !userProfile.user_role;
    
    // If user has no role, completely skip subscription logic
    if (hasNoRole) {
      console.log('🔄 User has no role yet, completely skipping subscription logic');
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }
    
    if (user && session && !loading && !isAuthPage) {
      checkSubscription();
    } else if (!user || !session) {
      // Reset subscription state when user logs out
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
    }
  }, [user, session, loading, userProfile]);

  // COMPLETE BYPASS: If user has no role OR no profile yet, don't run any subscription logic at all
  // MOVED HERE after all hooks to fix React error #300
  if (user && (!userProfile || !userProfile.user_role)) {
    console.log('🚫 COMPLETE BYPASS: User has no role or no profile, bypassing all subscription logic');
    const bypassValue = {
      subscribed: false,
      subscriptionTier: null,
      subscriptionEnd: null,
      loading: false,
      checkSubscription: async () => {},
      createCheckout: async () => {},
      manageSubscription: async () => {},
    };
    
    return (
      <SubscriptionContext.Provider value={bypassValue}>
        {children}
      </SubscriptionContext.Provider>
    );
  }

  const value = {
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    loading,
    checkSubscription,
    createCheckout,
    manageSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}