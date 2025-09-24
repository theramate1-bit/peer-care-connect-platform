import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  Calendar, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle,
  Timer,
  Activity,
  TrendingUp,
  Users,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { LiveSessionManager } from './LiveSessionManager';

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

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  completedToday: number;
  scheduledToday: number;
}

export const RealTimeSessionDashboard: React.FC = () => {
  const { user } = useAuth();
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0,
    activeSessions: 0,
    completedToday: 0,
    scheduledToday: 0
  });
  const [loading, setLoading] = useState(true);

  // Real-time subscription for session updates
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setTodaySessions(prev => [payload.new, ...prev]);
        updateStats([payload.new, ...todaySessions]);
      } else if (payload.eventType === 'UPDATE') {
        setTodaySessions(prev => 
          prev.map(session => 
            session.id === payload.new.id ? payload.new : session
          )
        );
        updateStats(todaySessions.map(session => 
          session.id === payload.new.id ? payload.new : session
        ));
      } else if (payload.eventType === 'DELETE') {
        setTodaySessions(prev => 
          prev.filter(session => session.id !== payload.old.id)
        );
        updateStats(todaySessions.filter(session => session.id !== payload.old.id));
      }
    }
  );

  useEffect(() => {
    fetchTodaySessions();
  }, [user]);

  const fetchTodaySessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user.id)
        .eq('session_date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setTodaySessions(data || []);
      updateStats(data || []);
    } catch (error) {
      console.error('Error fetching today sessions:', error);
      toast.error('Failed to load today sessions');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (sessions: Session[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(session => session.session_date === today);
    
    setSessionStats({
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'in_progress').length,
      completedToday: todaySessions.filter(s => s.status === 'completed').length,
      scheduledToday: todaySessions.filter(s => s.status === 'scheduled').length
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-green-500 text-white';
      case 'completed': return 'bg-blue-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-blue-600">{sessionStats.completedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled Today</p>
                <p className="text-2xl font-bold text-orange-600">{sessionStats.scheduledToday}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Sessions ({new Date().toLocaleDateString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p>No sessions scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSession?.id === session.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status)}
                        <span className="font-medium">{session.client_name}</span>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(session.start_time)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="h-4 w-4" />
                        {session.duration_minutes}min
                      </div>
                      <span>{session.session_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Session Manager */}
      {selectedSession && (
        <LiveSessionManager
          sessionId={selectedSession.id}
          onSessionUpdate={(updatedSession) => {
            setTodaySessions(prev => 
              prev.map(session => 
                session.id === updatedSession.id ? updatedSession : session
              )
            );
            setSelectedSession(updatedSession);
            updateStats(todaySessions.map(session => 
              session.id === updatedSession.id ? updatedSession : session
            ));
          }}
        />
      )}
    </div>
  );
};
