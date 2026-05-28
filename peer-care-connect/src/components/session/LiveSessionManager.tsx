import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  User as UserIcon, 
  Calendar, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Mic,
  Camera,
  Phone,
  MessageSquare,
  Activity,
  TrendingUp,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface Session {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  therapist_id: string;
  created_at: string;
  updated_at: string;
}

interface LiveSessionManagerProps {
  sessionId?: string;
  onSessionUpdate?: (session: Session) => void;
}

export const LiveSessionManager: React.FC<LiveSessionManagerProps> = ({
  sessionId,
  onSessionUpdate
}) => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientPainLevel, setClientPainLevel] = useState(0);
  const [sessionGoals, setSessionGoals] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Real-time session updates
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=eq.${user?.id}`,
    (payload) => {
      if (payload.new && payload.new.id === sessionId) {
        setCurrentSession(payload.new);
        if (onSessionUpdate) {
          onSessionUpdate(payload.new);
        }
      }
    }
  );

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStartTime]);

  const fetchSession = async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('therapist_id', user?.id)
        .single();

      if (error) throw error;
      
      setCurrentSession(data);
      setSessionNotes(data.notes || '');
      
      // Check if session is currently active
      if (data.status === 'in_progress') {
        setIsSessionActive(true);
        // Calculate elapsed time if session was already started
        const startTime = new Date(data.updated_at);
        setSessionStartTime(startTime);
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      const startTime = new Date();
      
      const { error } = await supabase
        .from('client_sessions')
        .update({
          status: 'in_progress',
          updated_at: startTime.toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setIsSessionActive(true);
      setSessionStartTime(startTime);
      setElapsedTime(0);
      
      toast.success('Session started');
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const pauseSession = () => {
    setIsSessionActive(false);
    toast.info('Session paused');
  };

  const resumeSession = () => {
    setIsSessionActive(true);
    toast.info('Session resumed');
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      const endTime = new Date();
      
      const { error } = await supabase
        .from('client_sessions')
        .update({
          status: 'completed',
          notes: sessionNotes,
          updated_at: endTime.toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setIsSessionActive(false);
      setSessionEndTime(endTime);
      
      toast.success('Session completed');
      
      // Send review request email to client
      try {
        const { NotificationSystem } = await import('@/lib/notification-system');
        await NotificationSystem.sendReviewRequest(currentSession.id);
      } catch (reviewError) {
        console.error('Error sending review request:', reviewError);
        // Don't fail the session completion if email fails
      }
      
      // Update local session state
      const updatedSession = {
        ...currentSession,
        status: 'completed' as const,
        notes: sessionNotes,
        updated_at: endTime.toISOString()
      };
      setCurrentSession(updatedSession);
      
      if (onSessionUpdate) {
        onSessionUpdate(updatedSession);
      }
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!currentSession) return;

    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({
          notes: sessionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !currentSession) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading session...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentSession) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>No session selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                {currentSession.client_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentSession.session_type} • {currentSession.duration_minutes} minutes
              </p>
            </div>
            <Badge 
              variant={currentSession.status === 'in_progress' ? 'default' : 'secondary'}
              className={currentSession.status === 'in_progress' ? 'bg-green-500' : ''}
            >
              {currentSession.status === 'in_progress' ? 'In Progress' : currentSession.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{new Date(currentSession.session_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{currentSession.start_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Session Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {currentSession.status === 'scheduled' && (
              <Button onClick={startSession} disabled={loading} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            )}
            
            {currentSession.status === 'in_progress' && (
              <>
                {isSessionActive ? (
                  <Button onClick={pauseSession} variant="outline">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={resumeSession} variant="outline">
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button onClick={endSession} disabled={loading} className="bg-red-600 hover:bg-red-700">
                  <Square className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              </>
            )}
            
            {currentSession.status === 'completed' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Session Completed</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Management Tabs */}
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notes">Live Notes</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="plan">Treatment Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Live Session Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="session-notes">Session Notes</Label>
                <Textarea
                  id="session-notes"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Record observations, treatments, and client responses during the session..."
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveNotes} disabled={loading}>
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Client Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pain-level">Pain Level (0-10)</Label>
                <Input
                  id="pain-level"
                  type="number"
                  min="0"
                  max="10"
                  value={clientPainLevel}
                  onChange={(e) => setClientPainLevel(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="session-goals">Session Goals</Label>
                <Textarea
                  id="session-goals"
                  value={sessionGoals}
                  onChange={(e) => setSessionGoals(e.target.value)}
                  placeholder="What are the client's goals for this session?"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Treatment Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="treatment-plan">Treatment Plan</Label>
                <Textarea
                  id="treatment-plan"
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Document the treatment plan, exercises, and follow-up recommendations..."
                  className="min-h-[200px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

