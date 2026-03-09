import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { generateInsights, ClientInsights, MetricTrend, GoalProgress, Correlation } from '@/lib/progress-calculations';
import { format } from 'date-fns';

interface ProgressInsightsProps {
  clientId: string;
  metrics: Array<{
    id: string;
    metric_name: string;
    metric_type: string;
    value: number;
    max_value: number;
    unit: string;
    session_date: string;
    created_at: string;
  }>;
  goals: Array<{
    id: string;
    goal_name: string;
    target_value: number;
    current_value: number;
    target_date: string;
    status: string;
    linked_metric_name?: string | null;
    created_at?: string;
  }>;
  exercises: Array<{
    completed_date: string;
    exercise_name: string;
    pain_level?: number;
    difficulty_rating?: number;
  }>;
}

export const ProgressInsights: React.FC<ProgressInsightsProps> = ({
  clientId,
  metrics,
  goals,
  exercises
}) => {
  const [insights, setInsights] = useState<ClientInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setLoading(true);
        const calculatedInsights = await generateInsights(clientId, metrics, goals, exercises);
        setInsights(calculatedInsights);
      } catch (error) {
        console.error('Error generating insights:', error);
      } finally {
        setLoading(false);
      }
    };

    if (metrics.length > 0 || goals.length > 0) {
      loadInsights();
    } else {
      setLoading(false);
    }
  }, [clientId, metrics, goals, exercises]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!insights || (insights.trends.length === 0 && insights.goalProgress.length === 0 && insights.correlations.length === 0)) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Insights Available Yet</h3>
          <p className="text-muted-foreground">
            Insights will appear as you track more metrics and goals over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Progress Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Metrics Tracked</div>
              <div className="text-2xl font-bold">{insights.summary.totalMetrics}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active Goals</div>
              <div className="text-2xl font-bold">{insights.summary.activeGoals}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Goals Achieved</div>
              <div className="text-2xl font-bold text-green-600">{insights.summary.achievedGoals}</div>
            </div>
            {insights.summary.mostImprovedMetric && (
              <div>
                <div className="text-sm text-muted-foreground">Most Improved</div>
                <div className="text-lg font-semibold truncate">{insights.summary.mostImprovedMetric}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trends */}
      {insights.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Metric Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.trends.slice(0, 5).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{trend.metricName}</span>
                      {trend.direction === 'up' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{trend.changePercent.toFixed(1)}%
                        </Badge>
                      ) : trend.direction === 'down' ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          -{trend.changePercent.toFixed(1)}%
                        </Badge>
                      ) : (
                        <Badge variant="outline">Stable</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trend.currentValue} / {metrics.find(m => m.metric_name === trend.metricName)?.max_value || 10}
                      {' '}• {format(new Date(trend.currentDate), 'MMM dd')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Progress */}
      {insights.goalProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.goalProgress.slice(0, 5).map((goal) => (
                <div key={goal.goalId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{goal.goalName}</span>
                    <div className="flex items-center gap-2">
                      {goal.onTrack ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          On Track
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Needs Attention
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {goal.progressPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {goal.currentValue} / {goal.targetValue}
                    </span>
                    {goal.estimatedCompletionDate && (
                      <span>
                        Est. completion: {format(new Date(goal.estimatedCompletionDate), 'MMM dd, yyyy')}
                      </span>
                    )}
                    {goal.daysRemaining > 0 && (
                      <span>{goal.daysRemaining} days remaining</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Correlations */}
      {insights.correlations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Exercise Correlations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.correlations.slice(0, 3).map((correlation, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{correlation.metricName}</span>
                    <Badge variant="outline" className={
                      correlation.strength === 'strong' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      correlation.strength === 'moderate' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }>
                      {correlation.strength}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {correlation.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {insights.summary.upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.summary.upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <span className="text-sm font-medium">{deadline.goalName}</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {deadline.daysRemaining} day{deadline.daysRemaining !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

