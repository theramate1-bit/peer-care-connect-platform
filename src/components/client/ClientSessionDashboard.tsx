import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  CheckCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  Star,
  MessageSquare,
  FileText,
  Timer,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { SessionCheckIn } from '@/components/session/SessionCheckIn';
import { SessionReminderSystem } from '@/components/session/SessionReminderSystem';
import { ClientProgressTracker } from '@/components/session/ClientProgressTracker';

interface Session {
  id: string;
  client_id: string;
  client_name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  therapist_id: string;
  therapist_name: string;
  therapist_phone: string;
  location: string;
  price: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface SessionStats {
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  totalSpent: number;
}

export const ClientSessionDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Real-time subscription for sessions
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `client_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setSessions(prev => [payload.new, ...prev]);
        updateStats([payload.new, ...sessions]);
      } else if (payload.eventType === 'UPDATE') {
        setSessions(prev => 
          prev.map(session => 
            session.id === payload.new.id ? payload.new : session
          )
        );
        updateStats(sessions.map(session => 
          session.id === payload.new.id ? payload.new : session
        ));
      } else if (payload.eventType === 'DELETE') {
        setSessions(prev => 
          prev.filter(session => session.id !== payload.old.id)
        );
        updateStats(sessions.filter(session => session.id !== payload.old.id));
      }
    }
  );

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          therapist:therapist_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('client_id', user?.id)
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      const sessionsData = data?.map(session => ({
        ...session,
        therapist_name: `${session.therapist.first_name} ${session.therapist.last_name}`,
        therapist_phone: session.therapist.phone
      })) || [];

      setSessions(sessionsData);
      updateStats(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (sessionsData: Session[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    setSessionStats({
      totalSessions: sessionsData.length,
      upcomingSessions: sessionsData.filter(s => s.session_date >= today && s.status === 'scheduled').length,
      completedSessions: sessionsData.filter(s => s.status === 'completed').length,
      totalSpent: sessionsData.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.price || 0), 0)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Activity className="h-4 w-4" />;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getUpcomingSessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(s => s.session_date >= today && s.status === 'scheduled');
  };

  const getRecentSessions = () => {
    return sessions.filter(s => s.status === 'completed').slice(0, 5);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{sessionStats.totalSessions}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{sessionStats.upcomingSessions}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{sessionStats.completedSessions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-purple-600">£{sessionStats.totalSpent.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Sessions ({getUpcomingSessions().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getUpcomingSessions().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                    <p>No upcoming sessions</p>
                    <p className="text-sm">Book a session to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getUpcomingSessions().slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(session.status)}
                              <span className="font-medium">{session.session_type}</span>
                            </div>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatDate(session.session_date)}</div>
                            <div className="text-xs text-muted-foreground">{formatTime(session.start_time)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          with {session.therapist_name} • {session.duration_minutes}min • £{session.price}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Recent Sessions ({getRecentSessions().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getRecentSessions().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p>No completed sessions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getRecentSessions().map((session) => (
                      <div
                        key={session.id}
                        className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(session.status)}
                              <span className="font-medium">{session.session_type}</span>
                            </div>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatDate(session.session_date)}</div>
                            <div className="text-xs text-muted-foreground">{formatTime(session.start_time)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          with {session.therapist_name} • {session.duration_minutes}min • £{session.price}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Session Reminders */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Session Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SessionReminderSystem />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {getUpcomingSessions().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>No upcoming sessions</p>
                  <p className="text-sm">Book a session to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getUpcomingSessions().map((session) => (
                    <div
                      key={session.id}
                      className="border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold">{session.session_type}</h3>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{session.therapist_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(session.session_date)} at {formatTime(session.start_time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4" />
                                <span>{session.duration_minutes} minutes</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {session.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{session.location}</span>
                                </div>
                              )}
                              {session.therapist_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span>{session.therapist_phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                <span>£{session.price}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>No sessions yet</p>
                  <p className="text-sm">Your session history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold">{session.session_type}</h3>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{session.therapist_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(session.session_date)} at {formatTime(session.start_time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4" />
                                <span>{session.duration_minutes} minutes</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                <span>£{session.price}</span>
                              </div>
                              {session.notes && (
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 mt-0.5" />
                                  <span className="text-xs">{session.notes.substring(0, 100)}...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          {selectedSession ? (
            <ClientProgressTracker
              clientId={selectedSession.client_id}
              clientName={selectedSession.client_name}
              sessionId={selectedSession.id}
            />
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a session to view progress</p>
                  <p className="text-sm">Choose a session from the overview tab to track your progress</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Session Check-in Modal */}
      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Session Details - {selectedSession.session_type}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionCheckIn
              sessionId={selectedSession.id}
              onCheckInComplete={(updatedSession) => {
                setSessions(prev => 
                  prev.map(session => 
                    session.id === updatedSession.id ? updatedSession : session
                  )
                );
                setSelectedSession(updatedSession);
                updateStats(sessions.map(session => 
                  session.id === updatedSession.id ? updatedSession : session
                ));
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
