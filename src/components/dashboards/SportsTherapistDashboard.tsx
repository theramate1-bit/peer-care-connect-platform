import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Users, 
  Activity, 
  Award, 
  Zap,
  Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookingCalendar } from "@/components/BookingCalendar";
import { MarketplaceVisibility } from "@/components/dashboards/MarketplaceVisibility";
import { RealTimeSessionDashboard } from "@/components/session/RealTimeSessionDashboard";


export const SportsTherapistDashboard = () => {
  const { user, userProfile, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0
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
        completedSessions: completedSessions?.length || 0
      });

      setUpcomingSessions(sessions || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Today's Training Sessions</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/practice/scheduler">View Full Schedule</Link>
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

            {/* Real-time Session Management */}
            <RealTimeSessionDashboard />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Marketplace Visibility */}
            <MarketplaceVisibility />
          </div>
        </div>
      </div>
    </div>
  );
};
