import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, CreditCard, BookOpen, MessageSquare, Plus, Search, Heart, TrendingUp, LogOut, Settings, Coins, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookingCalendar } from "@/components/BookingCalendar";
import { CreditManager } from "@/lib/credits";
import ProfileManager from "@/components/practitioner/ProfileManager";
import { useRealtimeSubscription } from "@/hooks/use-realtime";

export const TherapistDashboard = () => {
  const { user, userProfile, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    monthlyRevenue: 0,
    activeClients: 0,
    completedSessions: 0,
    averageRating: 0,
    responseTime: 0,
    profileViews: 0,
    conversionRate: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  // Real-time subscription for client sessions
  const { data: realtimeSessions, loading: sessionsLoading } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      // Refresh dashboard data when sessions change
      fetchDashboardData();
    }
  );

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Update stats when real-time data changes
  useEffect(() => {
    if (realtimeSessions && realtimeSessions.length > 0) {
      calculateStats(realtimeSessions);
    }
  }, [realtimeSessions]);

  const calculateStats = (sessions: any[]) => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const activeClients = new Set(sessions.map(s => s.client_id).filter(Boolean)).size;
    const monthlyRevenue = sessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.price || 0), 0);

    // Get upcoming sessions (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = sessions.filter(s => {
      const sessionDate = new Date(s.session_date);
      return sessionDate >= today && sessionDate <= nextWeek && s.status === 'scheduled';
    });

    setUpcomingSessions(upcoming.slice(0, 5));

    setStats(prev => ({
      ...prev,
      totalSessions,
      monthlyRevenue,
      activeClients,
      completedSessions
    }));
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch credit balance
      if (user?.id) {
        const balance = await CreditManager.getBalance(user.id);
        setCreditBalance(balance);
      }

      // Fetch therapist sessions
      const { data: sessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .eq('session_date', new Date().toISOString().split('T')[0]);

      // Fetch total sessions (client sessions only)
      const { data: totalSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id);

      // Fetch reviews for average rating
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('therapist_id', user?.id)
        .eq('review_status', 'published');
      
      setReviews(reviewsData || []);

      // Fetch therapist profile for views (using users table)
      const { data: profile } = await supabase
        .from('users')
        .select('profile_views, response_time_hours')
        .eq('id', user?.id)
        .single();

      // Fetch completed sessions
      const { data: completedSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .eq('status', 'completed');


      // Calculate monthly revenue from payments
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('therapist_id', user?.id)
        .eq('payment_status', 'completed')
        .gte('created_at', `${currentMonth}-01`)
        .lt('created_at', `${currentMonth}-32`);

      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      // Calculate active clients (unique clients with sessions in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: recentSessions } = await supabase
        .from('client_sessions')
        .select('client_id')
        .eq('therapist_id', user?.id)
        .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0]);
      
      const uniqueClients = new Set(recentSessions?.map(session => session.client_id) || []);
      const activeClients = uniqueClients.size;

      // Calculate average rating
      const averageRating = reviewsData && reviewsData.length > 0 
        ? reviewsData.reduce((sum, review) => sum + review.overall_rating, 0) / reviewsData.length 
        : 0;

      // Calculate conversion rate (sessions booked / profile views)
      const profileViews = profile?.profile_views || 0;
      const conversionRate = profileViews > 0 ? (totalSessions?.length || 0) / profileViews * 100 : 0;

      setStats({
        totalSessions: totalSessions?.length || 0,
        completedSessions: completedSessions?.length || 0,
        monthlyRevenue: monthlyRevenue / 100, // Convert from pence to pounds
        activeClients: activeClients,
        averageRating: Math.round(averageRating * 10) / 10,
        responseTime: profile?.response_time_hours || 0,
        profileViews,
        conversionRate: Math.round(conversionRate * 10) / 10
      });

      setUpcomingSessions(sessions || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Client Management", icon: Users, href: "/dashboard", color: "bg-primary/10 text-primary", description: "Manage your clients and their sessions" },
    { label: "Schedule", icon: Calendar, href: "/booking", color: "bg-accent/10 text-accent", description: "View and manage your calendar" },
    { label: "Treatment Notes", icon: BookOpen, href: "/dashboard", color: "bg-secondary/10 text-secondary", description: "Create and view session notes" },
    { label: "Analytics", icon: TrendingUp, href: "/analytics", color: "bg-muted/10 text-muted-foreground", description: "View your practice analytics" }
  ];

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Heart className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {userProfile?.first_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.user_role?.replace('_', ' ').toUpperCase()} Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">
                <CreditCard className="h-4 w-4 mr-1" />
                {stats.activeClients} Active Clients
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link to="/profile">View Profile</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-primary">£{stats.monthlyRevenue}</p>
                  <p className="text-xs text-green-600">This month</p>
                </div>
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                  <p className="text-3xl font-bold text-accent">{stats.activeClients}</p>
                  <p className="text-xs text-accent">Current month</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                  <p className="text-3xl font-bold text-secondary">{stats.totalSessions}</p>
                  <p className="text-xs text-secondary">All time</p>
                </div>
                <Calendar className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Sessions</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completedSessions}</p>
                  <p className="text-xs text-green-600">Successfully completed</p>
                </div>
                <Heart className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Credit Balance</p>
                  <p className="text-3xl font-bold text-primary">{creditBalance}</p>
                  <p className="text-xs text-primary">Coming Soon: Credit System</p>
                </div>
                <Coins className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.averageRating || 'N/A'}</p>
                  <p className="text-xs text-yellow-600">Based on {reviews?.length || 0} reviews</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.responseTime}h</p>
                  <p className="text-xs text-blue-600">Average response</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.profileViews}</p>
                  <p className="text-xs text-purple-600">This month</p>
                </div>
                <Eye className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold text-green-600">{stats.conversionRate}%</p>
                  <p className="text-xs text-green-600">Views to bookings</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Today's Schedule</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard">View Full Schedule</Link>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Your appointments for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{session.session_type || 'Client Session'}</p>
                            <p className="text-sm text-muted-foreground">
                              Client: {session.client_name}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{session.start_time}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>{session.duration_minutes} mins</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={session.status === 'confirmed' ? 'default' : 'secondary'}>
                            {session.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            £{session.price || '0'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No appointments scheduled for today</p>
                )}
              </CardContent>
            </Card>

            {/* Booking Calendar */}
            <BookingCalendar userType="therapist" />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Access your most used features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="h-auto p-4 flex items-center space-x-3 justify-start hover:shadow-md transition-shadow"
                      asChild
                    >
                      <Link to={action.href}>
                        <div className={`p-2 rounded-full ${action.color}`}>
                          <action.icon className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <span className="font-medium block">{action.label}</span>
                          <span className="text-xs text-muted-foreground">{action.description}</span>
                        </div>
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Practice Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Practice Management</span>
                  <Plus className="h-5 w-5 text-accent" />
                </CardTitle>
                <CardDescription>Manage your practice operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/booking">
                      <Calendar className="h-4 w-4 mr-2" />
                      Open Scheduler
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/dashboard">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Clients
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/payments">
                      <CreditCard className="h-4 w-4 mr-2" />
                      View Payments
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/profile">
                      <Settings className="h-4 w-4 mr-2" />
                      Update Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <ProfileManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analytics</CardTitle>
                <CardDescription>
                  Comprehensive performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-muted-foreground">Analytics Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Detailed analytics and reporting features will be available soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};