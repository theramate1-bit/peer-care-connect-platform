import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseDateSafe, formatDateSafe } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar, 
  Activity, 
  BarChart3, 
  Stethoscope,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  Target,
  CheckCircle,
  Minus,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ProgressMetric } from '@/lib/types/progress';
import { HomeExerciseProgram } from '@/lib/hep-service';

interface TheramateTimelineProps {
  clientId: string;
  clientName: string;
  readOnly?: boolean;
}

interface TimelineItem {
  id: string;
  type: 'metric' | 'exercise_prescription' | 'session';
  date: string;
  data: ProgressMetric | HomeExerciseProgram | { id: string; session_date: string; session_type: string; session_number?: number };
  sessionId?: string;
  sessionNumber?: number;
}

export const TheramateTimeline: React.FC<TheramateTimelineProps> = ({
  clientId,
  clientName,
  readOnly = false
}) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; session_date: string; session_type: string; session_number?: number }>>([]);

  useEffect(() => {
    fetchTimelineData();
  }, [clientId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);

      // Fetch metrics (including metadata)
      const { data: metricsData, error: metricsError } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('session_date', { ascending: false });

      // Ensure metadata is parsed if it's a string
      if (metricsData) {
        metricsData.forEach((metric: any) => {
          if (metric.metadata && typeof metric.metadata === 'string') {
            try {
              metric.metadata = JSON.parse(metric.metadata);
            } catch (e) {
              metric.metadata = {};
            }
          } else if (!metric.metadata) {
            metric.metadata = {};
          }
        });
      }

      if (metricsError) throw metricsError;

      // Fetch exercise programs (prescriptions)
      const { data: programsData, error: programsError } = await supabase
        .from('home_exercise_programs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (programsError) throw programsError;

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('id, session_date, session_type, session_number')
        .eq('client_id', clientId)
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;

      setSessions(sessionsData || []);

      // Combine all items into timeline
      const items: TimelineItem[] = [];

      // Add metrics
      (metricsData || []).forEach((metric: any) => {
        items.push({
          id: metric.id,
          type: 'metric',
          date: metric.session_date,
          data: metric as ProgressMetric,
          sessionId: metric.session_id || undefined
        });
      });

      // Add exercise prescriptions
      (programsData || []).forEach((program: any) => {
        items.push({
          id: program.id,
          type: 'exercise_prescription',
          date: program.delivered_at ? program.delivered_at.split('T')[0] : program.created_at.split('T')[0],
          data: program as HomeExerciseProgram,
          sessionId: program.session_id || undefined
        });
      });

      // Add sessions as markers
      (sessionsData || []).forEach((session) => {
        items.push({
          id: session.id,
          type: 'session',
          date: session.session_date,
          data: session,
          sessionId: session.id,
          sessionNumber: session.session_number
        });
      });

      // Sort by date (chronological order)
      items.sort((a, b) => parseDateSafe(a.date).getTime() - parseDateSafe(b.date).getTime());

      setTimelineItems(items);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'pain_level': return <AlertTriangle className="h-4 w-4" />;
      case 'mobility': return <Activity className="h-4 w-4" />;
      case 'strength': return <TrendingUp className="h-4 w-4" />;
      case 'flexibility': return <Minus className="h-4 w-4" />;
      case 'function': return <CheckCircle className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getMetricColor = (type: string) => {
    switch (type) {
      case 'pain_level': return 'bg-red-50 border-red-200 text-red-800';
      case 'mobility': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'strength': return 'bg-green-50 border-green-200 text-green-800';
      case 'flexibility': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'function': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Theramate Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
            <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium mb-2">No timeline data yet</p>
            <p className="text-sm">Metrics and exercise prescriptions will appear here in chronological order.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group items by date
  const groupedByDate = timelineItems.reduce((acc, item) => {
    const dateKey = item.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <>
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-foreground/70" />
            Theramate Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const items = groupedByDate[date];
              const sessionItem = items.find(item => item.type === 'session');
              const session = sessionItem ? sessions.find(s => s.id === sessionItem.sessionId) : null;

              return (
                <div key={date} className="space-y-4">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                    <Calendar className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-sm font-semibold text-foreground">
                      {format(parseDateSafe(date), 'MMM dd, yyyy')}
                    </span>
                    {session && (
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                        Session #{session.session_number || 'N/A'}
                      </Badge>
                    )}
                  </div>

                  {/* Timeline Items */}
                  <div className="space-y-3 pl-7">
                    {items
                      .filter(item => item.type !== 'session')
                      .map((item) => {
                        if (item.type === 'metric') {
                          const metric = item.data as ProgressMetric;
                          // Check if there's additional information to view (notes, session info, or detailed metadata)
                          // Note: Basic metadata (joint/movement) is already shown in the card, so we check for notes or session
                          const hasAdditionalInfo = metric.notes || metric.session_id;
                          
                          return (
                            <div
                              key={item.id}
                              className="p-4 rounded-lg border border-border/50 bg-card/50 transition-[border-color,background-color] duration-200 ease-out hover:bg-card hover:border-border"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="mt-0.5 text-foreground/70">
                                    {getMetricIcon(metric.metric_type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-semibold text-sm text-foreground">{metric.metric_name}</span>
                                      <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-border/40">
                                        {metric.metric_type}
                                      </Badge>
                                    </div>
                                    <div className="text-xl font-bold text-foreground">
                                      {metric.value} <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                                    </div>
                                    {metric.metadata && (metric.metadata.joint || metric.metadata.movement) && (
                                      <div className="text-xs text-muted-foreground mt-1.5">
                                        {metric.metadata.side && `${metric.metadata.side} `}
                                        {metric.metadata.joint && `${metric.metadata.joint} `}
                                        {metric.metadata.movement && metric.metadata.movement}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {hasAdditionalInfo && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItem(item);
                                      }}
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" />
                                      View
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        } else if (item.type === 'exercise_prescription') {
                          const program = item.data as HomeExerciseProgram;
                          // Check if there's additional information to view (exercises, instructions)
                          // Description and frequency are already shown in the card, so we check for exercises or instructions
                          const hasAdditionalInfo = (program.exercises && program.exercises.length > 0) || program.instructions;
                          
                          return (
                            <div
                              key={item.id}
                              className="p-4 rounded-lg border border-border/50 bg-card/50 transition-[border-color,background-color] duration-200 ease-out hover:bg-card/80"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <Activity className="h-4 w-4 mt-0.5 text-foreground/70" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-sm text-foreground">{program.title}</span>
                                      <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-border/40">
                                        Exercise Program
                                      </Badge>
                                    </div>
                                    {program.description && (
                                      <p className="text-xs text-muted-foreground mb-1">{program.description}</p>
                                    )}
                                    {program.exercises && program.exercises.length > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        {program.exercises.length} {program.exercises.length === 1 ? 'exercise' : 'exercises'}
                                        {program.frequency_per_week && ` • ${program.frequency_per_week}x/week`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {hasAdditionalInfo && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItem(item);
                                      }}
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" />
                                      View
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Metric Detail Modal */}
      {selectedItem && selectedItem.type === 'metric' && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="text-foreground/70">
                  {getMetricIcon((selectedItem.data as ProgressMetric).metric_type)}
                </div>
                Metric Details
              </DialogTitle>
              <DialogDescription className="text-sm">
                Recorded on {format(parseDateSafe(selectedItem.date), 'MMM dd, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              {(() => {
                const metric = selectedItem.data as ProgressMetric;
                const session = sessions.find(s => s.id === metric.session_id);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Metric Name</label>
                        <p className="text-sm font-semibold text-foreground">{metric.metric_name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
                        <Badge variant="outline" className="mt-1 bg-muted/50 text-muted-foreground border-border/40">
                          {metric.metric_type}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Value</label>
                        <p className="text-xl font-bold text-foreground">
                          {metric.value} <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Value</label>
                        <p className="text-sm text-foreground">{metric.max_value} {metric.unit}</p>
                      </div>
                    </div>

                    {metric.metadata && (metric.metadata.joint || metric.metadata.movement || metric.metadata.side) && (
                      <div className="p-4 bg-muted/40 border border-border/50 rounded-lg space-y-3">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">Structured Details</label>
                        <div className="grid grid-cols-3 gap-3">
                          {metric.metadata.side && (
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Side</label>
                              <p className="text-sm font-medium text-foreground capitalize">{metric.metadata.side}</p>
                            </div>
                          )}
                          {metric.metadata.joint && (
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Joint</label>
                              <p className="text-sm font-medium text-foreground">{metric.metadata.joint}</p>
                            </div>
                          )}
                          {metric.metadata.movement && (
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Movement</label>
                              <p className="text-sm font-medium text-foreground">{metric.metadata.movement}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {session && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session</label>
                        <p className="text-sm text-foreground">Session #{session.session_number || 'N/A'} - {format(parseDateSafe(session.session_date), 'MMM dd, yyyy')}</p>
                      </div>
                    )}

                    {metric.notes && (
                      <div className="space-y-2 pt-2 border-t border-border/30">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                        <div className="bg-muted/40 border border-border/50 p-4 rounded-lg">
                          <p className="text-sm text-foreground leading-relaxed">{metric.notes}</p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Exercise Prescription Detail Modal */}
      {selectedItem && selectedItem.type === 'exercise_prescription' && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5 text-foreground" />
                Exercise Prescription
              </DialogTitle>
              <DialogDescription className="text-sm">
                Prescribed on {format(parseDateSafe(selectedItem.date), 'MMM dd, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              {(() => {
                const program = selectedItem.data as HomeExerciseProgram;
                const session = sessions.find(s => s.id === program.session_id);
                return (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Program Title</label>
                      <p className="text-lg font-semibold text-foreground leading-tight">{program.title}</p>
                    </div>

                    {program.description && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                        <p className="text-sm text-foreground leading-relaxed">{program.description}</p>
                      </div>
                    )}

                    {program.frequency_per_week && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frequency</label>
                        <p className="text-sm text-foreground">{program.frequency_per_week} times per week</p>
                      </div>
                    )}

                    {program.instructions && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">General Instructions</label>
                        <div className="bg-muted/40 border border-border/50 p-4 rounded-lg">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{program.instructions}</p>
                        </div>
                      </div>
                    )}

                    {program.exercises && program.exercises.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Exercises</label>
                        <div className="space-y-3">
                          {program.exercises.map((exercise: any, index: number) => (
                            <div key={index} className="bg-card border border-border/50 rounded-lg p-4 space-y-3 hover:border-border transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-1">
                                  <p className="font-semibold text-base text-foreground">{exercise.name}</p>
                                  {exercise.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">{exercise.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs shrink-0 bg-muted/50 text-muted-foreground border-border/40">
                                  {exercise.difficulty_level || 'beginner'}
                                </Badge>
                              </div>
                              {(exercise.sets || exercise.reps) && (
                                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                                  {exercise.sets && <span className="font-medium">Sets: <span className="text-foreground">{exercise.sets}</span></span>}
                                  {exercise.reps && <span className="font-medium">Reps: <span className="text-foreground">{exercise.reps}</span></span>}
                                </div>
                              )}
                              {exercise.instructions && (
                                <div className="pt-2 border-t border-border/30">
                                  <p className="text-sm text-foreground leading-relaxed">{exercise.instructions}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {session && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prescribed During</label>
                        <p className="text-sm text-foreground">Session #{session.session_number || 'N/A'} - {format(parseDateSafe(session.session_date), 'MMM dd, yyyy')}</p>
                      </div>
                    )}

                    {program.status && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                        <Badge variant={program.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {program.status}
                        </Badge>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

