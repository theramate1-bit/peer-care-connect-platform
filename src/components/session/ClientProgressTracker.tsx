import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Activity,
  Calendar,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Stethoscope,
  Clock,
  MessageSquare,
  Sparkles,
  HelpCircle,
  FileText,
  MapPin,
  Dumbbell,
  Gauge
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClientProgressChart } from '@/components/client/ClientProgressChart';
// Note: Goal auto-update is handled by database trigger (update_goal_from_metric)
// No need to call updateLinkedGoalsForMetric here - it would be redundant
import { ProgressInsights } from '@/components/client/ProgressInsights';
import { GoalSuggestionCard } from '@/components/session/GoalSuggestionCard';
import { SuggestedGoal } from '@/lib/goal-suggestions';
import { HEPCreator } from '@/components/practice/HEPCreator';
import { HEPEditor } from '@/components/practice/HEPEditor';
import { HEPService, HomeExerciseProgram } from '@/lib/hep-service';
import { UnifiedProgressModal } from '@/components/session/UnifiedProgressModal';
import { ProgressMetric, ProgressGoal } from '@/lib/types/progress';
import { MetricTimelineChart } from '@/components/client/MetricTimelineChart';
import { PainMetricChart } from '@/components/client/PainMetricChart';
import { ROMMetricChart } from '@/components/client/ROMMetricChart';
import { StrengthMetricChart } from '@/components/client/StrengthMetricChart';
import { TheramateTimeline } from '@/components/client/TheramateTimeline';
import { filterMetricsBySession } from '@/lib/session-metrics-association';
import { logger } from '@/lib/logger';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClientProgressTrackerProps {
  /** Client user ID (UUID) - must be a valid UUID, not an email. Use resolveClientIdFromSession() if client_id is null. */
  clientId: string;
  clientName: string;
  sessionId?: string;
  /** If true, hide add/edit functionality (for client view). Defaults to false (practitioner view). */
  readOnly?: boolean;
  /** Default tab to show when component loads. Defaults to 'progress'. */
  defaultTab?: 'progress' | 'history' | 'insights' | 'exercises' | 'theramate-timeline' | 'goals';
  /** If true, hide internal tabs and show only the defaultTab content. Used when parent component controls navigation. */
  hideInternalTabs?: boolean;
}

