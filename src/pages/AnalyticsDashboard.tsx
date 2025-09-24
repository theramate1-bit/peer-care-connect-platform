import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Star, 
  Clock,
  Target,
  Activity,
  Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsData {
  totalSessions: number;
  totalClients: number;
  totalRevenue: number;
  averageRating: number;
  sessionsThisMonth: number;
  revenueThisMonth: number;
  topClients: Array<{
    client_name: string;
    session_count: number;
    total_spent: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    sessions: number;
    revenue: number;
  }>;
  sessionTypes: Array<{
    session_type: string;
    count: number;
  }>;
}

const AnalyticsDashboard = () => {
  const { userProfile } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (userProfile) {
      loadAnalytics();
    }
  }, [userProfile, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const startDate = timeRange === '30d' 
        ? subDays(new Date(), 30).toISOString()
        : startOfMonth(new Date()).toISOString();
      
      const endDate = timeRange === '30d'
        ? new Date().toISOString()
        : endOfMonth(new Date()).toISOString();

      // Load sessions data
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          session_date,
          price,
          session_type,
          status,
          client_name,
          created_at
        `)
        .eq('therapist_id', userProfile?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (sessionsError) throw sessionsError;

      // Load ratings data
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('practitioner_ratings')
        .select('rating')
        .eq('therapist_id', userProfile?.id);

      if (ratingsError) throw ratingsError;

      // Calculate analytics
      const completedSessions = sessionsData?.filter(s => s.status === 'completed') || [];
      const totalSessions = completedSessions.length;
      const totalClients = new Set(completedSessions.map(s => s.client_name)).size;
      const totalRevenue = completedSessions.reduce((sum, s) => sum + s.price, 0);
      const averageRating = ratingsData?.length 
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length 
        : 0;

      // This month's data
      const thisMonthStart = startOfMonth(new Date()).toISOString();
      const thisMonthEnd = endOfMonth(new Date()).toISOString();
      const thisMonthSessions = completedSessions.filter(s => 
        s.session_date >= thisMonthStart && s.session_date <= thisMonthEnd
      );
      const sessionsThisMonth = thisMonthSessions.length;
      const revenueThisMonth = thisMonthSessions.reduce((sum, s) => sum + s.price, 0);

      // Top clients
      const clientStats = completedSessions.reduce((acc, session) => {
        const clientName = session.client_name;
        if (!acc[clientName]) {
          acc[clientName] = { session_count: 0, total_spent: 0 };
        }
        acc[clientName].session_count++;
        acc[clientName].total_spent += session.price;
        return acc;
      }, {} as Record<string, { session_count: number; total_spent: number }>);

      const topClients = Object.entries(clientStats)
        .map(([client_name, stats]) => ({ client_name, ...stats }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5);

      // Session types
      const sessionTypeStats = completedSessions.reduce((acc, session) => {
        const type = session.session_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sessionTypes = Object.entries(sessionTypeStats)
        .map(([session_type, count]) => ({ session_type, count }))
        .sort((a, b) => b.count - a.count);

      // Monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subDays(new Date(), i * 30));
        const monthEnd = endOfMonth(monthStart);
        const monthSessions = completedSessions.filter(s => 
          s.session_date >= monthStart.toISOString() && s.session_date <= monthEnd.toISOString()
        );
        monthlyTrends.push({
          month: format(monthStart, 'MMM yyyy'),
          sessions: monthSessions.length,
          revenue: monthSessions.reduce((sum, s) => sum + s.price, 0)
        });
      }

      setAnalyticsData({
        totalSessions,
        totalClients,
        totalRevenue,
        averageRating,
        sessionsThisMonth,
        revenueThisMonth,
        topClients,
        monthlyTrends,
        sessionTypes
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No analytics data</h3>
            <p className="text-muted-foreground">
              Complete some sessions to see your analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track your practice performance and insights</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.totalSessions}</div>
            <p className="text-muted-foreground">
              {analyticsData.sessionsThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.totalClients}</div>
            <p className="text-muted-foreground">Unique clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">£{analyticsData.totalRevenue.toFixed(2)}</div>
            <p className="text-muted-foreground">
              £{analyticsData.revenueThisMonth.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.averageRating.toFixed(1)}</div>
            <p className="text-muted-foreground">Out of 5 stars</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Clients
            </CardTitle>
            <CardDescription>Clients by total spending</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData.topClients.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No client data available</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.topClients.map((client, index) => (
                  <div key={client.client_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{client.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.session_count} sessions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">£{client.total_spent.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Session Types
            </CardTitle>
            <CardDescription>Most popular session types</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData.sessionTypes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No session data available</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.sessionTypes.map((type) => (
                  <div key={type.session_type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Heart className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{type.session_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{type.count} sessions</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Trends
          </CardTitle>
          <CardDescription>Session and revenue trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsData.monthlyTrends.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No trend data available</p>
          ) : (
            <div className="space-y-4">
              {analyticsData.monthlyTrends.map((trend) => (
                <div key={trend.month} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{trend.month}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Sessions</p>
                      <p className="font-medium">{trend.sessions}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="font-medium">£{trend.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
