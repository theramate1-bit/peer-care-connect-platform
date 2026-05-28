import React, { useEffect, useState, useCallback, useRef } from 'react';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, RefreshCw, CreditCard, Wallet, Settings, Scale, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ComponentType = 'account-management' | 'payouts' | 'payments' | 'notification-banner' | 'disputes' | 'balance';

interface EmbeddedAccountManagementProps {
  stripeAccountId?: string;
  defaultTab?: 'account' | 'payouts' | 'payments' | 'disputes' | 'balance';
  showTabs?: boolean;
  showNotificationBanner?: boolean;
  onError?: (error: Error) => void;
}

export const EmbeddedAccountManagement: React.FC<EmbeddedAccountManagementProps> = ({
  stripeAccountId,
  defaultTab = 'account',
  showTabs = true,
  showNotificationBanner = true,
  onError,
}) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'payouts' | 'payments' | 'disputes' | 'balance'>(defaultTab);
  const [accountId, setAccountId] = useState<string | null>(stripeAccountId || null);
  
  const accountContainerRef = useRef<HTMLDivElement>(null);
  const payoutsContainerRef = useRef<HTMLDivElement>(null);
  const paymentsContainerRef = useRef<HTMLDivElement>(null);
  const disputesContainerRef = useRef<HTMLDivElement>(null);
  const balanceContainerRef = useRef<HTMLDivElement>(null);
  const notificationBannerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const mountedRef = useRef(true);

  // Fetch user's Stripe account ID if not provided
  useEffect(() => {
    const fetchAccountId = async () => {
      if (stripeAccountId) {
        setAccountId(stripeAccountId);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Not authenticated');
        }

        const { data: connectAccount, error: fetchError } = await supabase
          .from('connect_accounts')
          .select('stripe_account_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError || !connectAccount?.stripe_account_id) {
          throw new Error('No Stripe Connect account found');
        }

        setAccountId(connectAccount.stripe_account_id);
      } catch (err: any) {
        console.error('[EmbeddedAccountManagement] Error fetching account:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAccountId();
  }, [stripeAccountId]);

  // Fetch client secret from backend
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!accountId) {
      throw new Error('No account ID available');
    }

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
          stripe_account_id: accountId,
          components: {
            account_management: { enabled: true },
            payouts: { enabled: true },
            payments: { enabled: true },
            'notification-banner': { enabled: true },
            disputes: { enabled: true },
            balance: { enabled: true },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create account session');
    }

    const data = await response.json();
    return data.client_secret;
  }, [accountId]);

  // Initialize Stripe Connect
  useEffect(() => {
    if (!accountId) return;

    mountedRef.current = true;

    const initializeStripeConnect = async () => {
      try {
        setLoading(true);
        setError(null);

        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          throw new Error('Stripe publishable key not configured');
        }

        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance: {
            // NOTE: Do NOT set overlays: 'dialog' - that causes popups instead of inline embedding
            // Components should render directly in container divs, not in popups
            variables: {
              colorPrimary: '#10b981',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '8px',
            },
          },
        });

        if (!mountedRef.current) return;

        setStripeConnectInstance(instance);
        setLoading(false);

      } catch (err: any) {
        console.error('[EmbeddedAccountManagement] Init error:', err);
        if (mountedRef.current) {
          setError(err.message || 'Failed to initialize Stripe Connect');
          setLoading(false);
          onError?.(err);
        }
      }
    };

    initializeStripeConnect();

    return () => {
      mountedRef.current = false;
    };
  }, [accountId, fetchClientSecret, onError]);

  // Mount component based on active tab
  const mountComponent = useCallback((type: ComponentType, container: HTMLDivElement | null) => {
    if (!stripeConnectInstance || !container) return;

    // Clear existing content
    container.innerHTML = '';

    try {
      const component = stripeConnectInstance.create(type);
      container.appendChild(component);
    } catch (err) {
      console.error(`[EmbeddedAccountManagement] Error mounting ${type}:`, err);
    }
  }, [stripeConnectInstance]);

  // Mount notification banner (always visible if enabled)
  useEffect(() => {
    if (!stripeConnectInstance || !showNotificationBanner || !notificationBannerRef.current) return;
    mountComponent('notification-banner', notificationBannerRef.current);
  }, [stripeConnectInstance, showNotificationBanner, mountComponent]);

  // Mount components when tab changes or instance is ready
  useEffect(() => {
    if (!stripeConnectInstance) return;

    switch (activeTab) {
      case 'account':
        mountComponent('account-management', accountContainerRef.current);
        break;
      case 'payouts':
        mountComponent('payouts', payoutsContainerRef.current);
        break;
      case 'payments':
        mountComponent('payments', paymentsContainerRef.current);
        break;
      case 'disputes':
        mountComponent('disputes', disputesContainerRef.current);
        break;
      case 'balance':
        mountComponent('balance', balanceContainerRef.current);
        break;
    }
  }, [stripeConnectInstance, activeTab, mountComponent]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRetry} className="w-fit">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-muted-foreground">Loading account settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showTabs) {
    // Single component mode
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>
            Manage your Stripe account settings, payouts, and payment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            ref={accountContainerRef} 
            className="min-h-[400px] stripe-connect-container"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
        <CardDescription>
          Manage your Stripe account, view payouts, and track payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Notification Banner - Always visible at top if enabled */}
        {showNotificationBanner && (
          <div 
            ref={notificationBannerRef} 
            className="mb-6 stripe-connect-container"
            style={{ minHeight: '60px' }}
          />
        )}
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Payouts</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Disputes</span>
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Balance</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="mt-6">
            <div 
              ref={accountContainerRef} 
              className="min-h-[400px] stripe-connect-container"
            />
          </TabsContent>
          
          <TabsContent value="payouts" className="mt-6">
            <div 
              ref={payoutsContainerRef} 
              className="min-h-[400px] stripe-connect-container"
            />
          </TabsContent>
          
          <TabsContent value="payments" className="mt-6">
            <div 
              ref={paymentsContainerRef} 
              className="min-h-[400px] stripe-connect-container"
            />
          </TabsContent>
          
          <TabsContent value="disputes" className="mt-6">
            <div 
              ref={disputesContainerRef} 
              className="min-h-[400px] stripe-connect-container"
            />
          </TabsContent>
          
          <TabsContent value="balance" className="mt-6">
            <div 
              ref={balanceContainerRef} 
              className="min-h-[400px] stripe-connect-container"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmbeddedAccountManagement;

