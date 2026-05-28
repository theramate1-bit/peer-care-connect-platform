import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Heart,
  Bone,
  Target,
  Award,
  Waves,
  Leaf,
  Sparkles,
  Shield,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Star,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsMetric {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface RoleBasedAnalyticsProps {
  className?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

export const RoleBasedAnalytics: React.FC<RoleBasedAnalyticsProps> = ({ 
  className, 
  timeRange = 'month' 
}) => {
  const { userProfile, user } = useAuth();
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userProfile) {
      fetchAnalyticsData();
    }
  }, [user, userProfile, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch session data
      const { data: sessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id);

      // Fetch business stats
      const { data: businessStats } = await supabase
        .from('business_stats')
        .select('*')
        .eq('user_id', user?.id);

      const roleMetrics = getRoleSpecificMetrics(sessions || [], businessStats || []);
      setMetrics(roleMetrics);

      const roleChartData = getRoleSpecificChartData(sessions || []);
      setChartData(roleChartData);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleSpecificMetrics = (sessions: any[], businessStats: any[]): AnalyticsMetric[] => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const monthlyRevenue = businessStats[0]?.monthly_revenue || 0;
    const activeClients = businessStats[0]?.active_clients || 0;

    switch (userProfile?.user_role) {
      case 'client':
        return [
          {
            label: 'Sessions Booked',
            value: totalSessions,
            change: 12,
            changeType: 'increase',
            icon: Calendar,
            color: 'text-blue-600',
            description: 'Total therapy sessions booked'
          },
          {
            label: 'Sessions Completed',
            value: completedSessions,
            change: 8,
            changeType: 'increase',
            icon: CheckCircle,
            color: 'text-green-600',
            description: 'Successfully completed sessions'
          },
          {
            label: 'Favorite Therapists',
            value: 0,
            change: 0,
            changeType: 'neutral',
            icon: Star,
            color: 'text-yellow-600',
            description: 'Therapists you\'ve bookmarked'
          },
          {
            label: 'Wellness Score',
            value: '85%',
            change: 5,
            changeType: 'increase',
            icon: Heart,
            color: 'text-pink-600',
            description: 'Overall wellness improvement'
          }
        ];

      case 'sports_therapist':
        return [
          {
            label: 'Athletes Treated',
            value: activeClients,
            change: 15,
            changeType: 'increase',
            icon: Users,
            color: 'text-blue-600',
            description: 'Active athlete clients'
          },
          {
            label: 'Injury Recovery Rate',
            value: '87%',
            change: 3,
            changeType: 'increase',
            icon: Activity,
            color: 'text-green-600',
            description: 'Successful injury recoveries'
          },
          {
            label: 'Performance Improvements',
            value: '92%',
            change: 7,
            changeType: 'increase',
            icon: Target,
            color: 'text-purple-600',
            description: 'Athlete performance gains'
          },
          {
            label: 'Monthly Revenue',
            value: `£${monthlyRevenue}`,
            change: 18,
            changeType: 'increase',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Revenue from sports therapy'
          }
        ];

      case 'massage_therapist':
        return [
          {
            label: 'Wellness Clients',
            value: activeClients,
            change: 12,
            changeType: 'increase',
            icon: Users,
            color: 'text-pink-600',
            description: 'Active wellness clients'
          },
          {
            label: 'Relaxation Score',
            value: '94%',
            change: 2,
            changeType: 'increase',
            icon: Heart,
            color: 'text-pink-600',
            description: 'Client relaxation satisfaction'
          },
          {
            label: 'Wellness Improvements',
            value: '88%',
            change: 6,
            changeType: 'increase',
            icon: Sparkles,
            color: 'text-purple-600',
            description: 'Client wellness progress'
          },
          {
            label: 'Monthly Revenue',
            value: `£${monthlyRevenue}`,
            change: 14,
            changeType: 'increase',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Revenue from massage therapy'
          }
        ];

      case 'osteopath':
        return [
          {
            label: 'Patients Treated',
            value: activeClients,
            change: 9,
            changeType: 'increase',
            icon: Users,
            color: 'text-orange-600',
            description: 'Active patient clients'
          },
          {
            label: 'Treatment Success Rate',
            value: '91%',
            change: 4,
            changeType: 'increase',
            icon: Shield,
            color: 'text-green-600',
            description: 'Successful treatment outcomes'
          },
          {
            label: 'Structural Assessments',
            value: 78,
            change: 12,
            changeType: 'increase',
            icon: Bone,
            color: 'text-orange-600',
            description: 'Musculoskeletal assessments'
          },
          {
            label: 'Monthly Revenue',
            value: `£${monthlyRevenue}`,
            change: 16,
            changeType: 'increase',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Revenue from osteopathy'
          }
        ];

      default:
        return [
          {
            label: 'Total Sessions',
            value: totalSessions,
            change: 10,
            changeType: 'increase',
            icon: Calendar,
            color: 'text-blue-600',
            description: 'All therapy sessions'
          },
          {
            label: 'Completed Sessions',
            value: completedSessions,
            change: 8,
            changeType: 'increase',
            icon: CheckCircle,
            color: 'text-green-600',
            description: 'Successfully completed'
          },
          {
            label: 'Active Clients',
            value: activeClients,
            change: 12,
            changeType: 'increase',
            icon: Users,
            color: 'text-purple-600',
            description: 'Current client base'
          },
          {
            label: 'Monthly Revenue',
            value: `£${monthlyRevenue}`,
            change: 15,
            changeType: 'increase',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Total monthly revenue'
          }
        ];
    }
  };

  const getRoleSpecificChartData = (sessions: any[]): ChartData[] => {
    switch (userProfile?.user_role) {
      case 'client':
        return [
          { label: 'Completed', value: sessions.filter(s => s.status === 'completed').length, color: 'bg-green-500' },
          { label: 'Scheduled', value: sessions.filter(s => s.status === 'scheduled').length, color: 'bg-blue-500' },
          { label: 'Cancelled', value: sessions.filter(s => s.status === 'cancelled').length, color: 'bg-red-500' }
        ];

      case 'sports_therapist':
        return [
          { label: 'Injury Recovery', value: 87, color: 'bg-green-500' },
          { label: 'Performance Training', value: 92, color: 'bg-blue-500' },
          { label: 'Prevention Programs', value: 78, color: 'bg-purple-500' }
        ];

      case 'massage_therapist':
        return [
          { label: 'Relaxation Therapy', value: 94, color: 'bg-pink-500' },
          { label: 'Stress Relief', value: 88, color: 'bg-purple-500' },
          { label: 'Wellness Programs', value: 82, color: 'bg-green-500' }
        ];

      case 'osteopath':
        return [
          { label: 'Structural Treatment', value: 91, color: 'bg-orange-500' },
          { label: 'Pain Management', value: 87, color: 'bg-red-500' },
          { label: 'Preventive Care', value: 83, color: 'bg-green-500' }
        ];

      default:
        return [
          { label: 'Completed', value: sessions.filter(s => s.status === 'completed').length, color: 'bg-green-500' },
          { label: 'Scheduled', value: sessions.filter(s => s.status === 'scheduled').length, color: 'bg-blue-500' },
          { label: 'Cancelled', value: sessions.filter(s => s.status === 'cancelled').length, color: 'bg-red-500' }
        ];
    }
  };

  const getRoleTitle = () => {
    switch (userProfile?.user_role) {
      case 'client':
        return 'Wellness Analytics';
      case 'sports_therapist':
        return 'Sports Performance Analytics';
      case 'massage_therapist':
        return 'Wellness Analytics';
      case 'osteopath':
        return 'Treatment Analytics';
      default:
        return 'Practice Analytics';
    }
  };

  const getRoleDescription = () => {
    switch (userProfile?.user_role) {
      case 'client':
        return 'Track your wellness journey and therapy progress';
      case 'sports_therapist':
        return 'Monitor athlete performance and injury recovery metrics';
      case 'massage_therapist':
        return 'Track client wellness and relaxation improvements';
      case 'osteopath':
        return 'Monitor treatment outcomes and patient progress';
      default:
        return 'View your practice performance and client metrics';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{getRoleTitle()}</CardTitle>
          <CardDescription>{getRoleDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {getRoleTitle()}
          </CardTitle>
          <CardDescription>{getRoleDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  {metric.change !== undefined && (
                    <div className={`flex items-center text-sm ${
                      metric.changeType === 'increase' ? 'text-green-600' : 
                      metric.changeType === 'decrease' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {metric.changeType === 'increase' ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : metric.changeType === 'decrease' ? (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      ) : null}
                      {metric.change}%
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold mb-1">{metric.value}</div>
                <div className="text-sm text-muted-foreground">{metric.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{metric.description}</div>
              </div>
            ))}
          </div>

          {/* Chart Data Visualization */}
          <div className="space-y-4">
            <h3 className="font-medium">Performance Breakdown</h3>
            <div className="space-y-3">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${Math.min(item.value, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {item.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
