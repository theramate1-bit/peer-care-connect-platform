import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  UserPlus, 
  UserMinus, 
  Calendar,
  Clock,
  Target,
  Award,
  Heart,
  MessageCircle,
  CreditCard,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Star,
  Crown,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface RetentionMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  churnedUsers: number;
  retentionRate: number;
  churnRate: number;
  averageSessionDuration: number;
  sessionsPerUser: number;
  revenuePerUser: number;
  lifetimeValue: number;
}

interface CohortData {
  cohort: string;
  size: number;
  week1: number;
  week2: number;
  week4: number;
  week8: number;
  week12: number;
  week24: number;
}

interface UserSegment {
  id: string;
  name: string;
  size: number;
  retentionRate: number;
  revenue: number;
  characteristics: string[];
  color: string;
}

interface RetentionDashboardProps {
  className?: string;
}

export const RetentionDashboard: React.FC<RetentionDashboardProps> = ({
  className = ''
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<string>('retention');
  const [metrics, setMetrics] = useState<RetentionMetrics>({
    totalUsers: 12543,
    newUsers: 1247,
    activeUsers: 8934,
    churnedUsers: 234,
    retentionRate: 78.5,
    churnRate: 2.1,
    averageSessionDuration: 45.2,
    sessionsPerUser: 3.4,
    revenuePerUser: 89.50,
    lifetimeValue: 234.75
  });

  const [cohortData, setCohortData] = useState<CohortData[]>([
    { cohort: 'Jan 2024', size: 1200, week1: 85, week2: 78, week4: 72, week8: 68, week12: 65, week24: 62 },
    { cohort: 'Feb 2024', size: 1350, week1: 88, week2: 81, week4: 75, week8: 71, week12: 68, week24: 64 },
    { cohort: 'Mar 2024', size: 1420, week1: 90, week2: 83, week4: 77, week8: 73, week12: 70, week24: 66 },
    { cohort: 'Apr 2024', size: 1580, week1: 92, week2: 85, week4: 79, week8: 75, week12: 72, week24: 68 },
    { cohort: 'May 2024', size: 1650, week1: 94, week2: 87, week4: 81, week8: 77, week12: 74, week24: 70 }
  ]);

  const [userSegments, setUserSegments] = useState<UserSegment[]>([
    {
      id: 'high-value',
      name: 'High Value Users',
      size: 2340,
      retentionRate: 92.5,
      revenue: 456.80,
      characteristics: ['Premium subscribers', 'Frequent users', 'High engagement'],
      color: 'bg-green-500'
    },
    {
      id: 'regular',
      name: 'Regular Users',
      size: 5670,
      retentionRate: 78.2,
      revenue: 156.40,
      characteristics: ['Monthly subscribers', 'Moderate usage', 'Stable engagement'],
      color: 'bg-blue-500'
    },
    {
      id: 'casual',
      name: 'Casual Users',
      size: 3450,
      retentionRate: 45.8,
      revenue: 67.20,
      characteristics: ['Occasional users', 'Low engagement', 'At risk of churn'],
      color: 'bg-yellow-500'
    },
    {
      id: 'new',
      name: 'New Users',
      size: 1083,
      retentionRate: 65.3,
      revenue: 23.50,
      characteristics: ['Recently joined', 'Learning platform', 'High potential'],
      color: 'bg-purple-500'
    }
  ]);

  const getTrendIcon = (value: number, previousValue: number) => {
    if (value > previousValue) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < previousValue) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number, previousValue: number) => {
    if (value > previousValue) return 'text-green-600';
    if (value < previousValue) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Retention & Growth Analytics</h1>
          <p className="text-gray-600">Monitor user retention, engagement, and growth metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.totalUsers)}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(metrics.totalUsers, 12000)}
                  <span className="text-sm text-green-600">+12.5%</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                <p className="text-2xl font-bold">{metrics.retentionRate}%</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(metrics.retentionRate, 75.2)}
                  <span className="text-sm text-green-600">+3.3%</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold">{metrics.churnRate}%</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(2.8, metrics.churnRate)}
                  <span className="text-sm text-green-600">-0.7%</span>
                </div>
              </div>
              <UserMinus className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lifetime Value</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.lifetimeValue)}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(metrics.lifetimeValue, 210.50)}
                  <span className="text-sm text-green-600">+24.25</span>
                </div>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Engagement Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Users</span>
                <span className="font-semibold">{formatNumber(metrics.activeUsers)}</span>
              </div>
              <Progress value={(metrics.activeUsers / metrics.totalUsers) * 100} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Session Duration</span>
                <span className="font-semibold">{metrics.averageSessionDuration} min</span>
              </div>
              <Progress value={(metrics.averageSessionDuration / 60) * 100} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Sessions per User</span>
                <span className="font-semibold">{metrics.sessionsPerUser}</span>
              </div>
              <Progress value={(metrics.sessionsPerUser / 5) * 100} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Revenue per User</span>
                <span className="font-semibold">{formatCurrency(metrics.revenuePerUser)}</span>
              </div>
              <Progress value={(metrics.revenuePerUser / 100) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>User Segments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userSegments.map((segment) => (
                <div key={segment.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${segment.color}`}></div>
                      <span className="font-medium">{segment.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatNumber(segment.size)} users</div>
                      <div className="text-sm text-gray-600">{segment.retentionRate}% retention</div>
                    </div>
                  </div>
                  <Progress value={segment.retentionRate} className="h-2" />
                  <div className="text-xs text-gray-600">
                    {segment.characteristics.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Cohort Retention Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Cohort</th>
                  <th className="text-right py-2">Size</th>
                  <th className="text-right py-2">Week 1</th>
                  <th className="text-right py-2">Week 2</th>
                  <th className="text-right py-2">Week 4</th>
                  <th className="text-right py-2">Week 8</th>
                  <th className="text-right py-2">Week 12</th>
                  <th className="text-right py-2">Week 24</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort) => (
                  <tr key={cohort.cohort} className="border-b">
                    <td className="py-2 font-medium">{cohort.cohort}</td>
                    <td className="text-right py-2">{formatNumber(cohort.size)}</td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cohort.week1 >= 80 ? 'bg-green-100 text-green-800' :
                        cohort.week1 >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cohort.week1}%
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cohort.week2 >= 70 ? 'bg-green-100 text-green-800' :
                        cohort.week2 >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cohort.week2}%
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cohort.week4 >= 60 ? 'bg-green-100 text-green-800' :
                        cohort.week4 >= 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cohort.week4}%
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cohort.week8 >= 50 ? 'bg-green-100 text-green-800' :
                        cohort.week8 >= 30 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cohort.week8}%
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cohort.week12 >= 40 ? 'bg-green-100 text-green-800' :
                        cohort.week12 >= 20 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cohort.week12}%
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        cohort.week24 >= 30 ? 'bg-green-100 text-green-800' :
                        cohort.week24 >= 15 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cohort.week24}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Growth Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Growth Insights & Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Strengths</span>
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <ArrowUp className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Retention rate increased by 3.3% this month</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowUp className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>High-value users show 92.5% retention rate</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowUp className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Average session duration increased to 45.2 minutes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowUp className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Lifetime value grew by 24.25 this quarter</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-yellow-600 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>Areas for Improvement</span>
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <ArrowDown className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Casual users retention rate is only 45.8%</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowDown className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>New user onboarding could be improved</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowDown className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Week 4 retention drops to 72% average</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowDown className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Consider implementing re-engagement campaigns</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetentionDashboard;
