import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  FileText, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { PatientHistoryRequestService, PatientHistoryRequest, HistoryRequestSummary } from '@/lib/patient-history-request-service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PatientHistoryRequestListProps {
  mode: 'incoming' | 'outgoing'; // 'incoming' = requests for me to approve, 'outgoing' = my requests
  onRequestUpdated?: () => void;
}

export const PatientHistoryRequestList: React.FC<PatientHistoryRequestListProps> = ({
  mode,
  onRequestUpdated
}) => {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState<PatientHistoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PatientHistoryRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [transferSummary, setTransferSummary] = useState<HistoryRequestSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      loadRequests();
    }
  }, [userProfile?.id, mode]);

  const loadRequests = async () => {
    if (!userProfile?.id) return;

    setLoading(true);
    try {
      const data = mode === 'incoming'
        ? await PatientHistoryRequestService.getPendingRequestsForMe(userProfile.id)
        : await PatientHistoryRequestService.getMyRequests(userProfile.id);
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = async (request: PatientHistoryRequest) => {
    setSelectedRequest(request);
    setResponseNotes('');
    
    if (mode === 'incoming' && request.status === 'pending') {
      setLoadingSummary(true);
      try {
        const summary = await PatientHistoryRequestService.getTransferSummary(
          request.client_id,
          userProfile!.id
        );
        setTransferSummary(summary);
      } catch (error) {
        console.error('Error loading transfer summary:', error);
      } finally {
        setLoadingSummary(false);
      }
    } else {
      setTransferSummary(null);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || !userProfile?.id) return;

    setProcessing(true);
    try {
      const result = await PatientHistoryRequestService.approveRequest(
        selectedRequest.id,
        userProfile.id,
        responseNotes.trim() || undefined
      );

      if (result.success) {
        toast.success('Request approved and patient data transferred successfully');
        setSelectedRequest(null);
        setResponseNotes('');
        setTransferSummary(null);
        loadRequests();
        if (onRequestUpdated) {
          onRequestUpdated();
        }
      } else {
        toast.error(result.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest || !userProfile?.id) return;

    setProcessing(true);
    try {
      const result = await PatientHistoryRequestService.denyRequest(
        selectedRequest.id,
        userProfile.id,
        responseNotes.trim() || undefined
      );

      if (result.success) {
        toast.success('Request denied');
        setSelectedRequest(null);
        setResponseNotes('');
        setTransferSummary(null);
        loadRequests();
        if (onRequestUpdated) {
          onRequestUpdated();
        }
      } else {
        toast.error(result.error || 'Failed to deny request');
      }
    } catch (error) {
      console.error('Error denying request:', error);
      toast.error('Failed to deny request');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedRequest || !userProfile?.id) return;

    setProcessing(true);
    try {
      const result = await PatientHistoryRequestService.cancelRequest(
        selectedRequest.id,
        userProfile.id
      );

      if (result.success) {
        toast.success('Request cancelled');
        setSelectedRequest(null);
        loadRequests();
        if (onRequestUpdated) {
          onRequestUpdated();
        }
      } else {
        toast.error(result.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'denied':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Denied</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold mb-2">
            {mode === 'incoming' 
              ? 'No Incoming Requests' 
              : 'No Requests Sent'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {mode === 'incoming' 
              ? 'You have no pending requests from other practitioners to access patient history.' 
              : 'You haven\'t sent any requests to access patient history from other practitioners. Use the "Request Patient History" button to send a request.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="transition-[border-color,background-color] duration-200 ease-out">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {mode === 'incoming' 
                    ? `Request from ${request.requesting_practitioner?.first_name} ${request.requesting_practitioner?.last_name}`
                    : `Request to ${request.previous_practitioner?.first_name} ${request.previous_practitioner?.last_name}`}
                </CardTitle>
                <CardDescription className="mt-1">
                  Patient: {request.client?.first_name} {request.client?.last_name} ({request.client?.email})
                </CardDescription>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Requested {format(new Date(request.requested_at), 'MMM dd, yyyy')}
                {request.responded_at && (
                  <>
                    <span className="mx-2">•</span>
                    Responded {format(new Date(request.responded_at), 'MMM dd, yyyy')}
                  </>
                )}
              </div>

              {request.request_notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Request Notes:</p>
                  <p className="text-sm text-muted-foreground">{request.request_notes}</p>
                </div>
              )}

              {request.response_notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Response:</p>
                  <p className="text-sm text-muted-foreground">{request.response_notes}</p>
                </div>
              )}

              {request.status === 'pending' && (
                <div className="flex gap-2">
                  {mode === 'incoming' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRequest(request)}
                      >
                        Review Request
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={processing}
                    >
                      Cancel Request
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Review/Approve Dialog */}
      {selectedRequest && mode === 'incoming' && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setResponseNotes('');
            setTransferSummary(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review History Request</DialogTitle>
              <DialogDescription>
                {selectedRequest.requesting_practitioner?.first_name} {selectedRequest.requesting_practitioner?.last_name} 
                {' '}is requesting access to {selectedRequest.client?.first_name}'s treatment history.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedRequest.request_notes && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Request Notes:</strong> {selectedRequest.request_notes}
                  </AlertDescription>
                </Alert>
              )}

              {loadingSummary && (
                <div className="text-center py-4 text-muted-foreground">
                  Loading transfer summary...
                </div>
              )}

              {transferSummary && !loadingSummary && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">What will be transferred:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>• {transferSummary.treatmentNotes} treatment notes</div>
                        <div>• {transferSummary.progressMetrics} progress metrics</div>
                        <div>• {transferSummary.progressGoals} progress goals</div>
                        <div>• {transferSummary.exercisePrograms} exercise programs</div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          • {transferSummary.sessions} session records (viewable by new practitioner)
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="response-notes">Response Notes (Optional)</Label>
                <Textarea
                  id="response-notes"
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setResponseNotes('');
                  setTransferSummary(null);
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeny}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Deny Request'}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Approve & Transfer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

