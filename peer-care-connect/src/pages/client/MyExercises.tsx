import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Play,
  Image as ImageIcon,
  ChevronRight,
  Loader2,
  AlertCircle,
  User as UserIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { HEPService, HomeExerciseProgram } from '@/lib/hep-service';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface SessionWithExercises {
  id: string;
  session_date: string;
  start_time: string;
  session_type: string;
  therapist: {
    first_name: string;
    last_name: string;
  };
  programs: HomeExerciseProgram[];
}

const MyExercises = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string | null>(null);

  // Fetch sessions with exercise programs
  const fetchSessionsWithExercises = async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(true);

      // Fetch all exercise programs for the client
      const heps = await HEPService.getClientPrograms(userProfile.id);

      // Separate programs with and without session_id
      const programsWithSession = heps.filter(hep => hep.session_id);
      const programsWithoutSession = heps.filter(hep => !hep.session_id);

      // Get unique session IDs that have exercise programs
      const sessionIds = [...new Set(programsWithSession.map(hep => hep.session_id!))];

      const sessionsWithExercises: SessionWithExercises[] = [];

      // Fetch session details for programs with sessions
      if (sessionIds.length > 0) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('client_sessions')
          .select(`
            id,
            session_date,
            start_time,
            session_type,
            therapist:users!client_sessions_therapist_id_fkey(
              first_name,
              last_name
            )
          `)
          .in('id', sessionIds)
          .eq('client_id', userProfile.id)
          .order('session_date', { ascending: false });

        if (sessionsError) throw sessionsError;

        // Group HEPs by session_id
        const hepsBySession = new Map<string, HomeExerciseProgram[]>();
        programsWithSession.forEach(hep => {
          if (hep.session_id) {
            if (!hepsBySession.has(hep.session_id)) {
              hepsBySession.set(hep.session_id, []);
            }
            hepsBySession.get(hep.session_id)!.push(hep);
          }
        });

        // Combine sessions with their exercise programs
        (sessionsData || []).forEach(session => {
          sessionsWithExercises.push({
            id: session.id,
            session_date: session.session_date,
            start_time: session.start_time,
            session_type: session.session_type,
            therapist: session.therapist || { first_name: 'Unknown', last_name: 'Practitioner' },
            programs: hepsBySession.get(session.id) || []
          });
        });
      }

      // Add programs without sessions as a special "General Programs" entry
      if (programsWithoutSession.length > 0) {
        // Get practitioner info for programs without sessions
        const practitionerIds = [...new Set(programsWithoutSession.map(hep => hep.practitioner_id))];
        const { data: practitionersData } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', practitionerIds);

        const practitionersMap = new Map(
          (practitionersData || []).map(p => [p.id, { first_name: p.first_name || 'Unknown', last_name: p.last_name || 'Practitioner' }])
        );

        // Group programs without session by practitioner
        const programsByPractitioner = new Map<string, HomeExerciseProgram[]>();
        programsWithoutSession.forEach(hep => {
          if (!programsByPractitioner.has(hep.practitioner_id)) {
            programsByPractitioner.set(hep.practitioner_id, []);
          }
          programsByPractitioner.get(hep.practitioner_id)!.push(hep);
        });

        // Create entries for each practitioner's general programs
        programsByPractitioner.forEach((programs, practitionerId) => {
          const practitioner = practitionersMap.get(practitionerId) || { first_name: 'Unknown', last_name: 'Practitioner' };
          // Use the most recent program's created_at as the date, or today if none
          const mostRecentDate = programs
            .map(p => p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

          sessionsWithExercises.push({
            id: `general-${practitionerId}`,
            session_date: mostRecentDate,
            start_time: '00:00:00',
            session_type: 'General Program',
            therapist: practitioner,
            programs: programs
          });
        });
      }

      // Sort by date (most recent first)
      sessionsWithExercises.sort((a, b) => 
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      );

      setSessions(sessionsWithExercises);

      // Auto-select first session if none selected
      if (!selectedSessionDate && sessionsWithExercises.length > 0) {
        setSelectedSessionDate(sessionsWithExercises[0].session_date);
      }
    } catch (error) {
      console.error('Error fetching sessions with exercises:', error);
      toast.error('Failed to load exercise programs');
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for exercise programs
  useRealtimeSubscription(
    'home_exercise_programs',
    `client_id=eq.${userProfile?.id}`,
    (payload) => {
      if (userProfile) {
        fetchSessionsWithExercises();
      }
    }
  );

  useEffect(() => {
    if (userProfile) {
      fetchSessionsWithExercises();
    }
  }, [userProfile]);

  // Get selected session
  const selectedSession = sessions.find(s => s.session_date === selectedSessionDate);
  const allExercises = selectedSession?.programs.flatMap(program => 
    program.exercises.map(exercise => ({
      ...exercise,
      programTitle: program.title,
      programId: program.id
    }))
  ) || [];

  // Group sessions by date for display
  const sessionsByDate = sessions.reduce((acc, session) => {
    const dateKey = session.session_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, SessionWithExercises[]>);

  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading exercises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">My Exercises</h1>
              <p className="text-muted-foreground">
                View exercises prescribed by your therapists for each session
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/client/sessions')}
            >
              <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Sessions
            </Button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-semibold mb-2">No Exercise Programs Yet</h3>
              <p className="text-muted-foreground">
                Your therapists haven't prescribed any exercise programs yet. Check back after your next session.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions List - Left Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Sessions
                  </CardTitle>
                  <CardDescription>
                    Select a session date to view exercises
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                    {sortedDates.map((date) => {
                      const dateSessions = sessionsByDate[date];
                      const isSelected = selectedSessionDate === date;
                      const totalExercises = dateSessions.reduce((sum, session) => 
                        sum + session.programs.reduce((pSum, program) => 
                          pSum + (program.exercises?.length || 0), 0
                        ), 0
                      );

                      return (
                        <button
                          key={date}
                          onClick={() => setSelectedSessionDate(date)}
                          className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                            isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-foreground mb-1">
                                {format(new Date(date), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                {dateSessions.map((session, idx) => (
                                  <div key={session.id} className="flex items-center gap-2">
                                    {session.session_type !== 'General Program' && (
                                      <>
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {format(new Date(`2000-01-01T${session.start_time}`), 'h:mm a')} - {session.session_type}
                                        </span>
                                      </>
                                    )}
                                    {session.session_type === 'General Program' && (
                                      <span>{session.session_type}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exercises Display - Right Side */}
            <div className="lg:col-span-2">
              {selectedSession ? (
                <div className="space-y-6">
                  {/* Session Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 mb-2">
                            <Calendar className="h-5 w-5" />
                            {format(new Date(selectedSession.session_date), 'EEEE, MMMM dd, yyyy')}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 flex-wrap">
                            {selectedSession.session_type !== 'General Program' && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {format(new Date(`2000-01-01T${selectedSession.start_time}`), 'h:mm a')}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4" />
                              {selectedSession.therapist.first_name} {selectedSession.therapist.last_name}
                            </div>
                            <Badge variant="outline">{selectedSession.session_type}</Badge>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Exercise Programs */}
                  {selectedSession.programs.map((program) => (
                    <Card key={program.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          {program.title}
                        </CardTitle>
                        {program.description && (
                          <CardDescription>{program.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {program.exercises && program.exercises.length > 0 ? (
                          program.exercises.map((exercise, index) => (
                            <div
                              key={index}
                              className="border rounded-lg p-4 space-y-3 bg-card"
                            >
                              {/* Exercise Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg mb-1">{exercise.name}</h4>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <Badge variant="outline">{exercise.category}</Badge>
                                    <Badge variant="outline">{exercise.difficulty_level}</Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Exercise Description */}
                              {exercise.description && (
                                <p className="text-sm text-muted-foreground">{exercise.description}</p>
                              )}

                              {/* Exercise Details */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {exercise.sets && exercise.reps && (
                                  <div>
                                    <div className="text-muted-foreground">Sets × Reps</div>
                                    <div className="font-medium">{exercise.sets} × {exercise.reps}</div>
                                  </div>
                                )}
                                {exercise.duration_minutes && (
                                  <div>
                                    <div className="text-muted-foreground">Duration</div>
                                    <div className="font-medium">{exercise.duration_minutes} min</div>
                                  </div>
                                )}
                                {exercise.frequency_per_week && (
                                  <div>
                                    <div className="text-muted-foreground">Frequency</div>
                                    <div className="font-medium">{exercise.frequency_per_week}x/week</div>
                                  </div>
                                )}
                              </div>

                              {/* Exercise Instructions */}
                              {exercise.instructions && (
                                <div className="bg-muted/50 p-3 rounded-md">
                                  <p className="text-sm">
                                    <strong>Instructions:</strong> {exercise.instructions}
                                  </p>
                                </div>
                              )}

                              {/* Video and Image - Library Exercise Media */}
                              {(exercise.video_url || exercise.image_url || (exercise.media_attachments && exercise.media_attachments.length > 0)) && (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-3">
                                    {exercise.video_url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(exercise.video_url, '_blank')}
                                        className="flex items-center gap-2"
                                      >
                                        <Play className="h-4 w-4" />
                                        Watch Video
                                      </Button>
                                    )}
                                    {exercise.image_url && (
                                      <div className="relative group">
                                        <img
                                          src={exercise.image_url}
                                          alt={exercise.name}
                                          className="h-32 w-32 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => window.open(exercise.image_url, '_blank')}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-md flex items-center justify-center">
                                          <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Program-specific media attachments */}
                                  {exercise.media_attachments && exercise.media_attachments.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        Exercise Demonstrations:
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {exercise.media_attachments.map((media: any, mediaIndex: number) => (
                                          <div key={mediaIndex} className="relative group cursor-pointer">
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
                                                  <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                                  <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Additional Exercise Info */}
                              {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  <strong>Muscle Groups:</strong> {exercise.muscle_groups.join(', ')}
                                </div>
                              )}
                              {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  <strong>Equipment:</strong> {exercise.equipment_needed.join(', ')}
                                </div>
                              )}
                              {exercise.contraindications && (
                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                  <strong>Note:</strong> {exercise.contraindications}
                                </div>
                              )}
                              {exercise.notes && (
                                <div className="text-xs text-muted-foreground italic">
                                  {exercise.notes}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">No exercises in this program</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {selectedSession.programs.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                        <p className="text-muted-foreground">No exercise programs for this session</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <h3 className="text-xl font-semibold mb-2">Select a Session</h3>
                    <p className="text-muted-foreground">
                      Choose a session date from the list to view exercises
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyExercises;