export const ClientProgressTracker: React.FC<ClientProgressTrackerProps> = ({
  clientId,
  clientName,
  sessionId,
  readOnly = false,
  defaultTab = 'progress',
  hideInternalTabs = false
}) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ProgressMetric[]>([]);
  const [goals, setGoals] = useState<ProgressGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'progress' | 'history' | 'insights' | 'exercises' | 'theramate-timeline' | 'goals'>(defaultTab as any);
  const [historyView, setHistoryView] = useState<'timeline' | 'chart'>(defaultTab === 'history' ? 'chart' : 'timeline');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [exerciseCompletions, setExerciseCompletions] = useState<Array<{
    id: string;
    exercise_name: string;
    completed_date: string;
    completed_at?: string;
    pain_level?: number;
    difficulty_rating?: number;
    client_notes?: string;
    session_id?: string;
    session?: {
      id: string;
      session_date: string;
      session_type: string;
      session_number?: number;
    } | null;
  }>>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; session_date: string; session_type: string; session_number?: number }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId || null);
  
  // Goal suggestions state
  const [suggestedGoals, setSuggestedGoals] = useState<SuggestedGoal[]>([]);
  const [showGoalSuggestions, setShowGoalSuggestions] = useState(false);

  // State for editing
  const [editingMetric, setEditingMetric] = useState<ProgressMetric | null>(null);
  const [editingGoal, setEditingGoal] = useState<ProgressGoal | null>(null);
  const [deletingMetricId, setDeletingMetricId] = useState<string | null>(null);
  
  // State for HEP creation and management
  const [showCreator, setShowCreator] = useState(false);
  const [createdHepId, setCreatedHepId] = useState<string | null>(null);
  const [existingPrograms, setExistingPrograms] = useState<HomeExerciseProgram[]>([]);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // Real-time subscription for progress metrics
  const { data: realtimeMetrics } = useRealtimeSubscription(
    'progress_metrics',
    `client_id=eq.${clientId}`,
    async (payload) => {
      logger.debug('Real-time metrics update', { payload }, 'ClientProgressTracker');
      
      if (payload.eventType === 'INSERT') {
        setMetrics(prev => [payload.new, ...prev]);
        // Database trigger automatically updates linked goals, just refresh goals to show updated values
        await fetchProgressData();
      } else if (payload.eventType === 'UPDATE') {
        setMetrics(prev => 
          prev.map(metric => 
            metric.id === payload.new.id ? payload.new : metric
          )
        );
        // Database trigger automatically updates linked goals, just refresh goals to show updated values
        await fetchProgressData();
      } else if (payload.eventType === 'DELETE') {
        setMetrics(prev => 
          prev.filter(metric => metric.id !== payload.old.id)
        );
      }
    }
  );

  // Real-time subscription for progress goals
  const { data: realtimeGoals } = useRealtimeSubscription(
    'progress_goals',
    `client_id=eq.${clientId}`,
    (payload) => {
      logger.debug('Real-time goals update', { payload }, 'ClientProgressTracker');
      
      if (payload.eventType === 'INSERT') {
        setGoals(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setGoals(prev => 
          prev.map(goal => 
            goal.id === payload.new.id ? payload.new : goal
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setGoals(prev => 
          prev.filter(goal => goal.id !== payload.old.id)
        );
      }
    }
  );

  // Real-time subscription for exercise completions
  const { data: realtimeExerciseCompletions } = useRealtimeSubscription(
    'exercise_program_progress',
    `client_id=eq.${clientId}`,
    (payload) => {
      logger.debug('Real-time exercise completion update', { payload }, 'ClientProgressTracker');
      
      if (payload.eventType === 'INSERT') {
        // Fetch session info for new completion
        const fetchSessionInfo = async () => {
          if (payload.new.session_id) {
            const { data: sessionData } = await supabase
              .from('client_sessions')
              .select('id, session_date, session_type, session_number')
              .eq('id', payload.new.session_id)
              .single();
            
            const newCompletion = {
              id: payload.new.id,
              exercise_name: payload.new.exercise_name || '',
              completed_date: payload.new.completed_date,
              completed_at: payload.new.completed_at || null,
              pain_level: payload.new.pain_level ?? null,
              difficulty_rating: payload.new.difficulty_rating ?? null,
              client_notes: payload.new.client_notes || null,
              session_id: payload.new.session_id || null,
              sets_completed: payload.new.sets_completed ?? null,
              reps_completed: payload.new.reps_completed ?? null,
              duration_minutes: payload.new.duration_minutes ?? null,
              session: sessionData ? {
                id: sessionData.id,
                session_date: sessionData.session_date,
                session_type: sessionData.session_type,
                session_number: sessionData.session_number
              } : null
            };
            
            setExerciseCompletions(prev => [newCompletion, ...prev]);
          } else {
            const newCompletion = {
              id: payload.new.id,
              exercise_name: payload.new.exercise_name || '',
              completed_date: payload.new.completed_date,
              completed_at: payload.new.completed_at || null,
              pain_level: payload.new.pain_level ?? null,
              difficulty_rating: payload.new.difficulty_rating ?? null,
              client_notes: payload.new.client_notes || null,
              session_id: payload.new.session_id || null,
              sets_completed: payload.new.sets_completed ?? null,
              reps_completed: payload.new.reps_completed ?? null,
              duration_minutes: payload.new.duration_minutes ?? null,
              session: null
            };
            setExerciseCompletions(prev => [newCompletion, ...prev]);
          }
        };
        fetchSessionInfo();
      } else if (payload.eventType === 'UPDATE') {
        // Refetch to get updated session info if needed
        fetchExerciseCompletions();
      } else if (payload.eventType === 'DELETE') {
        setExerciseCompletions(prev => 
          prev.filter(completion => completion.id !== payload.old.id)
        );
      }
    }
  );

  // Load existing exercise programs for this client
  const loadExistingPrograms = useCallback(async () => {
    if (!user?.id || !clientId) {
      logger.warn('Cannot load programs - missing user or clientId', { userId: user?.id, clientId }, 'ClientProgressTracker');
      setLoadingPrograms(false);
      return;
    }
    
    try {
      logger.debug('Loading exercise programs', { clientId, practitionerId: user.id }, 'ClientProgressTracker');
      setLoadingPrograms(true);
      const programs = await HEPService.getPractitionerPrograms(user.id, clientId);
      logger.debug('Loaded exercise programs', { count: programs.length, programs }, 'ClientProgressTracker');
      setExistingPrograms(programs);
      // If programs exist, hide creator by default
      if (programs.length > 0) {
        setShowCreator(false);
      }
    } catch (error) {
      logger.error('Error loading programs', error, 'ClientProgressTracker');
      toast.error('Failed to load exercise programs');
    } finally {
      setLoadingPrograms(false);
    }
  }, [user?.id, clientId]);

  // Real-time subscription for exercise programs
  useRealtimeSubscription(
    'home_exercise_programs',
    `client_id=eq.${clientId}`,
    (payload) => {
      logger.debug('Real-time exercise program update', { payload }, 'ClientProgressTracker');
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        loadExistingPrograms();
      }
    }
  );

  useEffect(() => {
    if (clientId && user?.id) {
      fetchProgressData();
      fetchExerciseCompletions();
      fetchSessions();
      loadExistingPrograms();
    }
  }, [clientId, user?.id, loadExistingPrograms]);

  // Update selectedSessionId when sessionId prop changes
  useEffect(() => {
    if (sessionId) {
      setSelectedSessionId(sessionId);
    }
  }, [sessionId]);

  // Handle program deletion
  const handleDeleteProgram = async (programId: string) => {
    try {
      const result = await HEPService.deleteProgram(programId);
      
      if (result.success) {
        toast.success('Exercise program deleted successfully');
        loadExistingPrograms();
        setDeletingProgramId(null);
      } else {
        toast.error(result.error || 'Failed to delete program');
      }
    } catch (error) {
      logger.error('Error deleting program', error, 'ClientProgressTracker');
      toast.error('Failed to delete program');
    }
  };


  const fetchProgressData = async () => {
    try {
      setLoading(true);
      
      // Fetch metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('session_date', { ascending: false });

      if (metricsError) throw metricsError;

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('progress_goals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      setMetrics(metricsData || []);
      setGoals(goalsData || []);
    } catch (error: any) {
      console.error('Error fetching progress data:', error);
      const errorMessage = error?.message || 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch');
      toast.error(
        isNetworkError 
          ? 'Unable to connect. Please check your internet connection and try again.'
          : `Failed to load progress data: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete metric function
  const handleDeleteMetric = async (metricId: string) => {
    try {
      const { error } = await supabase
        .from('progress_metrics')
        .delete()
        .eq('id', metricId);

      if (error) throw error;

      toast.success('Metric deleted successfully');
      fetchProgressData();
      setDeletingMetricId(null);
    } catch (error: any) {
      console.error('Error deleting metric:', error);
      toast.error('Failed to delete metric');
    }
  };

  const fetchSessions = async () => {
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
        console.log('[ClientProgressTracker] Loaded sessions:', (data || []).length, 'sessions', data?.map(s => ({ id: s.id, date: s.session_date, number: s.session_number })));
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const fetchExerciseCompletions = async () => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase
        .from('exercise_program_progress')
        .select(`
          id,
          exercise_name,
          completed_date,
          completed_at,
          pain_level,
          difficulty_rating,
          client_notes,
          session_id,
          sets_completed,
          reps_completed,
          duration_minutes,
          session:client_sessions (
            id,
            session_date,
            session_type,
            session_number
          )
        `)
        .eq('client_id', clientId)
        .order('completed_date', { ascending: false })
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('[fetchExerciseCompletions] Error fetching exercise completions:', error);
        toast.error('Failed to load exercise completions');
        return;
      }

      // Map data ensuring all fields are included
      const mappedCompletions = (data || []).map(completion => ({
        id: completion.id,
        exercise_name: completion.exercise_name || '',
        completed_date: completion.completed_date,
        completed_at: completion.completed_at || null,
        pain_level: completion.pain_level ?? null,
        difficulty_rating: completion.difficulty_rating ?? null,
        client_notes: completion.client_notes || null,
        session_id: completion.session_id || null,
        sets_completed: completion.sets_completed ?? null,
        reps_completed: completion.reps_completed ?? null,
        duration_minutes: completion.duration_minutes ?? null,
        session: completion.session ? {
          id: completion.session.id,
          session_date: completion.session.session_date,
          session_type: completion.session.session_type,
          session_number: completion.session.session_number
        } : null
      }));

      setExerciseCompletions(mappedCompletions);
      console.log('[fetchExerciseCompletions] Loaded', mappedCompletions.length, 'exercise completions');
    } catch (error) {
      console.error('[fetchExerciseCompletions] Unexpected error:', error);
      toast.error('Failed to load exercise completions');
    }
  };




  const updateGoalProgress = async (goalId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('progress_goals')
        .update({
          current_value: newValue,
          status: newValue >= goals.find(g => g.id === goalId)?.target_value ? 'achieved' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(prev => 
        prev.map(goal => 
          goal.id === goalId 
            ? { 
                ...goal, 
                current_value: newValue,
                status: newValue >= goal.target_value ? 'achieved' : 'active',
                updated_at: new Date().toISOString()
              }
            : goal
        )
      );

      toast.success('Goal progress updated');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'pain_level': return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
      case 'mobility': return <Activity className="h-4 w-4" aria-hidden="true" />;
      case 'strength': return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
      case 'flexibility': return <Minus className="h-4 w-4" aria-hidden="true" />;
      case 'function': return <CheckCircle className="h-4 w-4" aria-hidden="true" />;
      default: return <BarChart3 className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Helper function to calculate trend for a metric
  const getMetricTrend = (currentMetric: ProgressMetric, allMetrics: ProgressMetric[]) => {
    // Find previous metric of the same type and name
    const previousMetrics = allMetrics
      .filter(m => 
        m.metric_type === currentMetric.metric_type && 
        m.metric_name === currentMetric.metric_name &&
        new Date(m.session_date) < new Date(currentMetric.session_date)
      )
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
    
    if (previousMetrics.length === 0) return null;
    
    const previousMetric = previousMetrics[0];
    const currentValue = currentMetric.value / currentMetric.max_value;
    const previousValue = previousMetric.value / previousMetric.max_value;
    const change = currentValue - previousValue;
    const percentChange = Math.abs((change / previousValue) * 100);
    
    if (change > 0.05) return { direction: 'up', change: percentChange, previous: previousMetric.value };
    if (change < -0.05) return { direction: 'down', change: percentChange, previous: previousMetric.value };
    return { direction: 'same', change: 0, previous: previousMetric.value };
  };

  // Group metrics by session date
  const groupMetricsBySession = (metrics: ProgressMetric[]) => {
    const grouped = new Map<string, ProgressMetric[]>();
    metrics.forEach(metric => {
      const dateKey = metric.session_date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(metric);
    });
    return Array.from(grouped.entries()).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  // Helper function to render Exercise Content (moved from Progress)
  const renderExercisesContent = () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Exercise Program</h3>
              <p className="text-sm text-muted-foreground">Home exercise programs</p>
            </div>
          </div>
        </div>

        {clientId ? (
          editingProgramId ? (
            <HEPEditor
              programId={editingProgramId}
              clientId={clientId}
              clientName={clientName}
              onProgramUpdated={() => {
                setEditingProgramId(null);
                loadExistingPrograms();
                toast.success('Exercise program updated successfully!');
              }}
              onClose={() => setEditingProgramId(null)}
            />
          ) : showCreator ? (
            <HEPCreator
              clientId={clientId}
              clientName={clientName}
              sessionId={sessionId}
              onProgramCreated={async (programId) => {
                setShowCreator(false);
                setCreatedHepId(programId);
                await loadExistingPrograms();
                toast.success('Home Exercise Program created and sent to client!');
                fetchProgressData();
              }}
              onClose={() => {
                setShowCreator(false);
                loadExistingPrograms();
              }}
            />
          ) : (
            <div className="space-y-3">
              {loadingPrograms ? (
                <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading programs...</p>
                </div>
              ) : existingPrograms.length > 0 ? (
                <>
                  {!readOnly && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setShowCreator(true);
                          setCreatedHepId(null);
                        }}
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-border/40 hover:bg-accent/50 transition-[border-color,background-color] duration-200 ease-out"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Program
                      </Button>
                    </div>
                  )}
                  <div className="grid gap-3">
                    {existingPrograms.map((program) => (
                      <div
                        key={program.id}
                        className="group rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-[border-color,background-color] duration-200 ease-out hover:border-primary/30 hover:bg-card"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-base text-foreground">{program.title}</h4>
                                  <Badge 
                                    variant={program.status === 'active' ? 'default' : 'secondary'}
                                    className="border-0"
                                  >
                                    {program.status}
                                  </Badge>
                                </div>
                                {program.description && (
                                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                    {program.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {program.exercises && program.exercises.length > 0 && (
                              <div className="pl-7 space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {program.exercises.length} {program.exercises.length === 1 ? 'Exercise' : 'Exercises'}
                                </p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {program.exercises.slice(0, 3).map((ex: any, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                      <span>
                                        {ex.name}
                                        {ex.sets && ex.reps && (
                                          <span className="text-xs ml-1.5 opacity-70">
                                            • {ex.sets} sets × {ex.reps} reps
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                  {program.exercises.length > 3 && (
                                    <li className="text-xs italic text-muted-foreground/70 pl-3">
                                      + {program.exercises.length - 3} more exercises
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pl-7 pt-2">
                              {program.created_at && (
                                <span>Created {new Date(program.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              )}
                              {program.delivered_at && (
                                <span>• Delivered {new Date(program.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!readOnly && (
                          <div className="flex gap-2 pt-3 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              onClick={() => setEditingProgramId(program.id!)}
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-lg border-border/40 hover:bg-accent/50"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => setDeletingProgramId(program.id!)}
                              variant="outline"
                              size="sm"
                              className="rounded-lg border-border/40 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-12 text-center transition-[border-color,background-color] duration-200 ease-out hover:bg-muted/40">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/20 mb-4">
                    <Activity className="h-7 w-7 text-purple-500 dark:text-purple-400 opacity-60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">No exercise programs</p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Create an exercise program for {clientName} to get started
                  </p>
                  {!readOnly && (
                    <Button
                      onClick={() => {
                        setShowCreator(true);
                        setCreatedHepId(null);
                      }}
                      variant="default"
                      className="rounded-lg"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Program
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">Unable to load client information</p>
          </div>
        )}
      </div>
  );

  // Helper function to render Progress tab content
  const renderProgressContent = () => {
    // Filter metrics by selected session if in readOnly mode (client view) and a session is selected
    // Use the same association logic as TheramateTimeline for consistency
    // Only filter if sessions are loaded to avoid race conditions
    console.log('[ClientProgressTracker] renderProgressContent:', {
      readOnly,
      selectedSessionId,
      sessionsCount: sessions.length,
      metricsCount: metrics.length,
      willFilter: readOnly && selectedSessionId && sessions.length > 0
    });
    
    const filteredMetrics = readOnly && selectedSessionId && sessions.length > 0
      ? filterMetricsBySession(metrics, selectedSessionId, sessions)
      : metrics;
    
    console.log('[ClientProgressTracker] Filtered metrics:', filteredMetrics.length, 'out of', metrics.length);
    
    // Separate metrics by type
    const painMetrics = filteredMetrics.filter(m => m.metric_type === 'pain_level');
    const romMetrics = filteredMetrics.filter(m => m.metric_type === 'mobility');
    const strengthMetrics = filteredMetrics.filter(m => m.metric_type === 'strength');
    const otherMetrics = filteredMetrics.filter(m => !['pain_level', 'mobility', 'strength'].includes(m.metric_type));

    return (
      <div className="space-y-4">
        {/* Session Selector for Client View - Only show when viewing all sessions, not a specific session */}
        {readOnly && sessions.length > 0 && !sessionId && (
          <div className="mb-4">
            <Label htmlFor="session-selector" className="text-sm font-medium mb-2 block">
              Select Session
            </Label>
            <Select
              value={selectedSessionId || 'all'}
              onValueChange={(value) => {
                setSelectedSessionId(value === 'all' ? null : value);
              }}
            >
              <SelectTrigger id="session-selector" className="w-full">
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions
                  .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
                  .map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {format(new Date(session.session_date), 'MMM dd, yyyy')}
                      {session.session_number && ` - Session #${session.session_number}`}
                      {session.session_type && ` (${session.session_type})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Goal Suggestions */}
        {showGoalSuggestions && suggestedGoals.length > 0 && (
          <GoalSuggestionCard
            suggestions={suggestedGoals}
            onAccept={async (suggestion) => {
              setShowProgressModal(true);
              setShowGoalSuggestions(false);
              setSuggestedGoals([]);
              toast.success('Goal suggestion ready. Review and save in the modal.');
            }}
            onDismiss={() => {
              setShowGoalSuggestions(false);
              setSuggestedGoals([]);
            }}
          />
        )}

        {/* Pain Level Section */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
              <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Pain Level</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Visual Analog Scale (VAS) measurements</p>
            </div>
            {!readOnly && (
              <Button
                onClick={() => {
                  setEditingMetric({
                    id: '',
                    metric_name: 'Pain Level (VAS)',
                    metric_type: 'pain_level',
                    value: 0,
                    max_value: 10,
                    unit: '/10',
                    notes: '',
                    session_id: sessionId || null,
                    session_date: new Date().toISOString().split('T')[0],
                    metadata: {}
                  });
                  setShowProgressModal(true);
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Metric
              </Button>
            )}
          </div>
          {painMetrics.length > 0 ? (
            <div className="rounded-[10px] overflow-hidden border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="h-14 border-b border-border bg-card hover:bg-transparent">
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground w-[100px] rounded-tl-[10px] border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Date
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground min-w-[80px] border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Session
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        Location
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right border-r border-border">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <Gauge className="h-4 w-4" />
                        Pain Level
                      </span>
                    </TableHead>
                    <TableHead className={`h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border ${readOnly ? 'rounded-tr-[10px]' : ''}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        Notes
                      </span>
                    </TableHead>
                    {!readOnly && (
                      <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right w-[100px] rounded-tr-[10px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                {groupMetricsBySession(painMetrics).map(([sessionDate, sessionMetrics]) => {
                  const sessionForDate = sessionMetrics
                    .map(m => m.session_id ? sessions.find(s => s.id === m.session_id) : null)
                    .find(s => s !== null) || sessions.find(s => s.session_date === sessionDate);
                  return sessionMetrics.map((metric, index) => (
                    <TableRow key={metric.id} className="h-14 border-b border-border bg-card hover:bg-muted/50 group">
                      {index === 0 && (
                        <>
                          <TableCell className="h-14 px-3.5 py-2.5 text-sm text-foreground font-medium border-r border-border align-middle" rowSpan={sessionMetrics.length}>
                            {format(new Date(sessionDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle" rowSpan={sessionMetrics.length}>
                            {sessionForDate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                #{sessionForDate.session_number || 'N/A'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-foreground font-normal border-r border-border align-middle">{metric.metric_name}</TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-right border-r border-border align-middle text-muted-foreground font-normal">
                        <span className="inline-flex items-center justify-end gap-1">
                          <span className="font-semibold text-foreground">{metric.value}</span>
                          <span className="text-xs text-muted-foreground">{metric.unit}</span>
                        </span>
                      </TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle">
                        {metric.notes ? <span className="truncate block max-w-xs" title={metric.notes}>{metric.notes}</span> : <span>—</span>}
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="h-14 px-3.5 py-2.5 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingMetric(metric); setShowProgressModal(true); }} className="text-muted-foreground hover:text-teal-600 hover:bg-teal-100/50 dark:hover:bg-teal-950/30 h-8 px-2" aria-label={`Edit ${metric.metric_name} metric`}>
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingMetricId(metric.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label={`Delete ${metric.metric_name} metric`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ));
                })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 p-8 flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No pain level metrics recorded yet</p>
            </div>
          )}
        </section>

        {/* Range of Movement Section */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
              <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Range of Movement</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Joint mobility measurements in degrees</p>
            </div>
            {!readOnly && (
              <Button
                onClick={() => {
                  setEditingMetric({
                    id: '',
                    metric_name: '',
                    metric_type: 'mobility',
                    value: 0,
                    max_value: 180,
                    unit: 'degrees',
                    notes: '',
                    session_id: sessionId || null,
                    session_date: new Date().toISOString().split('T')[0],
                    metadata: {}
                  });
                  setShowProgressModal(true);
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Metric
              </Button>
            )}
          </div>
          {romMetrics.length > 0 ? (
            <div className="rounded-[10px] overflow-hidden border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="h-14 border-b border-border bg-card hover:bg-transparent">
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground w-[100px] rounded-tl-[10px] border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Date
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground min-w-[80px] border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Session
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <Activity className="h-4 w-4" />
                        Joint/Movement
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">Side</TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right border-r border-border">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <Gauge className="h-4 w-4" />
                        Range
                      </span>
                    </TableHead>
                    <TableHead className={`h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border ${readOnly ? 'rounded-tr-[10px]' : ''}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        Notes
                      </span>
                    </TableHead>
                    {!readOnly && (
                      <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right w-[100px] rounded-tr-[10px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                {groupMetricsBySession(romMetrics).map(([sessionDate, sessionMetrics]) => {
                  const sessionForDate = sessionMetrics
                    .map(m => m.session_id ? sessions.find(s => s.id === m.session_id) : null)
                    .find(s => s !== null) || sessions.find(s => s.session_date === sessionDate);
                  return sessionMetrics.map((metric, index) => (
                    <TableRow key={metric.id} className="h-14 border-b border-border bg-card hover:bg-muted/50 group">
                      {index === 0 && (
                        <>
                          <TableCell className="h-14 px-3.5 py-2.5 text-sm text-foreground font-medium border-r border-border align-middle" rowSpan={sessionMetrics.length}>
                            {format(new Date(sessionDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle" rowSpan={sessionMetrics.length}>
                            {sessionForDate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                #{sessionForDate.session_number || 'N/A'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-foreground font-normal border-r border-border align-middle">
                        {metric.metric_name}
                        {metric.metadata?.joint && metric.metadata?.movement && (
                          <div className="text-xs text-muted-foreground mt-0.5">{metric.metadata.joint} • {metric.metadata.movement}</div>
                        )}
                      </TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle">
                        {metric.metadata?.side ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">{metric.metadata.side}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-right border-r border-border align-middle text-muted-foreground font-normal">
                        <span className="inline-flex items-center justify-end gap-1">
                          <span className="font-semibold text-foreground">{metric.value}°</span>
                          <span className="text-xs text-muted-foreground">{metric.unit}</span>
                        </span>
                      </TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle">
                        {metric.notes ? <span className="truncate block max-w-xs" title={metric.notes}>{metric.notes}</span> : <span>—</span>}
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="h-14 px-3.5 py-2.5 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingMetric(metric); setShowProgressModal(true); }} className="text-muted-foreground hover:text-teal-600 hover:bg-teal-100/50 dark:hover:bg-teal-950/30 h-8 px-2" aria-label={`Edit ${metric.metric_name} metric`}>
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingMetricId(metric.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label={`Delete ${metric.metric_name} metric`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ));
                })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 p-8 flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No range of movement metrics recorded yet</p>
            </div>
          )}
        </section>

        {/* Strength Section */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
              <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Strength</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Oxford Scale measurements</p>
            </div>
            {!readOnly && (
              <Button
                onClick={() => {
                  setEditingMetric({
                    id: '',
                    metric_name: '',
                    metric_type: 'strength',
                    value: 0,
                    max_value: 5,
                    unit: '/5',
                    notes: '',
                    session_id: sessionId || null,
                    session_date: new Date().toISOString().split('T')[0],
                    metadata: {}
                  });
                  setShowProgressModal(true);
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Metric
              </Button>
            )}
          </div>
          {strengthMetrics.length > 0 ? (
            <div className="rounded-[10px] overflow-hidden border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="h-14 border-b border-border bg-card hover:bg-transparent">
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground w-[100px] rounded-tl-[10px] border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Date
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground min-w-[80px] border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Session
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">
                      <span className="inline-flex items-center gap-1.5">
                        <Dumbbell className="h-4 w-4" />
                        Muscle/Movement
                      </span>
                    </TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">Side</TableHead>
                    <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right border-r border-border">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <Target className="h-4 w-4" />
                        Grade
                      </span>
                    </TableHead>
                    <TableHead className={`h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border ${readOnly ? 'rounded-tr-[10px]' : ''}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        Notes
                      </span>
                    </TableHead>
                    {!readOnly && (
                      <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right w-[100px] rounded-tr-[10px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                {groupMetricsBySession(strengthMetrics).map(([sessionDate, sessionMetrics]) => {
                  const sessionForDate = sessionMetrics
                    .map(m => m.session_id ? sessions.find(s => s.id === m.session_id) : null)
                    .find(s => s !== null) || sessions.find(s => s.session_date === sessionDate);
                  return sessionMetrics.map((metric, index) => (
                    <TableRow key={metric.id} className="h-14 border-b border-border bg-card hover:bg-muted/50 group">
                      {index === 0 && (
                        <>
                          <TableCell className="h-14 px-3.5 py-2.5 text-sm text-foreground font-medium border-r border-border align-middle" rowSpan={sessionMetrics.length}>
                            {format(new Date(sessionDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle" rowSpan={sessionMetrics.length}>
                            {sessionForDate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                #{sessionForDate.session_number || 'N/A'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-foreground font-normal border-r border-border align-middle">
                        {metric.metric_name}
                        {metric.metadata?.joint && metric.metadata?.movement && (
                          <div className="text-xs text-muted-foreground mt-0.5">{metric.metadata.joint} • {metric.metadata.movement}</div>
                        )}
                      </TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle">
                        {metric.metadata?.side ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">{metric.metadata.side}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-right border-r border-border align-middle text-muted-foreground font-normal">
                        <span className="inline-flex items-center justify-end gap-1">
                          <span className="font-semibold text-foreground">{metric.value}</span>
                          <span className="text-xs text-muted-foreground">{metric.unit}</span>
                        </span>
                      </TableCell>
                      <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground font-normal border-r border-border align-middle">
                        {metric.notes ? <span className="truncate block max-w-xs" title={metric.notes}>{metric.notes}</span> : <span>—</span>}
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="h-14 px-3.5 py-2.5 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingMetric(metric); setShowProgressModal(true); }} className="text-muted-foreground hover:text-teal-600 hover:bg-teal-100/50 dark:hover:bg-teal-950/30 h-8 px-2" aria-label={`Edit ${metric.metric_name} metric`}>
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingMetricId(metric.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label={`Delete ${metric.metric_name} metric`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ));
                })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 p-8 flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No strength metrics recorded yet</p>
            </div>
          )}
        </section>

        {/* Other Metrics Section */}
        {otherMetrics.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-950/20">
                <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Other Metrics</h3>
                <p className="text-sm text-muted-foreground">Additional progress measurements</p>
              </div>
            </div>
            <div className="grid gap-3">
              {groupMetricsBySession(otherMetrics).map(([sessionDate, sessionMetrics]) => {
                // Find session for this date group - check if any metric has a session_id that matches a session
                const sessionForDate = sessionMetrics
                  .map(m => m.session_id ? sessions.find(s => s.id === m.session_id) : null)
                  .find(s => s !== null) || sessions.find(s => s.session_date === sessionDate);
                
                return (
                <div key={sessionDate} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-sm font-medium text-foreground">
                      {new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {sessionForDate && (
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                        Session #{sessionForDate.session_number || 'N/A'}
                      </Badge>
                    )}
                  </div>
                  {sessionMetrics.map((metric) => (
                    <div key={metric.id} className="rounded-lg border border-border/50 bg-card/50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm">{metric.metric_name}</span>
                          <div className="text-lg font-bold">
                            {metric.value} <span className="text-sm font-normal">{metric.unit}</span>
                          </div>
                        </div>
                      </div>
                      {metric.notes && (
                        <p className="text-xs text-muted-foreground mt-2">{metric.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper function to render Metrics content (for use in accordion)
  const renderMetricsContent = () => (
    <div className="space-y-4">
      {metrics.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No metrics recorded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupMetricsBySession(metrics).map(([sessionDate, sessionMetrics]) => {
            const sessionMetricWithId = sessionMetrics.find(m => m.session_id);
            return (
              <div key={sessionDate} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-semibold text-foreground">
                    {new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {sessionMetricWithId?.session_id && (() => {
                    const session = sessions.find(s => s.id === sessionMetricWithId.session_id);
                    return session?.session_number ? (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                        Session #{session.session_number}
                      </Badge>
                    ) : null;
                  })()}
                  <Badge variant="outline" className="text-xs">
                    {sessionMetrics.length} {sessionMetrics.length === 1 ? 'metric' : 'metrics'}
                  </Badge>
                </div>
                {sessionMetrics.map((metric) => {
                  const trend = getMetricTrend(metric, metrics);
                  return (
                    <div key={metric.id} className="border rounded-lg p-5 bg-card hover:border-primary/20 transition-[border-color,background-color] duration-200 ease-out">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getMetricIcon(metric.metric_type)}
                            <span className="font-semibold text-base">{metric.metric_name}</span>
                            <Badge variant="outline" className="text-xs">{metric.metric_type}</Badge>
                          </div>
                          <div className="text-2xl font-bold mt-2 mb-3">
                            {metric.value}{metric.unit}
                          </div>
                          {trend && trend.direction !== 'same' && (
                            <div className="text-xs text-muted-foreground">
                              {trend.direction === 'up' ? '↑' : '↓'} {trend.change.toFixed(0)}% from previous
                            </div>
                          )}
                        </div>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMetric(metric);
                              setShowProgressModal(true);
                            }}
                            className="shrink-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {metric.notes && (
                        <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">{metric.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Helper function to render Goals content (for use in accordion)
  const renderGoalsContent = () => (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Client Goals</h3>
            <p className="text-sm text-muted-foreground">Set and track specific goals for {clientName}</p>
          </div>
          <Button
            onClick={() => {
              setEditingGoal(null);
              setShowProgressModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        </div>
      )}
      {goals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-4">No goals set yet</p>
          {!readOnly && (
            <Button
              onClick={() => {
                setEditingGoal(null);
                setShowProgressModal(true);
              }}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Goal
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-[10px] overflow-hidden border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="h-14 border-b border-border bg-card hover:bg-transparent">
                <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground rounded-tl-[10px] border-r border-border">Goal</TableHead>
                <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">Description</TableHead>
                <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">Progress</TableHead>
                <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">Target date</TableHead>
                <TableHead className={`h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border ${readOnly ? 'rounded-tr-[10px]' : ''}`}>Status</TableHead>
                {!readOnly && (
                  <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right w-20 rounded-tr-[10px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id} className="h-14 border-b border-border bg-card hover:bg-muted/50 group">
                  <TableCell className="h-14 px-3.5 py-2.5 text-sm font-medium text-foreground border-r border-border align-middle">
                    <span className="inline-flex items-center gap-2">
                      <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {goal.goal_name}
                    </span>
                  </TableCell>
                  <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground border-r border-border align-middle max-w-xs">
                    {goal.description ? <span className="line-clamp-2">{goal.description}</span> : '—'}
                  </TableCell>
                  <TableCell className="h-14 px-3.5 py-2.5 border-r border-border align-middle">
                    <div className="space-y-1.5 min-w-[120px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold text-foreground">{goal.current_value} / {goal.target_value}</span>
                      </div>
                      <Progress
                        value={getProgressPercentage(goal.current_value, goal.target_value)}
                        className="h-2"
                        aria-label={`Goal progress: ${goal.current_value} out of ${goal.target_value}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="h-14 px-3.5 py-2.5 text-sm text-muted-foreground border-r border-border align-middle">
                    {new Date(goal.target_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="h-14 px-3.5 py-2.5 border-r border-border align-middle">
                    <Badge className={getGoalStatusColor(goal.status)}>{goal.status}</Badge>
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="h-14 px-3.5 py-2.5 align-middle text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingGoal(goal); setShowProgressModal(true); }}
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Edit goal ${goal.goal_name}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  // Helper function to render History tab content
  const renderHistoryContent = () => (
    <div className="space-y-4">
      {/* View Toggle - Hidden when hideInternalTabs is true (used in MySessions) */}
      {!hideInternalTabs && (
        <div className="flex justify-end gap-2">
          <Button
            variant={historyView === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHistoryView('timeline')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant={historyView === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHistoryView('chart')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Chart
          </Button>
        </div>
      )}

      {/* Timeline View */}
      {historyView === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Theramate Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.length === 0 && exerciseCompletions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium mb-2">No progress data yet</p>
                <p className="text-sm">Progress metrics and exercise completions will appear here in chronological order.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const timelineItems: Array<{
                    type: 'session' | 'metric' | 'exercise';
                    date: string;
                    sessionId?: string;
                    sessionNumber?: number;
                    data: any;
                  }> = [];

                  sessions.forEach(session => {
                    timelineItems.push({
                      type: 'session',
                      date: session.session_date,
                      sessionId: session.id,
                      sessionNumber: session.session_number,
                      data: session
                    });
                  });

                  metrics.forEach(metric => {
                    timelineItems.push({
                      type: 'metric',
                      date: metric.session_date,
                      sessionId: metric.session_id || undefined,
                      data: metric
                    });
                  });

                  exerciseCompletions.forEach(exercise => {
                    timelineItems.push({
                      type: 'exercise',
                      date: exercise.completed_date,
                      sessionId: exercise.session_id,
                      data: exercise
                    });
                  });

                  timelineItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                  const grouped: Array<{
                    period: string;
                    startDate: string;
                    endDate?: string;
                    sessionId?: string;
                    sessionNumber?: number;
                    items: typeof timelineItems;
                  }> = [];

                  let currentPeriod: typeof grouped[0] | null = null;

                  timelineItems.forEach(item => {
                    if (item.type === 'session') {
                      if (currentPeriod) {
                        grouped.push(currentPeriod);
                      }
                      const sessionDate = new Date(item.date);
                      const nextSession = sessions.find(s => new Date(s.session_date) > sessionDate);
                      currentPeriod = {
                        period: `Session #${item.sessionNumber || 'N/A'} - ${sessionDate.toLocaleDateString()}`,
                        startDate: item.date,
                        endDate: nextSession?.session_date,
                        sessionId: item.sessionId,
                        sessionNumber: item.sessionNumber,
                        items: [item]
                      };
                    } else {
                      const itemDate = new Date(item.date);
                      let assigned = false;

                      if (currentPeriod) {
                        const periodStart = new Date(currentPeriod.startDate);
                        const periodEnd = currentPeriod.endDate ? new Date(currentPeriod.endDate) : new Date(Date.now() + 86400000);
                        if (itemDate >= periodStart && itemDate < periodEnd) {
                          currentPeriod.items.push(item);
                          assigned = true;
                        }
                      }

                      if (!assigned) {
                        const nearestSession = sessions.reduce((closest, session) => {
                          const sessionDate = new Date(session.session_date);
                          const closestDate = closest ? new Date(closest.session_date) : null;
                          if (!closestDate || Math.abs(itemDate.getTime() - sessionDate.getTime()) < Math.abs(itemDate.getTime() - closestDate.getTime())) {
                            return session;
                          }
                          return closest;
                        }, sessions[0]);

                        if (nearestSession) {
                          const sessionDate = new Date(nearestSession.session_date);
                          const nextSession = sessions.find(s => new Date(s.session_date) > sessionDate);
                          grouped.push({
                            period: `Session #${nearestSession.session_number || 'N/A'} - ${sessionDate.toLocaleDateString()}`,
                            startDate: item.date,
                            endDate: nextSession?.session_date,
                            sessionId: nearestSession.id,
                            sessionNumber: nearestSession.session_number,
                            items: [item]
                          });
                        } else {
                          grouped.push({
                            period: new Date(item.date).toLocaleDateString(),
                            startDate: item.date,
                            items: [item]
                          });
                        }
                      } else if (!assigned && currentPeriod) {
                        currentPeriod.items.push(item);
                      }
                    }
                  });

                  if (currentPeriod) {
                    grouped.push(currentPeriod);
                  }

                  sessions.forEach(session => {
                    const sessionExists = grouped.some(g => g.sessionId === session.id);
                    if (!sessionExists) {
                      const sessionDate = new Date(session.session_date);
                      let insertIndex = grouped.length;
                      
                      for (let i = 0; i < grouped.length; i++) {
                        const periodDate = new Date(grouped[i].startDate);
                        if (sessionDate < periodDate) {
                          insertIndex = i;
                          break;
                        }
                      }
                      
                      const nextSession = sessions.find(s => new Date(s.session_date) > sessionDate);
                      grouped.splice(insertIndex, 0, {
                        period: `Session #${session.session_number || 'N/A'} - ${sessionDate.toLocaleDateString()}`,
                        startDate: session.session_date,
                        endDate: nextSession?.session_date,
                        sessionId: session.id,
                        sessionNumber: session.session_number,
                        items: [{
                          type: 'session',
                          date: session.session_date,
                          sessionId: session.id,
                          sessionNumber: session.session_number,
                          data: session
                        }]
                      });
                    }
                  });
                  
                  grouped.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                  return grouped.map((period, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{period.period}</span>
                        {period.startDate && period.endDate && (
                          <span className="text-xs text-muted-foreground">
                            ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
                          </span>
                        )}
                      </div>

                      {/* Session header - simplified when hideInternalTabs is true */}
                      {period.sessionId && period.items.some(item => item.type === 'session') && (
                        <div className={`mb-4 pb-3 ${hideInternalTabs ? 'border-b border-[#e9e9e7]' : 'border-b border-primary/20'}`}>
                          <div className="flex items-center gap-2">
                            <Calendar className={`h-4 w-4 ${hideInternalTabs ? 'text-[#787774]' : 'text-primary'}`} />
                            <span className={`text-sm font-medium ${hideInternalTabs ? 'text-[#37352f]' : 'text-primary'}`}>
                              {hideInternalTabs 
                                ? format(new Date(period.startDate), 'MMM dd, yyyy')
                                : `Session #${period.sessionNumber || 'N/A'} - ${new Date(period.startDate).toLocaleDateString()}`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {period.items
                        .filter(item => item.type !== 'session')
                        .map((item, itemIdx) => {
                          if (item.type === 'metric') {
                            const metric = item.data as ProgressMetric;
                            const trend = getMetricTrend(metric, metrics);
                            if (hideInternalTabs) {
                              return (
                                <div 
                                  key={`metric-${itemIdx}`} 
                                  className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-md p-3 mb-2"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    {getMetricIcon(metric.metric_type)}
                                    <span className="text-[14px] text-[#37352f] font-medium">{metric.metric_name}</span>
                                  </div>
                                  <div className="text-[15px] font-medium text-[#37352f]">
                                    {metric.value}{metric.unit} / {metric.max_value}{metric.unit}
                                  </div>
                                  {metric.notes && (
                                    <p className="text-[13px] text-[#787774] mt-2">{metric.notes}</p>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <Card key={`metric-${itemIdx}`} className="bg-blue-50/50 border-blue-200">
                                <CardContent className="pt-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getMetricIcon(metric.metric_type)}
                                    <span className="font-medium">{metric.metric_name}</span>
                                    <Badge variant="outline" className="text-xs">Progress Metric</Badge>
                                    {trend && (
                                      <Badge variant="outline" className={`text-xs ${
                                        trend.direction === 'up' ? 'text-green-600 border-green-300' :
                                        trend.direction === 'down' ? 'text-red-600 border-red-300' :
                                        'text-gray-600 border-gray-300'
                                      }`}>
                                        {trend.direction === 'up' && <TrendingUp className="h-3 w-3 inline mr-1" />}
                                        {trend.direction === 'down' && <TrendingDown className="h-3 w-3 inline mr-1" />}
                                        {trend.direction !== 'same' && `${trend.change.toFixed(0)}%`}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-lg font-bold">
                                    {metric.value}{metric.unit} / {metric.max_value}{metric.unit}
                                  </div>
                                  {metric.notes && (
                                    <p className="text-sm text-muted-foreground mt-2">{metric.notes}</p>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          } else if (item.type === 'exercise') {
                            const exercise = item.data;
                            if (hideInternalTabs) {
                              return (
                                <div 
                                  key={`exercise-${itemIdx}`} 
                                  className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-md p-3 mb-2"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Activity className="h-4 w-4 text-[#787774]" />
                                    <span className="text-[14px] text-[#37352f] font-medium">{exercise.exercise_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[12px] text-[#787774] mb-2">
                                    <Clock className="h-3 w-3" />
                                    {new Date(exercise.completed_date).toLocaleDateString()}
                                    {exercise.completed_at && 
                                      ` at ${new Date(exercise.completed_at).toLocaleTimeString()}`
                                    }
                                  </div>
                                  <div className="flex gap-3 mt-2">
                                    {exercise.pain_level !== null && exercise.pain_level !== undefined && (
                                      <div>
                                        <span className="text-[12px] text-[#787774]">Pain: </span>
                                        <Badge className={exercise.pain_level <= 3 ? 'bg-green-100 text-green-800' : exercise.pain_level <= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                          {exercise.pain_level}/10
                                        </Badge>
                                      </div>
                                    )}
                                    {exercise.difficulty_rating !== null && exercise.difficulty_rating !== undefined && (
                                      <div>
                                        <span className="text-[12px] text-[#787774]">Difficulty: </span>
                                        <Badge variant="outline" className="text-[11px]">
                                          {exercise.difficulty_rating}/5
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  {exercise.client_notes && (
                                    <div className="mt-3 pt-3 border-t border-[#e9e9e7]">
                                      <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 text-[#787774] mt-0.5" />
                                        <div className="flex-1">
                                          <div className="text-[12px] font-medium text-[#787774] mb-1">Client Notes</div>
                                          <p className="text-[13px] text-[#37352f]">{exercise.client_notes}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <Card key={`exercise-${itemIdx}`} className="bg-green-50/50 border-green-200">
                                <CardContent className="pt-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Activity className="h-4 w-4" />
                                    <span className="font-medium">{exercise.exercise_name}</span>
                                    <Badge variant="outline" className="text-xs">Exercise</Badge>
                                    {exercise.session && (
                                      <Badge variant="secondary" className="text-xs">
                                        Session #{exercise.session.session_number || 'N/A'}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <Clock className="h-3 w-3" />
                                    {new Date(exercise.completed_date).toLocaleDateString()}
                                    {exercise.completed_at && 
                                      ` at ${new Date(exercise.completed_at).toLocaleTimeString()}`
                                    }
                                  </div>
                                  <div className="flex gap-3 mt-2">
                                    {exercise.pain_level !== null && exercise.pain_level !== undefined && (
                                      <div>
                                        <span className="text-xs text-muted-foreground">Pain: </span>
                                        <Badge className={exercise.pain_level <= 3 ? 'bg-green-100 text-green-800' : exercise.pain_level <= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                          {exercise.pain_level}/10
                                        </Badge>
                                      </div>
                                    )}
                                    {exercise.difficulty_rating !== null && exercise.difficulty_rating !== undefined && (
                                      <div>
                                        <span className="text-xs text-muted-foreground">Difficulty: </span>
                                        <Badge variant="outline">
                                          {exercise.difficulty_rating}/5
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  {exercise.client_notes && (
                                    <div className="mt-3 pt-3 border-t">
                                      <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                                        <div className="flex-1">
                                          <div className="text-xs font-medium text-muted-foreground mb-1">Client Notes</div>
                                          <p className="text-sm">{exercise.client_notes}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          }
                          return null;
                        })}
                    </div>
                  ));
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart View - Show when chart is selected, or when hideInternalTabs is true and defaultTab is history */}
      {historyView === 'chart' && (!hideInternalTabs || (hideInternalTabs && defaultTab === 'history')) && (
        <div className="space-y-6">
          {/* Session Selector */}
          {sessions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Label htmlFor="chart-session-selector" className="text-sm font-medium">
                    Filter by Session:
                  </Label>
                  <Select
                    value={selectedSessionId || 'all'}
                    onValueChange={(value) => {
                      setSelectedSessionId(value === 'all' ? null : value);
                    }}
                  >
                    <SelectTrigger id="chart-session-selector" className="w-[300px]">
                      <SelectValue placeholder="Select a session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sessions</SelectItem>
                      {sessions
                        .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
                        .map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {format(new Date(session.session_date), 'MMM dd, yyyy')}
                            {session.session_number && ` - Session #${session.session_number}`}
                            {session.session_type && ` (${session.session_type})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Filter metrics by selected session */}
          {(() => {
            // Use the same association logic as TheramateTimeline for consistency
            const filteredMetrics = selectedSessionId && sessions.length > 0
              ? filterMetricsBySession(metrics, selectedSessionId, sessions)
              : metrics;
            
            return (
              <>
                {/* Pain Level Charts */}
                <PainMetricChart metrics={filteredMetrics} />
                
                {/* Range of Movement Charts */}
                <ROMMetricChart metrics={filteredMetrics} />
                
                {/* Strength Charts */}
                <StrengthMetricChart metrics={filteredMetrics} />
                
                {/* Goals Section - Goals are client-level, not session-specific */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Goals
                    </CardTitle>
                    <CardDescription>Track treatment objectives</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {goals.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No goals set yet</p>
                        {!readOnly && (
                          <p className="text-xs mt-2">Create goals to track treatment objectives</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {goals.map((goal) => {
                          const progressPercentage = getProgressPercentage(goal.current_value, goal.target_value);
                          return (
                            <div key={goal.id} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm mb-1">{goal.goal_name}</h4>
                                  {goal.description && (
                                    <p className="text-xs text-muted-foreground mb-1">{goal.description}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Target: {goal.target_value} by {format(new Date(goal.target_date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                                <Badge 
                                  variant={goal.status === 'achieved' ? 'default' : goal.status === 'active' ? 'secondary' : 'outline'}
                                  className="ml-2"
                                >
                                  {goal.status === 'achieved' ? 'Achieved' : goal.status === 'active' ? 'Active' : goal.status === 'paused' ? 'Paused' : 'Cancelled'}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Current: {goal.current_value}</span>
                                  <span>{progressPercentage.toFixed(0)}%</span>
                                </div>
                                <Progress 
                                  value={progressPercentage} 
                                  className="h-2"
                                  aria-label={`Goal progress: ${goal.current_value} out of ${goal.target_value}`}
        />
            </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );

  // Helper function to render Insights tab content
  const renderInsightsContent = () => (
    <ProgressInsights
      clientId={clientId}
      metrics={metrics.map(m => ({
        id: m.id,
        metric_name: m.metric_name,
        metric_type: m.metric_type,
        value: m.value,
        max_value: m.max_value,
        unit: m.unit,
        session_date: m.session_date,
        created_at: m.created_at
      }))}
      goals={goals.map(g => ({
        id: g.id,
        goal_name: g.goal_name,
        target_value: g.target_value,
        current_value: g.current_value,
        target_date: g.target_date,
        status: g.status,
        linked_metric_name: g.linked_metric_name,
        created_at: g.created_at
      }))}
      exercises={exerciseCompletions.map(e => ({
        completed_date: e.completed_date,
        exercise_name: e.exercise_name,
        pain_level: e.pain_level,
        difficulty_rating: e.difficulty_rating
      }))}
    />
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {hideInternalTabs ? (
        // When hiding internal tabs, show only the defaultTab content without tabs UI
        <div className="w-full">
          {defaultTab === 'progress' && (
            <div className="space-y-4 mt-0">
              {renderProgressContent()}
            </div>
          )}
          {defaultTab === 'goals' && (
            <div className="space-y-4 mt-0">
              {renderGoalsContent()}
            </div>
          )}
          {defaultTab === 'history' && (
            <div className="space-y-4 mt-0">
              {renderHistoryContent()}
            </div>
          )}
          {defaultTab === 'insights' && (
            <div className="mt-0">
              {renderInsightsContent()}
            </div>
          )}
          {defaultTab === 'exercises' && (
            <div className="mt-0">
              {renderExercisesContent()}
            </div>
          )}
          {defaultTab === 'theramate-timeline' && (
            <div className="mt-0">
              <TheramateTimeline clientId={clientId} clientName={clientName} readOnly={readOnly} />
            </div>
          )}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 min-h-[44px]">
            <TabsTrigger value="progress" className="min-h-[44px] sm:min-h-0">
              Progress
            </TabsTrigger>
            <TabsTrigger value="goals" className="min-h-[44px] sm:min-h-0">
              <Target className="h-4 w-4 inline mr-1" aria-hidden="true" />
              Goals
              {!readOnly && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex ml-1.5 text-muted-foreground hover:text-foreground cursor-help"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="What is Goals?"
                      >
                        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px]">
                      <p>Set and track client-focused goals. Goals can be linked to metrics and help focus treatment on what matters most to the client.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </TabsTrigger>
            <TabsTrigger value="theramate-timeline" className="min-h-[44px] sm:min-h-0">
              <Calendar className="h-4 w-4 inline mr-1" aria-hidden="true" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="history" className="min-h-[44px] sm:min-h-0">
              <Calendar className="h-4 w-4 inline mr-1" aria-hidden="true" />
              History
            </TabsTrigger>
            <TabsTrigger value="insights" className="min-h-[44px] sm:min-h-0">
              <Sparkles className="h-4 w-4 inline mr-1" aria-hidden="true" />
              Insights
            </TabsTrigger>
          </TabsList>

        {/* Progress Tab - Separate sections for Pain, ROM, Strength */}
        <TabsContent value="progress" className="space-y-4 mt-4">
          {renderProgressContent()}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4 mt-4">
          {renderGoalsContent()}
        </TabsContent>

        {/* Theramate Timeline Tab */}
        <TabsContent value="theramate-timeline" className="mt-4">
          <TheramateTimeline clientId={clientId} clientName={clientName} readOnly={readOnly} />
        </TabsContent>

        {/* History Tab - Combines Timeline and Chart */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {renderHistoryContent()}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="mt-4">
          {renderInsightsContent()}
        </TabsContent>

        {/* Exercises Tab (if used within internal tabs, though Practice Client Management separates it) */}
        <TabsContent value="exercises" className="mt-4">
          {renderExercisesContent()}
        </TabsContent>
        </Tabs>
      )}

      {/* Legacy Timeline Tab - Disabled (moved to History tab) */}
      {false && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Theramate Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 && exerciseCompletions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                  <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium mb-2">No progress data yet</p>
                  <p className="text-sm">Progress metrics and exercise completions will appear here in chronological order.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Combine metrics and exercises, group by session periods
                    const timelineItems: Array<{
                      type: 'session' | 'metric' | 'exercise';
                      date: string;
                      sessionId?: string;
                      sessionNumber?: number;
                      data: any;
                    }> = [];

                    // Add sessions as markers
                    sessions.forEach(session => {
                      timelineItems.push({
                        type: 'session',
                        date: session.session_date,
                        sessionId: session.id,
                        sessionNumber: session.session_number,
                        data: session
                      });
                    });

                    // Add metrics
                    metrics.forEach(metric => {
                      timelineItems.push({
                        type: 'metric',
                        date: metric.session_date,
                        sessionId: metric.session_id,
                        data: metric
                      });
                    });

                    // Add exercise completions
                    exerciseCompletions.forEach(exercise => {
                      timelineItems.push({
                        type: 'exercise',
                        date: exercise.completed_date,
                        sessionId: exercise.session_id,
                        data: exercise
                      });
                    });

                    // Sort by date
                    timelineItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    // Group by session periods - improved logic to handle all sessions
                    const grouped: Array<{
                      period: string;
                      startDate: string;
                      endDate?: string;
                      sessionId?: string;
                      sessionNumber?: number;
                      items: typeof timelineItems;
                    }> = [];

                    // Group items by session periods
                    let currentSession: typeof sessions[0] | null = null;
                    let currentPeriod: typeof grouped[0] | null = null;

                    timelineItems.forEach(item => {
                      if (item.type === 'session') {
                        // Close previous period if exists
                        if (currentPeriod) {
                          grouped.push(currentPeriod);
                        }
                        
                        // Start new period for this session
                        currentSession = sessions.find(s => s.id === item.sessionId) || null;
                        const nextSession = sessions.find(s => new Date(s.session_date) > new Date(item.date));
                        
                        currentPeriod = {
                          period: currentSession 
                            ? `Session #${currentSession.session_number || 'N/A'} - ${new Date(currentSession.session_date).toLocaleDateString()}`
                            : `Session on ${new Date(item.date).toLocaleDateString()}`,
                          startDate: item.date,
                          endDate: nextSession?.session_date,
                          sessionId: item.sessionId,
                          sessionNumber: item.sessionNumber,
                          items: [item] // Include the session marker
                        };
                      } else {
                        // Determine which session period this item belongs to
                        const itemDate = new Date(item.date);
                        let assigned = false;
                        
                        // Find the session this item belongs to (between session date and next session date)
                        for (let i = 0; i < sessions.length; i++) {
                          const session = sessions[i];
                          const nextSession = sessions[i + 1];
                          const sessionDate = new Date(session.session_date);
                          const nextSessionDate = nextSession ? new Date(nextSession.session_date) : new Date('9999-12-31');
                          
                          if (itemDate >= sessionDate && itemDate < nextSessionDate) {
                            // This item belongs to this session period
                            if (currentPeriod && currentPeriod.sessionId === session.id) {
                              // Add to current period
                              currentPeriod.items.push(item);
                              assigned = true;
                              break;
                            } else {
                              // Close current period and start new one
                              if (currentPeriod) {
                                grouped.push(currentPeriod);
                              }
                              currentPeriod = {
                                period: `Session #${session.session_number || 'N/A'} - ${sessionDate.toLocaleDateString()}`,
                                startDate: session.session_date,
                                endDate: nextSession?.session_date,
                                sessionId: session.id,
                                sessionNumber: session.session_number,
                                items: [item]
                              };
                              assigned = true;
                              break;
                            }
                          }
                        }
                        
                        // If item is before first session
                        if (!assigned && sessions.length > 0) {
                          const firstSessionDate = new Date(sessions[0].session_date);
                          if (itemDate < firstSessionDate) {
                            if (grouped.length === 0 || grouped[grouped.length - 1].period !== 'Before First Session') {
                              if (currentPeriod) {
                                grouped.push(currentPeriod);
                                currentPeriod = null;
                              }
                              grouped.push({
                                period: 'Before First Session',
                                startDate: item.date,
                                items: [item]
                              });
                            } else {
                              grouped[grouped.length - 1].items.push(item);
                            }
                            assigned = true;
                          }
                        }
                        
                        // If still not assigned and no current period, create one
                        if (!assigned && !currentPeriod) {
                          currentPeriod = {
                            period: 'Progress Data',
                            startDate: item.date,
                            items: [item]
                          };
                        } else if (!assigned && currentPeriod) {
                          currentPeriod.items.push(item);
                        }
                      }
                    });

                    // Add final period
                    if (currentPeriod) {
                      grouped.push(currentPeriod);
                    }
                    
                    // Ensure all sessions are represented, even if they have no data
                    sessions.forEach(session => {
                      const sessionExists = grouped.some(g => g.sessionId === session.id);
                      if (!sessionExists) {
                        // Find where to insert this session in the grouped array
                        const sessionDate = new Date(session.session_date);
                        let insertIndex = grouped.length;
                        
                        for (let i = 0; i < grouped.length; i++) {
                          const periodDate = new Date(grouped[i].startDate);
                          if (sessionDate < periodDate) {
                            insertIndex = i;
                            break;
                          }
                        }
                        
                        const nextSession = sessions.find(s => new Date(s.session_date) > sessionDate);
                        grouped.splice(insertIndex, 0, {
                          period: `Session #${session.session_number || 'N/A'} - ${sessionDate.toLocaleDateString()}`,
                          startDate: session.session_date,
                          endDate: nextSession?.session_date,
                          sessionId: session.id,
                          sessionNumber: session.session_number,
                          items: [{
                            type: 'session',
                            date: session.session_date,
                            sessionId: session.id,
                            sessionNumber: session.session_number,
                            data: session
                          }]
                        });
                      }
                    });
                    
                    // Re-sort grouped periods by start date
                    grouped.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                    return grouped.map((period, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{period.period}</span>
                          {period.startDate && period.endDate && (
                            <span className="text-xs text-muted-foreground">
                              ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
                            </span>
                          )}
                        </div>

                        {/* Show session marker if this period has a session */}
                        {period.sessionId && period.items.some(item => item.type === 'session') && (
                          <div className="mb-4 pb-3 border-b border-primary/20">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-primary">
                                Session #{period.sessionNumber || 'N/A'} - {new Date(period.startDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Show items (metrics and exercises) */}
                        {period.items
                          .filter(item => item.type !== 'session')
                          .map((item, itemIdx) => {
                            if (item.type === 'metric') {
                              const metric = item.data as ProgressMetric;
                              const trend = getMetricTrend(metric, metrics);
                              return (
                                <Card key={`metric-${itemIdx}`} className="bg-blue-50/50 border-blue-200">
                                  <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      {getMetricIcon(metric.metric_type)}
                                      <span className="font-medium">{metric.metric_name}</span>
                                      <Badge variant="outline" className="text-xs">Progress Metric</Badge>
                                      {trend && (
                                        <Badge variant="outline" className={`text-xs ${
                                          trend.direction === 'up' ? 'text-green-600 border-green-300' :
                                          trend.direction === 'down' ? 'text-red-600 border-red-300' :
                                          'text-gray-600 border-gray-300'
                                        }`}>
                                          {trend.direction === 'up' && <TrendingUp className="h-3 w-3 inline mr-1" />}
                                          {trend.direction === 'down' && <TrendingDown className="h-3 w-3 inline mr-1" />}
                                          {trend.direction !== 'same' && `${trend.change.toFixed(0)}%`}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-lg font-bold">
                                      {metric.value}{metric.unit} / {metric.max_value}{metric.unit}
                                    </div>
                                    {metric.notes && (
                                      <p className="text-sm text-muted-foreground mt-2">{metric.notes}</p>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            } else if (item.type === 'exercise') {
                              const exercise = item.data;
                              return (
                                <Card key={`exercise-${itemIdx}`} className="bg-green-50/50 border-green-200">
                                  <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Activity className="h-4 w-4" />
                                      <span className="font-medium">{exercise.exercise_name}</span>
                                      <Badge variant="outline" className="text-xs">Exercise</Badge>
                                      {exercise.session && (
                                        <Badge variant="secondary" className="text-xs">
                                          Session #{exercise.session.session_number || 'N/A'}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                      <Clock className="h-3 w-3" />
                                      {new Date(exercise.completed_date).toLocaleDateString()}
                                      {exercise.completed_at && 
                                        ` at ${new Date(exercise.completed_at).toLocaleTimeString()}`
                                      }
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                      {exercise.pain_level !== null && exercise.pain_level !== undefined && (
                                        <div>
                                          <span className="text-xs text-muted-foreground">Pain: </span>
                                          <Badge className={exercise.pain_level <= 3 ? 'bg-green-100 text-green-800' : exercise.pain_level <= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                            {exercise.pain_level}/10
                                          </Badge>
                                        </div>
                                      )}
                                      {exercise.difficulty_rating !== null && exercise.difficulty_rating !== undefined && (
                                        <div>
                                          <span className="text-xs text-muted-foreground">Difficulty: </span>
                                          <Badge variant="outline">
                                            {exercise.difficulty_rating}/5
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                    {exercise.client_notes && (
                                      <div className="mt-3 pt-3 border-t">
                                        <div className="flex items-start gap-2">
                                          <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                                          <div className="flex-1">
                                            <div className="text-xs font-medium text-muted-foreground mb-1">Client Notes</div>
                                            <p className="text-sm">{exercise.client_notes}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            }
                            return null;
                          })}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Unified Progress Modal */}
      <UnifiedProgressModal
        open={showProgressModal}
        onOpenChange={(open) => {
          setShowProgressModal(open);
          if (!open) {
            setEditingMetric(null);
            setEditingGoal(null);
          }
        }}
        clientId={clientId}
        clientName={clientName}
        sessionId={sessionId}
        editingMetric={editingMetric}
        editingGoal={editingGoal}
        onSuccess={async () => {
          await fetchProgressData();
          setEditingMetric(null);
          setEditingGoal(null);
          // Check if we should show goal suggestions for newly added metrics
          // This will be handled by real-time subscription, but we can also check here
        }}
        existingMetrics={metrics.map(m => ({
          id: m.id,
          metric_name: m.metric_name,
          metric_type: m.metric_type,
          value: m.value,
          max_value: m.max_value,
          unit: m.unit,
          session_date: m.session_date,
          metadata: m.metadata
        }))}
        existingSessions={sessions}
      />

      {/* Delete Program Confirmation Dialog */}
      <AlertDialog open={deletingProgramId !== null} onOpenChange={(open) => !open && setDeletingProgramId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exercise program? This action cannot be undone. The program will be permanently removed for both you and {clientName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProgramId) {
                  handleDeleteProgram(deletingProgramId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Program
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Metric Confirmation Dialog */}
      <AlertDialog open={deletingMetricId !== null} onOpenChange={(open) => !open && setDeletingMetricId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Metric</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this metric? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingMetricId) {
                  handleDeleteMetric(deletingMetricId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Metric
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
