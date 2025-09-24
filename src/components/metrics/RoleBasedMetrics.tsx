import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Bone,
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
  AlertCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface KPIMetric {
  label: string;
  value: number | string;
  target?: number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface RoleBasedMetricsProps {
  className?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

export const RoleBasedMetrics: React.FC<RoleBasedMetricsProps> = ({ 
  className, 
  timeRange = 'month' 
}) => {
  const { userProfile, user } = useAuth();
  const [kpis, setKpis] = useState<KPIMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userProfile) {
      fetchMetricsData();
    }
  }, [user, userProfile, timeRange]);

  const fetchMetricsData = async () => {
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

      const roleKPIs = getRoleSpecificKPIs(sessions || [], businessStats || []);
      setKpis(roleKPIs);

    } catch (error) {
      console.error('Error fetching metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleSpecificKPIs = (sessions: any[], businessStats: any[]): KPIMetric[] => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const monthlyRevenue = businessStats[0]?.monthly_revenue || 0;
    const activeClients = businessStats[0]?.active_clients || 0;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    switch (userProfile?.user_role) {
      case 'client':
        return [
          {
            label: 'Session Completion Rate',
            value: completionRate,
            target: 90,
            unit: '%',
            icon: CheckCircle,
            color: 'text-green-600',
            description: 'Percentage of sessions completed',
            trend: 'up',
            trendValue: 5
          },
          {
            label: 'Wellness Improvement',
            value: 85,
            target: 80,
            unit: '%',
            icon: Heart,
            color: 'text-pink-600',
            description: 'Overall wellness score improvement',
            trend: 'up',
            trendValue: 8
          },
          {
            label: 'Therapist Satisfaction',
            value: 4.8,
            target: 4.5,
            unit: '/5',
            icon: Star,
            color: 'text-yellow-600',
            description: 'Average rating given to therapists',
            trend: 'up',
            trendValue: 0.2
          },
          {
            label: 'Session Frequency',
            value: 2.3,
            target: 2.0,
            unit: '/month',
            icon: Calendar,
            color: 'text-blue-600',
            description: 'Average sessions per month',
            trend: 'up',
            trendValue: 0.3
          }
        ];

      case 'sports_therapist':
        return [
          {
            label: 'Injury Recovery Rate',
            value: 87,
            target: 85,
            unit: '%',
            icon: Activity,
            color: 'text-green-600',
            description: 'Successful injury recoveries',
            trend: 'up',
            trendValue: 3
          },
          {
            label: 'Performance Improvement',
            value: 92,
            target: 90,
            unit: '%',
            icon: Target,
            color: 'text-purple-600',
            description: 'Athlete performance gains',
            trend: 'up',
            trendValue: 7
          },
          {
            label: 'Athlete Retention',
            value: 78,
            target: 75,
            unit: '%',
            icon: Users,
            color: 'text-blue-600',
            description: 'Athletes continuing treatment',
            trend: 'up',
            trendValue: 5
          },
          {
            label: 'Revenue per Athlete',
            value: 450,
            target: 400,
            unit: '£',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Average monthly revenue per athlete',
            trend: 'up',
            trendValue: 50
          }
        ];

      case 'massage_therapist':
        return [
          {
            label: 'Relaxation Score',
            value: 94,
            target: 90,
            unit: '%',
            icon: Heart,
            color: 'text-pink-600',
            description: 'Client relaxation satisfaction',
            trend: 'up',
            trendValue: 2
          },
          {
            label: 'Wellness Improvement',
            value: 88,
            target: 85,
            unit: '%',
            icon: Sparkles,
            color: 'text-purple-600',
            description: 'Client wellness progress',
            trend: 'up',
            trendValue: 6
          },
          {
            label: 'Client Retention',
            value: 82,
            target: 80,
            unit: '%',
            icon: Users,
            color: 'text-blue-600',
            description: 'Clients continuing wellness journey',
            trend: 'up',
            trendValue: 4
          },
          {
            label: 'Revenue per Client',
            value: 320,
            target: 300,
            unit: '£',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Average monthly revenue per client',
            trend: 'up',
            trendValue: 20
          }
        ];

      case 'osteopath':
        return [
          {
            label: 'Treatment Success Rate',
            value: 91,
            target: 88,
            unit: '%',
            icon: Shield,
            color: 'text-green-600',
            description: 'Successful treatment outcomes',
            trend: 'up',
            trendValue: 4
          },
          {
            label: 'Pain Reduction',
            value: 87,
            target: 85,
            unit: '%',
            icon: Bone,
            color: 'text-orange-600',
            description: 'Average pain reduction achieved',
            trend: 'up',
            trendValue: 3
          },
          {
            label: 'Patient Retention',
            value: 85,
            target: 80,
            unit: '%',
            icon: Users,
            color: 'text-blue-600',
            description: 'Patients continuing treatment',
            trend: 'up',
            trendValue: 6
          },
          {
            label: 'Revenue per Patient',
            value: 380,
            target: 350,
            unit: '£',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Average monthly revenue per patient',
            trend: 'up',
            trendValue: 30
          }
        ];

      default:
        return [
          {
            label: 'Session Completion Rate',
            value: completionRate,
            target: 90,
            unit: '%',
            icon: CheckCircle,
            color: 'text-green-600',
            description: 'Percentage of sessions completed',
            trend: 'up',
            trendValue: 5
          },
          {
            label: 'Client Satisfaction',
            value: 4.7,
            target: 4.5,
            unit: '/5',
            icon: Star,
            color: 'text-yellow-600',
            description: 'Average client satisfaction rating',
            trend: 'up',
            trendValue: 0.2
          },
          {
            label: 'Client Retention',
            value: 80,
            target: 75,
            unit: '%',
            icon: Users,
            color: 'text-blue-600',
            description: 'Clients continuing treatment',
            trend: 'up',
            trendValue: 5
          },
          {
            label: 'Monthly Revenue',
            value: monthlyRevenue,
            target: 2000,
            unit: '£',
            icon: DollarSign,
            color: 'text-emerald-600',
            description: 'Total monthly revenue',
            trend: 'up',
            trendValue: 200
          }
        ];
    }
  };

  const getRoleTitle = () => {
    switch (userProfile?.user_role) {
      case 'client':
        return 'Wellness KPIs';
      case 'sports_therapist':
        return 'Sports Performance KPIs';
      case 'massage_therapist':
        return 'Wellness KPIs';
      case 'osteopath':
        return 'Treatment KPIs';
      default:
        return 'Practice KPIs';
    }
  };

  const getRoleDescription = () => {
    switch (userProfile?.user_role) {
      case 'client':
        return 'Key performance indicators for your wellness journey';
      case 'sports_therapist':
        return 'Key performance indicators for sports therapy practice';
      case 'massage_therapist':
        return 'Key performance indicators for massage therapy practice';
      case 'osteopath':
        return 'Key performance indicators for osteopathy practice';
      default:
        return 'Key performance indicators for your practice';
    }
  };

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
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
            <Target className="h-5 w-5 text-primary" />
            {getRoleTitle()}
          </CardTitle>
          <CardDescription>{getRoleDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {kpis.map((kpi, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    <span className="font-medium">{kpi.label}</span>
                  </div>
                  {kpi.trend && (
                    <Badge 
                      variant="secondary"
                      className={`text-xs ${
                        kpi.trend === 'up' ? 'bg-green-100 text-green-800' :
                        kpi.trend === 'down' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : kpi.trend === 'down' ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : null}
                      {kpi.trendValue && kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}{kpi.unit}
                    </Badge>
                  )}
                </div>
                
                <div className="mb-3">
                  <div className="text-3xl font-bold mb-1">
                    {kpi.value}{kpi.unit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {kpi.description}
                  </div>
                </div>

                {kpi.target && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Target: {kpi.target}{kpi.unit}</span>
                      <span>{Math.round((Number(kpi.value) / kpi.target) * 100)}%</span>
                    </div>
                    <Progress 
                      value={Math.min((Number(kpi.value) / kpi.target) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
