import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Clock, CheckCircle, XCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { PatientHistoryRequestService, HistoryRequestSummary } from '@/lib/patient-history-request-service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PatientHistoryRequestProps {
  clientId: string;
  clientName: string;
  onRequestCreated?: () => void;
}

export const PatientHistoryRequest: React.FC<PatientHistoryRequestProps> = ({
  clientId,
  clientName,
  onRequestCreated
}) => {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousPractitioners, setPreviousPractitioners] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    session_count: number;
    last_session_date?: string;
  }>>([]);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('');
  const [requestNotes, setRequestNotes] = useState('');
  const [transferSummary, setTransferSummary] = useState<HistoryRequestSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (open && userProfile?.id) {
      loadPreviousPractitioners();
    }
  }, [open, clientId, userProfile?.id]);

  const loadPreviousPractitioners = async () => {
    if (!userProfile?.id) return;

    try {
      const practitioners = await PatientHistoryRequestService.getPreviousPractitioners(
        clientId,
        userProfile.id
      );
      setPreviousPractitioners(practitioners);
    } catch (error) {
      console.error('Error loading previous practitioners:', error);
      toast.error('Failed to load previous practitioners');
    }
  };

  const handlePractitionerSelect = async (practitionerId: string) => {
    setSelectedPractitionerId(practitionerId);
    if (practitionerId && practitionerId !== 'none' && userProfile?.id) {
      setLoadingSummary(true);
      try {
        const summary = await PatientHistoryRequestService.getTransferSummary(
          clientId,
          practitionerId
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

  const handleCreateRequest = async () => {
    if (!selectedPractitionerId || selectedPractitionerId === 'none') {
      toast.error('Please select a previous practitioner');
      return;
    }

    if (!userProfile?.id) {
      toast.error('You must be logged in to create a request');
      return;
    }

    setLoading(true);
    try {
      const result = await PatientHistoryRequestService.createRequest(
        {
          clientId,
          previousPractitionerId: selectedPractitionerId,
          requestNotes: requestNotes.trim() || undefined
        },
        userProfile.id
      );

      if (result.success) {
        toast.success('History request sent successfully');
        setOpen(false);
        setSelectedPractitionerId('');
        setRequestNotes('');
        setTransferSummary(null);
        if (onRequestCreated) {
          onRequestCreated();
        }
      } else {
        toast.error(result.error || 'Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Request Patient History
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Patient History</DialogTitle>
            <DialogDescription>
              Request access to {clientName}'s treatment history from a previous practitioner. 
              This includes notes, progress metrics, goals, and exercise programs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="practitioner-select">Previous Practitioner</Label>
              <Select value={selectedPractitionerId} onValueChange={handlePractitionerSelect}>
                <SelectTrigger id="practitioner-select">
                  <SelectValue placeholder="Select a previous practitioner..." />
                </SelectTrigger>
                <SelectContent>
                  {previousPractitioners.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No previous practitioners found
                    </SelectItem>
                  ) : (
                    previousPractitioners.map((practitioner) => (
                      <SelectItem key={practitioner.id} value={practitioner.id}>
                        {practitioner.first_name} {practitioner.last_name}
                        {practitioner.session_count > 0 && (
                          <span className="text-muted-foreground ml-2">
                            ({practitioner.session_count} session{practitioner.session_count !== 1 ? 's' : ''})
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {previousPractitioners.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No previous practitioners found for this client. The client may be new or hasn't seen other practitioners yet.
                </p>
              )}
            </div>

            {loadingSummary && (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Loading transfer summary...</span>
              </div>
            )}

            {transferSummary && !loadingSummary && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">What will be transferred if approved:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>• {transferSummary.treatmentNotes} treatment notes</div>
                      <div>• {transferSummary.progressMetrics} progress metrics</div>
                      <div>• {transferSummary.progressGoals} progress goals</div>
                      <div>• {transferSummary.exercisePrograms} exercise programs</div>
                      <div className="col-span-2 text-xs text-muted-foreground">
                        • {transferSummary.sessions} session records (viewable by you)
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="request-notes">Request Notes (Optional)</Label>
              <Textarea
                id="request-notes"
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Explain why you need access to this patient's history..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelectedPractitionerId('');
                setRequestNotes('');
                setTransferSummary(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={loading || !selectedPractitionerId || selectedPractitionerId === 'none' || previousPractitioners.length === 0}
            >
              {loading ? 'Sending Request...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

