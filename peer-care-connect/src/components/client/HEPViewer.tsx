import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Activity, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Play,
  Image as ImageIcon,
  Info,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { HEPService, HomeExerciseProgram, ExerciseProgress } from '@/lib/hep-service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface HEPViewerProps {
  programId?: string;
  clientId?: string;
}

export const HEPViewer: React.FC<HEPViewerProps> = ({
  programId,
  clientId
}) => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<HomeExerciseProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<HomeExerciseProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [adherence, setAdherence] = useState<Record<string, any>>({});
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [exerciseToLog, setExerciseToLog] = useState<any>(null);
  const [progressData, setProgressData] = useState({
    client_notes: '',
    pain_level: '',
    difficulty_rating: ''
  });
  const [exerciseCompletions, setExerciseCompletions] = useState<Record<string, ExerciseProgress[]>>({});
  const [expandedCompletions, setExpandedCompletions] = useState<Set<string>>(new Set());

  const effectiveClientId = clientId || user?.id;

  useEffect(() => {
    if (effectiveClientId) {
      loadPrograms();
    }
  }, [effectiveClientId, programId]);

  // Real-time subscription for exercise completions
  const { error: realtimeError } = useRealtimeSubscription(
    'exercise_program_progress',
    `client_id=eq.${effectiveClientId}`,
    (payload) => {
      console.log('[HEPViewer] Real-time exercise completion update:', payload);
      
      try {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          // Reload completions for the affected program
          const programId = payload.new?.program_id || payload.old?.program_id;
          if (programId) {
            fetchExerciseCompletions(programId).catch(err => {
              console.error('[HEPViewer] Error fetching completions after real-time update:', err);
            });
          } else {
            // If program_id not available, reload all programs
            setPrograms(prevPrograms => {
              prevPrograms.forEach(program => {
                if (program.id) {
                  fetchExerciseCompletions(program.id).catch(err => {
                    console.error('[HEPViewer] Error fetching completions for program:', program.id, err);
                  });
                }
              });
              return prevPrograms;
            });
          }
        }
      } catch (error) {
        console.error('[HEPViewer] Error handling real-time update:', error);
      }
    }
  );

  // Log real-time subscription errors
  useEffect(() => {
    if (realtimeError) {
      console.error('[HEPViewer] Real-time subscription error:', realtimeError);
    }
  }, [realtimeError]);

  const fetchExerciseCompletions = async (programId: string) => {
    if (!effectiveClientId || !programId) return;

    try {
      const { data, error } = await supabase
        .from('exercise_program_progress')
        .select('*')
        .eq('program_id', programId)
        .eq('client_id', effectiveClientId)
        .order('completed_date', { ascending: false })
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching exercise completions:', error);
        return;
      }

      // Group completions by exercise identifier (exercise_id or exercise_name)
      // Use program_id as prefix to avoid conflicts between programs
      const grouped: Record<string, ExerciseProgress[]> = {};
      (data || []).forEach((completion: ExerciseProgress) => {
        // Create a unique key using program_id and exercise identifier
        const exerciseKey = completion.exercise_id || completion.exercise_name || 'unknown';
        const key = `${programId}-${exerciseKey}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(completion);
      });

      // Update state by merging with existing completions
      setExerciseCompletions(prev => ({
        ...prev,
        ...grouped
      }));
    } catch (error) {
      console.error('Error fetching exercise completions:', error);
    }
  };

  const loadPrograms = async () => {
    if (!effectiveClientId) return;

    setLoading(true);
    try {
      const data = programId
        ? await HEPService.getClientPrograms(effectiveClientId).then(progs => 
            progs.filter(p => p.id === programId)
          )
        : await HEPService.getClientPrograms(effectiveClientId);
      
      // Debug: Log fetched programs to check for duplicates
      console.log('[HEPViewer] Fetched programs:', data.length, 'programs');
      const programIds = data.map(p => p.id).filter(Boolean);
      const duplicateIds = programIds.filter((id, index) => programIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn('[HEPViewer] Found duplicate program IDs from database:', duplicateIds);
      }

      // Filter active programs first
      const activePrograms = data.filter(p => p.status === 'active');
      
      // Deduplicate programs by ID and content hash to prevent showing duplicates
      // This handles cases where the same program might exist with different database IDs
      const seenProgramIds = new Map<string, HomeExerciseProgram>();
      const seenProgramContent = new Map<string, HomeExerciseProgram>(); // Track by content hash for additional deduplication
      
      activePrograms.forEach(program => {
        // Create a content hash based on title, exercises, practitioner_id, client_id, and start_date
        // to catch duplicates even with different IDs
        const contentHash = `${program.practitioner_id}-${program.client_id}-${program.title || ''}-${program.start_date || ''}-${JSON.stringify(program.exercises || [])}`;
        
        // First check by program.id (primary deduplication)
        if (program.id) {
          const existing = seenProgramIds.get(program.id);
          if (!existing) {
            // Check if we've seen this content before (secondary deduplication)
            const existingByContent = seenProgramContent.get(contentHash);
            if (!existingByContent) {
              // First occurrence - keep it
              seenProgramIds.set(program.id, program);
              seenProgramContent.set(contentHash, program);
            } else {
              // Same content but different program.id - prefer the one with session_id or most recent
              const shouldReplace = 
                (!existingByContent.session_id && program.session_id) || // New one has session_id, old doesn't
                (existingByContent.session_id && program.session_id && new Date(program.created_at || 0) > new Date(existingByContent.created_at || 0)) || // Both have session_id, new is more recent
                (!existingByContent.session_id && !program.session_id && new Date(program.created_at || 0) > new Date(existingByContent.created_at || 0)); // Neither has session_id, new is more recent
              
              if (shouldReplace) {
                console.log('[HEPViewer] Replacing duplicate program by content:', {
                  oldId: existingByContent.id,
                  newId: program.id,
                  reason: !existingByContent.session_id && program.session_id ? 'new has session_id' : 'new is more recent'
                });
                // Remove old entry and add new one
                if (existingByContent.id) {
                  seenProgramIds.delete(existingByContent.id);
                }
                seenProgramIds.set(program.id, program);
                seenProgramContent.set(contentHash, program);
              } else {
                console.log('[HEPViewer] Filtering out duplicate program by content:', {
                  keptId: existingByContent.id,
                  filteredId: program.id,
                  reason: existingByContent.session_id && !program.session_id ? 'kept has session_id' : 'kept is more recent'
                });
              }
            }
          } else {
            // Duplicate program.id found - keep the one with session_id if available, or most recent
            const shouldReplace = 
              (!existing.session_id && program.session_id) || // New one has session_id, old doesn't
              (existing.session_id && program.session_id && new Date(program.created_at || 0) > new Date(existing.created_at || 0)) || // Both have session_id, new is more recent
              (!existing.session_id && !program.session_id && new Date(program.created_at || 0) > new Date(existing.created_at || 0)); // Neither has session_id, new is more recent
            
            if (shouldReplace) {
              console.log('[HEPViewer] Replacing duplicate program by ID:', {
                programId: program.id,
                reason: !existing.session_id && program.session_id ? 'new has session_id' : 'new is more recent'
              });
              seenProgramIds.set(program.id, program);
              seenProgramContent.set(contentHash, program);
            } else {
              console.log('[HEPViewer] Filtering out duplicate program by ID:', {
                programId: program.id,
                reason: existing.session_id && !program.session_id ? 'existing has session_id' : 'existing is more recent'
              });
            }
          }
        } else {
          // Program without id - check by content only
          const existingByContent = seenProgramContent.get(contentHash);
          if (!existingByContent) {
            seenProgramContent.set(contentHash, program);
          } else {
            // Duplicate content - prefer one with session_id or most recent
            const shouldReplace = 
              (!existingByContent.session_id && program.session_id) ||
              (existingByContent.session_id && program.session_id && new Date(program.created_at || 0) > new Date(existingByContent.created_at || 0)) ||
              (!existingByContent.session_id && !program.session_id && new Date(program.created_at || 0) > new Date(existingByContent.created_at || 0));
            
            if (shouldReplace) {
              console.log('[HEPViewer] Replacing duplicate program without ID by content:', {
                oldCreatedAt: existingByContent.created_at,
                newCreatedAt: program.created_at,
                reason: !existingByContent.session_id && program.session_id ? 'new has session_id' : 'new is more recent'
              });
              seenProgramContent.set(contentHash, program);
            } else {
              console.log('[HEPViewer] Filtering out duplicate program without ID by content:', {
                keptCreatedAt: existingByContent.created_at,
                filteredCreatedAt: program.created_at,
                reason: existingByContent.session_id && !program.session_id ? 'kept has session_id' : 'kept is more recent'
              });
            }
          }
        }
      });
      
      // Get unique programs - combine both maps, preferring entries from seenProgramIds (by program.id)
      // Also include programs from seenProgramContent that don't have a program.id match
      const uniqueProgramsById = Array.from(seenProgramIds.values());
      const uniqueProgramsByContent = Array.from(seenProgramContent.values()).filter(program => {
        // Only include if it's not already in the by-ID list
        return !program.id || !seenProgramIds.has(program.id);
      });
      const uniquePrograms = [...uniqueProgramsById, ...uniqueProgramsByContent];
      
      console.log('[HEPViewer] After deduplication:', {
        originalCount: activePrograms.length,
        uniqueCount: uniquePrograms.length,
        duplicatesRemoved: activePrograms.length - uniquePrograms.length
      });
      
      setPrograms(uniquePrograms);

      // Load adherence and completions for each unique program
      const adherenceData: Record<string, any> = {};
      for (const program of uniquePrograms) {
        if (program.id) {
          const adherenceResult = await HEPService.getProgramAdherence(program.id);
          if (adherenceResult) {
            adherenceData[program.id] = adherenceResult;
          }
          // Fetch completions for this program
          await fetchExerciseCompletions(program.id);
        }
      }
      setAdherence(adherenceData);

      if (programId && uniquePrograms.length > 0) {
        setSelectedProgram(uniquePrograms[0]);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('Failed to load exercise programs');
    } finally {
      setLoading(false);
    }
  };

  const handleLogProgress = async () => {
    if (!exerciseToLog || !selectedProgram || !effectiveClientId) return;

    try {
      const progress: ExerciseProgress = {
        program_id: selectedProgram.id!,
        client_id: effectiveClientId,
        exercise_id: exerciseToLog.id,
        exercise_name: exerciseToLog.name,
        completed_date: new Date().toISOString().split('T')[0],
        session_id: selectedProgram.session_id || undefined, // Pass session_id from program if available
        client_notes: progressData.client_notes || undefined,
        pain_level: progressData.pain_level ? parseInt(progressData.pain_level) : undefined,
        difficulty_rating: progressData.difficulty_rating ? parseInt(progressData.difficulty_rating) : undefined
      };

      const result = await HEPService.logProgress(progress);

      if (result.success) {
        toast.success('Progress logged successfully!');
        setShowLogDialog(false);
        setExerciseToLog(null);
        setProgressData({
          client_notes: '',
          pain_level: '',
          difficulty_rating: ''
        });
        // Reload adherence and completions
        if (selectedProgram.id) {
          const adherenceResult = await HEPService.getProgramAdherence(selectedProgram.id);
          if (adherenceResult) {
            setAdherence(prev => ({ ...prev, [selectedProgram.id!]: adherenceResult }));
          }
          // Reload completions to show the new entry
          await fetchExerciseCompletions(selectedProgram.id);
        }
      } else {
        toast.error(result.error || 'Failed to log progress');
      }
    } catch (error) {
      console.error('Error logging progress:', error);
      toast.error('Failed to log progress');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading exercise programs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (programs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No active exercise programs</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your practitioner will assign exercise programs here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If programId is provided, only show that specific program
  // Otherwise show all active programs
  const displayPrograms = programId && selectedProgram 
    ? [selectedProgram] 
    : programId 
      ? programs.filter(p => p.id === programId) // Fallback: filter by programId if selectedProgram not set
      : programs;

  return (
    <div className="space-y-6">
      {displayPrograms.map((program) => {
        const programAdherence = program.id ? adherence[program.id] : null;

        return (
          <Card key={program.id} className="transition-[border-color,background-color] duration-200 ease-out">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {program.title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {program.description || 'Home exercise program from your practitioner'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Program Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Frequency</div>
                  <div className="font-medium">{program.frequency_per_week || 3} days/week</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Start Date</div>
                  <div className="font-medium">
                    {program.start_date ? format(new Date(program.start_date), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                </div>
                {program.end_date && (
                  <div>
                    <div className="text-muted-foreground">End Date</div>
                    <div className="font-medium">{format(new Date(program.end_date), 'MMM dd, yyyy')}</div>
                  </div>
                )}
              </div>

              {/* General Instructions */}
              {program.instructions && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Instructions:</strong> {program.instructions}
                  </AlertDescription>
                </Alert>
              )}

              {/* Exercises List */}
              <div>
                <h4 className="font-medium mb-4">Exercises</h4>
                <div className="space-y-4">
                  {program.exercises && Array.isArray(program.exercises) && program.exercises.map((exercise: any, index: number) => {
                    // Create matching key for completions lookup
                    const exerciseIdentifier = exercise.id || exercise.name || `exercise-${index}`;
                    const exerciseKey = `${program.id}-${exerciseIdentifier}`;
                    const completions = exerciseCompletions[exerciseKey] || [];
                    const hasCompletions = completions.length > 0;
                    const latestCompletion = completions[0]; // Most recent
                    const today = new Date().toISOString().split('T')[0];
                    const completedToday = latestCompletion && latestCompletion.completed_date === today;
                    const completionCount = completions.length;

                    return (
                    <Card 
                      key={index} 
                      className={hasCompletions ? 'border-green-200 bg-green-50/30' : ''}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium">{exercise.name}</h5>
                              <Badge variant="outline">{exercise.category}</Badge>
                              <Badge variant="outline">{exercise.difficulty_level}</Badge>
                              {hasCompletions && (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {completionCount} {completionCount === 1 ? 'completion' : 'completions'}
                                </Badge>
                              )}
                              {completedToday && (
                                <Badge className="bg-blue-100 text-blue-800">
                                  Completed Today
                                </Badge>
                              )}
                            </div>
                            
                            {/* Completion Summary */}
                            {hasCompletions && latestCompletion && (
                              <div className="mb-3 text-sm text-muted-foreground">
                                Last completed: {format(new Date(latestCompletion.completed_date), 'MMM dd, yyyy')}
                                {latestCompletion.completed_at && 
                                  ` at ${format(new Date(latestCompletion.completed_at), 'h:mm a')}`
                                }
                              </div>
                            )}
                            
                            {exercise.description && (
                              <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                            )}

                            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                              {exercise.sets && exercise.reps && (
                                <div>
                                  <span className="text-muted-foreground">Sets × Reps:</span>
                                  <div className="font-medium">{exercise.sets} × {exercise.reps}</div>
                                </div>
                              )}
                              {exercise.duration_minutes && (
                                <div>
                                  <span className="text-muted-foreground">Duration:</span>
                                  <div className="font-medium">{exercise.duration_minutes} min</div>
                                </div>
                              )}
                              {exercise.frequency_per_week && (
                                <div>
                                  <span className="text-muted-foreground">Frequency:</span>
                                  <div className="font-medium">{exercise.frequency_per_week}x/week</div>
                                </div>
                              )}
                            </div>

                            {exercise.instructions && (
                              <div className="bg-muted p-3 rounded-md text-sm">
                                <strong>Instructions:</strong> {exercise.instructions}
                              </div>
                            )}

                            {/* Exercise Media Display */}
                            {(exercise.video_url || exercise.image_url || (exercise.media_attachments && exercise.media_attachments.length > 0)) && (
                              <div className="mt-3 space-y-2">
                                {/* Library exercise media (video_url/image_url) */}
                                {exercise.video_url && (
                                  <div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(exercise.video_url, '_blank')}
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      Watch Video
                                    </Button>
                                  </div>
                                )}
                                {exercise.image_url && (
                                  <div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(exercise.image_url, '_blank')}
                                    >
                                      <ImageIcon className="h-4 w-4 mr-2" />
                                      View Image
                                    </Button>
                                  </div>
                                )}

                                {/* Program-specific media attachments */}
                                {exercise.media_attachments && exercise.media_attachments.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground">
                                      Exercise Demonstrations:
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {exercise.media_attachments.map((media, mediaIndex) => (
                                        <Card key={mediaIndex} className="relative group cursor-pointer">
                                          <CardContent className="p-0">
                                            {media.type === 'image' ? (
                                              <div 
                                                className="relative aspect-video bg-muted rounded overflow-hidden"
                                                onClick={() => window.open(media.url, '_blank')}
                                              >
                                                <img
                                                  src={media.url}
                                                  alt={media.filename || `Exercise image ${mediaIndex + 1}`}
                                                  className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                  <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                              </div>
                                            ) : (
                                              <div 
                                                className="relative aspect-video bg-muted rounded overflow-hidden"
                                                onClick={() => window.open(media.url, '_blank')}
                                              >
                                                <video
                                                  src={media.url}
                                                  className="w-full h-full object-cover"
                                                  controls={false}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                  <Play className="h-8 w-8 text-white" />
                                                </div>
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                  <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Log Progress Button */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <Button
                              variant={completedToday ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setExerciseToLog(exercise);
                                setShowLogDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {completedToday 
                                ? "Log Another Completion" 
                                : hasCompletions 
                                  ? "Log Completion" 
                                  : "Log Completion"
                              }
                            </Button>
                            {hasCompletions && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const key = `${program.id}-${exerciseKey}`;
                                  setExpandedCompletions(prev => {
                                    const next = new Set(prev);
                                    if (next.has(key)) {
                                      next.delete(key);
                                    } else {
                                      next.add(key);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                <ChevronDown 
                                  className={`h-4 w-4 mr-2 transition-transform ${
                                    expandedCompletions.has(`${program.id}-${exerciseKey}`) ? 'rotate-180' : ''
                                  }`}
                                />
                                View History ({completionCount})
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Completion History */}
                        {hasCompletions && (
                          <Collapsible 
                            open={expandedCompletions.has(`${program.id}-${exerciseKey}`)}
                            onOpenChange={(open) => {
                              const key = `${program.id}-${exerciseKey}`;
                              setExpandedCompletions(prev => {
                                const next = new Set(prev);
                                if (open) {
                                  next.add(key);
                                } else {
                                  next.delete(key);
                                }
                                return next;
                              });
                            }}
                          >
                            <CollapsibleContent className="mt-4 pt-4 border-t">
                              <div className="space-y-3">
                                <h6 className="text-sm font-medium text-muted-foreground mb-3">
                                  Completion History
                                </h6>
                                {completions.map((completion, idx) => (
                                  <Card key={completion.id || idx} className="bg-muted/50">
                                    <CardContent className="pt-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">
                                            {format(new Date(completion.completed_date), 'MMM dd, yyyy')}
                                          </span>
                                          {completion.completed_at && (
                                            <>
                                              <Clock className="h-3 w-3 text-muted-foreground" />
                                              <span className="text-xs text-muted-foreground">
                                                {format(new Date(completion.completed_at), 'h:mm a')}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Pain Level and Difficulty */}
                                      <div className="flex gap-3 mb-2">
                                        {completion.pain_level !== null && completion.pain_level !== undefined && (
                                          <div>
                                            <span className="text-xs text-muted-foreground">Pain Level: </span>
                                            <Badge 
                                              className={
                                                completion.pain_level <= 3 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : completion.pain_level <= 6 
                                                    ? 'bg-yellow-100 text-yellow-800' 
                                                    : 'bg-red-100 text-red-800'
                                              }
                                            >
                                              {completion.pain_level}/10
                                            </Badge>
                                          </div>
                                        )}
                                        {completion.difficulty_rating !== null && completion.difficulty_rating !== undefined && (
                                          <div>
                                            <span className="text-xs text-muted-foreground">Difficulty: </span>
                                            <Badge variant="outline">
                                              {completion.difficulty_rating}/5
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
                                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                                Your Notes
                                              </div>
                                              <p className="text-sm">{completion.client_notes}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>
                  );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Log Progress Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Exercise Completion</DialogTitle>
            <DialogDescription>
              {exerciseToLog && `Mark ${exerciseToLog.name} as completed`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Pain Level (0-10, optional)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={progressData.pain_level}
                onChange={(e) => setProgressData(prev => ({ ...prev, pain_level: e.target.value }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Rate your pain level during or after the exercise
              </p>
            </div>

            <div>
              <Label>Difficulty Rating (1-5, optional)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={progressData.difficulty_rating}
                onChange={(e) => setProgressData(prev => ({ ...prev, difficulty_rating: e.target.value }))}
                placeholder="3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                1 = Very Easy, 5 = Very Difficult
              </p>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={progressData.client_notes}
                onChange={(e) => setProgressData(prev => ({ ...prev, client_notes: e.target.value }))}
                placeholder="How did it feel? Any observations? Share any feedback for your practitioner."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogProgress}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Log Completion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

