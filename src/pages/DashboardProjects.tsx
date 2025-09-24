import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, Calendar, Users, BarChart3, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Project {
  id: string;
  practitioner_id: string;
  client_id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  start_date: string;
  end_date: string;
  goals: string[];
  treatment_plan: string;
  progress_notes: string;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
  };
}

const DashboardProjects = () => {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    status: 'planning' as 'planning' | 'active' | 'completed' | 'paused',
    start_date: '',
    end_date: '',
    goals: [] as string[],
    treatment_plan: '',
    progress_notes: ''
  });

  const [clients, setClients] = useState<Array<{id: string, first_name: string, last_name: string}>>([]);

  useEffect(() => {
    if (userProfile) {
      loadData();
    }
  }, [userProfile]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('treatment_projects')
        .select(`
          id,
          practitioner_id,
          client_id,
          title,
          description,
          status,
          start_date,
          end_date,
          goals,
          treatment_plan,
          progress_notes,
          created_at,
          client:users!treatment_projects_client_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('practitioner_id', userProfile?.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('client_sessions')
        .select(`
          client_email,
          client_name
        `)
        .eq('therapist_id', userProfile?.id)
        .not('client_email', 'is', null);

      if (clientsError) throw clientsError;

      // Get unique clients
      const uniqueClients = Array.from(
        new Map(
          (clientsData || []).map(session => [
            session.client_email,
            { id: session.client_email, first_name: session.client_name.split(' ')[0], last_name: session.client_name.split(' ')[1] || '' }
          ])
        ).values()
      );

      setClients(uniqueClients);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const { error } = await supabase
        .from('treatment_projects')
        .insert({
          practitioner_id: userProfile?.id,
          client_id: formData.client_id,
          title: formData.title,
          description: formData.description,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date,
          goals: formData.goals,
          treatment_plan: formData.treatment_plan,
          progress_notes: formData.progress_notes
        });

      if (error) throw error;

      toast.success('Project created successfully');
      setShowCreateForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from('treatment_projects')
        .update({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date,
          goals: formData.goals,
          treatment_plan: formData.treatment_plan,
          progress_notes: formData.progress_notes
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      toast.success('Project updated successfully');
      setEditingProject(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('treatment_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Project deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      title: '',
      description: '',
      status: 'planning',
      start_date: '',
      end_date: '',
      goals: [],
      treatment_plan: '',
      progress_notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Planning</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Completed</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Treatment Projects</h1>
            <p className="text-muted-foreground">Manage client treatment plans and projects</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first treatment project to start managing client care plans.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <CardDescription>
                      {project.client.first_name} {project.client.last_name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(project.start_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {project.goals.length} goals
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProject(project);
                        setFormData({
                          client_id: project.client_id,
                          title: project.title,
                          description: project.description,
                          status: project.status,
                          start_date: project.start_date,
                          end_date: project.end_date,
                          goals: project.goals,
                          treatment_plan: project.treatment_plan,
                          progress_notes: project.progress_notes
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Project Modal */}
      {(showCreateForm || editingProject) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">Client</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Lower Back Pain Management"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the treatment project..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="treatment_plan">Treatment Plan</Label>
                <Textarea
                  id="treatment_plan"
                  value={formData.treatment_plan}
                  onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                  placeholder="Detailed treatment plan..."
                />
              </div>

              <div>
                <Label htmlFor="progress_notes">Progress Notes</Label>
                <Textarea
                  id="progress_notes"
                  value={formData.progress_notes}
                  onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
                  placeholder="Progress notes and observations..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={editingProject ? handleUpdateProject : handleCreateProject}
                  className="flex-1"
                >
                  {editingProject ? 'Update Project' : 'Create Project'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingProject(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardProjects;
