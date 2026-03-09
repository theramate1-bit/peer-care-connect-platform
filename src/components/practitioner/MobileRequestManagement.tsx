import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Clock, Calendar, User, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { NotificationSystem } from '@/lib/notification-system';
import { generateMapsUrl } from '@/emails/utils/maps';
import { useSearchParams } from 'react-router-dom';

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
    const dateCompare = new Date(a.requested_date).getTime() - new Date(b.requested_date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.requested_start_time.localeCompare(b.requested_start_time);
  });
};

export const MobileRequestManagement: React.FC = () => {
  const { user, userProfile } = useAuth();
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
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);
  const focusedRequestId = searchParams.get('requestId');

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

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
    if (!selectedRequest.stripe_payment_intent_id || selectedRequest.payment_status !== 'held') {
      toast.error('Cannot accept this request yet. Payment authorization hold is not completed.');
      return;
    }

    setProcessing(true);
    try {
      // Capture payment
      const { error: captureError } = await supabase.functions.invoke('mobile-payment', {
        body: {
          action: 'capture-mobile-payment',
          payment_intent_id: selectedRequest.stripe_payment_intent_id
        }
      });

      if (captureError) throw captureError;

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
      toast.error(error?.message || 'Failed to accept request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
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
      toast.error(error?.message || 'Failed to decline request');
    } finally {
      setProcessing(false);
    }
  };

  const handleResendRequestNotification = async (request: MobileRequest) => {
    if (!user?.id) return;
    setResendLoadingId(request.id);
    try {
      await NotificationSystem.sendMobileBookingRequestNotification(user.id, {
        requestId: request.id,
        clientName: request.client_name,
        serviceType: request.product_name,
        requestedDate: request.requested_date,
        requestedTime: request.requested_start_time,
        clientAddress: request.client_address,
        distanceKm: request.distance_from_base_km,
        price: request.total_price_pence,
      });
      toast.success('Email resent');
    } catch (error: any) {
      console.error('Error resending request notification:', error);
      toast.error('Failed to resend email');
    } finally {
      setResendLoadingId(null);
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

  const getStatusBadge = (status: string) => {
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

  const visibleRequests = requests.filter((request) => getEffectiveStatus(request) !== 'expired');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mobile Booking Requests</h2>
      </div>

      {visibleRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No mobile booking requests yet.
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
                  {getStatusBadge(effectiveStatus)}
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

                {effectiveStatus === 'pending' && (
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    {request.payment_status !== 'held' ? (
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
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      disabled={resendLoadingId === request.id}
                      onClick={() => handleResendRequestNotification(request)}
                    >
                      {resendLoadingId === request.id ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Resend request notification
                    </Button>
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
