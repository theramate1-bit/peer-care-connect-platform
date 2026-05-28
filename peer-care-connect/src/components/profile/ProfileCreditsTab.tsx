import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, TrendingDown, ArrowRight, Clock, RefreshCw, Info, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CreditTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface CreditsData {
  current_balance: number;
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface SubscriptionData {
  plan: string;
  monthly_credits: number;
  current_period_end: string;
}

const ProfileCreditsTab: React.FC = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  // Load credits data
  const loadCreditsData = async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(true);

      // Fetch credit balance
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('current_balance, balance, total_earned, total_spent')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Error fetching credits:', creditsError);
      }

      setCreditsData(credits || { current_balance: 0, balance: 0, total_earned: 0, total_spent: 0 });

      // Fetch recent transactions (last 5)
      const { data: txData, error: txError } = await supabase
        .from('credit_transactions')
        .select('id, amount, transaction_type, description, created_at')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txError) {
        console.error('Error fetching transactions:', txError);
      }

      setTransactions(txData || []);

      // Fetch subscription info
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('plan, monthly_credits, current_period_end')
        .eq('user_id', userProfile.id)
        .in('status', ['active', 'trialing'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      }

      setSubscription(subData);
    } catch (error) {
      console.error('Error loading credits data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditsData();
  }, [userProfile?.id]);

  // Real-time subscription for credits
  useRealtimeSubscription(
    'credits',
    `user_id=eq.${userProfile?.id}`,
    (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const newBalance = payload.new?.current_balance || payload.new?.balance || 0;
        setCreditsData(prev => ({
          ...prev!,
          current_balance: newBalance,
          balance: newBalance,
          total_earned: payload.new?.total_earned || prev?.total_earned || 0,
          total_spent: payload.new?.total_spent || prev?.total_spent || 0,
        }));
      }
    }
  );

  // Real-time subscription for transactions
  useRealtimeSubscription(
    'credit_transactions',
    `user_id=eq.${userProfile?.id}`,
    (payload) => {
      if (payload.eventType === 'INSERT') {
        loadCreditsData();
        toast.success('Credit balance updated!');
      }
    }
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'session_earning':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'session_payment':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'bonus':
        return <Sparkles className="h-4 w-4 text-yellow-500" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Coins className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'session_earning':
        return 'Session Earning';
      case 'session_payment':
        return 'Treatment Exchange';
      case 'bonus':
        return 'Bonus';
      case 'refund':
        return 'Refund';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const currentBalance = creditsData?.current_balance || creditsData?.balance || 0;
  const totalEarned = creditsData?.total_earned || 0;
  const totalSpent = creditsData?.total_spent || 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation: use credits for peer exchange or save for CPD (KAN-20) */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">How to use your credits</p>
              <p>Use your credits for our peer treatment exchange, or save your credits for our upcoming CPD sessions.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                Your Credits
              </CardTitle>
              <CardDescription>
                Use our credits for our peer treatment exchange, or save your credits for our upcoming CPD sessions
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>Earn credits</strong> by completing sessions with clients.
                    <br /><br />
                    <strong>Spend credits</strong> on peer treatment exchanges (1 credit per minute).
                    <br /><br />
                    <strong>Save credits</strong> for upcoming CPD sessions and training.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Balance Display */}
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Coins className="h-8 w-8 text-yellow-500" />
                <span className="text-5xl font-bold">{currentBalance}</span>
              </div>
              <p className="text-muted-foreground">Available Credits</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">{totalEarned}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="font-semibold">{totalSpent}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </div>

          {/* Subscription Info */}
          {subscription && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subscription.monthly_credits} credits/month
                  </p>
                </div>
                {subscription.current_period_end && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Next allocation</p>
                    <p className="text-sm font-medium">
                      {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zero Balance State */}
          {currentBalance === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>No credits available.</strong> Earn credits by completing sessions with clients, 
                or check your subscription for monthly allocations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/credits" className="flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-xs mt-1">Credits will appear here as you earn and spend them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.transaction_type)}
                    <div>
                      <p className="text-sm font-medium">
                        {formatTransactionType(tx.transaction_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${getTransactionColor(tx.amount)}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA to Full Credits Page */}
      <div className="flex justify-center">
        <Button asChild variant="outline" className="w-full max-w-md">
          <Link to="/credits" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            View Full Treatment Exchange
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ProfileCreditsTab;
