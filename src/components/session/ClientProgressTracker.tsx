import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Activity,
  Calendar,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface ProgressMetric {
  id: string;
  client_id: string;
  practitioner_id: string;
  session_id: string;
  metric_type: 'pain_level' | 'mobility' | 'strength' | 'flexibility' | 'function' | 'custom';
  metric_name: string;
  value: number;
  max_value: number;
  unit: string;
  notes: string;
  session_date: string;
  created_at: string;
}

interface ProgressGoal {
  id: string;
  client_id: string;
  practitioner_id: string;
  goal_name: string;
  description: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: 'active' | 'achieved' | 'paused' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface ClientProgressTrackerProps {
  clientId: string;
  clientName: string;
  sessionId?: string;
}

export const ClientProgressTracker: React.FC<ClientProgressTrackerProps> = ({
  clientId,
  clientName,
  sessionId
}) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ProgressMetric[]>([]);
  const [goals, setGoals] = useState<ProgressGoal[]>([]);
  const [newMetric, setNewMetric] = useState({
    metric_type: 'pain_level' as const,
    metric_name: '',
    value: 0,
    max_value: 10,
    unit: '',
    notes: ''
  });
  const [newGoal, setNewGoal] = useState({
    goal_name: '',
    description: '',
    target_value: 0,
    target_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'goals' | 'chart'>('metrics');

  // Real-time subscription for progress metrics
  const { data: realtimeMetrics } = useRealtimeSubscription(
    'progress_metrics',
    `client_id=eq.${clientId}`,
    (payload) => {
      console.log('Real-time metrics update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setMetrics(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setMetrics(prev => 
          prev.map(metric => 
            metric.id === payload.new.id ? payload.new : metric
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setMetrics(prev => 
          prev.filter(metric => metric.id !== payload.old.id)
        );
      }
    }
  );

  // Real-time subscription for progress goals
  const { data: realtimeGoals } = useRealtimeSubscription(
    'progress_goals',
    `client_id=eq.${clientId}`,
    (payload) => {
      console.log('Real-time goals update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setGoals(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setGoals(prev => 
          prev.map(goal => 
            goal.id === payload.new.id ? payload.new : goal
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setGoals(prev => 
          prev.filter(goal => goal.id !== payload.old.id)
        );
      }
    }
  );

  useEffect(() => {
    fetchProgressData();
  }, [clientId]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      
      // Fetch metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('session_date', { ascending: false });

      if (metricsError) throw metricsError;

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('progress_goals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      setMetrics(metricsData || []);
      setGoals(goalsData || []);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const addMetric = async () => {
    if (!newMetric.metric_name.trim()) {
      toast.error('Please enter a metric name');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('progress_metrics')
        .insert({
          client_id: clientId,
          practitioner_id: user?.id,
          session_id: sessionId || null,
          metric_type: newMetric.metric_type,
          metric_name: newMetric.metric_name.trim(),
          value: newMetric.value,
          max_value: newMetric.max_value,
          unit: newMetric.unit.trim(),
          notes: newMetric.notes.trim(),
          session_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      setMetrics(prev => [data, ...prev]);
      setNewMetric({
        metric_type: 'pain_level',
        metric_name: '',
        value: 0,
        max_value: 10,
        unit: '',
        notes: ''
      });

      toast.success('Progress metric added');
    } catch (error) {
      console.error('Error adding metric:', error);
      toast.error('Failed to add metric');
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async () => {
    if (!newGoal.goal_name.trim()) {
      toast.error('Please enter a goal name');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('progress_goals')
        .insert({
          client_id: clientId,
          practitioner_id: user?.id,
          goal_name: newGoal.goal_name.trim(),
          description: newGoal.description.trim(),
          target_value: newGoal.target_value,
          current_value: 0,
          target_date: newGoal.target_date,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => [data, ...prev]);
      setNewGoal({
        goal_name: '',
        description: '',
        target_value: 0,
        target_date: ''
      });

      toast.success('Progress goal added');
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error('Failed to add goal');
    } finally {
      setLoading(false);
    }
  };

  const updateGoalProgress = async (goalId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('progress_goals')
        .update({
          current_value: newValue,
          status: newValue >= goals.find(g => g.id === goalId)?.target_value ? 'achieved' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(prev => 
        prev.map(goal => 
          goal.id === goalId 
            ? { 
                ...goal, 
                current_value: newValue,
                status: newValue >= goal.target_value ? 'achieved' : 'active',
                updated_at: new Date().toISOString()
              }
            : goal
        )
      );

      toast.success('Goal progress updated');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'pain_level': return <AlertTriangle className="h-4 w-4" />;
      case 'mobility': return <Activity className="h-4 w-4" />;
      case 'strength': return <TrendingUp className="h-4 w-4" />;
      case 'flexibility': return <Minus className="h-4 w-4" />;
      case 'function': return <CheckCircle className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress Tracking - {clientName}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'metrics' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Metrics
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'goals' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Goals
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'chart' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Chart
        </button>
      </div>

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          {/* Add Metric */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Progress Metric</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="metric-type">Metric Type</Label>
                  <select
                    id="metric-type"
                    value={newMetric.metric_type}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, metric_type: e.target.value as any }))}
                    className="w-full p-2 border border-input rounded-md"
                  >
                    <option value="pain_level">Pain Level</option>
                    <option value="mobility">Mobility</option>
                    <option value="strength">Strength</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="function">Function</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="metric-name">Metric Name</Label>
                  <Input
                    id="metric-name"
                    value={newMetric.metric_name}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, metric_name: e.target.value }))}
                    placeholder="e.g., Lower Back Pain, Shoulder ROM"
                  />
                </div>
                <div>
                  <Label htmlFor="metric-value">Current Value</Label>
                  <Input
                    id="metric-value"
                    type="number"
                    value={newMetric.value}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, value: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="max-value">Max Value</Label>
                  <Input
                    id="max-value"
                    type="number"
                    value={newMetric.max_value}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, max_value: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={newMetric.unit}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., /10, degrees, kg"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newMetric.notes}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional observations..."
                  />
                </div>
              </div>
              <Button onClick={addMetric} disabled={loading} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Metric
              </Button>
            </CardContent>
          </Card>

          {/* Metrics List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Metrics ({metrics.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>No metrics recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.map((metric) => (
                    <div key={metric.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getMetricIcon(metric.metric_type)}
                          <span className="font-medium">{metric.metric_name}</span>
                          <Badge variant="outline">{metric.metric_type}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(metric.session_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold">
                          {metric.value}{metric.unit}
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${(metric.value / metric.max_value) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {metric.value} / {metric.max_value}{metric.unit}
                          </div>
                        </div>
                      </div>
                      {metric.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{metric.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {/* Add Goal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Progress Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goal-name">Goal Name</Label>
                  <Input
                    id="goal-name"
                    value={newGoal.goal_name}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, goal_name: e.target.value }))}
                    placeholder="e.g., Reduce pain to 3/10"
                  />
                </div>
                <div>
                  <Label htmlFor="target-value">Target Value</Label>
                  <Input
                    id="target-value"
                    type="number"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_value: Number(e.target.value) }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the goal and how it will be measured..."
                  />
                </div>
                <div>
                  <Label htmlFor="target-date">Target Date</Label>
                  <Input
                    id="target-date"
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={addGoal} disabled={loading} className="w-full">
                <Target className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </CardContent>
          </Card>

          {/* Goals List */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Goals ({goals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4" />
                  <p>No goals set yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <span className="font-medium">{goal.goal_name}</span>
                          <Badge className={getGoalStatusColor(goal.status)}>
                            {goal.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Progress</span>
                          <span className="text-sm font-medium">
                            {goal.current_value} / {goal.target_value}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${getProgressPercentage(goal.current_value, goal.target_value)}%` }}
                          ></div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={goal.current_value}
                            onChange={(e) => updateGoalProgress(goal.id, Number(e.target.value))}
                            className="w-20"
                            min="0"
                          />
                          <span className="text-sm text-muted-foreground self-center">
                            Current value
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart Tab */}
      {activeTab === 'chart' && (
        <Card>
          <CardHeader>
            <CardTitle>Progress Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>Chart visualization coming soon</p>
              <p className="text-sm">Track progress over time with visual charts</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
