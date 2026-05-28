import React, { useEffect, useState, useCallback, useRef } from 'react';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Single Connect instance per page so effect re-runs (e.g. callback deps) don't call loadConnectAndInitialize twice
let cachedConnectInstancePromise: Promise<StripeConnectInstance> | null = null;

interface EmbeddedStripeOnboardingProps {
  stripeAccountId: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export const EmbeddedStripeOnboarding: React.FC<EmbeddedStripeOnboardingProps> = ({
  stripeAccountId,
  onComplete,
  onError,
}) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const isCheckingRef = useRef(false);
  const pollAttemptRef = useRef(0);
  const completionCheckRef = useRef<() => Promise<void>>(async () => {});

  const clearPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const getPollDelay = useCallback((attempt: number) => {
    if (attempt < 4) return 900; // quick while user is actively onboarding
    if (attempt < 12) return 2000;
    return 4500; // backoff for long-running Stripe checks
  }, []);

  // Fetch client secret from backend
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create-account-session',
          stripe_account_id: stripeAccountId,
          components: {
            account_onboarding: { 
              enabled: true,
              features: {
                external_account_collection: true, // Enable inline bank account collection
                disable_stripe_user_authentication: true, // Skip authentication step (requires requirement_collection: 'application')
              },
            },
            payouts: {
              enabled: true,
              features: {
                // CRITICAL: disable_stripe_user_authentication must match account_onboarding
                disable_stripe_user_authentication: true, // Must be same value as account_onboarding
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      console.error('[EmbeddedStripeOnboarding] Account session creation failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      const errorMessage = errorData.details || errorData.error || 'Failed to create account session';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.client_secret;
  }, [stripeAccountId]);

  // Refresh account status from Stripe (forces sync)
  const refreshAccountStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('[EmbeddedStripeOnboarding] No session for status refresh');
        return;
      }

      // Get user ID from session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        console.error('[EmbeddedStripeOnboarding] No user ID for status refresh');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'get-connect-account-status',
            userId: user.id,
            account_id: stripeAccountId, // Backend expects account_id, not stripe_account_id
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Log full status with all fields expanded
        console.log('[EmbeddedStripeOnboarding] Status refreshed from Stripe:', {
          connect_account_id: data.connect_account_id,
          stripe_account_id: data.stripe_account_id,
          status: data.status,
          chargesEnabled: data.chargesEnabled,
          payoutsEnabled: data.payoutsEnabled,
          detailsSubmitted: data.detailsSubmitted,
          isFullyOnboarded: data.isFullyOnboarded,
          requirementsCurrentlyDue: data.requirementsCurrentlyDue,
          fullData: data, // Keep full object for debugging
        });
        return data;
      } else {
        console.error('[EmbeddedStripeOnboarding] Failed to refresh status:', response.status);
      }
    } catch (err) {
      console.error('[EmbeddedStripeOnboarding] Error refreshing status:', err);
    }
    return null;
  }, [stripeAccountId]);

  const scheduleNextPoll = useCallback((forceDelay?: number) => {
    if (!mountedRef.current || isComplete) return;
    clearPolling();
    const delay = forceDelay ?? getPollDelay(pollAttemptRef.current);
    pollingTimeoutRef.current = setTimeout(() => {
      void completionCheckRef.current();
    }, delay);
  }, [clearPolling, getPollDelay, isComplete]);

  // Check completion status directly from Stripe API (source of truth)
  const checkCompletionStatus = useCallback(async () => {
    if (isCheckingRef.current || !mountedRef.current || isComplete) return;
    isCheckingRef.current = true;
    pollAttemptRef.current += 1;
    try {
      // Check Stripe directly - this is the source of truth, not the database
      const statusData = await refreshAccountStatus();
      
      if (!statusData) {
        scheduleNextPoll();
        return;
      }

      // Log full status for debugging
      console.log('[EmbeddedStripeOnboarding] Checking completion:', {
        isFullyOnboarded: statusData.isFullyOnboarded,
        chargesEnabled: statusData.chargesEnabled,
        payoutsEnabled: statusData.payoutsEnabled,
        detailsSubmitted: statusData.detailsSubmitted,
        requirementsCurrentlyDue: statusData.requirementsCurrentlyDue,
        status: statusData.status,
      });

      // Use Stripe API response directly - check both isFullyOnboarded flag and individual fields
      // For Accounts v2, if chargesEnabled and detailsSubmitted are true, we can proceed
      // payoutsEnabled may take time to become true (bank verification, etc.)
      // But if chargesEnabled is true, the account can receive payments
      const isFullyOnboardedCheck = statusData.isFullyOnboarded || false;
      const chargesAndDetailsCheck = statusData.chargesEnabled && statusData.detailsSubmitted;
      const noRequirementsCheck = !statusData.requirementsCurrentlyDue || statusData.requirementsCurrentlyDue.length === 0;
      const isComplete = isFullyOnboardedCheck || (chargesAndDetailsCheck && noRequirementsCheck);

      console.log('[EmbeddedStripeOnboarding] Completion check result:', {
        isFullyOnboardedCheck,
        chargesAndDetailsCheck,
        noRequirementsCheck,
        isComplete,
        breakdown: {
          chargesEnabled: statusData.chargesEnabled,
          detailsSubmitted: statusData.detailsSubmitted,
          requirementsCount: statusData.requirementsCurrentlyDue?.length || 0,
        },
      });

      if (isComplete) {
        console.log('[EmbeddedStripeOnboarding] Onboarding complete!', statusData);
        setIsComplete(true);
        clearPolling();

        toast({
          title: 'Stripe Setup Complete!',
          description: 'Your payment account is now ready to receive payments.',
        });

        // Call onComplete immediately to proceed to next step
        onComplete?.();
      } else {
        // Log why it's not complete yet
        console.log('[EmbeddedStripeOnboarding] Not complete yet. Waiting for:', {
          needsFullyOnboarded: !isFullyOnboardedCheck,
          needsChargesEnabled: !statusData.chargesEnabled,
          needsDetailsSubmitted: !statusData.detailsSubmitted,
          hasRequirements: statusData.requirementsCurrentlyDue?.length > 0,
          requirements: statusData.requirementsCurrentlyDue,
        });
        scheduleNextPoll();
      }
    } catch (err) {
      console.error('[EmbeddedStripeOnboarding] Polling error:', err);
      scheduleNextPoll();
    } finally {
      isCheckingRef.current = false;
    }
  }, [clearPolling, isComplete, onComplete, refreshAccountStatus, scheduleNextPoll, toast]);

  useEffect(() => {
    completionCheckRef.current = checkCompletionStatus;
  }, [checkCompletionStatus]);

  // Initialize Stripe Connect embedded component (official: loadConnectAndInitialize loads Connect.js from Stripe CDN)
  const INIT_TIMEOUT_MS = 18000;

  useEffect(() => {
    mountedRef.current = true;

    const initializeStripeConnect = async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorHint(null);

        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          throw new Error('Stripe publishable key not configured');
        }

        // Official: loadConnectAndInitialize loads Connect.js from https://connect-js.stripe.com (CSP must allow script-src + connect-src + frame-src)
        // Reuse one instance per page so effect re-runs (e.g. deps change) don't create a second Connect UI
        if (!cachedConnectInstancePromise) {
          cachedConnectInstancePromise = loadConnectAndInitialize({
            publishableKey,
            fetchClientSecret,
            appearance: {
              variables: {
                colorPrimary: '#10b981', // Emerald brand color
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '8px',
              },
            },
          });
        }

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('INIT_TIMEOUT')), INIT_TIMEOUT_MS);
        });

        const instance = await Promise.race([cachedConnectInstancePromise, timeoutPromise]);

        if (!mountedRef.current) return;

        setStripeConnectInstance(instance);
        setLoading(false);

        pollAttemptRef.current = 0;
        scheduleNextPoll(700);

      } catch (err: any) {
        console.error('[EmbeddedStripeOnboarding] Init error:', err);
        if (!mountedRef.current) return;
        const isTimeout = err?.message === 'INIT_TIMEOUT';
        const msg = err?.message ?? '';
        const isScriptBlocked =
          isTimeout ||
          /Failed to load Connect\.js/i.test(msg) ||
          /Content Security Policy/i.test(msg);
        const message = isTimeout
          ? 'Payment setup is taking longer than usual. The Stripe Connect script may be blocked by your browser or network (e.g. Content Security Policy). Try refreshing the page or check your connection.'
          : (err.message || 'Failed to initialize Stripe Connect');
        setError(message);
        setErrorHint(
          isScriptBlocked
            ? 'CSP must allow connect-js.stripe.com (script-src, frame-src, connect-src). See peer-care-connect/vercel.json and docs/troubleshooting/remove-csp-vercel-dashboard.md.'
            : null
        );
        setLoading(false);
        onError?.(err);
      }
    };

    initializeStripeConnect();

    return () => {
      mountedRef.current = false;
      clearPolling();
    };
  }, [fetchClientSecret, checkCompletionStatus, clearPolling, onError, retrySeed, scheduleNextPoll]);

  const mountedOnboardingRef = useRef<HTMLElement | null>(null);

  // Mount the embedded component (once per stripeConnectInstance)
  useEffect(() => {
    if (!stripeConnectInstance || !containerRef.current || isComplete) return;

    const container = containerRef.current;
    // Avoid double-mount: if we already mounted for this instance, skip
    if (mountedOnboardingRef.current && container.contains(mountedOnboardingRef.current)) return;

    container.innerHTML = '';
    mountedOnboardingRef.current = null;

    const accountOnboarding = stripeConnectInstance.create('account-onboarding');
    mountedOnboardingRef.current = accountOnboarding;

    accountOnboarding.setOnExit(() => {
      console.log('[EmbeddedStripeOnboarding] User exited onboarding - checking completion immediately');
      pollAttemptRef.current = 0;
      void checkCompletionStatus();
      scheduleNextPoll(500);
    });

    container.appendChild(accountOnboarding);

    return () => {
      if (mountedOnboardingRef.current && container.contains(mountedOnboardingRef.current)) {
        container.removeChild(mountedOnboardingRef.current);
      }
      mountedOnboardingRef.current = null;
    };
  }, [stripeConnectInstance, isComplete, checkCompletionStatus]);

  const handleRetry = () => {
    cachedConnectInstancePromise = null; // allow fresh init on retry
    setError(null);
    setErrorHint(null);
    setLoading(true);
    clearPolling();
    setStripeConnectInstance(null);
    setRetrySeed((v) => v + 1);
  };

  if (isComplete) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">Setup Complete!</h3>
              <p className="text-emerald-700 mt-1">
                Your Stripe account is fully configured and ready to receive payments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{error}</span>
          {errorHint && (
            <span className="text-muted-foreground text-sm">{errorHint}</span>
          )}
          <Button variant="outline" size="sm" onClick={handleRetry} className="w-fit">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment Setup</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-muted-foreground">Loading payment setup...</p>
          </div>
        ) : (
          <div 
            ref={containerRef} 
            className="min-h-[400px] w-full stripe-connect-container"
            style={{ 
              minHeight: '400px',
              width: '100%',
              position: 'relative',
              display: 'block'
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EmbeddedStripeOnboarding;

