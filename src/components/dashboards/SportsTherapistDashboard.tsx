import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Activity, 
  Target, 
  Award, 
  Zap,
  Heart,
  BarChart3,
  LogOut,
  Settings,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookingCalendar } from "@/components/BookingCalendar";

// Real data functions
const getRealRecoveryRate = async (practitionerId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('treatment_outcomes')
      .select('recovery_status')
      .eq('therapist_id', practitionerId)
      .eq('recovery_status', 'recovered');
    
    if (error) throw error;
    
    const totalTreatments = await supabase
      .from('treatment_outcomes')
      .select('id')
      .eq('therapist_id', practitionerId);
    
    if (totalTreatments.error) throw totalTreatments.error;
    
    const recoveryRate = totalTreatments.data.length > 0 
      ? Math.round((data.length / totalTreatments.data.length) * 100)
      : 0;
    
    return recoveryRate;
  } catch (error) {
    console.error('Error fetching recovery rate:', error);
    return 0;
  }
};

const getRealPerformanceMetrics = async (practitionerId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('performance_assessments')
      .select('improvement_score')
      .eq('therapist_id', practitionerId);
    
    if (error) throw error;
    
    const avgImprovement = data.length > 0
      ? Math.round(data.reduce((sum, item) => sum + item.improvement_score, 0) / data.length)
      : 0;
    
    return avgImprovement;
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return 0;
  }
};

export const SportsTherapistDashboard = () => {
  const { user, userProfile, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    monthlyRevenue: 0,
    activeAthletes: 0,
    injuryRecoveryRate: 0,
    performanceImprovements: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch sports therapy sessions
      const { data: sessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .eq('session_date', new Date().toISOString().split('T')[0]);

      // Fetch total sessions
      const { data: totalSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id);

      // Fetch completed sessions
      const { data: completedSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .eq('status', 'completed');

      // Fetch business stats
      const { data: businessStats } = await supabase
        .from('business_stats')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      setStats({
        totalSessions: totalSessions?.length || 0,
        completedSessions: completedSessions?.length || 0,
        monthlyRevenue: businessStats?.monthly_revenue || 0,
        activeAthletes: businessStats?.active_clients || 0,
        injuryRecoveryRate: await getRealRecoveryRate(practitionerId), // Real data from recovery tracking
        performanceImprovements: await getRealPerformanceMetrics(practitionerId) // Real data from performance metrics
      });

      setUpcomingSessions(sessions || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sportsQuickActions = [
    { 
      label: "Athlete Management", 
      icon: Users, 
      href: "/dashboard", 
      color: "bg-primary/10 text-primary", 
      description: "Manage athlete clients and their training programs" 
    },
    { 
      label: "Injury Assessment", 
      icon: Activity, 
      href: "/dashboard", 
      color: "bg-red-100 text-red-600", 
      description: "Conduct injury assessments and recovery plans" 
    },
    { 
      label: "Performance Tracking", 
      icon: Target, 
      href: "/analytics", 
      color: "bg-green-100 text-green-600", 
      description: "Track athlete performance improvements" 
    },
    { 
      label: "Training Programs", 
      icon: Award, 
      href: "/dashboard", 
      color: "bg-blue-100 text-blue-600", 
      description: "Create and manage training programs" 
    }
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
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {userProfile?.first_name}</h1>
                <p className="text-sm text-muted-foreground">
                  Sports Therapist Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Activity className="h-4 w-4 mr-1" />
                {stats.activeAthletes} Active Athletes
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

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Sports Therapy Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">£{stats.monthlyRevenue}</p>
                  <p className="text-xs text-green-600">This month</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Athletes</p>
                  <p className="text-2xl sm:text-3xl font-bold text-accent">{stats.activeAthletes}</p>
                  <p className="text-xs text-accent">Current month</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Injury Recovery Rate</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.injuryRecoveryRate}%</p>
                  <p className="text-xs text-green-600">Success rate</p>
                </div>
                <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Performance Improvements</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.performanceImprovements}%</p>
                  <p className="text-xs text-blue-600">Athlete gains</p>
                </div>
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Today's Training Sessions</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard">View Full Schedule</Link>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Your sports therapy appointments for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{session.session_type || 'Sports Therapy Session'}</p>
                            <p className="text-sm text-muted-foreground">
                              Athlete: {session.client_name}
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
                  <p className="text-center text-muted-foreground py-8">No training sessions scheduled for today</p>
                )}
              </CardContent>
            </Card>

            {/* Booking Calendar */}
            <BookingCalendar userType="sports_therapist" />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sports Therapy Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Sports Therapy Actions</CardTitle>
                <CardDescription>Access your most used sports therapy features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {sportsQuickActions.map((action) => (
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

            {/* Sports Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Performance Metrics</span>
                  <BarChart3 className="h-5 w-5 text-accent" />
                </CardTitle>
                <CardDescription>Track your sports therapy effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Injury Recovery</span>
                      <span>{stats.injuryRecoveryRate}%</span>
                    </div>
                    <Progress value={stats.injuryRecoveryRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Performance Gains</span>
                      <span>{stats.performanceImprovements}%</span>
                    </div>
                    <Progress value={stats.performanceImprovements} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Session Completion</span>
                      <span>{stats.totalSessions > 0 ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%</span>
                    </div>
                    <Progress value={stats.totalSessions > 0 ? (stats.completedSessions / stats.totalSessions) * 100 : 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sports Therapy Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sports Therapy Management</span>
                  <Plus className="h-5 w-5 text-accent" />
                </CardTitle>
                <CardDescription>Manage your sports therapy practice</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/booking">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Training Session
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/dashboard">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Athletes
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/analytics">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Performance Analytics
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
      </div>
    </div>
  );
};
