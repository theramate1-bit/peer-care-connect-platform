import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
  created: number;
  description: string;
}

interface PayoutHistoryProps {
  userId: string;
}

export const PayoutHistory: React.FC<PayoutHistoryProps> = ({ userId }) => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchPayouts();
  }, [userId]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      
      // Get payouts from marketplace_bookings
      const { data: bookings, error } = await supabase
        .from('marketplace_bookings')
        .select('*')
        .eq('practitioner_id', userId)
        .in('status', ['paid', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = bookings?.reduce((sum, b) => sum + b.practitioner_amount, 0) || 0;
      setTotalEarnings(total);
      
      // Transform bookings into payout format
      const payoutList = bookings?.map(b => ({
        id: b.id,
        amount: b.practitioner_amount,
        currency: b.currency,
        status: b.status === 'completed' ? 'paid' : 'in_transit',
        arrival_date: new Date(b.created_at).getTime() / 1000 + (7 * 24 * 60 * 60), // Estimate 7 days
        created: new Date(b.created_at).getTime() / 1000,
        description: b.product_name,
      })) || [];

      setPayouts(payoutList);
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payout history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading payout history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payout History</CardTitle>
          <Button size="sm" variant="outline" onClick={fetchPayouts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Earnings */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Total Earnings</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            £{(totalEarnings / 100).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            From {payouts.length} {payouts.length === 1 ? 'booking' : 'bookings'}
          </p>
        </div>

        {/* Payout List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Recent Payouts</h4>
          {payouts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No payouts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Earnings will appear here after clients book your services
              </p>
            </div>
          ) : (
            payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-2 rounded-full">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">£{(payout.amount / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{payout.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(payout.status)}>
                    {payout.status === 'paid' ? 'Paid' : 'In Transit'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(payout.arrival_date * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        {payouts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Payouts typically arrive in your bank account within 2-7 business days after the booking is completed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
