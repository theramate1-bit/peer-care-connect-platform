import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Calendar, User, CheckCircle, XCircle, AlertCircle, RefreshCw, X, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { MobileBookingRequestFlow } from '@/components/marketplace/MobileBookingRequestFlow';
import { NotificationSystem } from '@/lib/notification-system';

interface MobileRequest {
  id: string;
  client_id?: string;
  practitioner_id: string;
  practitioner_name: string;
  product_id: string;
  product_name: string;
  service_type: string;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number;
  client_address: string;
  total_price_pence: number;
  payment_status: string;
  status: string;
  decline_reason?: string;
  alternate_date?: string;
  alternate_start_time?: string;
  alternate_suggestions?: any;
  client_notes?: string;
  created_at: string;
  expires_at: string;
  stripe_payment_intent_id?: string | null;
  session_id?: string | null;
}

export const MobileRequestStatus: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const guestEmail = searchParams.get('email');
  const focusedRequestId = searchParams.get('requestId');
  const [emailInput, setEmailInput] = useState('');
  const [requests, setRequests] = useState<MobileRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MobileRequest | null>(null);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [cancelConfirmRequest, setCancelConfirmRequest] = useState<MobileRequest | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [practitioner, setPractitioner] = useState<{
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    therapist_type?: 'clinic_based' | 'mobile' | 'hybrid';
    mobile_service_radius_km?: number;
    stripe_connect_account_id?: string | null;
    base_latitude?: number | null;
    base_longitude?: number | null;
    clinic_latitude?: number | null;
    clinic_longitude?: number | null;
    products?: Array<{
      id: string;
      name: string;
      description: string;
      price_amount: number;
      currency: string;
      duration_minutes: number;
      service_type?: 'clinic' | 'mobile' | 'both';
      is_active: boolean;
    }>;
  } | null>(null);

  useEffect(() => {
    loadRequests();
  }, [user, guestEmail]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      if (user) {
        const { data, error } = await supabase.rpc('get_client_mobile_requests', {
          p_client_id: user.id,
          p_status: null
        });
        if (error) throw error;
        const nextRequests = data || [];
        setRequests(nextRequests);

        for (const request of nextRequests) {
          if (request.status !== 'expired') continue;
          const dedupeKey = `mobile_expiry_email_sent_${request.id}`;
          if (localStorage.getItem(dedupeKey)) continue;

          try {
            await NotificationSystem.sendMobileBookingExpiredNotification(user.id, {
              requestId: request.id,
              practitionerName: request.practitioner_name,
              serviceType: request.product_name,
              requestedDate: request.requested_date,
              requestedTime: request.requested_start_time,
            });
            localStorage.setItem(dedupeKey, new Date().toISOString());
          } catch (notifyError) {
            console.error('Failed to send expiry email notification:', notifyError);
          }
        }
      } else if (guestEmail) {
        const { data, error } = await supabase.rpc('get_guest_mobile_requests_by_email', {
          p_email: guestEmail,
          p_status: null
        });
        if (error) throw error;
        const guestRequests = data || [];
        setRequests(guestRequests);

        for (const request of guestRequests) {
          if (request.status !== 'expired' || !request.client_id) continue;
          const dedupeKey = `mobile_expiry_email_sent_${request.id}`;
          if (localStorage.getItem(dedupeKey)) continue;

          try {
            await NotificationSystem.sendMobileBookingExpiredNotification(request.client_id, {
              requestId: request.id,
              practitionerName: request.practitioner_name,
              serviceType: request.product_name,
              requestedDate: request.requested_date,
              requestedTime: request.requested_start_time,
            });
            localStorage.setItem(dedupeKey, new Date().toISOString());
          } catch (notifyError) {
            console.error('Failed to send expiry email notification:', notifyError);
          }
        }
      } else {
        setRequests([]);
      }

    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load mobile requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAlternate = async (request: MobileRequest) => {
    if (!request.alternate_date || !request.alternate_start_time) return;

    try {
      // Load practitioner details
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('users')
        .select('*, products:practitioner_products(*)')
        .eq('id', request.practitioner_id)
        .single();

      if (practitionerError) throw practitionerError;

      setPractitioner(practitionerData);
      setSelectedRequest(request);
      setShowNewRequestDialog(true);
    } catch (error: any) {
      console.error('Error loading practitioner:', error);
      toast.error('Failed to load practitioner details');
    }
  };

  const handleRequestNew = async (request: MobileRequest) => {
    try {
      // Load practitioner details
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('users')
        .select('*, products:practitioner_products(*)')
        .eq('id', request.practitioner_id)
        .single();

      if (practitionerError) throw practitionerError;

      setPractitioner(practitionerData);
      setSelectedRequest(null);
      setShowNewRequestDialog(true);
    } catch (error: any) {
      console.error('Error loading practitioner:', error);
      toast.error('Failed to load practitioner details');
    }
  };

  const handleCancelRequest = async (request: MobileRequest) => {
    if (!user && !guestEmail) return;
    setCancellingId(request.id);
    try {
      if (request.payment_status === 'held' && request.stripe_payment_intent_id) {
        const { error: releaseError } = await supabase.functions.invoke('mobile-payment', {
          body: {
            action: 'release-mobile-payment',
            payment_intent_id: request.stripe_payment_intent_id,
          },
        });
        if (releaseError) throw releaseError;
      }
      if (user) {
        const { error: updateError } = await supabase
          .from('mobile_booking_requests')
          .update({ status: 'cancelled', payment_status: 'released' })
          .eq('id', request.id)
          .eq('client_id', user.id)
          .eq('status', 'pending');
        if (updateError) throw updateError;
      } else if (guestEmail) {
        const { data: cancelResult, error: cancelError } = await supabase.rpc(
          'cancel_guest_mobile_request_by_email',
          {
            p_request_id: request.id,
            p_email: guestEmail,
          }
        );
        if (cancelError) throw cancelError;
        if (!cancelResult?.success) {
          throw new Error(cancelResult?.error || 'Failed to cancel request');
        }
      }
      toast.success('Request cancelled. Any payment hold has been released.');
      setCancelConfirmRequest(null);
      loadRequests();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error(error?.message || 'Failed to cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === 'accepted') {
      return <Badge variant="outline" className="border-primary/20 text-foreground">Accepted</Badge>;
    } else if (status === 'declined') {
      return <Badge variant="outline" className="border-gray-200 text-gray-700">Declined</Badge>;
    } else if (status === 'expired') {
      return <Badge variant="outline" className="border-gray-200 text-gray-700">Expired</Badge>;
    } else if (status === 'cancelled') {
      return <Badge variant="outline" className="border-gray-200 text-gray-700">Cancelled</Badge>;
    } else {
      return <Badge variant="outline" className="border-primary/20 text-muted-foreground">Pending</Badge>;
    }
  };

  if (loading) {
    return <div>Loading mobile requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{user ? 'My Mobile Booking Requests' : 'Guest Mobile Booking Requests'}</h2>
      </div>

      {!user && !guestEmail && (
        <Card>
          <CardContent className="py-8 space-y-4">
            <p className="text-center text-muted-foreground">
              View your mobile booking request status. Enter the email address you used when making the request.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = emailInput.trim();
                if (trimmed) {
                  setSearchParams({ email: trimmed });
                } else {
                  toast.error('Please enter your email address');
                }
              }}
            >
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">View my requests</Button>
            </form>
            <p className="text-xs text-center text-muted-foreground">
              Or use the link from your confirmation email for quick access.
            </p>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {user || guestEmail ? 'No mobile booking requests yet.' : 'No request link provided.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className={focusedRequestId === request.id ? 'ring-2 ring-primary/40' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {request.practitioner_name}
                    </CardTitle>
                    <CardDescription>
                      {request.product_name} · {new Date(request.requested_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {request.requested_start_time.includes(':') && request.requested_start_time.split(':').length === 3 ? request.requested_start_time.slice(0, 5) : request.requested_start_time}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status, request.payment_status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date & Time</Label>
                    <p className="font-medium">
                      {new Date(request.requested_date).toLocaleDateString()} at {request.requested_start_time.includes(':') && request.requested_start_time.split(':').length === 3 ? request.requested_start_time.slice(0, 5) : request.requested_start_time}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p className="font-medium">{formatCurrency(request.total_price_pence / 100)}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Your Address</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {request.client_address}
                    </p>
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Waiting for practitioner to respond...
                    </p>
                    {(user || guestEmail) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground"
                        disabled={cancellingId === request.id}
                        onClick={() => setCancelConfirmRequest(request)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel request
                      </Button>
                    )}
                  </div>
                )}

                {request.status === 'accepted' && (
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <p className="font-medium">Request accepted! Payment captured.</p>
                    </div>
                    {request.session_id && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          navigate(
                            user
                              ? `/client/sessions?sessionId=${request.session_id}`
                              : `/booking/view/${request.session_id}`
                          )
                        }
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        View session
                      </Button>
                    )}
                  </div>
                )}

                {request.status === 'declined' && (
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-start gap-2 text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                      <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Request declined</p>
                        {request.decline_reason && (
                          <p className="text-sm mt-1">{request.decline_reason}</p>
                        )}
                      </div>
                    </div>
                    {request.alternate_date && request.alternate_start_time && (
                      <div className="p-3 bg-muted/20 rounded-lg border border-primary/20">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Practitioner suggested alternate date/time:
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.alternate_date).toLocaleDateString()} at {request.alternate_start_time}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Submit a new request for this date and time.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptAlternate(request)}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Request for suggested time
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestNew(request)}
                            className="flex-1"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Request Different Time
                          </Button>
                        </div>
                      </div>
                    )}
                    {!request.alternate_date && (
                      <Button
                        variant="outline"
                        onClick={() => handleRequestNew(request)}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Request Different Time
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel request confirmation */}
      <Dialog open={!!cancelConfirmRequest} onOpenChange={(open) => !open && setCancelConfirmRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel request</DialogTitle>
            <DialogDescription>
              Cancel this mobile booking request? Any payment hold will be released and the practitioner will no longer see it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setCancelConfirmRequest(null)}>
              Keep request
            </Button>
            <Button
              variant="destructive"
              disabled={cancellingId === cancelConfirmRequest?.id}
              onClick={() => cancelConfirmRequest && handleCancelRequest(cancelConfirmRequest)}
            >
              {cancellingId === cancelConfirmRequest?.id ? 'Cancelling...' : 'Cancel request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      {showNewRequestDialog && practitioner && (
        <MobileBookingRequestFlow
          open={showNewRequestDialog}
          onOpenChange={(open) => {
            setShowNewRequestDialog(open);
            if (!open) {
              loadRequests(); // Reload requests when dialog closes
            }
          }}
          practitioner={practitioner}
          initialDate={selectedRequest?.alternate_date}
          initialTime={selectedRequest?.alternate_start_time}
        />
      )}
    </div>
  );
};
