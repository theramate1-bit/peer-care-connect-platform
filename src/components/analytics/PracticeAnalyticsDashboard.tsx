import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Clock,
  Star,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Award,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface PracticeStats {
  totalSessions: number;
  totalClients: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  averageSessionDuration: number;
  monthlyRevenue: number;
  monthlySessions: number;
  clientRetentionRate: number;
  noShowRate: number;
}

interface SessionData {
  id: string;
  session_date: string;
  duration_minutes: number;
  price: number;
  status: string;
  client_id: string;
  created_at: string;
}

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface FeedbackData {
  id: string;
  rating: number;
  feedback: string;
  created_at: string;
}

export const PracticeAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PracticeStats>({
    totalSessions: 0,
    totalClients: 0,
    totalRevenue: 0,
    averageRating: 0,
    completionRate: 0,
    averageSessionDuration: 0,
    monthlyRevenue: 0,
    monthlySessions: 0,
    clientRetentionRate: 0,
    noShowRate: 0
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Real-time subscription for sessions
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setSessions(prev => [payload.new, ...prev]);
        calculateStats([payload.new, ...sessions], clients, feedback);
      } else if (payload.eventType === 'UPDATE') {
        setSessions(prev => 
          prev.map(session => 
            session.id === payload.new.id ? payload.new : session
          )
        );
        calculateStats(sessions.map(session => 
          session.id === payload.new.id ? payload.new : session
        ), clients, feedback);
      } else if (payload.eventType === 'DELETE') {
        setSessions(prev => 
          prev.filter(session => session.id !== payload.old.id)
        );
        calculateStats(sessions.filter(session => session.id !== payload.old.id), clients, feedback);
      }
    }
  );

  // Real-time subscription for feedback
  const { data: realtimeFeedback } = useRealtimeSubscription(
    'session_feedback',
    `session_id=in.(${sessions.map(s => s.id).join(',')})`,
    (payload) => {
      console.log('Real-time feedback update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setFeedback(prev => [payload.new, ...prev]);
        calculateStats(sessions, clients, [payload.new, ...feedback]);
      } else if (payload.eventType === 'UPDATE') {
        setFeedback(prev => 
          prev.map(f => 
            f.id === payload.new.id ? payload.new : f
          )
        );
        calculateStats(sessions, clients, feedback.map(f => 
          f.id === payload.new.id ? payload.new : f
        ));
      }
    }
  );

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id);

      if (sessionsError) throw sessionsError;

      // Fetch unique clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, created_at')
        .in('id', [...new Set(sessionsData?.map(s => s.client_id) || [])]);

      if (clientsError) throw clientsError;

      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('session_feedback')
        .select('*')
        .in('session_id', sessionsData?.map(s => s.id) || []);

      if (feedbackError) throw feedbackError;

      setSessions(sessionsData || []);
      setClients(clientsData || []);
      setFeedback(feedbackData || []);
      
      calculateStats(sessionsData || [], clientsData || [], feedbackData || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessionsData: SessionData[], clientsData: ClientData[], feedbackData: FeedbackData[]) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Basic stats
    const totalSessions = sessionsData.length;
    const totalClients = clientsData.length;
    const totalRevenue = sessionsData
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.price || 0), 0);
    
    // Monthly stats
    const monthlySessions = sessionsData.filter(s => 
      new Date(s.session_date) >= thisMonth
    ).length;
    const monthlyRevenue = sessionsData
      .filter(s => s.status === 'completed' && new Date(s.session_date) >= thisMonth)
      .reduce((sum, s) => sum + (s.price || 0), 0);
    
    // Completion rate
    const completedSessions = sessionsData.filter(s => s.status === 'completed').length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    
    // Average session duration
    const totalDuration = sessionsData.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    
    // Average rating
    const totalRating = feedbackData.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = feedbackData.length > 0 ? totalRating / feedbackData.length : 0;
    
    // No-show rate
    const noShowSessions = sessionsData.filter(s => s.status === 'cancelled').length;
    const noShowRate = totalSessions > 0 ? (noShowSessions / totalSessions) * 100 : 0;
    
    // Client retention (clients with multiple sessions)
    const clientSessionCounts = sessionsData.reduce((acc, session) => {
      acc[session.client_id] = (acc[session.client_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const returningClients = Object.values(clientSessionCounts).filter(count => count > 1).length;
    const clientRetentionRate = totalClients > 0 ? (returningClients / totalClients) * 100 : 0;

    setStats({
      totalSessions,
      totalClients,
      totalRevenue,
      averageRating,
      completionRate,
      averageSessionDuration,
      monthlyRevenue,
      monthlySessions,
      clientRetentionRate,
      noShowRate
    });
  };

  const getPerformanceColor = (value: number, type: 'positive' | 'negative' = 'positive') => {
    if (type === 'positive') {
      return value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
    } else {
      return value <= 20 ? 'text-green-600' : value <= 40 ? 'text-yellow-600' : 'text-red-600';
    }
  };

  const getPerformanceIcon = (value: number, type: 'positive' | 'negative' = 'positive') => {
    if (type === 'positive') {
      return value >= 80 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
    } else {
      return value <= 20 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
    }
  };

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
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.monthlySessions} this month
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  £{stats.monthlyRevenue.toFixed(2)} this month
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.clientRetentionRate.toFixed(1)}% retention
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
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {feedback.length} reviews
                </p>
              </div>
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.completionRate.toFixed(1)}%</div>
              <div className={`flex items-center gap-1 ${getPerformanceColor(stats.completionRate)}`}>
                {getPerformanceIcon(stats.completionRate)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${stats.completionRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.clientRetentionRate.toFixed(1)}%</div>
              <div className={`flex items-center gap-1 ${getPerformanceColor(stats.clientRetentionRate)}`}>
                {getPerformanceIcon(stats.clientRetentionRate)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${stats.clientRetentionRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              No-Show Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.noShowRate.toFixed(1)}%</div>
              <div className={`flex items-center gap-1 ${getPerformanceColor(stats.noShowRate, 'negative')}`}>
                {getPerformanceIcon(stats.noShowRate, 'negative')}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${stats.noShowRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Feedback ({feedback.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p>No feedback yet</p>
                    <p className="text-sm">Client feedback will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedback.slice(0, 5).map((item) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {item.feedback && (
                          <p className="text-sm text-muted-foreground">{item.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Duration Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.averageSessionDuration.toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">Average Minutes</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>30-45 min</span>
                      <span>{sessions.filter(s => s.duration_minutes >= 30 && s.duration_minutes <= 45).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>45-60 min</span>
                      <span>{sessions.filter(s => s.duration_minutes > 45 && s.duration_minutes <= 60).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>60+ min</span>
                      <span>{sessions.filter(s => s.duration_minutes > 60).length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Session Status Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Completed</span>
                      <span className="text-sm font-medium">
                        {sessions.filter(s => s.status === 'completed').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Scheduled</span>
                      <span className="text-sm font-medium">
                        {sessions.filter(s => s.status === 'scheduled').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cancelled</span>
                      <span className="text-sm font-medium">
                        {sessions.filter(s => s.status === 'cancelled').length}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Revenue Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">This Month</span>
                      <span className="text-sm font-medium">£{stats.monthlyRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Revenue</span>
                      <span className="text-sm font-medium">£{stats.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average per Session</span>
                      <span className="text-sm font-medium">
                        £{stats.totalSessions > 0 ? (stats.totalRevenue / stats.totalSessions).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Client Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Client Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">New Clients</span>
                      <span className="text-sm font-medium">
                        {clients.filter(c => {
                          const clientDate = new Date(c.created_at);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return clientDate >= thirtyDaysAgo;
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Returning Clients</span>
                      <span className="text-sm font-medium">
                        {clients.filter(c => {
                          const clientSessions = sessions.filter(s => s.client_id === c.id);
                          return clientSessions.length > 1;
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Clients</span>
                      <span className="text-sm font-medium">{stats.totalClients}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Client Engagement</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Sessions per Client</span>
                      <span className="text-sm font-medium">
                        {stats.totalClients > 0 ? (stats.totalSessions / stats.totalClients).toFixed(1) : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Retention Rate</span>
                      <span className="text-sm font-medium">{stats.clientRetentionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average Rating</span>
                      <span className="text-sm font-medium">{stats.averageRating.toFixed(1)}/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
