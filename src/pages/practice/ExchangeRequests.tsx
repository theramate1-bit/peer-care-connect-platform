import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Inbox, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Star,
  MapPin,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TreatmentExchangeService, ExchangeRequest } from '@/lib/treatment-exchange';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ExchangeRequests: React.FC = () => {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState<{
    sent: ExchangeRequest[];
    received: ExchangeRequest[];
  }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('received');
  const [selectedRequest, setSelectedRequest] = useState<ExchangeRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadRequests();
    }
  }, [userProfile]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await TreatmentExchangeService.getExchangeRequests(userProfile?.id!);
      setRequests(data);
    } catch (error) {
      console.error('Error loading exchange requests:', error);
      toast.error('Failed to load exchange requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return;

    try {
      setResponding(true);
      await TreatmentExchangeService.acceptExchangeRequest(
        selectedRequest.id,
        userProfile?.id!,
        responseNotes
      );
      
      toast.success('Exchange request accepted!');
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseNotes('');
      loadRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept request');
    } finally {
      setResponding(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedRequest) return;

    try {
      setResponding(true);
      await TreatmentExchangeService.declineExchangeRequest(
        selectedRequest.id,
        userProfile?.id!,
        responseNotes
      );
      
      toast.success('Exchange request declined');
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseNotes('');
      loadRequests();
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to decline request');
    } finally {
      setResponding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'declined': return <XCircle className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading exchange requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Exchange Requests</h1>
        <p className="text-muted-foreground">
          Manage your treatment exchange requests
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'received' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('received')}
          className="flex-1"
        >
          <Inbox className="h-4 w-4 mr-2" />
          Received ({requests.received.length})
        </Button>
        <Button
          variant={activeTab === 'sent' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('sent')}
          className="flex-1"
        >
          <Send className="h-4 w-4 mr-2" />
          Sent ({requests.sent.length})
        </Button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {(activeTab === 'received' ? requests.received : requests.sent).map((request) => {
          const otherUser = activeTab === 'received' ? request.requester : request.recipient;
          const isRequestExpired = isExpired(request.expires_at);
          
          return (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherUser?.profile_photo_url} />
                      <AvatarFallback>
                        {otherUser?.first_name[0]}{otherUser?.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        {otherUser?.first_name} {otherUser?.last_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          {getRoleDisplayName(otherUser?.user_role || '')}
                        </Badge>
                        {otherUser?.average_rating && otherUser.average_rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {otherUser.average_rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(request.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </Badge>
                    {isRequestExpired && request.status === 'pending' && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(request.requested_session_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{request.requested_start_time} - {request.requested_end_time}</span>
                  </div>
                </div>

                {request.session_type && (
                  <div className="text-sm">
                    <span className="font-medium">Session Type:</span> {request.session_type}
                  </div>
                )}

                {request.requester_notes && (
                  <div className="text-sm">
                    <span className="font-medium">Notes:</span> {request.requester_notes}
                  </div>
                )}

                {request.recipient_notes && (
                  <div className="text-sm">
                    <span className="font-medium">Response:</span> {request.recipient_notes}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Requested {format(new Date(request.created_at), 'MMM dd, yyyy at h:mm a')}
                  {request.expires_at && (
                    <span> • Expires {format(new Date(request.expires_at), 'MMM dd, yyyy at h:mm a')}</span>
                  )}
                </div>

                {/* Action Buttons */}
                {activeTab === 'received' && request.status === 'pending' && !isRequestExpired && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowResponseModal(true);
                      }}
                      size="sm"
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Respond
                    </Button>
                  </div>
                )}

                {activeTab === 'sent' && request.status === 'pending' && !isRequestExpired && (
                  <div className="text-sm text-muted-foreground">
                    Waiting for response...
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {(activeTab === 'received' ? requests.received : requests.sent).length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No {activeTab} requests
            </h3>
            <p className="text-muted-foreground">
              {activeTab === 'received' 
                ? 'You haven\'t received any exchange requests yet.'
                : 'You haven\'t sent any exchange requests yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Respond to Request</CardTitle>
                <CardDescription>
                  {selectedRequest.requester?.first_name} {selectedRequest.requester?.last_name} wants to exchange treatments
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResponseModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="response-notes">Response Notes (Optional)</Label>
                <Textarea
                  id="response-notes"
                  placeholder="Add any notes about your response..."
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleDeclineRequest}
                  disabled={responding}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  onClick={handleAcceptRequest}
                  disabled={responding}
                  className="flex-1"
                >
                  {responding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Responding...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Accept
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ExchangeRequests;
