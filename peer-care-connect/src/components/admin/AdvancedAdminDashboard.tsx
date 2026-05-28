import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  DollarSign, 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { AdvancedIntegrationSystem } from '@/lib/advanced-integration';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  activePractitioners: number;
  totalSessions: number;
  totalRevenue: number;
  systemHealth: number;
  dataQualityScore: number;
}

const AdvancedAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activePractitioners: 0,
    totalSessions: 0,
    totalRevenue: 0,
    systemHealth: 0,
    dataQualityScore: 0
  });
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [dataQualityReport, setDataQualityReport] = useState<any>(null);
  const [operationsLog, setOperationsLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        analytics,
        financial,
        qualityReport,
        operations
      ] = await Promise.all([
        AdvancedIntegrationSystem.getAnalyticsData(),
        AdvancedIntegrationSystem.getFinancialData(),
        AdvancedIntegrationSystem.getDataQualityReport(),
        AdvancedIntegrationSystem.getDailyOperationsLog()
      ]);

      setAnalyticsData(analytics);
      setFinancialData(financial);
      setDataQualityReport(qualityReport);
      setOperationsLog(operations);

      // Calculate system health score
      const systemHealth = calculateSystemHealth(analytics, financial, qualityReport);
      
      setStats({
        totalUsers: 14, // From our data
        activePractitioners: 9,
        totalSessions: analytics.sessionsCompleted,
        totalRevenue: financial.totalRevenue,
        systemHealth,
        dataQualityScore: qualityReport.totalRules > 0 ? 
          ((qualityReport.totalRules - qualityReport.violationsFound) / qualityReport.totalRules) * 100 : 100
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateSystemHealth = (analytics: any, financial: any, quality: any): number => {
    let score = 100;
    
    // Deduct points for data quality issues
    if (quality.criticalIssues > 0) score -= quality.criticalIssues * 10;
    if (quality.warnings > 0) score -= quality.warnings * 5;
    
    // Deduct points for low payment success rate
    if (analytics.paymentSuccessRate < 90) score -= 10;
    
    // Deduct points for low practitioner utilization
    if (analytics.practitionerUtilization < 70) score -= 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleDataQualityCheck = async () => {
    try {
      const result = await AdvancedIntegrationSystem.runDataQualityCheck();
      if (result.success) {
        toast.success(`Data quality check completed. Found ${result.violations} violations.`);
        await loadDashboardData(); // Refresh data
      } else {
        toast.error('Data quality check failed');
      }
    } catch (error) {
      toast.error('Failed to run data quality check');
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading advanced dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Advanced Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive platform monitoring and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDataQualityCheck}
            disabled={refreshing}
          >
            <Shield className="h-4 w-4 mr-2" />
            Run Quality Check
          </Button>
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {stats.systemHealth < 80 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System health is below optimal levels. Please review the issues below and take appropriate action.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activePractitioners} active practitioners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Completed sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Platform revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemHealth}%</div>
            <div className="flex items-center gap-2 mt-2">
              {getHealthBadge(stats.systemHealth)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Session Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">{analyticsData?.sessionsCompleted || 0}</div>
                  <p className="text-sm text-muted-foreground">Completed Sessions</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{analyticsData?.practitionerUtilization || 0}%</div>
                  <p className="text-sm text-muted-foreground">Practitioner Utilization</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{analyticsData?.clientRetentionRate || 0}%</div>
                  <p className="text-sm text-muted-foreground">Client Retention Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">{analyticsData?.averageRating || 0}</div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{analyticsData?.paymentSuccessRate || 0}%</div>
                  <p className="text-sm text-muted-foreground">Payment Success Rate</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.dataQualityScore.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Data Quality Score</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Revenue Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">£{analyticsData?.revenueGenerated || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">£{financialData?.averageProjectValue || 0}</div>
                  <p className="text-sm text-muted-foreground">Average Project Value</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{financialData?.profitMargin || 0}%</div>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span className="font-bold">£{financialData?.totalRevenue || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses</span>
                  <span className="font-bold">£{financialData?.totalExpenses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Profit</span>
                  <span className="font-bold text-green-600">£{financialData?.netProfit || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outstanding Invoices</span>
                  <span className="font-bold text-red-600">£{financialData?.outstandingInvoices || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Collection Rate</span>
                    <span>{financialData?.paymentCollectionRate || 0}%</span>
                  </div>
                  <Progress value={financialData?.paymentCollectionRate || 0} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Profit Margin</span>
                    <span>{financialData?.profitMargin || 0}%</span>
                  </div>
                  <Progress value={financialData?.profitMargin || 0} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Data Quality Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Rules</span>
                  <span className="font-bold">{dataQualityReport?.totalRules || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Violations Found</span>
                  <span className="font-bold text-red-600">{dataQualityReport?.violationsFound || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical Issues</span>
                  <span className="font-bold text-red-600">{dataQualityReport?.criticalIssues || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Warnings</span>
                  <span className="font-bold text-yellow-600">{dataQualityReport?.warnings || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Check</span>
                  <span className="text-sm text-muted-foreground">
                    {dataQualityReport?.lastCheck ? 
                      new Date(dataQualityReport.lastCheck).toLocaleString() : 
                      'Never'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{stats.dataQualityScore.toFixed(1)}%</div>
                  <Progress value={stats.dataQualityScore} className="mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Overall data quality score
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {operationsLog.slice(0, 10).map((operation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {operation.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="font-medium capitalize">
                          {operation.operation_type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {operation.operation_data?.description}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {operation.executed_at ? 
                        new Date(operation.executed_at).toLocaleString() : 
                        'Unknown'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAdminDashboard;
