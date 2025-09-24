import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Calendar, 
  Bell, 
  BellOff, 
  User, 
  MapPin,
  Phone,
  CheckCircle,
  AlertCircle,
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
  therapist_id: string;
  therapist_name: string;
  therapist_phone: string;
  location: string;
  created_at: string;
  updated_at: string;
}

interface SessionReminderSystemProps {
  className?: string;
}

export const SessionReminderSystem: React.FC<SessionReminderSystemProps> = ({
  className
}) => {
  const { user } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Real-time subscription for session updates
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `client_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setUpcomingSessions(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setUpcomingSessions(prev => 
          prev.map(session => 
            session.id === payload.new.id ? payload.new : session
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setUpcomingSessions(prev => 
          prev.filter(session => session.id !== payload.old.id)
        );
      }
    }
  );

  useEffect(() => {
    if (user) {
      fetchUpcomingSessions();
      checkForReminders();
    }
  }, [user]);

  useEffect(() => {
    if (remindersEnabled) {
      // Check for reminders every minute
      const interval = setInterval(checkForReminders, 60000);
      return () => clearInterval(interval);
    }
  }, [remindersEnabled, upcomingSessions]);

  const fetchUpcomingSessions = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
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
        .gte('session_date', today)
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const sessionsData = data?.map(session => ({
        ...session,
        therapist_name: `${session.therapist.first_name} ${session.therapist.last_name}`,
        therapist_phone: session.therapist.phone
      })) || [];

      setUpcomingSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForReminders = () => {
    if (!remindersEnabled) return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDate = now.toISOString().split('T')[0];

    upcomingSessions.forEach(session => {
      if (session.session_date === currentDate) {
        const sessionTime = parseInt(session.start_time.split(':')[0]) * 60 + parseInt(session.start_time.split(':')[1]);
        const timeDiff = sessionTime - currentTime;

        // Send reminder 24 hours before
        if (timeDiff === 24 * 60) {
          sendReminder(session, '24 hours');
        }
        // Send reminder 2 hours before
        else if (timeDiff === 2 * 60) {
          sendReminder(session, '2 hours');
        }
        // Send reminder 30 minutes before
        else if (timeDiff === 30) {
          sendReminder(session, '30 minutes');
        }
      }
    });
  };

  const sendReminder = async (session: Session, timeBefore: string) => {
    try {
      // Create notification for the client
      await supabase
        .from('notifications')
        .insert({
          user_id: session.client_id,
          type: 'session_reminder',
          title: 'Session Reminder',
          message: `Your ${session.session_type} session with ${session.therapist_name} is in ${timeBefore}`,
          data: {
            session_id: session.id,
            therapist_name: session.therapist_name,
            session_type: session.session_type,
            session_date: session.session_date,
            start_time: session.start_time,
            location: session.location
          }
        });

      // Also notify the therapist
      await supabase
        .from('notifications')
        .insert({
          user_id: session.therapist_id,
          type: 'session_reminder',
          title: 'Upcoming Session',
          message: `Your ${session.session_type} session with ${session.client_name} is in ${timeBefore}`,
          data: {
            session_id: session.id,
            client_name: session.client_name,
            session_type: session.session_type,
            session_date: session.session_date,
            start_time: session.start_time,
            location: session.location
          }
        });

      console.log(`Reminder sent for session ${session.id} - ${timeBefore} before`);
    } catch (error) {
      console.error('Error sending reminder:', error);
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

  const getTimeUntilSession = (session: Session) => {
    const now = new Date();
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const diffMs = sessionDateTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Past due';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''} away`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m away`;
    } else {
      return `${diffMinutes}m away`;
    }
  };

  const toggleReminders = () => {
    setRemindersEnabled(!remindersEnabled);
    toast.info(`Reminders ${!remindersEnabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Session Reminders
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleReminders}
              className={remindersEnabled ? 'bg-green-100 text-green-800' : ''}
            >
              {remindersEnabled ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enabled
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disabled
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Get automatic reminders 24 hours, 2 hours, and 30 minutes before your sessions.
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions ({upcomingSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading sessions...</p>
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p>No upcoming sessions</p>
              <p className="text-sm">Book a session to see reminders here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{session.session_type}</h4>
                        <Badge variant="outline">{session.status}</Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
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
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">
                        {getTimeUntilSession(session)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(session.session_date)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {upcomingSessions.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    View All Sessions ({upcomingSessions.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
