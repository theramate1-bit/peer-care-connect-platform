import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  ArrowRight, 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Send,
  Inbox,
  Coins
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { TreatmentExchangeService } from '@/lib/treatment-exchange';

interface ExchangeRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  requested_session_date: string;
  requested_start_time: string;
  requested_end_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  expires_at: string;
  created_at: string;
  requester?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
    user_role: string;
  };
  recipient?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
    user_role: string;
  };
}

interface UpcomingSession {
  id: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  practitioner_a_id: string;
  practitioner_b_id: string;
  practitioner_a?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  practitioner_b?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

const ProfileTreatmentExchangeTab: React.FC = () => {
  const { userProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<ExchangeRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ExchangeRequest[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const isOptedIn = userProfile?.treatment_exchange_opt_in || userProfile?.treatment_exchange_enabled;

  // Load data
  const loadData = async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(true);

      // Fetch credit balance
      const { data: credits } = await supabase
        .from('credits')
        .select('current_balance, balance')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      setCreditBalance(credits?.current_balance || credits?.balance || 0);

      // Fetch incoming requests (where I'm the recipient)
      const { data: incoming, error: incomingError } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          requester_id,
          recipient_id,
          requested_session_date,
          requested_start_time,
          requested_end_time,
          duration_minutes,
          session_type,
          status,
          expires_at,
          created_at,
          requester:users!treatment_exchange_requests_requester_id_fkey(
            first_name,
            last_name,
            profile_photo_url,
            user_role
          )
        `)
        .eq('recipient_id', userProfile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (incomingError) {
        console.error('Error fetching incoming requests:', incomingError);
      }

      setIncomingRequests(incoming || []);

      // Fetch outgoing requests (where I'm the requester)
      const { data: outgoing, error: outgoingError } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          requester_id,
          recipient_id,
          requested_session_date,
          requested_start_time,
          requested_end_time,
          duration_minutes,
          session_type,
          status,
          expires_at,
          created_at,
          recipient:users!treatment_exchange_requests_recipient_id_fkey(
            first_name,
            last_name,
            profile_photo_url,
            user_role
          )
        `)
        .eq('requester_id', userProfile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (outgoingError) {
        console.error('Error fetching outgoing requests:', outgoingError);
      }

      setOutgoingRequests(outgoing || []);

      // Fetch upcoming exchange sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('mutual_exchange_sessions')
        .select(`
          id,
          session_date,
          start_time,
          duration_minutes,
          session_type,
          status,
          practitioner_a_id,
          practitioner_b_id,
          practitioner_a:users!mutual_exchange_sessions_practitioner_a_id_fkey(
            first_name,
            last_name,
            profile_photo_url
          ),
          practitioner_b:users!mutual_exchange_sessions_practitioner_b_id_fkey(
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .or(`practitioner_a_id.eq.${userProfile.id},practitioner_b_id.eq.${userProfile.id}`)
        .in('status', ['scheduled', 'confirmed', 'pending_booking'])
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(3);

      if (sessionsError) {
        console.error('Error fetching upcoming sessions:', sessionsError);
      }

      setUpcomingSessions(sessions || []);
    } catch (error) {
      console.error('Error loading treatment exchange data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userProfile?.id]);

  // Real-time subscriptions
  useRealtimeSubscription(
    'treatment_exchange_requests',
    `recipient_id=eq.${userProfile?.id}`,
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        loadData();
        if (payload.eventType === 'INSERT') {
          toast.info('New exchange request received!');
        }
      }
    }
  );

  useRealtimeSubscription(
    'treatment_exchange_requests',
    `requester_id=eq.${userProfile?.id}`,
    (payload) => {
      if (payload.eventType === 'UPDATE') {
        loadData();
        if (payload.new?.status === 'accepted') {
          toast.success('Your exchange request was accepted!');
        } else if (payload.new?.status === 'declined') {
          toast.info('Your exchange request was declined.');
        }
      }
    }
  );

  useRealtimeSubscription(
    'mutual_exchange_sessions',
    `practitioner_a_id=eq.${userProfile?.id}`,
    () => loadData()
  );

  useRealtimeSubscription(
    'mutual_exchange_sessions',
    `practitioner_b_id=eq.${userProfile?.id}`,
    () => loadData()
  );

  // Handle opt-in toggle
  const handleToggleOptIn = async (enabled: boolean) => {
    if (!userProfile?.id) return;

    try {
      setToggling(true);

      // Use TreatmentExchangeService for proper handling
      await TreatmentExchangeService.setTreatmentExchangeEnabled(userProfile.id, enabled);

      // Update local state
      await updateProfile({ 
        treatment_exchange_opt_in: enabled,
        treatment_exchange_enabled: enabled 
      });

      toast.success(enabled ? 'Treatment Exchange enabled!' : 'Treatment Exchange disabled');

      if (enabled) {
        loadData();
      }
    } catch (error) {
      console.error('Error toggling treatment exchange:', error);
      toast.error('Failed to update treatment exchange setting');
    } finally {
      setToggling(false);
    }
  };

  // Handle accept request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      setRespondingTo(requestId);
      await TreatmentExchangeService.acceptExchangeRequest(requestId, userProfile?.id!);
      toast.success('Request accepted! Session scheduled.');
      loadData();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast.error(error.message || 'Failed to accept request');
    } finally {
      setRespondingTo(null);
    }
  };

  // Handle decline request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      setRespondingTo(requestId);
      await TreatmentExchangeService.declineExchangeRequest(requestId, userProfile?.id!);
      toast.info('Request declined');
      loadData();
    } catch (error: any) {
      console.error('Error declining request:', error);
      toast.error(error.message || 'Failed to decline request');
    } finally {
      setRespondingTo(null);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(`2000-01-01T${timeString}`), 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      default: return role;
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const totalPendingRequests = incomingRequests.length + outgoingRequests.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Opt-In Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Treatment Exchange
                {totalPendingRequests > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {totalPendingRequests}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Exchange treatments with other practitioners using credits
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>{creditBalance} credits</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="exchange-toggle" className="text-sm">
                  {isOptedIn ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="exchange-toggle"
                  checked={isOptedIn}
                  onCheckedChange={handleToggleOptIn}
                  disabled={toggling}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Not Opted In State */}
      {!isOptedIn && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Treatment Exchange Not Enabled</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Enable treatment exchange to find and book peer treatments with other practitioners.
              Use your credits to receive treatments from fellow therapists.
            </p>
            <Button onClick={() => handleToggleOptIn(true)} disabled={toggling}>
              {toggling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Enable Treatment Exchange
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Opted In Content */}
      {isOptedIn && (
        <>
          {/* Incoming Requests */}
          {incomingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Incoming Requests
                  <Badge variant="secondary">{incomingRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.requester?.profile_photo_url} />
                        <AvatarFallback>
                          {getInitials(request.requester?.first_name, request.requester?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {request.requester?.first_name} {request.requester?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.session_type || 'Treatment'} • {request.duration_minutes} min
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.requested_session_date), 'MMM d')} at {formatTime(request.requested_start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineRequest(request.id)}
                        disabled={respondingTo === request.id}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={respondingTo === request.id}
                      >
                        {respondingTo === request.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Outgoing Requests */}
          {outgoingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Outgoing Requests
                  <Badge variant="secondary">{outgoingRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {outgoingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.recipient?.profile_photo_url} />
                        <AvatarFallback>
                          {getInitials(request.recipient?.first_name, request.recipient?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {request.recipient?.first_name} {request.recipient?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.session_type || 'Treatment'} • {request.duration_minutes} min
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.requested_session_date), 'MMM d')} at {formatTime(request.requested_start_time)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-amber-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Exchange Sessions
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/credits#peer-treatment" className="flex items-center gap-1">
                      View All <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingSessions.map((session) => {
                  const isPractitionerA = session.practitioner_a_id === userProfile?.id;
                  const otherPerson = isPractitionerA ? session.practitioner_b : session.practitioner_a;

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherPerson?.profile_photo_url} />
                          <AvatarFallback>
                            {getInitials(otherPerson?.first_name, otherPerson?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {otherPerson?.first_name} {otherPerson?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.session_type || 'Treatment'} • {session.duration_minutes} min
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(session.session_date), 'MMM d')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(session.start_time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {incomingRequests.length === 0 && outgoingRequests.length === 0 && upcomingSessions.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Exchanges</h3>
                <p className="text-muted-foreground mb-4">
                  Find other practitioners and request treatment exchanges
                </p>
              </CardContent>
            </Card>
          )}

          {/* CTA to Full Marketplace */}
          <div className="flex justify-center">
            <Button asChild className="w-full max-w-md">
              <Link to="/credits" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Find Exchange Partners
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileTreatmentExchangeTab;
