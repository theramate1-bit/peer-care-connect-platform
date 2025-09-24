import React, { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  FileText, 
  Bell, 
  TrendingUp, 
  Download,
  RefreshCw,
  Settings,
  Eye,
  Calendar,
  Target,
  DollarSign,
  Users
} from 'lucide-react';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import CustomReports from '@/components/analytics/CustomReports';
import AnalyticsAlerts from '@/components/analytics/AnalyticsAlerts';

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const quickStats = [
    {
      title: "Active Projects",
      value: "12",
      change: "+2",
      trend: "up",
      icon: Target,
      color: "text-blue-600"
    },
    {
      title: "Monthly Revenue",
      value: "£8,450",
      change: "+12%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Client Satisfaction",
      value: "4.8/5",
      change: "+0.2",
      trend: "up",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Response Time",
      value: "2.3h",
      change: "-0.5h",
      trend: "down",
      icon: Calendar,
      color: "text-orange-600"
    }
  ];

  const recentActivities = [
    {
      type: "project_completed",
      title: "Project 'Back Pain Treatment' completed",
      time: "2 hours ago",
      status: "success"
    },
    {
      type: "review_received",
      title: "New 5-star review received",
      time: "4 hours ago",
      status: "success"
    },
    {
      type: "alert_triggered",
      title: "Revenue alert: Above £8K threshold",
      time: "6 hours ago",
      status: "warning"
    },
    {
      type: "report_generated",
      title: "Weekly performance report generated",
      time: "1 day ago",
      status: "info"
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_completed':
        return <Target className="h-4 w-4" />;
      case 'review_received':
        return <Users className="h-4 w-4" />;
      case 'alert_triggered':
        return <Bell className="h-4 w-4" />;
      case 'report_generated':
        return <FileText className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Analytics & Insights"
        description="Data-driven insights to optimize your therapy practice and client outcomes"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analytics" }
        ]}
        backTo="/dashboard"
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className={`text-xs flex items-center gap-1 ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Analytics Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Custom Reports
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <CustomReports />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AnalyticsAlerts />
          </TabsContent>
        </Tabs>

        {/* Recent Activity Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Main content area - can be used for additional analytics widgets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
                <CardDescription>
                  Key insights and recommendations based on your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">📈 Growth Opportunity</h4>
                    <p className="text-blue-800 text-sm">
                      Your client satisfaction score has increased by 15% this month. 
                      Consider highlighting this in your marketing materials.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">🎯 Efficiency Improvement</h4>
                    <p className="text-green-800 text-sm">
                      Average response time has decreased to 2.3 hours. 
                      This is below the industry average of 4 hours.
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Attention Needed</h4>
                    <p className="text-yellow-800 text-sm">
                      Project completion rate is at 78%. Consider reviewing 
                      your project management processes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest updates and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="mt-1 p-1 rounded-full bg-muted">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Activity
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common analytics tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
