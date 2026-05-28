import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Clock, Calendar, User, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { NotificationSystem } from '@/lib/notification-system';
import { generateMapsUrl } from '@/emails/utils/maps';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface MobileRequest {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  product_id: string;
  product_name: string;
  service_type: string;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number;
  client_address: string;
  client_latitude: number;
  client_longitude: number;
  distance_from_base_km: number;
  total_price_pence: number;
  payment_status: string;
  status: string;
  session_id?: string | null;
  stripe_payment_intent_id?: string;
  decline_reason?: string;
  alternate_date?: string;
  alternate_start_time?: string;
  alternate_suggestions?: any;
  client_notes?: string;
  created_at: string;
  expires_at: string | null;
}

const dedupeMobileRequests = (rows: MobileRequest[]): MobileRequest[] => {
  const byId = new Map<string, MobileRequest>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      byId.set(row.id, row);
    }
  }

  // Defensive second pass: collapse semantically duplicated rows that can appear from data anomalies.
  const bySignature = new Map<string, MobileRequest>();
  for (const row of byId.values()) {
    const signature = [
      row.client_id,
      row.product_id,
      row.requested_date,
      row.requested_start_time,
      row.status,
    ].join('|');

    const existing = bySignature.get(signature);
    if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      bySignature.set(signature, row);
    }
  }

  return Array.from(bySignature.values()).sort((a, b) => {
    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    return createdB - createdA;
  });
};

