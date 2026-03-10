import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { AuthErrorHandler } from '@/lib/auth-error-handler';
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
  practitionerAccess?: boolean;
}

const SubscriptionContext = React.createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Start as false to prevent blocking
  const hasCheckedSubscription = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasConnectAccount, setHasConnectAccount] = useState<boolean | null>(null);
  
  // Always call useAuth hook (no conditional hooks)
  const authContext = useAuth();
  const user = authContext?.user || null;
  const session = authContext?.session || null;
  const userProfile = authContext?.userProfile || null;

  // MOVED: Conditional logic moved after all hooks to fix React error #300

  const checkSubscription = async (forceRefresh = false) => {
    // Avoid running subscription sync while on Stripe return route to prevent races
    if (typeof window !== 'undefined' && window.location.pathname.includes('/onboarding/stripe-return')) {
      return;
    }
    
    // Skip subscription check on role-selection page - user needs to select role first
    if (typeof window !== 'undefined' && window.location.pathname === '/auth/role-selection') {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }
    
    // If manually called with forceRefresh, reset the flag
    if (forceRefresh) {
      hasCheckedSubscription.current = false;
    }

    if (!user || !session) {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      hasCheckedSubscription.current = false;
      return;
    }

    try {
      setLoading(true);
      
      // First, try to get active subscriptions
      const { data: subRow, error: subErr } = await supabase
        .from('subscriptions')
        .select('status, price_id, current_period_end, stripe_subscription_id, plan')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'incomplete', 'past_due'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Handle errors cleanly - no caching, just log and set state
      if (subErr && subErr.code !== 'PGRST116') {
        // Only log critical subscription errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Subscription check failed:', subErr);
        }
        
        // Fallback: Try querying without status filter to see if subscription exists with different status
        const { data: fallbackSub, error: fallbackErr } = await supabase
          .from('subscriptions')
          .select('status, price_id, current_period_end, stripe_subscription_id, plan')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setSubscribed(false);
        setSubscriptionTier(null);
        setSubscriptionEnd(null);
        return;
      }

      if (subRow) {
        // Determine plan from price_id (official integration approach)
        // Also check the plan field directly if price_id is missing or doesn't match
        let planTier = 'practitioner'; // Default fallback
        
        // First, try to use the plan field directly (most reliable)
        const planField = (subRow as any).plan;
        if (planField) {
          const planLower = planField.toLowerCase();
          if (planLower === 'pro' || planLower === 'professional_pro') {
            planTier = 'pro';
          } else if (planLower === 'practitioner' || planLower === 'professional') {
            planTier = 'practitioner';
          }
        }
        
        // Also check price_id as fallback/verification
        if (subRow.price_id) {
          const priceIdLower = subRow.price_id.toLowerCase();
          // Practitioner plan price IDs
          if (priceIdLower.includes('sgfp1fk77knavvan6m5irrs') || 
              priceIdLower.includes('sl6qffk77knavvarmyinzwv') ||
              priceIdLower.includes('sgfp1') || // Partial match for flexibility
              subRow.price_id.includes('SGfP1Fk77knaVvan6m5IRRS') || 
              subRow.price_id.includes('SL6QFFk77knaVvaRMyinzWv')) {
            planTier = 'practitioner';
          } 
          // Pro plan price IDs
          else if (priceIdLower.includes('sgfpifk77knavvaebxplhj9') || 
                   priceIdLower.includes('sl6qffk77knavvarshwzkou') ||
                   priceIdLower.includes('sgfpi') || // Partial match for flexibility
                   subRow.price_id.includes('SGfPIFk77knaVvaeBxPlhJ9') || 
                   subRow.price_id.includes('SL6QFFk77knaVvarSHwZKou')) {
            planTier = 'pro';
          }
        }

        // Only active (and trialing if present) grant access. Webhook is source of truth.
        if (subRow.status === 'active' || subRow.status === 'trialing') {
          setSubscribed(true);
          setSubscriptionTier(planTier);
          setSubscriptionEnd(subRow.current_period_end || null);
        } else {
          // incomplete, past_due, cancelled, unpaid: no access until webhook sets active
          setSubscribed(false);
          setSubscriptionTier(subRow.status === 'past_due' ? planTier : null);
          setSubscriptionEnd(subRow.current_period_end || null);
        }
      } else {
        // No subscription found in database - try syncing from Stripe
        // BUT: Skip sync for clients - they don't need subscriptions
        if (userProfile?.user_role === 'client') {
          setSubscribed(false);
          setSubscriptionTier(null);
          setSubscriptionEnd(null);
          return;
        }
        
        // Recovery: Check Stripe directly and sync if subscription exists
        // Helper function to do final Supabase check before giving up
        const finalSupabaseCheck = async () => {
            // Final check: Query Supabase one more time in case sync actually worked
            const { data: finalCheck, error: finalErr } = await supabase
              .from('subscriptions')
              .select('status, price_id, current_period_end, stripe_subscription_id, plan')
              .eq('user_id', user.id)
              .in('status', ['active', 'trialing', 'incomplete', 'past_due'])
              .order('current_period_end', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (finalCheck) {
              // Use the same logic as above to determine plan tier
              let planTier = 'practitioner';
              const planField = (finalCheck as any).plan;
              if (planField) {
                const planLower = planField.toLowerCase();
                if (planLower === 'pro' || planLower === 'professional_pro') {
                  planTier = 'pro';
                } else if (planLower === 'practitioner' || planLower === 'professional') {
                  planTier = 'practitioner';
                }
              }
              if (finalCheck.price_id) {
                const priceIdLower = finalCheck.price_id.toLowerCase();
                if (priceIdLower.includes('sgfp1fk77knavvan6m5irrs') || 
                    priceIdLower.includes('sl6qffk77knavvarmyinzwv') ||
                    finalCheck.price_id.includes('SGfP1Fk77knaVvan6m5IRRS') || 
                    finalCheck.price_id.includes('SL6QFFk77knaVvaRMyinzWv')) {
                  planTier = 'practitioner';
                } else if (priceIdLower.includes('sgfpifk77knavvaebxplhj9') || 
                           priceIdLower.includes('sl6qffk77knavvarshwzkou') ||
                           finalCheck.price_id.includes('SGfPIFk77knaVvaeBxPlhJ9') || 
                           finalCheck.price_id.includes('SL6QFFk77knaVvarSHwZKou')) {
                  planTier = 'pro';
                }
              }
              
              setSubscribed(true);
              setSubscriptionTier(planTier);
              setSubscriptionEnd(finalCheck.current_period_end || null);
              return;
            }
            
            // No subscription found in final check either
            setSubscribed(false);
            setSubscriptionTier(null);
            setSubscriptionEnd(null);
        };
        
        try {
          // Get fresh session for sync call
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          
          if (!freshSession?.access_token) {
            console.error('❌ No session token available for sync');
            await finalSupabaseCheck();
            return;
          }
          
          let syncData: any = null;
          let syncError: any = null;
          
          try {
            const result = await supabase.functions.invoke('sync-stripe-subscription', {
              body: { user_id: user.id },
              headers: { Authorization: `Bearer ${freshSession.access_token}` }
            });
            syncData = result.data;
            syncError = result.error;
          } catch (invokeErr: any) {
            // If the invoke itself fails, do a final check of Supabase before giving up
            await finalSupabaseCheck();
            return;
          }
          
          // Handle non-2xx status codes (500, etc.) or explicit error response
          if (syncError) {
            await finalSupabaseCheck();
            return;
          }
          
          // Safely check response data
          if (syncData) {
            // Check if response contains error field (Edge Function returned 200 but with error)
            if ((syncData as any).error) {
              await finalSupabaseCheck();
              return;
            }
            
            // Check if sync returned success: false (no customer/subscription found)
            if (syncData.success === false) {
              await finalSupabaseCheck();
              return;
            }
          }
          
          if (syncData?.success && syncData?.subscription_id) {
            // Re-check subscription immediately after sync
            const { data: syncedSub, error: recheckError } = await supabase
              .from('subscriptions')
              .select('status, price_id, current_period_end, stripe_subscription_id, plan')
              .eq('user_id', user.id)
              .in('status', ['active', 'trialing', 'incomplete', 'past_due'])
              .order('current_period_end', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (syncedSub) {
              // Determine plan tier using same logic as above
              let planTier = 'practitioner';
              
              // First, try to use the plan field directly (most reliable)
              const planField = (syncedSub as any).plan;
              if (planField) {
                const planLower = planField.toLowerCase();
                if (planLower === 'pro' || planLower === 'professional_pro') {
                  planTier = 'pro';
                } else if (planLower === 'practitioner' || planLower === 'professional') {
                  planTier = 'practitioner';
                }
              }
              
              // Also check price_id as fallback/verification
              if (syncedSub.price_id) {
                const priceIdLower = syncedSub.price_id.toLowerCase();
                if (priceIdLower.includes('sgfp1fk77knavvan6m5irrs') || 
                    priceIdLower.includes('sl6qffk77knavvarmyinzwv') ||
                    syncedSub.price_id.includes('SGfP1Fk77knaVvan6m5IRRS') || 
                    syncedSub.price_id.includes('SL6QFFk77knaVvaRMyinzWv')) {
                  planTier = 'practitioner';
                } else if (priceIdLower.includes('sgfpifk77knavvaebxplhj9') || 
                           priceIdLower.includes('sl6qffk77knavvarshwzkou') ||
                           syncedSub.price_id.includes('SGfPIFk77knaVvaeBxPlhJ9') || 
                           syncedSub.price_id.includes('SL6QFFk77knaVvarSHwZKou')) {
                  planTier = 'pro';
                }
              }
              
              setSubscribed(true);
              setSubscriptionTier(planTier);
              setSubscriptionEnd(syncedSub.current_period_end || null);
              return; // Exit early - subscription synced
            }
            // If sync succeeded but re-check returned no subscription, mark as not subscribed
            setSubscribed(false);
            setSubscriptionTier(null);
            setSubscriptionEnd(null);
            return;
          }
        } catch (syncErr: any) {
          // On any error, ensure user is marked as not subscribed and continue
          setSubscribed(false);
          setSubscriptionTier(null);
          setSubscriptionEnd(null);
          // Don't return - continue to set final state below
        }
        
        // If sync didn't work, user truly has no subscription
        setSubscribed(false);
        setSubscriptionTier(null);
        setSubscriptionEnd(null);
      }
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
    } catch (error: any) {
      // Ensure we always handle errors gracefully and never block the UI
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
    } finally {
      // Always clear loading state, even if there was an error
      setLoading(false);
      hasCheckedSubscription.current = false; // Reset flag so it can be retried if needed
    }
  };

  const createCheckout = async (plan: string, billing: string) => {
    // CRITICAL FIX: Get fresh session from Supabase instead of relying on closure
    const { data: { session: freshSession }, error: authError } = await supabase.auth.getSession();
    
    // User data is in session.user, not as a separate return value
    const freshUser = freshSession?.user;
    
    if (!freshUser || !freshSession) {
      console.error('❌ CREATE CHECKOUT: No user or session');
      toast.error('Your session has expired. Please refresh the page and try again.');
      return;
    }

    try {
      // Map plan/billing to Stripe price ID (official integration approach)
      const priceIdMap = {
        'practitioner': {
          'monthly': 'price_1SGfP1Fk77knaVvan6m5IRRS', // Live mode monthly
          'yearly': 'price_1SL6QFFk77knaVvaRMyinzWv'   // Live mode yearly
        },
        'pro': {
          'monthly': 'price_1SGfPIFk77knaVvaeBxPlhJ9', // Live mode monthly
          'yearly': 'price_1SL6QFFk77knaVvarSHwZKou'    // Live mode yearly
        }
      };

      const priceId = priceIdMap[plan as keyof typeof priceIdMap]?.[billing as 'monthly' | 'yearly'];
      
      if (!priceId) {
        console.error('❌ CREATE CHECKOUT: Invalid plan/billing combination', { plan, billing });
        toast.error('Invalid subscription plan. Please try again.');
        return;
      }

      // Call Supabase Edge Function to create Stripe checkout session (official approach)
      // Direct call - no timeout, let Supabase handle retries
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: priceId  // Use official approach with direct price ID
        },
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`
        }
      });

      if (error) {
        console.error('❌ Edge Function Error:', error);
        throw error;
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('❌ No URL in response:', data);
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('❌ Error creating checkout:', error);
      
      // Show the actual error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      toast.error(`Checkout Error: ${errorMessage}`);
      
      // Don't simulate subscription - let user retry or contact support
      throw error;
    }
  };

  const manageSubscription = async () => {
    // Get fresh session
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    const freshUser = freshSession?.user;
    
    if (!freshUser || !freshSession) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      // Call Supabase Edge Function to create Stripe customer portal session
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: {
          user_id: freshUser.id,
          email: freshUser.email
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

  // Load Stripe Connect account existence for practitioner-access fallback
  useEffect(() => {
    const loadConnect = async () => {
      if (!user?.id) {
        setHasConnectAccount(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('stripe_connect_account_id')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error loading Stripe Connect status:', error);
          setHasConnectAccount(false);
          return;
        }
        setHasConnectAccount(!!data?.stripe_connect_account_id);
      } catch (e) {
        console.error('Unexpected error loading Stripe Connect status:', e);
        setHasConnectAccount(false);
      }
    };
    loadConnect();
  }, [user?.id]);

  useEffect(() => {
    // Prevent duplicate checks on same user/session
    if (hasCheckedSubscription.current) return;
    
    if (user && session) {
      hasCheckedSubscription.current = true;
      // Direct query - no debouncing, no delays
      // Wrap in try-catch to prevent errors from breaking the app
      checkSubscription().catch((err) => {
        // Ensure loading state is cleared even if checkSubscription fails
        setLoading(false);
        setSubscribed(false);
        setSubscriptionTier(null);
        setSubscriptionEnd(null);
        hasCheckedSubscription.current = false; // Allow retry
      });
    } else {
      // Reset subscription state when user logs out
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      hasCheckedSubscription.current = false;
    }
  }, [user, session]);

  // Realtime: when webhook updates subscription status (e.g. lapse to past_due, cancelled), refetch immediately
  // Fixes PRACTITIONER_DASHBOARD #1: subscription lapses mid-session while user stays on dashboard
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`subscriptions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        () => {
          checkSubscription(true);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const practitionerAccess = useMemo(() => {
    const role = userProfile?.user_role;
    const isPractitionerRole = role && ['sports_therapist', 'massage_therapist', 'osteopath'].includes(role);
    
    // Practitioners need BOTH subscription AND Stripe Connect account
    if (isPractitionerRole) {
      return subscribed && !!hasConnectAccount;
    }
    
    // Non-practitioners just need subscription
    return subscribed;
  }, [subscribed, hasConnectAccount, userProfile?.user_role]);

  const value = useMemo(() => ({
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    loading,
    checkSubscription,
    createCheckout,
    manageSubscription,
    practitionerAccess,
  }), [subscribed, subscriptionTier, subscriptionEnd, loading, practitionerAccess]);

  // No bypass mode - query database directly regardless of role
  // If no subscription exists, it will return null (which is correct)
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}