import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, Settings } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * StripeReturn handles edge cases from Stripe Connect authentication popups.
 * 
 * With Embedded Onboarding, most users complete setup inline and won't reach this page.
 * This page is kept for:
 * 1. Authentication popup redirects (OAuth flows within embedded components)
 * 2. Legacy redirect flows (if any remain)  
 * 3. Direct URL access (edge case handling)
 */
const StripeReturn: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'incomplete' | 'embedded_flow'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    
    const waitForAuthAndVerify = async () => {
      const start = Date.now();
      
      // Wait for auth (max 10 seconds)
      while (!user && Date.now() - start < 10000) {
        await new Promise(r => setTimeout(r, 300));
        if (cancelled) return;
      }
      
      if (!user) {
        // No user after waiting - likely an embedded OAuth popup closing
        // Redirect to settings where embedded component handles state
        setStatus('embedded_flow');
        setVerifying(false);
        return;
      }
      
      verifyAndContinue();
    };
    
    waitForAuthAndVerify();
    return () => { cancelled = true; };
  }, [user]);

  const verifyAndContinue = async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1200;

    try {
      setVerifying(true);
      setStatus('verifying');

      // Handle Checkout session verification (subscription flow)
      const csId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
      if (csId) {
        try {
          await supabase.functions.invoke('verify-checkout', { body: { checkout_session_id: csId } });
        } catch (e) {
          console.warn('[STRIPE-RETURN] verify-checkout failed (non-fatal):', e);
        }
      }

      // Get user's Stripe Connect account ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_connect_account_id')
        .eq('id', user?.id)
        .single();

      if (userError || !userData?.stripe_connect_account_id) {
        // No Connect account - user may have accessed this URL directly
        // Redirect them to the appropriate place
        setStatus('error');
        setErrorMessage('No payment account found. Please start the setup process.');
        return;
      }

      const accountId = userData.stripe_connect_account_id;
      console.log('[STRIPE-RETURN] Checking account status for:', accountId);

      let accountData;
      let accountError: any = null;
      
      try {
        const result = await supabase.functions.invoke('stripe-payment', {
          body: {
            action: 'get-connect-account-status',
            account_id: accountId
          }
        });
        
        if (result.error) {
          accountError = result.error;
        } else if (result.data?.error) {
          accountError = new Error(result.data.error);
          accountError.details = result.data.details;
        } else {
          accountData = result.data;
        }
      } catch (err: any) {
        accountError = err;
        console.error('[STRIPE-RETURN] Exception:', err);
      }

      if (accountError) {
        // Retry logic for transient errors
        const isRetryable = retryCount < MAX_RETRIES && (
          accountError.message?.includes('timeout') ||
          accountError.message?.includes('network') ||
          accountError.status >= 500
        );
        
        if (isRetryable) {
          console.log(`Retrying verification (${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return verifyAndContinue(retryCount + 1);
        }

        setStatus('error');
        setErrorMessage(accountError.details || accountError.message || 'Failed to verify payment setup.');
        return;
      }

      if (!accountData) {
        setStatus('error');
        setErrorMessage('No account data received. Please try again.');
        return;
      }

      // Check if account is fully onboarded
      const isAccountReady = accountData?.isFullyOnboarded || 
        (accountData?.chargesEnabled && accountData?.payoutsEnabled);

      if (isAccountReady) {
        setStatus('success');
        toast.success('Payment setup complete!');
        
        // Update onboarding progress
        try {
          const { data: progressData } = await supabase
            .from('onboarding_progress')
            .select('*')
            .eq('user_id', user?.id)
            .maybeSingle();

          if (progressData) {
            const completedSteps = Array.isArray(progressData.completed_steps) 
              ? [...progressData.completed_steps] 
              : [];
            
            if (!completedSteps.includes(4)) {
              completedSteps.push(4);
            }

            await supabase
              .from('onboarding_progress')
              .update({
                current_step: 5,
                completed_steps: completedSteps,
                last_saved_at: new Date().toISOString()
              })
              .eq('user_id', user?.id);
          }
        } catch (error) {
          console.error('[STRIPE-RETURN] Error updating onboarding progress:', error);
        }
        
        // Redirect based on where user came from
        const returnUrl = searchParams.get('return_url');
        
        if (returnUrl) {
          const separator = returnUrl.includes('?') ? '&' : '?';
          window.location.href = `${returnUrl}${separator}stripe_complete=true`;
        } else {
          navigate('/onboarding', { 
            state: { stripeConnectComplete: true, timestamp: Date.now() } 
          });
        }
      } else {
        // Not fully onboarded - likely OAuth popup edge case
        // Redirect back to settings where embedded component will handle state
        setStatus('incomplete');
        setErrorMessage('Please complete the payment setup in your settings.');
      }
    } catch (error) {
      console.error('Error verifying payment setup:', error);
      setStatus('error');
      setErrorMessage('Failed to verify payment setup');
    } finally {
      setVerifying(false);
    }
  };

  const handleGoToOnboarding = () => {
    navigate('/onboarding');
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Verifying Payment Setup</h2>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment configuration...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <h2 className="text-xl font-semibold text-green-900">Payment Setup Complete!</h2>
            <p className="text-muted-foreground">
              Your Stripe Connect account is now ready to receive payments.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                Redirecting you automatically...
              </p>
            </div>
            <Button onClick={handleGoToOnboarding} className="w-full">
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );

      case 'incomplete':
        return (
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-600" />
            <h2 className="text-xl font-semibold text-yellow-900">Setup Incomplete</h2>
            <p className="text-muted-foreground">
              {errorMessage || 'Please complete the payment setup.'}
            </p>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-700">
                You may need to provide additional information or complete identity verification.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleGoToSettings} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Go to Payment Settings
              </Button>
              <Button onClick={handleGoToOnboarding} variant="outline" className="w-full">
                Return to Onboarding
              </Button>
            </div>
          </div>
        );

      case 'embedded_flow':
        // User likely came from embedded OAuth popup - close/redirect gracefully
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-600" />
            <h2 className="text-xl font-semibold">Authentication Complete</h2>
            <p className="text-muted-foreground">
              You can close this tab and return to your previous page to continue the setup.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleGoToSettings} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Go to Payment Settings
              </Button>
              <Button onClick={handleGoToOnboarding} variant="outline" className="w-full">
                Go to Onboarding
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">Something Went Wrong</h2>
            <p className="text-muted-foreground">
              {errorMessage || 'We encountered an error while verifying your payment setup.'}
            </p>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-700">
                Please try setting up your payment account again.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleGoToSettings} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Go to Payment Settings
              </Button>
              <Button onClick={handleGoToOnboarding} variant="outline" className="w-full">
                Return to Onboarding
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default StripeReturn;
