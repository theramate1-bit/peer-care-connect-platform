import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Stethoscope,
  Edit,
  UserPlus
} from 'lucide-react';
import { HEPService, HomeExerciseProgram, ExerciseProgress } from '@/lib/hep-service';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { HEPEditor } from '@/components/practice/HEPEditor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HEPTransferService } from '@/lib/hep-transfer-service';
import { PatientTransferService } from '@/lib/patient-transfer-service';
import { Checkbox } from '@/components/ui/checkbox';

interface PractitionerHEPProgressProps {
  clientId: string;
  clientName?: string;
}

interface CompletionWithSession extends ExerciseProgress {
  session?: {
    id: string;
    session_date: string;
    session_type: string;
    session_number?: number;
  } | null;
}

export const PractitionerHEPProgress: React.FC<PractitionerHEPProgressProps> = ({
  clientId,
  clientName
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Array<{ id: string; session_date: string; session_type: string; session_number?: number }>>([]);
  const [programsData, setProgramsData] = useState<Array<{
    program: HomeExerciseProgram;
    adherence: {
      days_since_start: number;
      expected_completions: number;
      actual_completions: number;
      adherence_percent: number;
    } | null;
    completions: CompletionWithSession[];
  }>>([]);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [transferringProgramId, setTransferringProgramId] = useState<string | null>(null);
  const [availablePractitioners, setAvailablePractitioners] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>>([]);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [includePatientData, setIncludePatientData] = useState(true);
  const [transferSummary, setTransferSummary] = useState<{
    treatmentNotes: number;
    progressMetrics: number;
    progressGoals: number;
    exercisePrograms: number;
    sessions: number;
  } | null>(null);
  const [programGaps, setProgramGaps] = useState<Record<string, Array<{
    gap_start_date: string;
    gap_end_date: string;
    gap_days: number;
    expected_completions: number;
    actual_completions: number;
  }>>>({});

  useEffect(() => {
    if (userProfile?.id && clientId) {
      loadProgress();
      loadSessions();
    }
  }, [userProfile?.id, clientId]);

  // Real-time subscription for exercise completions
  const { error: realtimeError } = useRealtimeSubscription(
    'exercise_program_progress',
    `client_id=eq.${clientId}`,
    (payload) => {
      console.log('[PractitionerHEPProgress] Real-time exercise completion update:', payload);
      
      try {
        // Reload progress when completions change
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          if (userProfile?.id && clientId) {
            loadProgress().catch(err => {
              console.error('[PractitionerHEPProgress] Error loading progress after real-time update:', err);
            });
          }
        }
      } catch (error) {
        console.error('[PractitionerHEPProgress] Error handling real-time update:', error);
      }
    }
  );

  // Log real-time subscription errors
  useEffect(() => {
    if (realtimeError) {
      console.error('[PractitionerHEPProgress] Real-time subscription error:', realtimeError);
    }
  }, [realtimeError]);

  const loadSessions = async () => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase
        .from('client_sessions')
        .select('id, session_date, session_type, session_number')
        .eq('client_id', clientId)
        .order('session_date', { ascending: true });

      if (error) {
        console.error('Error loading sessions:', error);
      } else {
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadProgress = async () => {
    if (!userProfile?.id || !clientId) return;

    setLoading(true);
    try {
      const data = await HEPService.getClientProgressForPractitioner(userProfile.id, clientId);
      setProgramsData(data.programs);

      // Load gaps for each program
      const gapsMap: Record<string, any[]> = {};
      for (const { program } of data.programs) {
        if (program.id && program.status === 'active') {
          try {
            const gaps = await HEPService.detectExerciseGaps(program.id, 7);
            if (gaps.length > 0) {
              gapsMap[program.id] = gaps;
            }
          } catch (error) {
            console.error(`Error detecting gaps for program ${program.id}:`, error);
          }
        }
      }
      setProgramGaps(gapsMap);
    } catch (error: any) {
      console.error('Error loading HEP progress:', error);
      const errorMessage = error?.message || 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch');
      toast.error(
        isNetworkError 
          ? 'Unable to load exercise programs. Please check your internet connection and try again.'
          : `Failed to load exercise program progress: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Group completions by session periods
  const groupCompletionsBySessionPeriod = (completions: CompletionWithSession[]) => {
    if (sessions.length === 0) {
      return { unlinked: completions, byPeriod: [] };
    }

    const grouped: Array<{
      period: string;
      startDate?: string;
      endDate?: string;
      completions: CompletionWithSession[];
    }> = [];

    const unlinked: CompletionWithSession[] = [];

    // Group by session periods
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const nextSession = sessions[i + 1];
      
      const periodCompletions = completions.filter(completion => {
        if (!completion.session_id) return false;
        const completionDate = new Date(completion.completed_date);
        const sessionDate = new Date(session.session_date);
        const nextSessionDate = nextSession ? new Date(nextSession.session_date) : new Date('9999-12-31');
        
        return completionDate >= sessionDate && completionDate < nextSessionDate;
      });

      if (periodCompletions.length > 0) {
        grouped.push({
          period: nextSession 
            ? `Between Session #${session.session_number || i + 1} and Session #${nextSession.session_number || i + 2}`
            : `After Session #${session.session_number || i + 1}`,
          startDate: session.session_date,
          endDate: nextSession?.session_date,
          completions: periodCompletions
        });
      }
    }

    // Find completions linked to specific sessions
    const linkedToSessions = completions.filter(c => c.session_id && c.session);
    
    // Find unlinked completions
    unlinked.push(...completions.filter(c => !c.session_id || !c.session));

    return { unlinked, byPeriod: grouped, linkedToSessions };
  };

  const getPainLevelColor = (painLevel?: number) => {
    if (!painLevel) return 'bg-gray-100 text-gray-800';
    if (painLevel <= 3) return 'bg-green-100 text-green-800';
    if (painLevel <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyColor = (difficulty?: number) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    if (difficulty <= 2) return 'bg-blue-100 text-blue-800';
    if (difficulty <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
  };

  const getAdherenceColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading exercise program progress...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (programsData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Exercise Programs</h3>
            <p className="text-sm text-muted-foreground">
              {clientName ? `${clientName} hasn't been assigned any exercise programs yet.` : 'No exercise programs found for this client.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {programsData.map(({ program, adherence, completions }) => (
        <Card key={program.id} className="transition-[border-color,background-color] duration-200 ease-out">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {program.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {program.description || 'Home exercise program'}
                  {program.start_date && (
                    <span className="ml-2">
                      • Started {format(new Date(program.start_date), 'MMM dd, yyyy')}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {program.status === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProgramId(program.id || null)}
                      aria-label={`Edit exercise program: ${program.title}`}
                      className="min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setTransferringProgramId(program.id || null);
                        const practitioners = await HEPTransferService.getAvailablePractitioners(
                          clientId,
                          userProfile?.id || ''
                        );
                        setAvailablePractitioners(practitioners);
                      }}
                      aria-label={`Transfer exercise program: ${program.title}`}
                      className="min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                    >
                      <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Transfer
                    </Button>
                  </>
                )}
                <Badge className={program.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                  {program.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gap Detection Alert */}
            {programGaps[program.id || ''] && programGaps[program.id || ''].length > 0 && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="font-medium mb-1">Exercise Gaps Detected</div>
                  <div className="text-sm space-y-1">
                    {programGaps[program.id || ''].slice(0, 3).map((gap, idx) => (
                      <div key={idx}>
                        {format(new Date(gap.gap_start_date), 'MMM dd')} - {format(new Date(gap.gap_end_date), 'MMM dd')}: 
                        {' '}{gap.gap_days} days with no completions
                      </div>
                    ))}
                    {programGaps[program.id || ''].length > 3 && (
                      <div className="text-xs text-orange-700">
                        +{programGaps[program.id || ''].length - 3} more gap{programGaps[program.id || ''].length - 3 !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Adherence Summary */}
            {adherence && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Program Adherence</span>
                  </div>
                  <span className={`text-lg font-bold ${getAdherenceColor(adherence.adherence_percent)} flex items-center gap-2`}>
                    {adherence.adherence_percent >= 80 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    ) : adherence.adherence_percent >= 50 ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                    )}
                    <span aria-label={`Adherence: ${Math.round(adherence.adherence_percent)}%`}>
                      {Math.round(adherence.adherence_percent)}%
                    </span>
                  </span>
                </div>
                <Progress 
                  value={Math.min(adherence.adherence_percent, 100)} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {adherence.actual_completions} / {Math.round(adherence.expected_completions)} completions
                  </span>
                  <span>{adherence.days_since_start} days since start</span>
                </div>
              </div>
            )}

            {/* Program Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Frequency</div>
                <div className="font-medium">{program.frequency_per_week || 3} days per week</div>
              </div>
              <div>
                <div className="text-muted-foreground">Exercises</div>
                <div className="font-medium">
                  {program.exercises?.length || 0} exercises
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Completions</div>
                <div className="font-medium">{completions.length}</div>
              </div>
              {program.end_date && (
                <div>
                  <div className="text-muted-foreground">End Date</div>
                  <div className="font-medium">
                    {format(new Date(program.end_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              )}
            </div>

            {/* Exercise Completions */}
            {completions.length > 0 ? (() => {
              const grouped = groupCompletionsBySessionPeriod(completions);
              return (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="completions">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            {completions.length} Exercise Completion{completions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {(() => {
                            const withNotes = completions.filter(c => c.client_notes && c.client_notes.trim()).length;
                            const withPain = completions.filter(c => c.pain_level !== null && c.pain_level !== undefined).length;
                            const withDifficulty = completions.filter(c => c.difficulty_rating !== null && c.difficulty_rating !== undefined).length;
                            const hasFeedback = withNotes > 0 || withPain > 0 || withDifficulty > 0;
                            
                            if (hasFeedback) {
                              return (
                                <>
                                  {withNotes > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      {withNotes} with notes
                                    </Badge>
                                  )}
                                  {withPain > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      Pain: {withPain}
                                    </Badge>
                                  )}
                                  {withDifficulty > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      Difficulty: {withDifficulty}
                                    </Badge>
                                  )}
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Completions grouped by session periods */}
                        {grouped.byPeriod.map((period, idx) => (
                          <div key={`period-${idx}`} className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b">
                              <Stethoscope className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-muted-foreground">{period.period}</span>
                              {period.startDate && period.endDate && (
                                <span className="text-xs text-muted-foreground">
                                  ({format(new Date(period.startDate), 'MMM dd')} - {format(new Date(period.endDate), 'MMM dd')})
                                </span>
                              )}
                            </div>
                            {period.completions.map((completion) => (
                              <Card key={completion.id} className="bg-muted/50">
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-medium">{completion.exercise_name}</h5>
                                        <Badge variant="outline" className="text-xs">
                                          {format(new Date(completion.completed_date), 'MMM dd, yyyy')}
                                        </Badge>
                                        {completion.session && (
                                          <Badge variant="secondary" className="text-xs">
                                            Session #{completion.session.session_number || 'N/A'}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {completion.completed_at && 
                                          format(new Date(completion.completed_at), 'h:mm a')
                                        }
                                      </div>
                                    </div>
                                  </div>

                            {/* Client Feedback */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                              {completion.pain_level !== null && completion.pain_level !== undefined && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Pain Level</div>
                                  <Badge className={getPainLevelColor(completion.pain_level)}>
                                    {`${completion.pain_level}/10`}
                                  </Badge>
                                </div>
                              )}
                              {completion.difficulty_rating !== null && completion.difficulty_rating !== undefined && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Difficulty</div>
                                  <Badge className={getDifficultyColor(completion.difficulty_rating)}>
                                    {`${completion.difficulty_rating}/5`}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            {/* Client Notes */}
                            {completion.client_notes && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div className="flex-1">
                                    <div className="text-xs text-muted-foreground mb-1">Client Notes</div>
                                    <p className="text-sm">{completion.client_notes}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              );
            })() : (
              <div className="text-center py-6 border rounded-lg bg-muted/30">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No exercise completions logged yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edit Program Dialog */}
      {editingProgramId && (
        <Dialog open={!!editingProgramId} onOpenChange={(open) => !open && setEditingProgramId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <HEPEditor
              programId={editingProgramId}
              clientId={clientId}
              clientName={clientName || 'Client'}
              onProgramUpdated={(programId) => {
                setEditingProgramId(null);
                loadProgress();
                toast.success('Program updated successfully');
              }}
              onClose={() => setEditingProgramId(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Transfer Program Dialog */}
      {transferringProgramId && (
        <Dialog open={!!transferringProgramId} onOpenChange={(open) => {
          if (!open) {
            setTransferringProgramId(null);
            setSelectedPractitionerId('');
            setTransferNotes('');
            setIncludePatientData(true);
            setTransferSummary(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Exercise Program</DialogTitle>
              <DialogDescription>
                Transfer this program to another practitioner. You can optionally include all patient records (notes, progress, goals).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="practitioner-select">Select Practitioner</Label>
                <Select 
                  value={selectedPractitionerId} 
                  onValueChange={async (value) => {
                    setSelectedPractitionerId(value);
                    if (value && value !== 'none' && userProfile?.id && includePatientData) {
                      // Fetch transfer summary
                      const summary = await PatientTransferService.getTransferSummary(
                        clientId,
                        userProfile.id
                      );
                      setTransferSummary(summary);
                    } else {
                      setTransferSummary(null);
                    }
                  }}
                >
                  <SelectTrigger id="practitioner-select">
                    <SelectValue placeholder="Choose a practitioner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePractitioners.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No other practitioners found for this client
                      </SelectItem>
                    ) : (
                      availablePractitioners.map((practitioner) => (
                        <SelectItem key={practitioner.id} value={practitioner.id}>
                          {practitioner.first_name} {practitioner.last_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {availablePractitioners.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Only practitioners who have sessions with this client can receive the transfer.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="include-patient-data"
                    checked={includePatientData}
                    onCheckedChange={async (checked) => {
                      setIncludePatientData(checked as boolean);
                      if (checked && selectedPractitionerId && selectedPractitionerId !== 'none' && userProfile?.id) {
                        const summary = await PatientTransferService.getTransferSummary(
                          clientId,
                          userProfile.id
                        );
                        setTransferSummary(summary);
                      } else {
                        setTransferSummary(null);
                      }
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="include-patient-data" className="cursor-pointer">
                      Include Full Patient Record
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Transfer all treatment notes, progress metrics, goals, and exercise programs for this patient
                    </p>
                  </div>
                </div>

                {includePatientData && transferSummary && (
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">What will be transferred:</p>
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
                )}
              </div>

              <div>
                <Label htmlFor="transfer-notes">Transfer Notes (Optional)</Label>
                <Textarea
                  id="transfer-notes"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Add any notes about why this program is being transferred..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTransferringProgramId(null);
                  setSelectedPractitionerId('');
                  setTransferNotes('');
                }}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedPractitionerId || selectedPractitionerId === 'none') {
                    toast.error('Please select a practitioner');
                    return;
                  }

                  // Show confirmation dialog if including full patient data
                  if (includePatientData && transferSummary) {
                    const confirmed = window.confirm(
                      `Are you sure you want to transfer this program and all patient records?\n\n` +
                      `This will transfer:\n` +
                      `• ${transferSummary.exercisePrograms} exercise program(s)\n` +
                      `• ${transferSummary.treatmentNotes} treatment notes\n` +
                      `• ${transferSummary.progressMetrics} progress metrics\n` +
                      `• ${transferSummary.progressGoals} progress goals\n` +
                      `• ${transferSummary.sessions} session records\n\n` +
                      `The new practitioner will have full access to this patient's history.`
                    );
                    if (!confirmed) return;
                  }

                  setTransferring(true);
                  try {
                    let result;
                    if (includePatientData) {
                      // Transfer program with full patient record
                      result = await PatientTransferService.transferProgramWithPatientData(
                        transferringProgramId,
                        selectedPractitionerId,
                        true,
                        transferNotes
                      );
                    } else {
                      // Transfer only the program
                      result = await HEPTransferService.transferProgram(
                        transferringProgramId,
                        selectedPractitionerId,
                        transferNotes
                      );
                    }

                    if (result.success) {
                      if (includePatientData && result.transferredItems) {
                        toast.success(
                          `Transfer complete! Transferred ${result.transferredItems.exercisePrograms} program(s), ` +
                          `${result.transferredItems.treatmentNotes} notes, ${result.transferredItems.progressMetrics} metrics, ` +
                          `and ${result.transferredItems.progressGoals} goals.`
                        );
                      } else {
                        toast.success('Program transferred successfully');
                      }
                      setTransferringProgramId(null);
                      setSelectedPractitionerId('');
                      setTransferNotes('');
                      setIncludePatientData(true);
                      setTransferSummary(null);
                      loadProgress();
                    } else {
                      toast.error(result.error || 'Failed to transfer program');
                    }
                  } catch (error) {
                    console.error('Error transferring program:', error);
                    toast.error('Failed to transfer program');
                  } finally {
                    setTransferring(false);
                  }
                }}
                disabled={transferring || !selectedPractitionerId || selectedPractitionerId === 'none' || availablePractitioners.length === 0}
              >
                {transferring ? 'Transferring...' : 'Transfer Program'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

