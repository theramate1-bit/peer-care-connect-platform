import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EmbeddedStripeOnboarding } from './EmbeddedStripeOnboarding';

interface PaymentSetupStepProps {
  onComplete: () => void;
}

type OnboardingState = 'initial' | 'creating' | 'embedded' | 'complete';

export const PaymentSetupStep: React.FC<PaymentSetupStepProps> = ({ onComplete }) => {
  const { user, userProfile } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('initial');
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [platformReviewError, setPlatformReviewError] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Check if user already has a Stripe Connect account
  const checkExistingAccount = useCallback(async () => {
    if (!user) {
      setCheckingExisting(false);
      return;
    }

    try {
      setCheckingExisting(true);
      const { data: connectAccount, error } = await supabase
        .from('connect_accounts')
        .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking existing account:', error);
        setCheckingExisting(false);
        return;
      }

      if (connectAccount?.stripe_account_id) {
        setStripeAccountId(connectAccount.stripe_account_id);
        
        // Check if fully onboarded
        if (connectAccount.charges_enabled && connectAccount.payouts_enabled && connectAccount.details_submitted) {
          setOnboardingState('complete');
        } else {
          // Resume onboarding with embedded component
          setOnboardingState('embedded');
        }
      } else {
        setStripeAccountId(null);
        setOnboardingState('initial');
      }
    } catch (err) {
      console.error('Error checking existing Stripe account:', err);
    } finally {
      setCheckingExisting(false);
    }
  }, [user]);

  useEffect(() => {
    checkExistingAccount();
  }, [checkExistingAccount, refreshNonce]);

  const handleStartStripeConnect = async () => {
    if (!user || !userProfile) {
      toast.error('User information not available');
      return;
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      toast.error('Please accept the Stripe terms and conditions to continue');
      return;
    }

    // Clear any previous platform review error state when retrying
    setPlatformReviewError(false);

    try {
      setOnboardingState('creating');
      
      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Your session has expired. Please refresh the page.');
        setOnboardingState('initial');
        return;
      }

      // Create Stripe Connect account (without redirect - just get the account ID)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl) {
        toast.error('App configuration error: missing Supabase URL');
        setOnboardingState('initial');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...(supabaseAnonKey && { apikey: supabaseAnonKey }),
        },
        body: JSON.stringify({
          action: 'create-connect-account',
          userId: user.id,
          email: user.email,
          firstName: userProfile.first_name || '',
          lastName: userProfile.last_name || '',
          businessType: 'individual'
        })
      });

      let data: any = null;
      let error: any = null;

      if (!response.ok) {
        // Parse error response
        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        error = {
          message: `Edge Function returned a non-2xx status code`,
          status: response.status,
          statusText: response.statusText,
          data: errorBody
        };
        data = null;
      } else {
        // Parse success response
        data = await response.json().catch(() => null);
        error = null;
      }

      if (error) {
        console.error('=== STRIPE CONNECT CREATION ERROR ===');
        console.error('Error object:', error);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error data:', error.data);
        
        // Extract detailed error message from error.data (now properly parsed)
        let errorMessage = error.message || 'Failed to create payment account. Please try again.';
        let errorDetails: any = error.data || null;
        let errorCode: string | undefined;
        let errorType: string | undefined;
        
        if (errorDetails) {
          console.error('=== PARSED ERROR RESPONSE ===');
          console.error(JSON.stringify(errorDetails, null, 2));
          
          // Check for platform review requirement error (specific Stripe error)
          const v2Error = errorDetails.v2Error || '';
          const customError = errorDetails.customError || '';
          const isPlatformReviewError = 
            v2Error.includes('review the responsibilities') ||
            v2Error.includes('platform-profile') ||
            customError.includes('review the responsibilities') ||
            customError.includes('platform-profile');
          
          if (isPlatformReviewError) {
            // Platform review required - show actionable error with link
            const reviewUrl = 'https://dashboard.stripe.com/settings/connect/platform-profile';
            
            console.log('[PaymentSetupStep] Platform review error detected - setting error state');
            
            // Set error state to show in UI (must be set before state change)
            setPlatformReviewError(true);
            
            // Reset to initial state to show the Alert
            setOnboardingState('initial');
            
            // Show toast notification
            toast.error('Platform Setup Required', {
              duration: 30000, // Show for 30 seconds
              description: `Stripe requires a one-time platform review before creating payment accounts. Complete the review and refresh this page.`,
              action: {
                label: 'Open Review Page',
                onClick: () => window.open(reviewUrl, '_blank', 'noopener,noreferrer')
              }
            });
            
            console.log('[PaymentSetupStep] Platform review error handled - Alert should be visible');
            return; // Exit early - don't show generic error
          }
          
          // Extract error message from various possible fields
          if (errorDetails.details) {
            errorMessage = errorDetails.details;
          } else if (errorDetails.fullError?.message) {
            errorMessage = errorDetails.fullError.message;
          } else if (errorDetails.error) {
            errorMessage = typeof errorDetails.error === 'string' 
              ? errorDetails.error 
              : errorDetails.error.message || errorMessage;
          } else if (errorDetails.message) {
            errorMessage = errorDetails.message;
          }
          
          // Extract error code
          if (errorDetails.code) {
            errorCode = errorDetails.code;
          } else if (errorDetails.fullError?.code) {
            errorCode = errorDetails.fullError.code;
          }
          
          // Extract error type
          if (errorDetails.type) {
            errorType = errorDetails.type;
          } else if (errorDetails.fullError?.type) {
            errorType = errorDetails.fullError.type;
          }
        }
        
        // Display error with all available details
        const errorDescription = errorCode 
          ? `Error code: ${errorCode}${errorType ? ` (${errorType})` : ''}`
          : errorType 
            ? `Error type: ${errorType}`
            : error.status
              ? `HTTP ${error.status}: ${error.statusText}`
              : undefined;
        
        console.error('=== FINAL ERROR MESSAGE ===');
        console.error('Message:', errorMessage);
        console.error('Code:', errorCode);
        console.error('Type:', errorType);
        console.error('Status:', error.status);
        console.error('Full error details:', errorDetails);
        
        toast.error(errorMessage, {
          duration: 15000, // Show for 15 seconds
          description: errorDescription
        });
        setOnboardingState('initial');
        return;
      }

      if (!data?.stripe_account_id) {
        console.error('Missing stripe_account_id in response:', data);
        toast.error('Failed to create Stripe account');
        setOnboardingState('initial');
        return;
      }

      // Save account ID
      setStripeAccountId(data.stripe_account_id);
      
      // Update user record with stripe_connect_account_id
      await supabase
        .from('users')
        .update({ stripe_connect_account_id: data.stripe_account_id })
        .eq('id', user.id);

      // If account is already fully onboarded (existing user returning)
      if (data.status === 'active') {
        setOnboardingState('complete');
        toast.success('Payment account already set up!');
        onComplete();
        return;
      }
      
      // Show embedded onboarding
      setOnboardingState('embedded');
      
    } catch (error: any) {
      console.error('Error starting Stripe Connect:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to start payment setup. Please try again.';
      toast.error(errorMessage, {
        duration: 10000, // Show for 10 seconds
      });
      setOnboardingState('initial');
    }
  };

  const handleEmbeddedComplete = () => {
    setOnboardingState('complete');
    toast.success('Payment setup complete!');
    onComplete();
  };

  const handleEmbeddedError = (error: Error) => {
    console.error('Embedded onboarding error:', error);
    toast.error('There was an issue with payment setup. Please try again.');
    // Allow retry by going back to initial state
    setOnboardingState('initial');
  };

  // Loading state while checking for existing account
  if (checkingExisting) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-muted-foreground">Checking payment setup...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Completed state
  if (onboardingState === 'complete') {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">Payment Setup Complete!</h3>
              <p className="text-emerald-700 mt-1">
                Your Stripe account is fully configured and ready to receive payments.
              </p>
            </div>
            <Button onClick={onComplete} className="mt-2">
              Continue to Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Embedded onboarding state
  if (onboardingState === 'embedded' && stripeAccountId) {
    return (
        <EmbeddedStripeOnboarding
          stripeAccountId={stripeAccountId}
          onComplete={handleEmbeddedComplete}
          onError={handleEmbeddedError}
        />
    );
  }

  // Creating account state
  if (onboardingState === 'creating') {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-muted-foreground">Setting up your payment account...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial state - show info and start button
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Payment Setup</span>
        </CardTitle>
        <CardDescription>
          Set up your account to receive payments from clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Review Error Alert - Always show at top when error occurs */}
        {platformReviewError && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-50 mb-6">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <AlertTitle className="text-orange-900 font-semibold text-lg mb-2">
              ⚠️ Platform Setup Required
            </AlertTitle>
            <AlertDescription className="text-orange-800 space-y-3">
              <p className="font-medium">
                Stripe requires a one-time platform review before creating payment accounts. 
                This is a required setup step that must be completed in the Stripe Dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button
                  onClick={() => window.open('https://dashboard.stripe.com/settings/connect/platform-profile', '_blank', 'noopener,noreferrer')}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
                  size="lg"
                >
                  Complete Platform Review →
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPlatformReviewError(false);
                    setRefreshNonce((v) => v + 1);
                    toast.info('Refreshing Stripe account status...');
                  }}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 font-medium"
                  size="lg"
                >
                  Refresh After Completion
                </Button>
              </div>
              <div className="bg-orange-100 p-3 rounded-md mt-3">
                <p className="text-sm font-medium text-orange-900 mb-1">Steps to complete:</p>
                <ol className="text-xs text-orange-800 list-decimal list-inside space-y-1">
                  <li>Click "Complete Platform Review" above</li>
                  <li>Review and accept responsibilities in Stripe Dashboard</li>
                  <li>Return to this page and click "Refresh After Completion"</li>
                  <li>Try creating your payment account again</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">What you'll need:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Bank account details</li>
              <li>Business or personal information</li>
              <li>Proof of identity</li>
              <li>5-10 minutes to complete</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Required for Marketplace</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You must complete payment setup before you can appear in the marketplace and accept bookings from clients.
                </p>
              </div>
            </div>
          </div>

          {/* Stripe Terms and Conditions Acceptance */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="stripe-terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                required
              />
              <label htmlFor="stripe-terms" className="text-sm text-foreground cursor-pointer">
                I agree to{' '}
                <a
                  href="https://stripe.com/gb/legal/connect-account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  Stripe's Connected Account Agreement
                </a>
                {' '}and{' '}
                <a
                  href="https://stripe.com/gb/legal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  Stripe Services Agreement
                </a>
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              By proceeding, you acknowledge that you have read and agree to Stripe's terms. Payments are processed securely through Stripe's platform.
            </p>
          </div>

          <Button 
            onClick={handleStartStripeConnect} 
            className="w-full"
            size="lg"
            disabled={!termsAccepted}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Set Up Payment Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSetupStep;
