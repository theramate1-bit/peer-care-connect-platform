import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Loader2, Target, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProgressMetric {
  id: string;
  client_id: string;
  practitioner_id: string;
  session_id: string | null;
  metric_type: 'pain_level' | 'mobility' | 'strength' | 'flexibility' | 'function' | 'custom';
  metric_name: string;
  value: number;
  max_value: number;
  unit: string;
  notes: string;
  session_date: string;
  created_at: string;
  updated_at: string;
}

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: string;
  linked_metric_name?: string | null;
}

interface ClientProgressChartProps {
  clientId: string;
  sessionId?: string;
  readOnly?: boolean;
  goals?: Goal[];
}

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  [metricName: string]: string | number;
}

// Color palette for different metrics
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export const ClientProgressChart: React.FC<ClientProgressChartProps> = ({
  clientId,
  sessionId,
  readOnly = true,
  goals = []
}) => {
  const [metrics, setMetrics] = useState<ProgressMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [metricNames, setMetricNames] = useState<string[]>([]);
  const [showGoalOverlays, setShowGoalOverlays] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [clientId, sessionId]);

  const fetchMetrics = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build query
      let query = supabase
        .from('progress_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('session_date', { ascending: true });

      // If sessionId is provided, we need to get the session date first
      // and then show metrics from that session and all previous sessions
      if (sessionId) {
        // First, get the session date
        const { data: sessionData } = await supabase
          .from('client_sessions')
          .select('session_date')
          .eq('id', sessionId)
          .single();

        if (sessionData?.session_date) {
          // Get metrics from this session and all previous sessions
          query = query.lte('session_date', sessionData.session_date);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching progress metrics:', error);
        toast.error('Failed to load progress data');
        setLoading(false);
        return;
      }

      setMetrics(data || []);

      // Transform data for chart
      if (data && data.length > 0) {
        transformDataForChart(data);
      } else {
        setChartData([]);
        setMetricNames([]);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const transformDataForChart = (metricsData: ProgressMetric[]) => {
    // Get all unique metric names
    const uniqueMetricNames = Array.from(
      new Set(metricsData.map(m => m.metric_name))
    );
    setMetricNames(uniqueMetricNames);

    // Get all unique dates
    const uniqueDates = Array.from(
      new Set(metricsData.map(m => m.session_date))
    ).sort();

    // Create chart data points
    const dataPoints: ChartDataPoint[] = uniqueDates.map(date => {
      const point: ChartDataPoint = {
        date,
        dateFormatted: format(new Date(date), 'MMM dd')
      };

      // For each metric, find the value for this date
      uniqueMetricNames.forEach(metricName => {
        const metric = metricsData.find(
          m => m.metric_name === metricName && m.session_date === date
        );
        
        if (metric) {
          // Normalize value to percentage for consistent Y-axis (0-100)
          // But keep original value for display
          const normalizedValue = (metric.value / metric.max_value) * 100;
          point[metricName] = Number(normalizedValue.toFixed(2));
        } else {
          // No data for this metric on this date - use undefined so recharts handles it
          point[metricName] = undefined as any;
        }
      });

      return point;
    });

    setChartData(dataPoints);
  };

  const getMetricDisplayName = (metricName: string): string => {
    // Find the metric to get its type and unit
    const metric = metrics.find(m => m.metric_name === metricName);
    if (!metric) return metricName;

    const unit = metric.unit ? ` (${metric.unit})` : '';
    return `${metricName}${unit}`;
  };

  const getMetricColor = (index: number): string => {
    return COLORS[index % COLORS.length];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Progress Data Available</h3>
          <p className="text-muted-foreground">
            No progress data available yet. Your practitioner will add metrics after sessions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Chart Data</h3>
          <p className="text-muted-foreground">
            Unable to generate chart from available data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip to show actual values with units
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const metric = metrics.find(m => m.metric_name === entry.dataKey);
            if (!metric || entry.value === null || entry.value === undefined) return null;
            
            const actualValue = (entry.value / 100) * metric.max_value;
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.dataKey}: {actualValue.toFixed(2)}{metric.unit} / {metric.max_value}{metric.unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Get goals linked to metrics shown in chart
  const linkedGoals = goals.filter(g => 
    g.linked_metric_name && 
    metricNames.includes(g.linked_metric_name) &&
    g.status === 'active'
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Progress Over Time
          </CardTitle>
          {linkedGoals.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoalOverlays(!showGoalOverlays)}
            >
              <Target className="h-4 w-4 mr-2" />
              {showGoalOverlays ? 'Hide' : 'Show'} Goals
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => getMetricDisplayName(value)}
                wrapperStyle={{ paddingTop: '20px' }}
              />
              {/* Goal target lines */}
              {showGoalOverlays && linkedGoals.map((goal, index) => {
                const linkedMetric = metrics.find(m => m.metric_name === goal.linked_metric_name);
                if (!linkedMetric) return null;
                
                // Normalize target value to percentage
                const normalizedTarget = (goal.target_value / linkedMetric.max_value) * 100;
                
                return (
                  <ReferenceLine
                    key={`goal-${goal.id}`}
                    y={normalizedTarget}
                    stroke="#8b5cf6"
                    strokeDasharray="5 5"
                    label={{ 
                      value: `${goal.goal_name} (${goal.target_value})`, 
                      position: 'right',
                      fill: '#8b5cf6',
                      fontSize: 12
                    }}
                  />
                );
              })}
              {metricNames.map((metricName, index) => (
                <Line
                  key={metricName}
                  type="monotone"
                  dataKey={metricName}
                  stroke={getMetricColor(index)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Goal Achievement Indicators */}
        {showGoalOverlays && linkedGoals.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goal Progress
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedGoals.map((goal) => {
                const linkedMetric = metrics.find(m => m.metric_name === goal.linked_metric_name);
                if (!linkedMetric) return null;
                
                const progressPercent = (goal.current_value / goal.target_value) * 100;
                const isAchieved = goal.current_value >= goal.target_value;
                
                return (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{goal.goal_name}</p>
                        {isAchieved && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Achieved
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {goal.current_value.toFixed(1)} / {goal.target_value} ({progressPercent.toFixed(0)}%)
                      </p>
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isAchieved ? 'bg-green-600' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metric Summary */}
        {metrics.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Recent Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metricNames.slice(0, 6).map((metricName, index) => {
                const latestMetric = metrics
                  .filter(m => m.metric_name === metricName)
                  .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
                
                if (!latestMetric) return null;

                const previousMetric = metrics
                  .filter(m => m.metric_name === metricName)
                  .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[1];

                const currentValue = latestMetric.value / latestMetric.max_value;
                const previousValue = previousMetric ? previousMetric.value / previousMetric.max_value : null;
                const change = previousValue !== null ? currentValue - previousValue : 0;
                const percentChange = previousValue !== null ? ((change / previousValue) * 100) : 0;

                return (
                  <div
                    key={metricName}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{metricName}</p>
                      <p className="text-xs text-muted-foreground">
                        {latestMetric.value}{latestMetric.unit} / {latestMetric.max_value}{latestMetric.unit}
                      </p>
                    </div>
                    {previousValue !== null && (
                      <div className="flex items-center gap-1">
                        {change > 0.05 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : change < -0.05 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : null}
                        {Math.abs(percentChange) > 5 && (
                          <span className={`text-xs font-medium ${
                            change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {change > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

