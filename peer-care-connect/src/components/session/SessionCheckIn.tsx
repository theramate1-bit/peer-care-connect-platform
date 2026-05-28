import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  QrCode, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar,
  User as UserIcon,
  AlertCircle,
  Camera,
  LogIn,
  MessageSquare,
  Star
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
  therapist_name: string;
  therapist_phone: string;
  location: string;
  created_at: string;
  updated_at: string;
}

interface SessionCheckInProps {
  sessionId: string;
  onCheckInComplete?: (session: Session) => void;
}

export const SessionCheckIn: React.FC<SessionCheckInProps> = ({
  sessionId,
  onCheckInComplete
}) => {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<'pending' | 'checked_in' | 'session_started' | 'completed'>('pending');
  const [arrivalTime, setArrivalTime] = useState<Date | null>(null);
  const [waitTime, setWaitTime] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<any>(null);

  // Real-time subscription for session updates
  const { data: realtimeSession } = useRealtimeSubscription(
    'client_sessions',
    `id=eq.${sessionId}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      
      if (payload.eventType === 'UPDATE') {
        setSession(payload.new);
        
        // Update check-in status based on session status
        if (payload.new.status === 'in_progress') {
          setCheckInStatus('session_started');
        } else if (payload.new.status === 'completed') {
          setCheckInStatus('completed');
        }
      }
    }
  );

  useEffect(() => {
    fetchSession();
    if (checkInStatus === 'completed') {
      fetchExistingFeedback();
    }
  }, [sessionId, checkInStatus]);

  useEffect(() => {
    if (arrivalTime) {
      const interval = setInterval(() => {
        setWaitTime(Math.floor((Date.now() - arrivalTime.getTime()) / 1000 / 60));
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [arrivalTime]);

  const fetchExistingFeedback = async () => {
    if (!sessionId || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching existing feedback:', error);
        return;
      }

      if (data) {
        setExistingFeedback(data);
        setRating(data.rating || 0);
        setFeedback(data.feedback || '');
      }
    } catch (error) {
      console.error('Error fetching existing feedback:', error);
    }
  };

  const fetchSession = async () => {
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
        .eq('id', sessionId)
        .eq('client_id', user?.id)
        .single();

      if (error) throw error;

      const sessionData = {
        ...data,
        therapist_name: `${data.therapist.first_name} ${data.therapist.last_name}`,
        therapist_phone: data.therapist.phone
      };

      setSession(sessionData);
      
      // Determine check-in status
      if (data.status === 'in_progress') {
        setCheckInStatus('session_started');
      } else if (data.status === 'completed') {
        setCheckInStatus('completed');
        // Fetch existing feedback when session is completed
        await fetchExistingFeedback();
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const checkInTime = new Date();
      
      // Update session with check-in time
      const { error } = await supabase
        .from('client_sessions')
        .update({
          check_in_time: checkInTime.toISOString(),
          updated_at: checkInTime.toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      setCheckInStatus('checked_in');
      setArrivalTime(checkInTime);
      
      // Notify therapist of check-in
      await supabase
        .from('notifications')
        .insert({
          user_id: session.therapist_id,
          type: 'client_check_in',
          title: 'Client Checked In',
          message: `${session.client_name} has arrived for their ${session.session_type} session`,
          data: {
            session_id: sessionId,
            client_name: session.client_name,
            check_in_time: checkInTime.toISOString()
          }
        });

      toast.success('Successfully checked in! Your therapist has been notified.');
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!session || !feedback.trim()) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('session_feedback')
        .insert({
          session_id: sessionId,
          client_id: user?.id,
          rating: rating,
          feedback: feedback.trim(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      // Reload existing feedback to show it
      await fetchExistingFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    // Strip seconds if present (HH:MM:SS -> HH:MM)
    const timeWithoutSeconds = timeString.includes(':') && timeString.split(':').length === 3
      ? timeString.substring(0, 5)
      : timeString;
    return new Date(`2000-01-01T${timeWithoutSeconds}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && !session) {
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

  if (!session) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>Session not found</p>
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
                <Calendar className="h-5 w-5" />
                {session.session_type}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(session.session_date)} at {formatTime(session.start_time)}
              </p>
            </div>
            <Badge 
              variant={checkInStatus === 'completed' ? 'default' : 'secondary'}
              className={checkInStatus === 'checked_in' || checkInStatus === 'session_started' ? 'bg-green-500 text-white' : ''}
            >
              {checkInStatus === 'pending' && 'Pending Check-in'}
              {checkInStatus === 'checked_in' && 'Checked In'}
              {checkInStatus === 'session_started' && 'Session Started'}
              {checkInStatus === 'completed' && 'Completed'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Therapist: {session.therapist_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Duration: {session.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{session.location || 'Location TBD'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{session.therapist_phone}</span>
              </div>
            </div>
            
            {arrivalTime && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Arrived: {arrivalTime.toLocaleTimeString()}</span>
                </div>
                {waitTime > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Wait time: {waitTime} minutes</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Actions */}
      {checkInStatus === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Check In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please check in when you arrive for your session. Your therapist will be notified.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleCheckIn} disabled={loading} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Check In Now
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowQRCode(!showQRCode)}
                disabled={loading}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            </div>
            
            {showQRCode && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Show this QR code to your therapist for quick check-in
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Status */}
      {checkInStatus === 'checked_in' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">You're checked in!</h3>
              <p className="text-muted-foreground">
                Your therapist has been notified of your arrival. Please wait for them to start the session.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {checkInStatus === 'session_started' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Session in progress</h3>
              <p className="text-muted-foreground">
                Your session has started. Enjoy your treatment!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-Session Feedback */}
      {checkInStatus === 'completed' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Session Feedback
              </CardTitle>
              {existingFeedback && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Feedback Submitted
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingFeedback ? (
              // Display existing feedback
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="font-medium">Your Rating</span>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= (existingFeedback.rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({existingFeedback.rating}/5)
                    </span>
                  </div>
                  
                  {existingFeedback.feedback && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Your Feedback
                          </div>
                          <p className="text-sm">{existingFeedback.feedback}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {existingFeedback.created_at && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Submitted on {new Date(existingFeedback.created_at).toLocaleDateString()} at{' '}
                      {new Date(existingFeedback.created_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Show feedback form
              <>
                <div>
                  <Label htmlFor="rating">Rate your session (1-5 stars)</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-2xl ${
                          star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="feedback">Share your experience</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="How was your session? Any feedback for your therapist?"
                    className="min-h-[100px]"
                  />
                </div>
                
                <Button onClick={submitFeedback} disabled={loading || !feedback.trim()}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

