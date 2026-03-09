import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User as UserIcon, Star, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MessagingManager } from '@/lib/messaging';

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
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [ratingSession, setRatingSession] = useState<Session | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<Record<string, any>>({});

  const handleMessageTherapist = async (session: Session) => {
    if (!user) return;

    try {
      // Create/get conversation
      const conversationId = await MessagingManager.getOrCreateConversation(
        user.id,
        session.therapist_id
      );

      // Navigate to messages with conversation pre-selected
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
      fetchSessionRatings();
    }
  }, [user]);

  const fetchSessionRatings = async () => {
    // Use user?.id as primary (matches RLS auth.uid()), fallback to userProfile?.id
    const clientId = user?.id || userProfile?.id;
    if (!clientId) return;

    try {
      // Fetch ratings from practitioner_ratings table
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('practitioner_ratings')
        .select('session_id, rating, review_text, created_at')
        .eq('client_id', clientId);

      if (ratingsError && ratingsError.code !== 'PGRST116') {
        console.error('Error fetching ratings:', ratingsError);
      }

      // Also check session_feedback table as fallback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('session_feedback')
        .select('session_id, rating, feedback, created_at')
        .eq('client_id', user.id);

      if (feedbackError && feedbackError.code !== 'PGRST116') {
        console.error('Error fetching feedback:', feedbackError);
      }

      // Combine both sources, prioritizing practitioner_ratings
      const ratingsMap: Record<string, any> = {};
      
      if (ratingsData) {
        ratingsData.forEach((rating: any) => {
          if (rating.session_id) {
            ratingsMap[rating.session_id] = {
              rating: rating.rating,
              review_text: rating.review_text,
              feedback: rating.review_text,
              created_at: rating.created_at
            };
          }
        });
      }

      if (feedbackData) {
        feedbackData.forEach((feedback: any) => {
          if (feedback.session_id && !ratingsMap[feedback.session_id]) {
            ratingsMap[feedback.session_id] = {
              rating: feedback.rating,
              feedback: feedback.feedback,
              created_at: feedback.created_at
            };
          }
        });
      }

      setSessionRatings(ratingsMap);
    } catch (error) {
      console.error('Error fetching session ratings:', error);
    }
  };

  const loadSessions = async () => {
    // Use user?.id as primary (matches RLS auth.uid()), fallback to userProfile?.id
    const clientId = user?.id || userProfile?.id;
    
    if (!clientId) {
      console.warn('No client ID available for loading sessions');
      setLoading(false);
      return;
    }

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
        .eq('client_id', clientId)
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
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="p-6">
                <div className="h-6 bg-muted animate-pulse rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
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
        <Card className="shadow-sm">
          <CardContent className="text-center py-12 px-6">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">No sessions found</h3>
            <p className="text-muted-foreground mb-6">
              {filter === 'all' 
                ? "You haven't booked any sessions yet."
                : `No ${filter} sessions found.`
              }
            </p>
            <Button onClick={() => navigate('/marketplace')} className="transition-[background-color,border-color] duration-200 ease-out">
              Browse Therapists
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="shadow-sm">
              <CardHeader className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      {format(new Date(session.session_date), 'MMM dd, yyyy')}
                      <span className="text-lg font-medium text-muted-foreground">•</span>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-base font-medium">{session.start_time}</span>
                      <span className="text-sm text-muted-foreground">({session.duration_minutes} min)</span>
                    </CardTitle>
                    <CardDescription className="text-lg font-medium mb-2 flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      {session.therapist?.first_name} {session.therapist?.last_name}
                    </CardDescription>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {session.therapist?.location}
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{session.session_type}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {getStatusBadge(session.status)}
                    {getPaymentBadge(session.payment_status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Price</h4>
                      <p className="text-lg font-semibold">£{session.price.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {session.status === 'completed' && (
                        sessionRatings[session.id] ? (
                          // Show submitted rating
                          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-green-50">
                            <Badge className="bg-green-100 text-green-800 border-0">
                              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                              Rated {sessionRatings[session.id].rating}/5
                            </Badge>
                            {sessionRatings[session.id].review_text && (
                              <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                                {sessionRatings[session.id].review_text}
                              </span>
                            )}
                          </div>
                        ) : (
                          // Show rate button
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setRatingSession(session);
                              setRatingOpen(true);
                            }}
                            className="transition-[background-color,border-color] duration-200 ease-out active:scale-[0.98]"
                          >
                            <Star className="h-4 w-4 mr-1.5" />
                            Rate Session
                          </Button>
                        )
                      )}
                      {session.status === 'scheduled' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMessageTherapist(session)}
                          className="transition-[background-color,border-color] duration-200 ease-out active:scale-[0.98]"
                        >
                          <MessageSquare className="h-4 w-4 mr-1.5" />
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
            // Refresh sessions and ratings after feedback
            loadSessions();
            fetchSessionRatings();
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



