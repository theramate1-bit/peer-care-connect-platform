import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDateSafe, formatTimeHHMM } from '@/lib/date';

interface PendingBooking {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  approval_expires_at: string | null;
  created_at: string;
  notes: string | null;
}

interface SameDayBookingApprovalProps {
  practitionerId: string;
  onApprovalChange?: () => void;
}

export const SameDayBookingApproval: React.FC<SameDayBookingApprovalProps> = ({
  practitionerId,
  onApprovalChange
}) => {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingBookings();
    
    // Set up real-time subscription for pending bookings
    const channel = supabase
      .channel('same-day-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_sessions',
          filter: `therapist_id=eq.${practitionerId}`
        },
        () => {
          fetchPendingBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [practitionerId]);

  const fetchPendingBookings = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_pending_same_day_bookings', {
          p_practitioner_id: practitionerId
        });

      if (error) throw error;
      setPendingBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching pending bookings:', error);
      toast.error('Failed to load pending bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      // First, get the session to find payment intent ID
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('stripe_payment_intent_id')
        .eq('id', bookingId)
        .single();

      if (sessionError || !session?.stripe_payment_intent_id) {
        throw new Error('Payment intent not found');
      }

      // Call RPC to approve booking (updates status)
      const { data, error } = await supabase
        .rpc('approve_same_day_booking', {
          p_session_id: bookingId,
          p_practitioner_id: practitionerId
        });

      if (error) throw error;

      if (data?.success) {
        // Call edge function to capture payment
        const { error: captureError } = await supabase.functions.invoke('stripe-payment', {
          body: {
            action: 'capture-same-day-payment',
            session_id: bookingId,
            payment_intent_id: session.stripe_payment_intent_id
          }
        });

        if (captureError) {
          console.error('Payment capture error:', captureError);
          toast.error('Booking approved but payment capture failed. Please contact support.');
        } else {
          toast.success('Booking approved. Payment captured.');
        }

        await fetchPendingBookings();
        onApprovalChange?.();
      } else {
        throw new Error(data?.error || 'Failed to approve booking');
      }
    } catch (error: any) {
      console.error('Error approving booking:', error);
      toast.error(error.message || 'Failed to approve booking');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const reason = declineReason[bookingId] || null;
      
      // First, get the session to find payment intent ID
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('stripe_payment_intent_id')
        .eq('id', bookingId)
        .single();

      if (sessionError) {
        throw new Error('Session not found');
      }

      // Call RPC to decline booking (updates status)
      const { data, error } = await supabase
        .rpc('decline_same_day_booking', {
          p_session_id: bookingId,
          p_practitioner_id: practitionerId,
          p_reason: reason
        });

      if (error) throw error;

      if (data?.success) {
        // Call edge function to release payment authorization
        if (session.stripe_payment_intent_id) {
          const { error: releaseError } = await supabase.functions.invoke('stripe-payment', {
            body: {
              action: 'release-same-day-payment',
              session_id: bookingId,
              payment_intent_id: session.stripe_payment_intent_id
            }
          });

          if (releaseError) {
            console.error('Payment release error:', releaseError);
            toast.error('Booking declined but payment release failed. Please contact support.');
          } else {
            toast.success('Booking declined. Payment authorization has been released.');
          }
        } else {
          toast.success('Booking declined.');
        }

        setDeclineReason(prev => {
          const next = { ...prev };
          delete next[bookingId];
          return next;
        });
        await fetchPendingBookings();
        onApprovalChange?.();
      } else {
        throw new Error(data?.error || 'Failed to decline booking');
      }
    } catch (error: any) {
      console.error('Error declining booking:', error);
      toast.error(error.message || 'Failed to decline booking');
    } finally {
      setProcessingId(null);
    }
  };

  const getTimeRemaining = (expiresAt: string | null): string | null => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isExpiringSoon = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    return diffMs > 0 && diffMs < 30 * 60 * 1000; // Less than 30 minutes
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingBookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No pending same-day bookings requiring approval</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingBookings.map((booking) => {
        const timeRemaining = getTimeRemaining(booking.approval_expires_at);
        const expiringSoon = isExpiringSoon(booking.approval_expires_at);
        const isProcessing = processingId === booking.id;

        return (
          <Card key={booking.id} className={expiringSoon ? 'border-orange-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {booking.client_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateSafe(booking.session_date, 'short')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTimeHHMM(booking.start_time)}
                    </span>
                    <span className="font-medium">{booking.duration_minutes} min</span>
                  </CardDescription>
                </div>
                <Badge variant={expiringSoon ? 'destructive' : 'secondary'}>
                  {booking.session_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Service:</span>
                  <span className="ml-2 font-medium">{booking.session_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <span className="ml-2 font-medium">£{(booking.price / 100).toFixed(2)}</span>
                </div>
                {booking.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-1 text-sm">{booking.notes}</p>
                  </div>
                )}
              </div>

              {booking.approval_expires_at && (
                <Alert variant={expiringSoon ? 'destructive' : 'default'}>
                  <Timer className="h-4 w-4" />
                  <AlertDescription>
                    Approval deadline: {timeRemaining || 'Expired'}
                    {expiringSoon && ' - Please respond soon!'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor={`decline-reason-${booking.id}`}>Decline reason (optional)</Label>
                <Textarea
                  id={`decline-reason-${booking.id}`}
                  placeholder="Optional reason for declining this booking..."
                  value={declineReason[booking.id] || ''}
                  onChange={(e) =>
                    setDeclineReason(prev => ({
                      ...prev,
                      [booking.id]: e.target.value
                    }))
                  }
                  disabled={isProcessing}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(booking.id)}
                  disabled={isProcessing || timeRemaining === 'Expired'}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleDecline(booking.id)}
                  disabled={isProcessing || timeRemaining === 'Expired'}
                  className="flex-1"
                  variant="outline"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
