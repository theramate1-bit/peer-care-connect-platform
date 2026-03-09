import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Mic, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  User as UserIcon,
  Stethoscope,
  Play,
  Pause,
  Square,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  History,
  TrendingUp,
  Upload,
  Image,
  File,
  ChevronLeft,
  ChevronRight,
  Archive,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LiveSOAPNotes } from './LiveSOAPNotes';
import { SOAPNotesTemplate } from './SOAPNotesTemplate';
import { SOAPNotesViewer } from './SOAPNotesViewer';
import { ClinicalFileUpload } from './ClinicalFileUpload';
import { VisitHistoryNavigation } from './VisitHistoryNavigation';

interface SOAPSession {
  id: string;
  session_id: string;
  client_name: string;
  client_id: string;
  therapy_type: string;
  session_date: string;
  duration_minutes: number;
  status: 'draft' | 'completed' | 'archived';
  soap_subjective: string;
  soap_objective: string;
  soap_assessment: string;
  soap_plan: string;
  chief_complaint: string;
  session_notes: string;
  created_at: string;
}

interface ClinicalFile {
  id: string;
  name: string;
  type: 'image' | 'document' | 'audio' | 'other';
  size: number;
  url: string;
  uploaded_at: string;
  description?: string;
  file_path: string;
}

interface EnhancedSOAPNotesDashboardProps {
  clientId?: string;
  sessionId?: string;
}

