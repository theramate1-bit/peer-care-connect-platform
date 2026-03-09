import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000; // 2 minutes

/**
 * SubscriptionSuccess: post-checkout landing page.
 * Does NOT grant any entitlement. Shows spinner and polls billing status from backend
 * until DB shows active/trialing, then redirects. Prevents back-button bypass.
 */
export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [status, setStatus] = useState<'polling' | 'active' | 'timeout' | 'error'>('polling');
  const [message, setMessage] = useState('');
  const pollCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId || !user) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;

        const { data, error } = await supabase.functions.invoke('get-subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (cancelled) return;
        if (error) {
          setStatus('error');
          setMessage('Could not verify subscription status. Please check your dashboard or subscription settings.');
          return;
        }

        const hasActive = data?.hasActiveSubscription === true;
        if (hasActive) {
          setStatus('active');
          setMessage('Subscription active! Redirecting...');
          const role = userProfile?.user_role;
          const dashboard = ['sports_therapist', 'massage_therapist', 'osteopath'].includes(role || '')
            ? '/dashboard'
            : '/client/dashboard';
          setTimeout(() => navigate(dashboard, { replace: true }), 1500);
          return;
        }

        pollCount.current += 1;
        if (Date.now() - startTime.current > POLL_TIMEOUT_MS) {
          setStatus('timeout');
          setMessage('Activation is taking longer than usual. You can check your subscription status in Settings or try again in a few minutes.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Something went wrong while verifying your subscription.');
        }
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [searchParams, user, userProfile, navigate]);

  if (!user) {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please sign in to continue.</p>
            <Button className="mt-4" onClick={() => navigate('/login')}>Sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'polling' || status === 'active') {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              {status === 'active' ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              )}
              {status === 'active' ? 'Subscription active!' : 'Setting up your subscription...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {status === 'active'
                ? message
                : 'Do not close this page. We’re confirming your payment with our provider.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'timeout' || status === 'error') {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              {status === 'timeout' ? 'Taking longer than usual' : 'Verification issue'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">{message}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/settings/subscription')}>
                Subscription settings
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
