import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SOAPNotesViewer } from '@/components/session/SOAPNotesViewer';
import { 
  Calendar, 
  Clock, 
  Heart, 
  User, 
  Star, 
  MessageCircle, 
  FileText, 
  CreditCard,
  MapPin,
  TrendingUp,
  Settings,
  Stethoscope,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClientProfile } from "@/components/client/ClientProfile";
import { ClientSessionDashboard } from "@/components/client/ClientSessionDashboard";
import { ClientCommunicationHub } from "@/components/communication/ClientCommunicationHub";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface UpcomingSession {
  id: string;
  therapist_name: string;
  session_type: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  price: number;
  status: string;
}

interface FavoritePractitioner {
  id: string;
  therapist_id: string;
  first_name: string;
  last_name: string;
  specializations: string[];
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
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, userProfile, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);


      // Fetch upcoming sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: upcoming, error: upcomingError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('client_id', user?.id)
        .gte('session_date', today)
        .eq('status', 'scheduled')
        .order('session_date');

      if (upcomingError) throw upcomingError;

      // Fetch recent completed sessions
      const { data: recent, error: recentError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('client_id', user?.id)
        .eq('status', 'completed')
        .order('session_date', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Fetch all sessions for stats
      const { data: allSessions, error: allError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('client_id', user?.id);

      if (allError) throw allError;

      // Fetch favorites - simplified without join for now
      const { data: favData, error: favError } = await supabase
        .from('client_favorites')
        .select('*')
        .eq('client_id', user?.id);

      if (favError && favError.code !== 'PGRST116') throw favError;

      // Process upcoming sessions data
      const formattedUpcoming = (upcoming || []).map(session => ({
        id: session.id,
        therapist_name: session.client_name || 'Practitioner',
        session_type: session.session_type || 'Session',
        session_date: session.session_date,
        start_time: session.start_time || '09:00',
        duration_minutes: session.duration_minutes || 60,
        price: session.price || 0,
        status: session.status
      }));

      // For now, create empty favorites array since we need to fix the relations
      const formattedFavorites: FavoritePractitioner[] = [];

      const totalSpent = (allSessions || [])
        .filter(s => s.status === 'completed')
        .reduce((sum, session) => sum + (session.price || 0), 0);

      setUpcomingSessions(formattedUpcoming);
      setRecentSessions(recent || []);
      setFavorites(formattedFavorites);
      setStats({
        totalSessions: (allSessions || []).length,
        upcomingCount: formattedUpcoming.length,
        totalSpent,
        favoriteCount: formattedFavorites.length
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'TBD';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={generateAvatarUrl(
                    `${userProfile?.first_name}${userProfile?.last_name}`,
                    userProfile?.avatar_preferences || {
                      hairColor: 'brown',
                      clothingColor: 'blue',
                      accessories: [],
                      backgroundColor: 'f0f0f0',
                      skinColor: 'light',
                      clothing: 'shirt',
                      hairStyle: 'short',
                      eyes: 'default',
                      eyebrows: 'default',
                      mouth: 'default',
                      flip: false,
                      rotate: 0,
                      scale: 1
                    }
                  )} 
                />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {userProfile?.first_name?.charAt(0)}{userProfile?.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">
                  Welcome back, {userProfile?.first_name}!
                </h1>
                <p className="text-gray-600">
                  Manage your wellness journey and appointments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
            <TabsTrigger value="communication">Messages</TabsTrigger>
            <TabsTrigger value="soap-notes">Notes with your practitioner</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
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
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.favoriteCount}</div>
                  <p className="text-sm text-gray-600">Favorite Practitioners</p>
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
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild size="lg" className="flex-1">
                    <Link to="/marketplace">
                      <Stethoscope className="h-5 w-5 mr-2" />
                      Browse Marketplace
                    </Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link to="/client/booking">
                      <Calendar className="h-5 w-5 mr-2" />
                      Book Session
                    </Link>
                  </Button>
                </div>
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
                            {formatDate(session.session_date)} at {formatTime(session.start_time)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                          <p className="text-sm font-medium mt-1">£{session.price}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {upcomingSessions.length > 3 && (
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("sessions")}>
                      View All Sessions
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your wellness journey progress</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentSessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No recent sessions to show
                    </p>
                  ) : (
                    recentSessions.map((session, index) => (
                      <div key={session.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Completed session with {session.client_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.session_date)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <ClientSessionDashboard />
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <ClientCommunicationHub />
          </TabsContent>

          {/* SOAP Notes Tab */}
          <TabsContent value="soap-notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Notes with your practitioner
                </CardTitle>
                <CardDescription>
                  View detailed session notes and treatment summaries from your practitioner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SOAPNotesViewer clientView={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Favorite Practitioners
                </CardTitle>
                <CardDescription>Your saved practitioners for quick booking</CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No favorite practitioners yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add practitioners to favorites while browsing to see them here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favorites.map((favorite) => (
                      <div key={favorite.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar>
                            <AvatarImage 
                              src={generateAvatarUrl(
                                `${favorite.first_name}${favorite.last_name}`,
                                favorite.avatar_preferences || {
                                  hairColor: 'brown',
                                  clothingColor: 'blue',
                                  accessories: [],
                                  backgroundColor: 'f0f0f0',
                                  skinColor: 'light',
                                  clothing: 'shirt',
                                  hairStyle: 'short',
                                  eyes: 'default',
                                  eyebrows: 'default',
                                  mouth: 'default',
                                  flip: false,
                                  rotate: 0,
                                  scale: 1
                                }
                              )} 
                            />
                            <AvatarFallback>
                              {favorite.first_name.charAt(0)}{favorite.last_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{favorite.first_name} {favorite.last_name}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {favorite.location}
                            </div>
                          </div>
                        </div>
                        
                        {favorite.average_rating && favorite.average_rating > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {renderStars(favorite.average_rating)}
                            </div>
                            <span className="text-sm">{favorite.average_rating.toFixed(1)}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {favorite.specializations.slice(0, 2).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">£{favorite.hourly_rate}/hour</span>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                // Navigate to practitioner profile
                                navigate(`/therapist/${favorite.therapist_id}`);
                              }}
                            >
                              View Profile
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => {
                                // Navigate to booking with this practitioner
                                navigate(`/client/booking?practitioner=${favorite.therapist_id}`);
                              }}
                            >
                              Book Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ClientProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;