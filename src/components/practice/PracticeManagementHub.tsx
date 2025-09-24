import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Activity,
  CheckCircle,
  AlertCircle,
  Star,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Bell,
  UserPlus,
  CalendarPlus,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { RealTimeSessionDashboard } from '@/components/session/RealTimeSessionDashboard';
import { PracticeAnalyticsDashboard } from '@/components/analytics/PracticeAnalyticsDashboard';
import { ClientProgressTracker } from '@/components/session/ClientProgressTracker';

interface PracticeStats {
  totalClients: number;
  activeClients: number;
  totalSessions: number;
  todaySessions: number;
  monthlyRevenue: number;
  averageRating: number;
  upcomingAppointments: number;
  pendingTasks: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

export const PracticeManagementHub: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<PracticeStats>({
    totalClients: 0,
    activeClients: 0,
    totalSessions: 0,
    todaySessions: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    upcomingAppointments: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClient, setSelectedClient] = useState(null);

  // Real-time subscription for sessions
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      fetchPracticeStats();
    }
  );

  // Real-time subscription for clients
  const { data: realtimeClients } = useRealtimeSubscription(
    'users',
    `user_role=eq.client`,
    (payload) => {
      console.log('Real-time client update:', payload);
      fetchPracticeStats();
    }
  );

  useEffect(() => {
    if (user) {
      fetchPracticeStats();
    }
  }, [user]);

  const fetchPracticeStats = async () => {
    try {
      setLoading(true);
      
      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id);

      if (sessionsError) throw sessionsError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('id, created_at')
        .eq('user_role', 'client');

      if (clientsError) throw clientsError;

      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('session_feedback')
        .select('rating')
        .in('session_id', sessionsData?.map(s => s.id) || []);

      if (feedbackError) throw feedbackError;

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date();
      thisMonth.setDate(1);

      const totalSessions = sessionsData?.length || 0;
      const todaySessions = sessionsData?.filter(s => s.session_date === today).length || 0;
      const monthlyRevenue = sessionsData
        ?.filter(s => s.status === 'completed' && new Date(s.session_date) >= thisMonth)
        .reduce((sum, s) => sum + (s.price || 0), 0) || 0;
      
      const averageRating = feedbackData?.length > 0 
        ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length 
        : 0;

      const upcomingAppointments = sessionsData?.filter(s => 
        s.session_date >= today && s.status === 'scheduled'
      ).length || 0;

      setStats({
        totalClients: clientsData?.length || 0,
        activeClients: sessionsData?.filter(s => s.status === 'completed').length || 0,
        totalSessions,
        todaySessions,
        monthlyRevenue,
        averageRating,
        upcomingAppointments,
        pendingTasks: sessionsData?.filter(s => s.status === 'scheduled').length || 0
      });
    } catch (error) {
      console.error('Error fetching practice stats:', error);
      toast.error('Failed to load practice statistics');
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'new-client',
      title: 'Add New Client',
      description: 'Register a new client',
      icon: <UserPlus className="h-5 w-5" />,
      action: () => toast.info('Add client feature coming soon'),
      color: 'bg-blue-500'
    },
    {
      id: 'schedule-session',
      title: 'Schedule Session',
      description: 'Book a new appointment',
      icon: <CalendarPlus className="h-5 w-5" />,
      action: () => toast.info('Schedule session feature coming soon'),
      color: 'bg-green-500'
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Check practice performance',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => setActiveTab('analytics'),
      color: 'bg-purple-500'
    },
    {
      id: 'manage-clients',
      title: 'Manage Clients',
      description: 'View and manage client data',
      icon: <Users className="h-5 w-5" />,
      action: () => setActiveTab('clients'),
      color: 'bg-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Practice Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeClients} active
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Sessions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.todaySessions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.upcomingAppointments} upcoming
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-600">£{stats.monthlyRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalSessions} total sessions
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Client satisfaction
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                onClick={action.action}
              >
                <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center text-white`}>
                  {action.icon}
                </div>
                <div className="text-center">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">{stats.todaySessions} sessions today</p>
                  <p className="text-sm">View detailed schedule in Sessions tab</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Session completed</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New message received</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Appointment scheduled</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <RealTimeSessionDashboard />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <PracticeAnalyticsDashboard />
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          {selectedClient ? (
            <ClientProgressTracker
              clientId={selectedClient.id}
              clientName={selectedClient.name}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Client Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Client Management</p>
                  <p className="text-sm">Select a client to view their progress and manage their care</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
