import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, DollarSign, User, CheckCircle, XCircle, AlertCircle, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ServiceReviewForm } from '@/components/reviews/ServiceReviewForm';

interface Booking {
  id: string;
  product_id: string;
  practitioner_id: string;
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
  has_review?: boolean;
  practitioner: {
    first_name: string;
    last_name: string;
  };
}

export const ClientBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketplace_bookings')
        .select(`
          *,
          practitioner:users!practitioner_id(first_name, last_name)
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
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
        <p className="text-muted-foreground">View all your marketplace bookings and payments</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't made any bookings through the marketplace yet.
            </p>
            <Button onClick={() => window.location.href = '/marketplace'}>
              Browse Services
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
                      with {booking.practitioner.first_name} {booking.practitioner.last_name}
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
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Amount Paid: £{(booking.amount_paid / 100).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Platform fee: £{(booking.platform_fee / 100).toFixed(2)}
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
                
                {/* Review Button for Completed Bookings */}
                {(booking.status === 'completed' || booking.status === 'paid') && !booking.has_review && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewingBooking(booking)}
                      className="w-full"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Leave a Review
                    </Button>
                  </div>
                )}
                
                {booking.has_review && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Review submitted
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Review Dialog */}
      {reviewingBooking && (
        <Dialog open={!!reviewingBooking} onOpenChange={() => setReviewingBooking(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review: {reviewingBooking.product_name}</DialogTitle>
            </DialogHeader>
            <ServiceReviewForm
              bookingId={reviewingBooking.id}
              productId={reviewingBooking.product_id}
              practitionerId={reviewingBooking.practitioner_id}
              onReviewSubmitted={() => {
                setReviewingBooking(null);
                loadBookings(); // Refresh to show updated status
                toast.success('Thank you for your review!');
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