export const MobileRequestManagement: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<MobileRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MobileRequest | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [alternateDate, setAlternateDate] = useState('');
  const [alternateTime, setAlternateTime] = useState('');
  const [processing, setProcessing] = useState(false);
  const focusedRequestId = searchParams.get('requestId');

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  // Tick every 15s when there are pending requests - refetch to pick up server-side expiry (cron) and keep client-side expiry accurate
  const [expiryTick, setExpiryTick] = useState(0);
  const hasPending = requests.some((r) => r.status === 'pending');
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => setExpiryTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, [hasPending]);
  useEffect(() => {
    if (hasPending && expiryTick > 0) loadRequests();
  }, [expiryTick]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_practitioner_mobile_requests', {
        p_practitioner_id: user.id,
        p_status: null // Get all requests
      });

      if (error) throw error;
      setRequests(dedupeMobileRequests((data || []) as MobileRequest[]));
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load mobile requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
    const paymentReady = selectedRequest.payment_status === 'held' || selectedRequest.payment_status === 'captured';
    if (!selectedRequest.stripe_payment_intent_id || !paymentReady) {
      toast.error('Cannot accept this request yet. Payment authorization hold is not completed.');
      return;
    }

    setProcessing(true);
    try {
      // Capture payment only when held; some methods (e.g. wallets) auto-capture per Stripe docs
      if (selectedRequest.payment_status === 'held') {
        const { error: captureError } = await supabase.functions.invoke('mobile-payment', {
          body: {
            action: 'capture-mobile-payment',
            payment_intent_id: selectedRequest.stripe_payment_intent_id
          }
        });

        if (captureError) throw captureError;
      }

      // Accept request
      const { data, error } = await supabase.rpc('accept_mobile_booking_request', {
        p_request_id: selectedRequest.id,
        p_stripe_payment_intent_id: selectedRequest.stripe_payment_intent_id
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to accept request');
      }

      await NotificationSystem.sendMobileBookingAcceptedNotification(selectedRequest.client_id, {
        requestId: selectedRequest.id,
        practitionerName:
          `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'Your practitioner',
        serviceType: selectedRequest.product_name,
        sessionDate: selectedRequest.requested_date,
        sessionTime: selectedRequest.requested_start_time,
        clientAddress: selectedRequest.client_address,
        pricePence: selectedRequest.total_price_pence,
      });

      toast.success('Request accepted! Payment captured and session created.');
      setShowAcceptDialog(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      const msg = error?.message || 'Failed to accept request';
      const isNetwork = /fetch|network|timeout|offline/i.test(msg) || error?.name === 'TypeError';
      toast.error(isNetwork ? 'Connection issue. Check your network and try again.' : msg, {
        description: isNetwork ? 'The dialog stays open – you can retry.' : undefined,
        duration: isNetwork ? 8000 : 5000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    if (selectedRequest.payment_status === 'captured') {
      toast.error('Payment already captured. Please accept the request or contact support for a refund.');
      return;
    }
    if (!selectedRequest.stripe_payment_intent_id || selectedRequest.payment_status !== 'held') {
      toast.error('Cannot decline this request yet. Payment authorization hold is not completed.');
      return;
    }

    setProcessing(true);
    try {
      // Release payment
      const { error: releaseError } = await supabase.functions.invoke('mobile-payment', {
        body: {
          action: 'release-mobile-payment',
          payment_intent_id: selectedRequest.stripe_payment_intent_id
        }
      });

      if (releaseError) throw releaseError;

      // Decline request
      const { data, error } = await supabase.rpc('decline_mobile_booking_request', {
        p_request_id: selectedRequest.id,
        p_decline_reason: declineReason || null,
        p_alternate_date: alternateDate || null,
        p_alternate_start_time: alternateTime || null,
        p_alternate_suggestions: alternateDate && alternateTime ? {
          date: alternateDate,
          time: alternateTime,
          reason: declineReason
        } : null
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to decline request');
      }

      await NotificationSystem.sendMobileBookingDeclinedNotification(selectedRequest.client_id, {
        requestId: selectedRequest.id,
        practitionerName:
          `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'Your practitioner',
        serviceType: selectedRequest.product_name,
        requestedDate: selectedRequest.requested_date,
        requestedTime: selectedRequest.requested_start_time,
        declineReason: declineReason || null,
        alternateDate: alternateDate || null,
        alternateTime: alternateTime || null,
      });

      toast.success('Request declined. Payment released.');
      setShowDeclineDialog(false);
      setSelectedRequest(null);
      setDeclineReason('');
      setAlternateDate('');
      setAlternateTime('');
      loadRequests();
    } catch (error: any) {
      console.error('Error declining request:', error);
      const msg = error?.message || 'Failed to decline request';
      const isNetwork = /fetch|network|timeout|offline/i.test(msg) || error?.name === 'TypeError';
      toast.error(isNetwork ? 'Connection issue. Check your network and try again.' : msg, {
        description: isNetwork ? 'The dialog stays open – you can retry.' : undefined,
        duration: isNetwork ? 8000 : 5000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const isExpiredPending = (request: MobileRequest) => {
    if (request.status !== 'pending' || !request.expires_at) return false;
    const expiryMs = new Date(request.expires_at).getTime();
    return Number.isFinite(expiryMs) && expiryMs <= Date.now();
  };

  const getEffectiveStatus = (request: MobileRequest) => {
    if (request.status === 'expired' || isExpiredPending(request)) return 'expired';
    return request.status;
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (paymentStatus === 'payment_failed') {
      return (
        <Badge variant="destructive" className="bg-amber-100 text-amber-800 border-amber-300">
          Payment failed
        </Badge>
      );
    }
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
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
                    <div className="h-4 w-48 rounded-md bg-muted animate-pulse" />
                  </div>
                  <div className="h-6 w-20 rounded-md bg-muted animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-1">
                      <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
                  <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Only show pending (actionable) and accepted (completed/confirmed bookings); hide declined, cancelled, expired
  const visibleRequests = requests.filter((request) => {
    const status = getEffectiveStatus(request);
    return status === 'pending' || status === 'accepted';
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mobile Booking Requests</h2>
      </div>

      {visibleRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No mobile booking requests yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Mobile requests appear when clients book home visits. Add mobile or hybrid services to your products and set your service area to start receiving requests.
            </p>
            <Button variant="outline" onClick={() => window.location.assign('/practice/products')}>
              Manage products & availability
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleRequests.map((request) => (
            <Card key={request.id} className={focusedRequestId === request.id ? 'ring-2 ring-primary/40' : ''}>
              {(() => {
                const effectiveStatus = getEffectiveStatus(request);
                return (
                  <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {request.client_name}
                    </CardTitle>
                    <CardDescription>{request.client_email}</CardDescription>
                  </div>
                  {getStatusBadge(effectiveStatus, request.payment_status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Service</Label>
                    <p className="font-medium">{request.product_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p className="font-medium">{formatCurrency(request.total_price_pence / 100)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date & Time</Label>
                    <p className="font-medium">
                      {new Date(request.requested_date).toLocaleDateString()} at {request.requested_start_time.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <p className="font-medium">{request.duration_minutes} minutes</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Client Address</Label>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <a
                          href={generateMapsUrl(request.client_address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {request.client_address}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {request.distance_from_base_km && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {request.distance_from_base_km.toFixed(1)} km from your base
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {request.client_notes && (
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Client Notes</Label>
                      <p className="text-sm">{request.client_notes}</p>
                    </div>
                  )}
                </div>

                {effectiveStatus === 'accepted' && request.session_id && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="default"
                      onClick={() => navigate(`/practice/clients?session=${request.session_id}&tab=sessions`)}
                    >
                      View session
                    </Button>
                  </div>
                )}

                {effectiveStatus === 'pending' && (
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    {request.payment_status === 'payment_failed' ? (
                      <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Payment failed (card declined or 3DS failed). Ask the client to retry with a different card or payment method.
                      </div>
                    ) : (request.payment_status !== 'held' && request.payment_status !== 'captured') ? (
                      <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Waiting for client payment authorization before you can accept or decline.
                      </div>
                    ) : (
                      <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowAcceptDialog(true);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    {/* Decline only when held; captured payments require refund, not release */}
                    {request.payment_status === 'held' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDeclineDialog(true);
                      }}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                    )}
                      </div>
                    )}
                  </div>
                )}

                {effectiveStatus === 'declined' && request.decline_reason && (
                  <div className="pt-4 border-t">
                    <Label className="text-xs text-muted-foreground">Decline Reason</Label>
                    <p className="text-sm">{request.decline_reason}</p>
                    {request.alternate_date && request.alternate_start_time && (
                      <p className="text-sm mt-2">
                        Suggested alternate: {new Date(request.alternate_date).toLocaleDateString()} at {request.alternate_start_time}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
                  </>
                );
              })()}
            </Card>
          ))}
        </div>
      )}

      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Mobile Booking Request</DialogTitle>
            <DialogDescription>
              Accepting this request will capture the payment and create a session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Client:</strong> {selectedRequest.client_name}</p>
                <p><strong>Service:</strong> {selectedRequest.product_name}</p>
                <p><strong>Date:</strong> {new Date(selectedRequest.requested_date).toLocaleDateString()} at {selectedRequest.requested_start_time}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedRequest.total_price_pence / 100)}</p>
                <div>
                  <p><strong>Address:</strong></p>
                  <a
                    href={generateMapsUrl(selectedRequest.client_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <MapPin className="h-4 w-4" />
                    {selectedRequest.client_address}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {selectedRequest.distance_from_base_km && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedRequest.distance_from_base_km.toFixed(1)} km from your base
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAcceptDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAccept} disabled={processing} className="flex-1">
                {processing ? 'Processing...' : 'Accept & Capture Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Mobile Booking Request</DialogTitle>
            <DialogDescription>
              Declining this request will release the payment hold. You can optionally suggest an alternate date/time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Decline (Optional)</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g., Unavailable on this date, too far from base..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Suggested Alternate Date (Optional)</Label>
                <Input
                  type="date"
                  value={alternateDate}
                  onChange={(e) => setAlternateDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label>Suggested Alternate Time (Optional)</Label>
                <Input
                  type="time"
                  value={alternateTime}
                  onChange={(e) => setAlternateTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeclineDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={processing}
                className="flex-1"
              >
                {processing ? 'Processing...' : 'Decline & Release Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
