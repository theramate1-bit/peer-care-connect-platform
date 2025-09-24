import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, CreditCard, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentStatusProps {
  sessionId?: string;
  showEarnings?: boolean;
}

interface SessionPayment {
  id: string;
  client_name: string;
  session_date: string;
  duration_minutes: number;
  price: number;
  payment_status: 'pending' | 'processing' | 'completed' | 'failed';
  platform_fee_amount?: number;
  practitioner_amount?: number;
  stripe_session_id?: string;
}

export const PaymentStatus = ({ sessionId, showEarnings = false }: PaymentStatusProps) => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<SessionPayment[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, sessionId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('client_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionId) {
        query = query.eq('id', sessionId);
      } else if (showEarnings) {
        // Show practitioner's earnings
        query = query.eq('therapist_id', user?.id);
      } else {
        // Show client's bookings
        query = query.eq('client_email', user?.email);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      setPayments(data || []);

      // Calculate totals for practitioners
      if (showEarnings && data) {
        const completed = data.filter(p => p.payment_status === 'completed');
        const pending = data.filter(p => p.payment_status === 'pending' || p.payment_status === 'processing');
        
        setTotalEarnings(completed.reduce((sum, p) => sum + (p.practitioner_amount || p.price * 0.95), 0));
        setPendingPayments(pending.reduce((sum, p) => sum + (p.practitioner_amount || p.price * 0.95), 0));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const retryPayment = async (payment: SessionPayment) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-session-payment', {
        body: { 
          sessionId: payment.id,
          practitionerId: payment.therapist_id,
          amount: Math.round(payment.price),
          duration: payment.duration_minutes
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Redirecting to payment...');
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Failed to retry payment');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading payment information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showEarnings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">
                From completed sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(pendingPayments)}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting client payment
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {showEarnings ? 'Session Payments' : 'My Bookings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {showEarnings ? 'No sessions found' : 'No bookings found'}
            </p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(payment.payment_status)}
                    <div>
                      <p className="font-medium">
                        {showEarnings ? payment.client_name : 'Therapy Session'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.session_date).toLocaleDateString()} • {payment.duration_minutes} minutes
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(showEarnings ? (payment.practitioner_amount || payment.price * 0.95) : payment.price)}
                      </p>
                      <Badge variant="outline" className={`text-white ${getStatusColor(payment.payment_status)}`}>
                        {payment.payment_status}
                      </Badge>
                    </div>
                    
                    {!showEarnings && payment.payment_status === 'failed' && (
                      <Button 
                        size="sm" 
                        onClick={() => retryPayment(payment)}
                        variant="outline"
                      >
                        Retry Payment
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
