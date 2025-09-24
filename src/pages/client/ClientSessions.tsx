import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, Star, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PrivateRatingModal from '@/components/reviews/PrivateRatingModal';
import { useNavigate } from 'react-router-dom';

interface Session {
  id: string;
  therapist_id: string;
  client_name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  notes: string;
  created_at: string;
  therapist: {
    first_name: string;
    last_name: string;
    user_role: string;
    location: string;
    hourly_rate: number;
  };
}

const ClientSessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [ratingSession, setRatingSession] = useState<Session | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('client_sessions')
        .select(`
          id,
          therapist_id,
          client_id,
          client_name,
          client_email,
          session_date,
          start_time,
          duration_minutes,
          session_type,
          price,
          status,
          payment_status,
          notes,
          created_at
        `)
        .eq('client_id', user?.id)
        .order('session_date', { ascending: false });

      if (error) throw error;

      // Get therapist details for each session
      const sessionsWithTherapists = await Promise.all(
        (data || []).map(async (session) => {
          const { data: therapist, error: therapistError } = await supabase
            .from('users')
            .select('first_name, last_name, user_role, location, hourly_rate')
            .eq('id', session.therapist_id)
            .single();

          if (therapistError) {
            console.error('Error loading therapist:', therapistError);
            return {
              ...session,
              therapist: {
                first_name: 'Unknown',
                last_name: 'Therapist',
                user_role: 'unknown',
                location: 'Unknown',
                hourly_rate: 0
              }
            };
          }

          return {
            ...session,
            therapist
          };
        })
      );

      setSessions(sessionsWithTherapists);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Sessions</h1>
        <p className="text-muted-foreground">View and manage your therapy sessions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'All Sessions' },
          { key: 'scheduled', label: 'Scheduled' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key as any)}
            className="text-sm"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' 
                ? "You haven't booked any sessions yet."
                : `No ${filter} sessions found.`
              }
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              Browse Therapists
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {session.therapist?.first_name} {session.therapist?.last_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(session.session_date), 'MMM dd, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {session.start_time} ({session.duration_minutes} min)
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {session.therapist?.location}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(session.status)}
                    {getPaymentBadge(session.payment_status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Session Type</h4>
                    <p className="text-muted-foreground">{session.session_type}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Price</h4>
                      <p className="text-lg font-semibold">£{session.price.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {session.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setRatingSession(session);
                            setRatingOpen(true);
                          }}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Rate Session
                        </Button>
                      )}
                      {session.status === 'scheduled' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Navigate to messages page with therapist filter
                            navigate(`/messages?user=${session.therapist_id}`);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message Therapist
                        </Button>
                      )}
                    </div>
                  </div>

                  {session.notes && (
                    <div>
                      <h4 className="font-medium">Notes</h4>
                      <p className="text-muted-foreground">{session.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Private post-session rating modal */}
      {ratingSession && user && (
        <PrivateRatingModal
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          sessionId={ratingSession.id}
          therapistId={ratingSession.therapist_id}
          clientId={user.id}
          therapistName={`${ratingSession.therapist?.first_name} ${ratingSession.therapist?.last_name}`}
          onSubmitted={() => {
            // Refresh sessions after feedback
            loadSessions();
          }}
        />
      )}
    </div>
  );
};

export default ClientSessions;


// Modal mount
// Keep outside return of main component to avoid layout shift
// NOTE: Rendering handled conditionally inside component tree above