export const EnhancedSOAPNotesDashboard: React.FC<EnhancedSOAPNotesDashboardProps> = ({
  clientId,
  sessionId
}) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SOAPSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SOAPSession | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [therapyTypeFilter, setTherapyTypeFilter] = useState('all');
  const [filteredSessions, setFilteredSessions] = useState<SOAPSession[]>([]);
  const [clinicalFiles, setClinicalFiles] = useState<ClinicalFile[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  // Filter sessions based on search and filters
  useEffect(() => {
    let filtered = sessions;

    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.therapy_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.session_notes.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter);
    }

    if (therapyTypeFilter !== 'all') {
      filtered = filtered.filter(session => session.therapy_type === therapyTypeFilter);
    }

    setFilteredSessions(filtered);
  }, [sessions, searchTerm, statusFilter, therapyTypeFilter]);

  const fetchSOAPSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('session_recordings')
        .select(`
          *,
          client_sessions!inner(
            client:users!inner(first_name, last_name),
            session_type
          )
        `)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match our interface
      const transformedSessions: SOAPSession[] = (data || []).map((recording: any) => ({
        id: recording.id,
        session_id: recording.session_id,
        client_name: `${recording.client_sessions.client.first_name} ${recording.client_sessions.client.last_name}`,
        client_id: recording.client_id,
        therapy_type: recording.client_sessions.session_type || 'General',
        session_date: recording.created_at,
        duration_minutes: Math.round((recording.duration_seconds || 0) / 60),
        status: recording.status as 'draft' | 'completed' | 'archived',
        soap_subjective: recording.soap_subjective || '',
        soap_objective: recording.soap_objective || '',
        soap_assessment: recording.soap_assessment || '',
        soap_plan: recording.soap_plan || '',
        chief_complaint: recording.chief_complaint || '',
        session_notes: recording.session_notes || '',
        created_at: recording.created_at,
      }));

      setSessions(transformedSessions);
    } catch (error) {
      console.error('Error fetching SOAP sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicalFiles = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('clinical_files')
        .select('*')
        .eq('session_id', sessionId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setClinicalFiles(data || []);
    } catch (error) {
      console.error('Error fetching clinical files:', error);
    }
  };

  useEffect(() => {
    fetchSOAPSessions();
  }, [user, clientId, sessionId]);

  useEffect(() => {
    if (selectedSession?.session_id) {
      fetchClinicalFiles(selectedSession.session_id);
    }
  }, [selectedSession]);

  const handleSessionSelect = (session: SOAPSession) => {
    setSelectedSession(session);
    setActiveTab('view');
    setCurrentSessionIndex(sessions.findIndex(s => s.id === session.id));
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedSession(null);
    setActiveTab('live');
  };

  const handleNavigate = (direction: 'previous' | 'next') => {
    const currentIndex = sessions.findIndex(s => s.id === selectedSession?.id);
    let newIndex;
    
    if (direction === 'previous') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : sessions.length - 1;
    } else {
      newIndex = currentIndex < sessions.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedSession(sessions[newIndex]);
    setCurrentSessionIndex(newIndex);
  };

  const handleSaveSOAP = async (soapData: any) => {
    try {
      if (selectedSession) {
        // Update existing session
        const { error } = await supabase
          .from('session_recordings')
          .update({
            soap_subjective: soapData.subjective,
            soap_objective: soapData.objective,
            soap_assessment: soapData.assessment,
            soap_plan: soapData.plan,
            chief_complaint: soapData.chief_complaint,
            session_notes: soapData.session_notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSession.id);

        if (error) throw error;
        toast.success('SOAP notes updated successfully');
      } else {
        // Create new session
        const { error } = await supabase
          .from('session_recordings')
          .insert({
            session_id: sessionId || 'new-session',
            therapist_id: user?.id,
            client_id: clientId || user?.id,
            soap_subjective: soapData.subjective,
            soap_objective: soapData.objective,
            soap_assessment: soapData.assessment,
            soap_plan: soapData.plan,
            chief_complaint: soapData.chief_complaint,
            session_notes: soapData.session_notes,
            status: 'draft'
          });

        if (error) throw error;
        toast.success('SOAP notes created successfully');
        setIsCreatingNew(false);
      }

      // Refresh sessions
      fetchSOAPSessions();
    } catch (error) {
      console.error('Error saving SOAP notes:', error);
      toast.error('Failed to save SOAP notes');
    }
  };

  const handleFileUploaded = (file: ClinicalFile) => {
    setClinicalFiles(prev => [file, ...prev]);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const { error } = await supabase
        .from('session_recordings')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session deleted successfully');
      fetchSOAPSessions();
      setSelectedSession(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading SOAP notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced SOAP Notes Dashboard</h1>
          <p className="text-muted-foreground">
            Manage SOAP notes, clinical files, and visit history for therapy sessions
          </p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New SOAP Notes
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {sessions.filter(s => s.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Clinical Files</p>
                <p className="text-2xl font-bold">{clinicalFiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {Math.round(sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / sessions.length) || 0}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit History Navigation */}
      {selectedSession && sessions.length > 1 && (
        <VisitHistoryNavigation
          sessions={sessions}
          currentSession={selectedSession}
          onSessionSelect={handleSessionSelect}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="live">Live Recording</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="view">View Notes</TabsTrigger>
          <TabsTrigger value="files">Clinical Files</TabsTrigger>
          <TabsTrigger value="history">Session History</TabsTrigger>
        </TabsList>

        {/* Live Recording Tab */}
        <TabsContent value="live" className="space-y-6">
          {isCreatingNew || selectedSession ? (
            <LiveSOAPNotes
              sessionId={selectedSession?.session_id || sessionId || 'new-session'}
              clientName={selectedSession?.client_name || 'New Client'}
              clientId={selectedSession?.client_id || clientId || user?.id || ''}
              onSave={handleSaveSOAP}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Mic className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Start Recording SOAP Notes</h3>
                <p className="text-muted-foreground mb-4">
                  Use live speech-to-text to create SOAP notes during your therapy sessions
                </p>
                <Button onClick={handleCreateNew}>
                  <Mic className="h-4 w-4 mr-2" />
                  Start New Session
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <SOAPNotesTemplate
            therapyType={selectedSession?.therapy_type}
            clientName={selectedSession?.client_name}
            onSave={handleSaveSOAP}
          />
        </TabsContent>

        {/* View Notes Tab */}
        <TabsContent value="view" className="space-y-6">
          {selectedSession ? (
            <SOAPNotesViewer
              sessionId={selectedSession.session_id}
              clientView={false}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a Session</h3>
                <p className="text-muted-foreground">
                  Choose a session from the history to view its SOAP notes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clinical Files Tab */}
        <TabsContent value="files" className="space-y-6">
          {selectedSession ? (
            <ClinicalFileUpload
              sessionId={selectedSession.session_id}
              clientId={selectedSession.client_id}
              practitionerId={user?.id || ''}
              onFileUploaded={handleFileUploaded}
              existingFiles={clinicalFiles}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a Session</h3>
                <p className="text-muted-foreground">
                  Choose a session to upload and manage clinical files
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Session History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Sessions</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by client name, therapy type, or notes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="therapy-filter">Therapy Type</Label>
                  <select
                    id="therapy-filter"
                    value={therapyTypeFilter}
                    onChange={(e) => setTherapyTypeFilter(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="Deep Tissue">Deep Tissue</option>
                    <option value="Sports Therapy">Sports Therapy</option>
                    <option value="Prenatal">Prenatal</option>
                    <option value="Rehabilitation">Rehabilitation</option>
                    <option value="General Wellness">General Wellness</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No sessions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSessionSelect(session)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Stethoscope className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div>
                          <h4 className="font-semibold">{session.client_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{session.therapy_type}</span>
                            <span>•</span>
                            <span>{formatDate(session.session_date)}</span>
                            <span>•</span>
                            <span>{session.duration_minutes} min</span>
                          </div>
                          {session.chief_complaint && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {session.chief_complaint.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSessionSelect(session);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSessionSelect(session);
                              setActiveTab('live');
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedSOAPNotesDashboard;



