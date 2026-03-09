import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Heart, 
  User as UserIcon, 
  Star, 
  MessageCircle, 
  FileText, 
  CreditCard,
  MapPin,
  TrendingUp,
  Settings,
  Stethoscope,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { getFriendlyDateLabel } from "@/lib/date";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { TheramateTimeline } from "@/components/client/TheramateTimeline";
import { getDisplaySessionStatus, getDisplaySessionStatusLabel, isClientSessionVisible } from "@/lib/session-display-status";

interface UpcomingSession {
  id: string;
  therapist_name: string;
  session_type: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  price: number;
  status: string;
  payment_status?: string;
}

interface FavoritePractitioner {
  id: string;
  therapist_id: string;
  first_name: string;
  last_name: string;
  bio: string;
  location: string;
  hourly_rate: number;
  average_rating?: number;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<FavoritePractitioner[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingCount: 0,
    totalSpent: 0,
    favoriteCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();

  // Real-time subscription for client sessions
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `client_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      // Refresh dashboard data when sessions are updated
      if (user) {
        fetchDashboardData();
      }
    }
  );

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch upcoming sessions - include confirmed and pending_payment statuses
      const today = new Date().toISOString().split('T')[0];
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          session_date,
          start_time,
          duration_minutes,
          price,
          status,
          payment_status,
          session_type,
          therapist:users!client_sessions_therapist_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('client_id' as any, user?.id as any)
        .gte('session_date', today)
        .in('status' as any, ['scheduled', 'confirmed', 'pending_payment'])
        .order('session_date', { ascending: true });

      if (upcomingError) {
        console.error('Error fetching upcoming sessions:', upcomingError);
      } else {
        const formattedUpcoming = ((upcomingData as any[]) || [])
          .filter((session) => isClientSessionVisible(session))
          .map(session => ({
          id: session.id,
          therapist_name: `${session.therapist.first_name} ${session.therapist.last_name}`,
          session_type: session.session_type,
          session_date: session.session_date,
          start_time: session.start_time,
          duration_minutes: session.duration_minutes,
          price: session.price,
          status: getDisplaySessionStatus(session),
          payment_status: session.payment_status
        }));
        setUpcomingSessions(formattedUpcoming);
      }

      // Fetch recent sessions
      const { data: recentData, error: recentError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          session_date,
          start_time,
          duration_minutes,
          price,
          status,
          payment_status,
          session_type,
          therapist:users!client_sessions_therapist_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('client_id' as any, user?.id as any)
        .lt('session_date', today)
        .order('session_date', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent sessions:', recentError);
      } else {
        const formattedRecent = ((recentData as any[]) || [])
          .filter((session) => isClientSessionVisible(session))
          .map(session => ({
          id: session.id,
          therapist_name: `${session.therapist.first_name} ${session.therapist.last_name}`,
          session_type: session.session_type,
          session_date: session.session_date,
          start_time: session.start_time,
          duration_minutes: session.duration_minutes,
          price: session.price,
          status: getDisplaySessionStatus(session),
          payment_status: session.payment_status
        }));
        setRecentSessions(formattedRecent);
      }

      // Fetch favorites - using separate queries to avoid FK issues
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('client_favorites')
        .select('id, therapist_id')
        .eq('client_id' as any, user?.id as any);

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        setFavorites([]);
      } else if (favoritesData && favoritesData.length > 0) {
        // Get therapist details separately
        const therapistIds = (favoritesData as any[]).map((fav: any) => fav.therapist_id);
        const { data: therapistsData, error: therapistsError } = await supabase
          .from('users')
          .select('id, first_name, last_name, bio, location, hourly_rate')
          .in('id', therapistIds);

        if (therapistsError) {
          console.error('Error fetching therapists:', therapistsError);
          setFavorites([]);
        } else {
          const formattedFavorites = (favoritesData as any[]).map((fav: any) => {
            const therapist = (therapistsData as any[])?.find((t: any) => t.id === fav.therapist_id);
            return {
              id: fav.id,
              therapist_id: fav.therapist_id,
              first_name: therapist?.first_name || 'Unknown',
              last_name: therapist?.last_name || 'Practitioner',
              bio: therapist?.bio || '',
              location: therapist?.location || '',
              hourly_rate: therapist?.hourly_rate || 0
            };
          });
          setFavorites(formattedFavorites);
        }
      } else {
        setFavorites([]);
      }

      // Fetch ALL sessions for accurate stats calculation
      const { data: allSessionsData, error: allSessionsError } = await supabase
        .from('client_sessions')
        .select('id, session_date, price, status, payment_status')
        .eq('client_id' as any, user?.id as any);

      if (allSessionsError) {
        console.error('Error fetching all sessions for stats:', allSessionsError);
      }

      // Calculate stats from all sessions
      const allSessions = (allSessionsData as any[]) || [];
      const visibleSessions = allSessions.filter((session) => isClientSessionVisible(session));
      const totalSessions = visibleSessions.length;
      
      // Count successfully paid sessions as confirmed for display/stats purposes.
      const totalSpent = visibleSessions
        .filter(session => 
          (getDisplaySessionStatus(session) === 'completed' || getDisplaySessionStatus(session) === 'confirmed') &&
          (session.payment_status === 'paid' || session.payment_status === 'completed')
        )
        .reduce((sum, session) => sum + (session.price || 0), 0);
      
      // Calculate upcoming count from sessions with date >= today and status in ['scheduled', 'confirmed', 'pending_payment']
      const upcomingCount = visibleSessions.filter(session => {
        const sessionDate = new Date(session.session_date);
        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);
        const displayStatus = getDisplaySessionStatus(session);
        return sessionDate >= todayDate && 
               ['scheduled', 'confirmed', 'pending_payment'].includes(displayStatus);
      }).length;
      
      setStats({
        totalSessions,
        upcomingCount,
        totalSpent,
        favoriteCount: (favoritesData as any[])?.length || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">
              Welcome back, {userProfile?.first_name}!
            </h1>
            <p className="text-gray-600">
              Manage your wellness journey and appointments
            </p>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.upcomingCount}</div>
                <p className="text-sm text-gray-600">Upcoming Sessions</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalSessions}</div>
                <p className="text-sm text-gray-600">Total Sessions</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <CreditCard className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">£{stats.totalSpent.toFixed(0)}</div>
                <p className="text-sm text-gray-600">Total Invested</p>
              </CardContent>
            </Card>
            
          </div>

          {/* Find Practitioners */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Find Your Perfect Practitioner
              </CardTitle>
              <CardDescription>
                Browse our marketplace to discover qualified therapists and book your sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/marketplace">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Browse Marketplace
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>Your scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingSessions.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">
                    No upcoming sessions. Ready to book your next appointment?
                  </p>
                ) : (
                  upcomingSessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{session.therapist_name}</p>
                        <p className="text-sm text-gray-600">{session.session_type}</p>
                        <p className="text-sm text-gray-600">
                          {getFriendlyDateLabel(session.session_date)} at {session.start_time}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">£{session.price}</p>
                        <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
                          {getDisplaySessionStatusLabel(session)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
                {upcomingSessions.length > 0 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/client/sessions">View All Sessions</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
                <CardDescription>Your latest appointments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentSessions.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">
                    No recent sessions yet. Book your first appointment to get started!
                  </p>
                ) : (
                  recentSessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{session.therapist_name}</p>
                        <p className="text-sm text-gray-600">{session.session_type}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(session.session_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">£{session.price}</p>
                        <Badge variant="outline">{getDisplaySessionStatusLabel(session)}</Badge>
                      </div>
                    </div>
                  ))
                )}
                {recentSessions.length > 0 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/client/sessions">View All Sessions</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Your Journey Timeline */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Your Wellness Journey
              </CardTitle>
              <CardDescription>
                Track your progress, sessions, and milestones over time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto px-6 pb-6">
                {(user?.id || userProfile?.id) ? (
                  <TheramateTimeline 
                    clientId={user?.id || userProfile?.id || ''}
                    clientName={userProfile?.first_name && userProfile?.last_name 
                      ? `${userProfile.first_name} ${userProfile.last_name}` 
                      : 'Client'}
                    readOnly={true}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p>Loading your journey timeline...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;


