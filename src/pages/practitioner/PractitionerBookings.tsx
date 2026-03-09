import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, DollarSign, User, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SameDayBookingApproval } from '@/components/practitioner/SameDayBookingApproval';

interface Booking {
  id: string;
  product_name: string;
  product_description: string;
  amount_paid: number;
  platform_fee: number;
  practitioner_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  booking_date: string;
  session_date?: string;
  client_email: string;
  client_name: string;
  client: {
    first_name: string;
    last_name: string;
  };
}

export const PractitionerBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    completedSessions: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    if (user) {
      loadBookings();
      loadPendingBookings();
    }
  }, [user]);

  const loadPendingBookings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .rpc('get_pending_same_day_bookings', {
          p_practitioner_id: user.id
        });
      if (error) throw error;
      setPendingBookings(data || []);
    } catch (error: any) {
      console.error('Error loading pending bookings:', error);
    }
  };

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketplace_bookings')
        .select(`
          *,
          client:users!client_id(first_name, last_name)
        `)
        .eq('practitioner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setBookings(data || []);
      
      // Calculate stats
      const totalBookings = data?.length || 0;
      const totalRevenue = data?.reduce((sum, b) => sum + b.practitioner_amount, 0) || 0;
      const completedSessions = data?.filter(b => b.status === 'completed').length || 0;
      const pendingPayments = data?.filter(b => b.status === 'paid').length || 0;
      
      setStats({
        totalBookings,
        totalRevenue,
        completedSessions,
        pendingPayments
      });
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'refunded':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">Manage your marketplace bookings and track revenue</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Bookings</TabsTrigger>
          <TabsTrigger value="pending-approval">
            Pending Approval
            {pendingBookings.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingBookings.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending-approval" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Same-Day Bookings Requiring Approval</CardTitle>
              <CardDescription>
                Review and approve or decline same-day booking requests. Payment authorization is held until you approve.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SameDayBookingApproval 
                practitionerId={user?.id || ''} 
                onApprovalChange={loadBookings}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">£{(stats.totalRevenue / 100).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completedSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't received any bookings through the marketplace yet.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Manage Your Services
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{booking.product_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Client: {booking.client.first_name} {booking.client.last_name}
                    </p>
                  </div>
                  <Badge className={getStatusColor(booking.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(booking.status)}
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Booked: {new Date(booking.booking_date).toLocaleDateString()}
                      </span>
                    </div>
                    {booking.session_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Session: {new Date(booking.session_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-semibold">You receive: £{(booking.practitioner_amount / 100).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Client paid: £{(booking.amount_paid / 100).toFixed(2)} (Platform fee: £{(booking.platform_fee / 100).toFixed(2)})
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.client_email}</span>
                    </div>
                    {booking.product_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {booking.product_description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
