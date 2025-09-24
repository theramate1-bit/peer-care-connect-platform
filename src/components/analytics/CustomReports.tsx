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
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Clock,
  Star,
  Settings,
  Copy,
  Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CustomReport {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  time_range: string;
  frequency: string;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  last_generated?: string;
  next_generation?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  default_metrics: string[];
  preview_image?: string;
}

const CustomReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<CustomReport | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metrics: [] as string[],
    time_range: '30d',
    frequency: 'weekly'
  });
  const [loading, setLoading] = useState(true);

  const availableMetrics = [
    { id: 'project_completion_rate', label: 'Project Completion Rate', icon: Target, category: 'Performance' },
    { id: 'client_satisfaction', label: 'Client Satisfaction Score', icon: Star, category: 'Quality' },
    { id: 'response_time', label: 'Response Time', icon: Clock, category: 'Performance' },
    { id: 'total_revenue', label: 'Total Revenue', icon: DollarSign, category: 'Financial' },
    { id: 'profit_margin', label: 'Profit Margin', icon: TrendingUp, category: 'Financial' },
    { id: 'active_projects', label: 'Active Projects', icon: BarChart3, category: 'Performance' },
    { id: 'client_retention', label: 'Client Retention Rate', icon: Users, category: 'Engagement' },
    { id: 'project_duration', label: 'Average Project Duration', icon: Calendar, category: 'Performance' }
  ];

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
    { value: 'custom', label: 'Custom range' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'on_demand', label: 'On Demand' }
  ];

  useEffect(() => {
    if (user) {
      fetchReports();
      fetchTemplates();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load custom reports",
        variant: "destructive"
      });
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_metrics')
        .select('*')
        .limit(10);

      if (error) throw error;
      
      // Convert metrics to template format for demonstration
      const mockTemplates: ReportTemplate[] = [
        {
          id: '1',
          name: 'Performance Overview',
          description: 'Comprehensive performance metrics for your therapy practice',
          category: 'Performance',
          default_metrics: ['project_completion_rate', 'client_satisfaction', 'response_time']
        },
        {
          id: '2',
          name: 'Financial Summary',
          description: 'Key financial indicators and revenue analysis',
          category: 'Financial',
          default_metrics: ['total_revenue', 'profit_margin', 'active_projects']
        },
        {
          id: '3',
          name: 'Client Engagement',
          description: 'Client interaction and satisfaction metrics',
          category: 'Engagement',
          default_metrics: ['client_retention', 'client_satisfaction', 'active_projects']
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = () => {
    setEditingReport(null);
    setFormData({
      name: '',
      description: '',
      metrics: [],
      time_range: '30d',
      frequency: 'weekly'
    });
    setShowForm(true);
  };

  const handleEditReport = (report: CustomReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      description: report.description,
      metrics: report.metrics,
      time_range: report.time_range,
      frequency: report.frequency
    });
    setShowForm(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const { error } = await supabase
        .from('custom_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report deleted successfully"
      });

      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || formData.metrics.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and select at least one metric",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingReport) {
        // Update existing report
        const { error } = await supabase
          .from('custom_reports')
          .update({
            name: formData.name,
            description: formData.description,
            metrics: formData.metrics,
            time_range: formData.time_range,
            frequency: formData.frequency,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingReport.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Report updated successfully"
        });
      } else {
        // Create new report
        const { error } = await supabase
          .from('custom_reports')
          .insert({
            user_id: user?.id,
            name: formData.name,
            description: formData.description,
            metrics: formData.metrics,
            time_range: formData.time_range,
            frequency: formData.frequency,
            status: 'active'
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Report created successfully"
        });
      }

      setShowForm(false);
      fetchReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive"
      });
    }
  };

  const toggleMetric = (metricId: string) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(id => id !== metricId)
        : [...prev.metrics, metricId]
    }));
  };

  const useTemplate = (template: ReportTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      metrics: template.default_metrics,
      time_range: '30d',
      frequency: 'weekly'
    });
    setShowForm(true);
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

  const getMetricIcon = (metricId: string) => {
    const metric = availableMetrics.find(m => m.id === metricId);
    return metric ? <metric.icon className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Custom Reports</h2>
          <p className="text-muted-foreground">Create and manage custom analytics reports</p>
        </div>
        <Button onClick={handleCreateReport}>
          <Plus className="h-4 w-4 mr-2" />
          Create Report
        </Button>
      </div>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Report Templates</CardTitle>
          <CardDescription>Quick start with pre-configured report templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {template.default_metrics.slice(0, 3).map((metricId) => {
                    const metric = availableMetrics.find(m => m.id === metricId);
                    return (
                      <div key={metricId} className="flex items-center gap-1 text-xs text-muted-foreground">
                        {metric && <metric.icon className="h-3 w-3" />}
                        {metric?.label.split(' ')[0]}
                      </div>
                    );
                  })}
                  {template.default_metrics.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{template.default_metrics.length - 3} more
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => useTemplate(template)}
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Your Reports</CardTitle>
          <CardDescription>Manage and view your custom reports</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No custom reports yet</p>
              <p className="text-sm">Create your first report to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{report.name}</h4>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>• {report.metrics.length} metrics</span>
                      <span>• {timeRangeOptions.find(t => t.value === report.time_range)?.label}</span>
                      <span>• {frequencyOptions.find(f => f.value === report.frequency)?.label}</span>
                      <span>• Created {new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditReport(report)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteReport(report.id)}
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

      {/* Create/Edit Report Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingReport ? 'Edit Report' : 'Create New Report'}</CardTitle>
            <CardDescription>
              {editingReport ? 'Update your report configuration' : 'Configure a new custom report'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Report Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_range">Time Range</Label>
                  <Select value={formData.time_range} onValueChange={(value) => setFormData(prev => ({ ...prev, time_range: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeRangeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
                  placeholder="Describe what this report will show"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Select Metrics</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.id}
                        checked={formData.metrics.includes(metric.id)}
                        onCheckedChange={() => toggleMetric(metric.id)}
                      />
                      <Label htmlFor={metric.id} className="flex items-center gap-2 cursor-pointer">
                        {getMetricIcon(metric.id)}
                        <span className="text-sm">{metric.label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Generation Frequency</Label>
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

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit">
                  {editingReport ? 'Update Report' : 'Create Report'}
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

export default CustomReports;
