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
  Bone, 
  Activity, 
  Target, 
  Shield,
  BarChart3,
  Settings,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookingCalendar } from "@/components/BookingCalendar";
import { MarketplaceVisibility } from "@/components/dashboards/MarketplaceVisibility";
import { PracticeManagementHub } from "@/components/practice/PracticeManagementHub";

export const OsteopathDashboard = () => {
  const { user, userProfile, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    monthlyRevenue: 0,
    activePatients: 0,
    structuralAssessments: 0,
    treatmentSuccessRate: 0
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
      // Fetch osteopathy sessions
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
        activePatients: businessStats?.active_clients || 0,
        structuralAssessments: 0, // TODO: Implement assessment tracking
        treatmentSuccessRate: 0 // TODO: Implement treatment outcome tracking
      });

      setUpcomingSessions(sessions || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const osteopathyQuickActions = [
    { 
      label: "Client Management", 
      icon: Users, 
      href: "/dashboard", 
      color: "bg-primary/10 text-primary", 
      description: "Manage your clients and sessions" 
    },
    { 
      label: "Schedule", 
      icon: Calendar, 
      href: "/booking", 
      color: "bg-blue-100 text-blue-600", 
      description: "Manage your availability and bookings" 
    },
    { 
      label: "Profile", 
      icon: User, 
      href: "/profile", 
      color: "bg-green-100 text-green-600", 
      description: "Update your professional profile" 
    },
    { 
      label: "Messages", 
      icon: MessageSquare, 
      href: "/messages", 
      color: "bg-orange-100 text-orange-600", 
      description: "Communicate with clients" 
    }
  ];

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="container mx-auto px-6 py-8">
        {/* Osteopathy Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-primary">£{stats.monthlyRevenue}</p>
                  <p className="text-xs text-green-600">This month</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Patients</p>
                  <p className="text-3xl font-bold text-accent">{stats.activePatients}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Structural Assessments</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.structuralAssessments}</p>
                  <p className="text-xs text-orange-600">This month</p>
                </div>
                <Bone className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Treatment Success Rate</p>
                  <p className="text-3xl font-bold text-green-600">{stats.treatmentSuccessRate}%</p>
                  <p className="text-xs text-green-600">Positive outcomes</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
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
                  <span>Today's Osteopathy Sessions</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/practice/scheduler">View Full Schedule</Link>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Your osteopathy appointments for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 rounded-full bg-orange-100">
                            <Bone className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{session.session_type || 'Osteopathy Session'}</p>
                            <p className="text-sm text-muted-foreground">
                              Patient: {session.client_name}
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
                  <p className="text-center text-muted-foreground py-8">No osteopathy sessions scheduled for today</p>
                )}
              </CardContent>
            </Card>

            {/* Booking Calendar */}
            <PracticeManagementHub />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Marketplace Visibility */}
            <MarketplaceVisibility />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Access your most used features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {osteopathyQuickActions.map((action) => (
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

            {/* Osteopathy Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Treatment Metrics</span>
                  <BarChart3 className="h-5 w-5 text-accent" />
                </CardTitle>
                <CardDescription>Track your osteopathy treatment effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Treatment Success</span>
                      <span>{stats.treatmentSuccessRate}%</span>
                    </div>
                    <Progress value={stats.treatmentSuccessRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Structural Assessments</span>
                      <span>{stats.structuralAssessments}</span>
                    </div>
                    <Progress value={stats.structuralAssessments} className="h-2" />
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

            {/* Osteopathy Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Osteopathy Management</span>
                  <Plus className="h-5 w-5 text-accent" />
                </CardTitle>
                <CardDescription>Manage your osteopathy practice</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/booking">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Osteopathy Session
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/dashboard">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Patients
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/analytics">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Treatment Analytics
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
