import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_type: string;
  created_at: string;
  therapist_id?: string;
  project_id?: string;
  session_id?: string;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  payout_status: string;
  created_at: string;
  arrival_date?: string;
}

const Payments = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    thisMonth: 0,
    lastMonth: 0
  });

  useEffect(() => {
    if (user) {
      loadPaymentData();
    }
  }, [user]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Load payments from client_sessions table
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          price,
          payment_status,
          created_at,
          therapist_id,
          session_type,
          client_name,
          session_date
        `)
        .eq('therapist_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionsError) throw sessionsError;

      // Transform sessions to payment format
      const paymentsData = (sessionsData || []).map(session => ({
        id: session.id,
        amount: session.price * 100, // Convert to pence for display
        currency: 'gbp',
        payment_status: session.payment_status === 'completed' ? 'succeeded' : 'pending',
        payment_type: 'session_payment',
        created_at: session.created_at,
        therapist_id: session.therapist_id,
        session_id: session.id
      }));

      setPayments(paymentsData);

      // Calculate stats
      const totalEarnings = paymentsData
        .filter(p => p.payment_status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingPayouts = paymentsData
        .filter(p => p.payment_status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0) * 0.9; // 90% after platform fee

      const now = new Date();
      const thisMonth = paymentsData
        .filter(p => {
          const paymentDate = new Date(p.created_at);
          return paymentDate.getMonth() === now.getMonth() && 
                 paymentDate.getFullYear() === now.getFullYear() &&
                 p.payment_status === 'succeeded';
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const lastMonth = paymentsData
        .filter(p => {
          const paymentDate = new Date(p.created_at);
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return paymentDate.getMonth() === lastMonthDate.getMonth() && 
                 paymentDate.getFullYear() === lastMonthDate.getFullYear() &&
                 p.payment_status === 'succeeded';
        })
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalEarnings,
        pendingPayouts,
        thisMonth,
        lastMonth
      });

    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'gbp') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      succeeded: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPayoutStatusBadge = (status: string) => {
    const variants = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      in_transit: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return <Calendar className="h-4 w-4" />;
      case 'one_time':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'Subscription';
      case 'one_time':
        return 'One-time';
      default:
        return 'Payment';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to view your payments.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Payments & Payouts"
        description="Manage your earnings, view payment history, and track payouts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Payments" }
        ]}
        backTo="/dashboard"
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <Banknote className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.pendingPayouts)}</div>
              <p className="text-xs text-muted-foreground">
                Available for withdrawal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.thisMonth)}</div>
              <div className="flex items-center gap-1 text-xs">
                {stats.thisMonth > stats.lastMonth ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      +{Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">
                      -{Math.round(((stats.lastMonth - stats.thisMonth) / stats.lastMonth) * 100)}%
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connect Account</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  // TODO: Implement Stripe Connect account setup
                  console.log('Setup Stripe Connect account functionality coming soon!');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Setup Account
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Recent Payments
                  </CardTitle>
                  <CardDescription>
                    Latest payment activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.slice(0, 5).map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-muted">
                              {getPaymentTypeIcon(payment.payment_type)}
                            </div>
                            <div>
                              <p className="font-medium">{getPaymentTypeLabel(payment.payment_type)}</p>
                              <p className="text-sm text-muted-foreground">{formatDate(payment.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatAmount(payment.amount, payment.currency)}</p>
                            {getStatusBadge(payment.payment_status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No payments yet</p>
                      <p className="text-sm">Start accepting payments to see them here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common payment tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Setup Connect Account
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Banknote className="h-4 w-4 mr-2" />
                    Request Payout
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  Complete history of all payments received
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : payments.length > 0 ? (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-muted">
                            {getPaymentTypeIcon(payment.payment_type)}
                          </div>
                          <div>
                            <p className="font-medium">{getPaymentTypeLabel(payment.payment_type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(payment.created_at)}
                            </p>
                            {payment.project_id && (
                              <p className="text-xs text-muted-foreground">
                                Project ID: {payment.project_id}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">{formatAmount(payment.amount, payment.currency)}</p>
                          {getStatusBadge(payment.payment_status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No payment history</p>
                    <p className="text-sm">Payments will appear here once you start receiving them</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>
                  Track your payout requests and transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : payouts.length > 0 ? (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-muted">
                            <Banknote className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">Payout</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(payout.created_at)}
                            </p>
                            {payout.arrival_date && (
                              <p className="text-xs text-muted-foreground">
                                Arrives: {formatDate(payout.arrival_date)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">{formatAmount(payout.amount, payout.currency)}</p>
                          {getPayoutStatusBadge(payout.payout_status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No payout history</p>
                    <p className="text-sm">Payouts will appear here once you request them</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Payments;
