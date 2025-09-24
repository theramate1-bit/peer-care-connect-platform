import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Target, 
  FileText, 
  MessageSquare,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  budget: number;
  start_date: string;
  end_date?: string;
  practitioner_id: string;
  goals: string[];
  success_metrics: string[];
  requirements: string;
  created_at: string;
}

interface ProjectPhase {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  start_date: string;
  end_date?: string;
  progress_percentage: number;
}

interface ProjectDocument {
  id: string;
  project_id: string;
  title: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

const ProjectManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectDetails(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          practitioner:users!projects_practitioner_id_fkey(
            id,
            first_name,
            last_name,
            specializations
          )
        `)
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      // Fetch phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (phasesError) throw phasesError;
      setPhases(phasesData || []);

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      planning: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPhaseStatusBadge = (status: string) => {
    const variants = {
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Projects</h2>
          <p className="text-muted-foreground">Manage and track your therapy projects</p>
        </div>
        <Button asChild>
          <a href="/dashboard/projects/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold">Projects ({projects.length})</h3>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h4 className="text-lg font-semibold mb-2">No projects yet</h4>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first project to start tracking your therapy goals
                </p>
                <Button asChild>
                  <a href="/dashboard/projects/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedProject?.id === project.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold line-clamp-2">{project.title}</h4>
                        {getStatusBadge(project.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.start_date)}
                        {project.end_date && (
                          <>
                            <span>-</span>
                            {formatDate(project.end_date)}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(project.budget)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Project Details */}
        <div className="lg:col-span-2">
          {selectedProject ? (
            <div className="space-y-6">
              {/* Project Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{selectedProject.title}</CardTitle>
                      <CardDescription>{selectedProject.description}</CardDescription>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedProject.status)}
                        <Badge variant="outline">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency(selectedProject.budget)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Start Date:</span>
                      <div className="font-medium">{formatDate(selectedProject.start_date)}</div>
                    </div>
                    {selectedProject.end_date && (
                      <div>
                        <span className="text-muted-foreground">End Date:</span>
                        <div className="font-medium">{formatDate(selectedProject.end_date)}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Therapist:</span>
                      <div className="font-medium">
                        {selectedProject.therapist?.first_name} {selectedProject.therapist?.last_name}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Specialization:</span>
                      <div className="font-medium">
                        {selectedProject.therapist?.specializations}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Tabs */}
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="phases">Phases</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="goals">Goals & Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Goals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedProject.goals.map((goal, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="text-sm">{goal}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Success Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedProject.success_metrics.map((metric, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{metric}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedProject.requirements}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="phases" className="space-y-4">
                  <div className="space-y-4">
                    {phases.map((phase) => (
                      <Card key={phase.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{phase.title}</CardTitle>
                              <CardDescription>{phase.description}</CardDescription>
                            </div>
                            {getPhaseStatusBadge(phase.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>{phase.progress_percentage}%</span>
                            </div>
                            <Progress value={phase.progress_percentage} />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Start:</span>
                                <div className="font-medium">{formatDate(phase.start_date)}</div>
                              </div>
                              {phase.end_date && (
                                <div>
                                  <span className="text-muted-foreground">End:</span>
                                  <div className="font-medium">{formatDate(phase.end_date)}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <Card key={doc.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-primary" />
                              <div>
                                <h4 className="font-semibold">{doc.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {doc.file_type} • {formatDate(doc.uploaded_at)}
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="goals" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Project Goals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedProject.goals.map((goal, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{goal}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Success Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedProject.success_metrics.map((metric, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{metric}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
                <p className="text-muted-foreground text-center">
                  Choose a project from the list to view details and track progress
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
