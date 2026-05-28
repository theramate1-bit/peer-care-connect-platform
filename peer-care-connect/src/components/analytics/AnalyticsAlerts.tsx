import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Users,
  Clock,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsAlert {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'above' | 'below' | 'equals' | 'changes_by';
  threshold: number;
  time_window: string;
  frequency: string;
  channels: string[];
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  last_triggered?: string;
  trigger_count: number;
}

interface AlertNotification {
  id: string;
  alert_id: string;
  alert_name: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read' | 'acknowledged';
  created_at: string;
  data?: any;
}

const AnalyticsAlerts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AnalyticsAlert | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric: '',
    condition: 'above' as const,
    threshold: 0,
    time_window: '1h',
    frequency: 'immediate',
    channels: [] as string[]
  });
  const [loading, setLoading] = useState(true);

  const availableMetrics = [
    { id: 'project_completion_rate', label: 'Project Completion Rate', icon: Target, unit: '%' },
    { id: 'client_satisfaction', label: 'Client Satisfaction Score', icon: Star, unit: '/5' },
    { id: 'response_time', label: 'Response Time', icon: Clock, unit: 'hours' },
    { id: 'total_revenue', label: 'Total Revenue', icon: DollarSign, unit: '£' },
    { id: 'profit_margin', label: 'Profit Margin', icon: TrendingUp, unit: '%' },
    { id: 'active_projects', label: 'Active Projects', icon: BarChart3, unit: 'count' },
    { id: 'client_retention', label: 'Client Retention Rate', icon: Users, unit: '%' },
    { id: 'project_duration', label: 'Average Project Duration', icon: Clock, unit: 'days' }
  ];

  const conditionOptions = [
    { value: 'above', label: 'Above', icon: TrendingUp },
    { value: 'below', label: 'Below', icon: TrendingDown },
    { value: 'equals', label: 'Equals', icon: Target },
    { value: 'changes_by', label: 'Changes by', icon: BarChart3 }
  ];

  const timeWindowOptions = [
    { value: '5m', label: '5 minutes' },
    { value: '15m', label: '15 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '6h', label: '6 hours' },
    { value: '1d', label: '1 day' },
    { value: '1w', label: '1 week' }
  ];

  const frequencyOptions = [
    { value: 'immediate', label: 'Immediate' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  const channelOptions = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: Smartphone },
    { value: 'push', label: 'Push Notification', icon: Bell },
    { value: 'in_app', label: 'In-App', icon: MessageSquare }
  ];

  useEffect(() => {
    if (user) {
      fetchAlerts();
      fetchNotifications();
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics alerts",
        variant: "destructive"
      });
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = () => {
    setEditingAlert(null);
    setFormData({
      name: '',
      description: '',
      metric: '',
      condition: 'above',
      threshold: 0,
      time_window: '1h',
      frequency: 'immediate',
      channels: []
    });
    setShowForm(true);
  };

  const handleEditAlert = (alert: AnalyticsAlert) => {
    setEditingAlert(alert);
    setFormData({
      name: alert.name,
      description: alert.description,
      metric: alert.metric,
      condition: alert.condition,
      threshold: alert.threshold,
      time_window: alert.time_window,
      frequency: alert.frequency,
      channels: alert.channels
    });
    setShowForm(true);
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const { error } = await supabase
        .from('analytics_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alert deleted successfully"
      });

      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive"
      });
    }
  };

  const handleToggleAlert = async (alert: AnalyticsAlert) => {
    try {
      const newStatus = alert.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('analytics_alerts')
        .update({ status: newStatus })
        .eq('id', alert.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Alert ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
      });

      fetchAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast({
        title: "Error",
        description: "Failed to update alert status",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.metric || formData.channels.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name, select a metric, and choose at least one notification channel",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingAlert) {
        // Update existing alert
        const { error } = await supabase
          .from('analytics_alerts')
          .update({
            name: formData.name,
            description: formData.description,
            metric: formData.metric,
            condition: formData.condition,
            threshold: formData.threshold,
            time_window: formData.time_window,
            frequency: formData.frequency,
            channels: formData.channels,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAlert.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Alert updated successfully"
        });
      } else {
        // Create new alert
        const { error } = await supabase
          .from('analytics_alerts')
          .insert({
            user_id: user?.id,
            name: formData.name,
            description: formData.description,
            metric: formData.metric,
            condition: formData.condition,
            threshold: formData.threshold,
            time_window: formData.time_window,
            frequency: formData.frequency,
            channels: formData.channels,
            status: 'active'
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Alert created successfully"
        });
      }

      setShowForm(false);
      fetchAlerts();
    } catch (error) {
      console.error('Error saving alert:', error);
      toast({
        title: "Error",
        description: "Failed to save alert",
        variant: "destructive"
      });
    }
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const getMetricIcon = (metricId: string) => {
    const metric = availableMetrics.find(m => m.id === metricId);
    return metric ? <metric.icon className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />;
  };

  const getMetricUnit = (metricId: string) => {
    const metric = availableMetrics.find(m => m.id === metricId);
    return metric?.unit || '';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    return (
      <Badge variant="secondary" className={variants[severity as keyof typeof variants]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Alerts</h2>
          <p className="text-muted-foreground">Set up automated alerts for important metrics</p>
        </div>
        <Button onClick={handleCreateAlert}>
          <Plus className="h-4 w-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {/* Notifications Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {alerts.filter(a => a.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
            <p className="text-xs text-muted-foreground">
              {notifications.filter(n => n.status === 'unread').length} unread
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Triggered Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.reduce((sum, alert) => sum + alert.trigger_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total triggers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.length > 0 
                ? Math.round((notifications.filter(n => n.status !== 'unread').length / notifications.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Acknowledged</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Latest alert notifications and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">Alerts will appear here when triggered</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 10).map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(notification.severity)}
                    <div>
                      <p className="font-medium text-sm">{notification.alert_name}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(notification.severity)}
                    <Badge variant={notification.status === 'unread' ? 'default' : 'secondary'}>
                      {notification.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Your Alerts</CardTitle>
          <CardDescription>Manage and configure your analytics alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alerts configured yet</p>
              <p className="text-sm">Create your first alert to get notified about important changes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{alert.name}</h4>
                      {getStatusBadge(alert.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getMetricIcon(alert.metric)}
                        {availableMetrics.find(m => m.id === alert.metric)?.label}
                      </span>
                      <span>• {conditionOptions.find(c => c.value === alert.condition)?.label} {alert.threshold}{getMetricUnit(alert.metric)}</span>
                      <span>• {timeWindowOptions.find(t => t.value === alert.time_window)?.label}</span>
                      <span>• {frequencyOptions.find(f => f.value === alert.frequency)?.label}</span>
                      <span>• {alert.channels.length} channels</span>
                      <span>• Triggered {alert.trigger_count} times</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleToggleAlert(alert)}
                    >
                      {alert.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditAlert(alert)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Alert Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingAlert ? 'Edit Alert' : 'Create New Alert'}</CardTitle>
            <CardDescription>
              {editingAlert ? 'Update your alert configuration' : 'Configure a new analytics alert'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Alert Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter alert name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metric">Metric to Monitor</Label>
                  <Select value={formData.metric} onValueChange={(value) => setFormData(prev => ({ ...prev, metric: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMetrics.map((metric) => (
                        <SelectItem key={metric.id} value={metric.id}>
                          <div className="flex items-center gap-2">
                            <metric.icon className="h-4 w-4" />
                            {metric.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when this alert should trigger"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={formData.condition} onValueChange={(value: any) => setFormData(prev => ({ ...prev, condition: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="threshold">Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="0.01"
                    value={formData.threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_window">Time Window</Label>
                  <Select value={formData.time_window} onValueChange={(value) => setFormData(prev => ({ ...prev, time_window: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeWindowOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Check Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notification Channels</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {channelOptions.map((channel) => (
                      <div key={channel.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={channel.value}
                          checked={formData.channels.includes(channel.value)}
                          onCheckedChange={() => toggleChannel(channel.value)}
                        />
                        <Label htmlFor={channel.value} className="flex items-center gap-2 cursor-pointer text-sm">
                          <channel.icon className="h-4 w-4" />
                          {channel.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit">
                  {editingAlert ? 'Update Alert' : 'Create Alert'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsAlerts;
