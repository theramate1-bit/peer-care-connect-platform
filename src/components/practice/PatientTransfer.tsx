import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Loader2, AlertCircle, FileText } from 'lucide-react';
import { PatientTransferService } from '@/lib/patient-transfer-service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PatientTransferProps {
  clientId: string;
  clientName: string;
  onTransferComplete?: () => void;
}

export const PatientTransfer: React.FC<PatientTransferProps> = ({
  clientId,
  clientName,
  onTransferComplete
}) => {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availablePractitioners, setAvailablePractitioners] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_role?: string;
    profile_completed?: boolean;
  }>>([]);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSummary, setTransferSummary] = useState<{
    treatmentNotes: number;
    progressMetrics: number;
    progressGoals: number;
    exercisePrograms: number;
    sessions: number;
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPractitioners, setLoadingPractitioners] = useState(false);

  useEffect(() => {
    if (open && userProfile?.id) {
      loadAvailablePractitioners();
      if (userProfile.id) {
        loadTransferSummary();
      }
    }
  }, [open, clientId, userProfile?.id]);

  const loadAvailablePractitioners = async () => {
    if (!userProfile?.id) return;

    setLoadingPractitioners(true);
    try {
      // Get all practitioners (excluding current user)
      // For transfers, we allow any active practitioner regardless of profile completion status
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, user_role, profile_completed')
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .neq('id', userProfile.id)
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;

      // Filter out practitioners with null names (incomplete profiles)
      const validPractitioners = (data || []).filter(
        p => p.first_name && p.last_name
      );

      console.log('Available practitioners for transfer:', {
        totalFound: data?.length || 0,
        validPractitioners: validPractitioners.length,
        practitioners: validPractitioners.map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          email: p.email,
          role: p.user_role,
          profileCompleted: p.profile_completed
        }))
      });

      setAvailablePractitioners(validPractitioners);
    } catch (error) {
      console.error('Error loading practitioners:', error);
      toast.error('Failed to load practitioners');
    } finally {
      setLoadingPractitioners(false);
    }
  };

  const loadTransferSummary = async () => {
    if (!userProfile?.id) return;

    setLoadingSummary(true);
    try {
      const summary = await PatientTransferService.getTransferSummary(
        clientId,
        userProfile.id
      );
      setTransferSummary(summary);
    } catch (error) {
      console.error('Error loading transfer summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handlePractitionerSelect = (practitionerId: string) => {
    setSelectedPractitionerId(practitionerId);
  };

  const handleTransfer = async () => {
    if (!selectedPractitionerId || selectedPractitionerId === 'none') {
      toast.error('Please select a practitioner to transfer to');
      return;
    }

    if (!userProfile?.id) {
      toast.error('You must be logged in to transfer a patient');
      return;
    }

    // Show confirmation
    const confirmed = window.confirm(
      `Are you sure you want to transfer ${clientName} to another practitioner?\n\n` +
      `This will transfer:\n` +
      `• ${transferSummary?.treatmentNotes || 0} treatment notes\n` +
      `• ${transferSummary?.progressMetrics || 0} progress metrics\n` +
      `• ${transferSummary?.progressGoals || 0} progress goals\n` +
      `• ${transferSummary?.exercisePrograms || 0} exercise programs\n` +
      `• ${transferSummary?.sessions || 0} session records\n\n` +
      `The new practitioner will have full access to this patient's records. This action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await PatientTransferService.transferPatientRecord(
        clientId,
        selectedPractitionerId,
        userProfile.id,
        transferNotes.trim() || undefined
      );

      if (result.success) {
        toast.success(
          `Patient transferred successfully! Transferred ${result.transferredItems?.treatmentNotes || 0} notes, ` +
          `${result.transferredItems?.progressMetrics || 0} metrics, ${result.transferredItems?.progressGoals || 0} goals, ` +
          `and ${result.transferredItems?.exercisePrograms || 0} programs.`
        );
        setOpen(false);
        setSelectedPractitionerId('');
        setTransferNotes('');
        if (onTransferComplete) {
          onTransferComplete();
        }
      } else {
        toast.error(result.error || 'Failed to transfer patient');
      }
    } catch (error) {
      console.error('Error transferring patient:', error);
      toast.error('Failed to transfer patient');
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
        Transfer Patient
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Patient</DialogTitle>
            <DialogDescription>
              Transfer {clientName} to another practitioner. This will transfer all patient records including notes, metrics, goals, and exercise programs. 
              The new practitioner will have full access to manage this patient's care.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="practitioner-select">Transfer To</Label>
              {loadingPractitioners ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Loading practitioners...</span>
                </div>
              ) : (
                <Select value={selectedPractitionerId} onValueChange={handlePractitionerSelect}>
                  <SelectTrigger id="practitioner-select">
                    <SelectValue placeholder="Select a practitioner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePractitioners.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No practitioners found
                      </SelectItem>
                    ) : (
                      availablePractitioners.map((practitioner) => (
                        <SelectItem key={practitioner.id} value={practitioner.id}>
                          {practitioner.first_name} {practitioner.last_name}
                          {practitioner.email && ` (${practitioner.email})`}
                          {practitioner.user_role && ` - ${practitioner.user_role.replace('_', ' ')}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {availablePractitioners.length === 0 && !loadingPractitioners && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">No practitioners found</p>
                      <p className="text-sm">
                        To transfer a patient, there must be other active practitioners in the system. 
                        Make sure:
                      </p>
                      <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                        <li>Other practitioners have completed their profile setup</li>
                        <li>Their accounts are marked as active</li>
                        <li>They have a user role of Sports Therapist, Massage Therapist, or Osteopath</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
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
              <Label htmlFor="transfer-notes">Transfer Notes (Optional)</Label>
              <Textarea
                id="transfer-notes"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Add any notes about why this patient is being transferred..."
                rows={4}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This action will transfer all patient records to the selected practitioner. 
                You will no longer have access to edit these records, but you can still view them. 
                The new practitioner will have full access to manage this patient.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelectedPractitionerId('');
                setTransferNotes('');
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || !selectedPractitionerId || selectedPractitionerId === 'none' || availablePractitioners.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Transfer Patient
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

