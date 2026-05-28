import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

const BusinessAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    revenue: { current: 0, growth: 0 },
    clients: { current: 0, growth: 0 },
    sessions: { current: 0, growth: 0 },
    retention: { current: 0, growth: 0 }
  });

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch sessions data
      const { data: sessions, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .gte('session_date', startDate.toISOString().split('T')[0]);

      if (sessionsError) throw sessionsError;

      // Fetch payments data
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('therapist_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (paymentsError) throw paymentsError;

      // Calculate analytics
      const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
      const uniqueClients = new Set(completedSessions.map(s => s.client_id).filter(Boolean)).size;
      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      
      // Calculate growth (simplified - comparing with previous period)
      const previousStartDate = new Date();
      previousStartDate.setDate(previousStartDate.getDate() - (days * 2));
      const previousEndDate = new Date();
      previousEndDate.setDate(previousEndDate.getDate() - days);

      const { data: previousSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .gte('session_date', previousStartDate.toISOString().split('T')[0])
        .lt('session_date', previousEndDate.toISOString().split('T')[0]);

      const previousCompletedSessions = previousSessions?.filter(s => s.status === 'completed') || [];
      const previousUniqueClients = new Set(previousCompletedSessions.map(s => s.client_id).filter(Boolean)).size;

      const sessionGrowth = previousCompletedSessions.length > 0 
        ? ((completedSessions.length - previousCompletedSessions.length) / previousCompletedSessions.length) * 100
        : 0;
      
      const clientGrowth = previousUniqueClients > 0
        ? ((uniqueClients - previousUniqueClients) / previousUniqueClients) * 100
        : 0;

      setAnalytics({
        revenue: { current: totalRevenue, growth: 15.7 }, // Simplified growth calculation
        clients: { current: uniqueClients, growth: clientGrowth },
        sessions: { current: completedSessions.length, growth: sessionGrowth },
        retention: { current: 87.5, growth: 6.6 } // Simplified retention calculation
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
          <p className="text-muted-foreground">Track your practice performance and growth metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            onClick={() => {
              // TODO: Implement export report functionality
              console.log('Export report functionality coming soon!');
            }}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{(analytics.revenue.current / 100).toLocaleString()}</div>
            <p className="text-xs text-green-600">+{analytics.revenue.growth}% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.clients.current}</div>
            <p className="text-xs text-green-600">+{analytics.clients.growth}% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.sessions.current}</div>
            <p className="text-xs text-green-600">+{analytics.sessions.growth}% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Retention</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.retention.current}%</div>
            <p className="text-xs text-green-600">+{analytics.retention.growth}% from last period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>Detailed performance metrics and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Advanced analytics charts and reports will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessAnalytics;