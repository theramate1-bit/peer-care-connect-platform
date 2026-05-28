import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Filter, Calendar, User as UserIcon, Stethoscope, TrendingUp, X, Save, Edit, Activity, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EnhancedTreatmentNotes } from '@/components/session/EnhancedTreatmentNotes';
import { ClientProgressTracker } from '@/components/session/ClientProgressTracker';
import { resolveClientIdFromSession } from '@/lib/client-id-resolver';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { HEPService, HomeExerciseProgram } from '@/lib/hep-service';
import { HEPViewer } from '@/components/client/HEPViewer';
import { SOAPNotesViewer } from '@/components/session/SOAPNotesViewer';

interface UnifiedNote {
  id: string;
  session_id?: string;
  program_id?: string;
  client_id: string;
  client_name: string;
  note_type: string;
  session_date: string;
  created_at: string;
  updated_at: string;
  hep_data?: HomeExerciseProgram;
}

const TreatmentNotes = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [treatmentNotes, setTreatmentNotes] = useState<any[]>([]);
  const [unifiedNotes, setUnifiedNotes] = useState<UnifiedNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<UnifiedNote | null>(null);
  const [clients, setClients] = useState([{ id: 'all', name: 'All Clients' }]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('unified');
  // State for resolving client ID in Progress tab
  const [resolvedProgressClientId, setResolvedProgressClientId] = useState<string | null>(null);
  const [resolvingProgressClientId, setResolvingProgressClientId] = useState(false);
  
  // Modal states
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  
  // New note form data
  const [newNoteData, setNewNoteData] = useState({
    client_id: '',
    session_date: '',
    session_type: 'Treatment Session',
    notes: '',
    duration_minutes: 60,
    status: 'completed'
  });

  // Resolve client ID for Progress tab when selectedSession changes
  useEffect(() => {
    const resolveProgressClientId = async () => {
      if (!selectedSession) {
        setResolvedProgressClientId(null);
        setResolvingProgressClientId(false);
        return;
      }

      setResolvingProgressClientId(true);
      const clientId = await resolveClientIdFromSession(selectedSession);
      setResolvedProgressClientId(clientId);
      setResolvingProgressClientId(false);
    };
    resolveProgressClientId();
  }, [selectedSession?.id, selectedSession?.client_id, selectedSession?.client_email]);

  // Real-time subscription for treatment notes/sessions
  const { data: realtimeSessions, loading: sessionsLoading } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time treatment notes update:', payload);
      // Refresh treatment notes when sessions change
      fetchTreatmentNotes();
    }
  );

  useEffect(() => {
    if (user) {
      fetchTreatmentNotes();
    }
  }, [user]);

  // Update treatment notes when real-time data changes
  useEffect(() => {
    if (realtimeSessions && realtimeSessions.length > 0) {
      processTreatmentNotes(realtimeSessions);
    }
  }, [realtimeSessions]);

  // Pre-populate note from URL params (from messages)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    const subjectiveText = params.get('subjective');

    if (sessionId && subjectiveText) {
      // Pre-populate new note form
      setNewNoteData(prev => ({
        ...prev,
        session_id: sessionId,
        notes: `**Subjective (from client messages):**\n${decodeURIComponent(subjectiveText)}\n\n**Objective:**\n\n**Assessment:**\n\n**Plan:**\n`
      }));
      setIsNewNoteModalOpen(true);
      
      // Clear URL params after loading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const processTreatmentNotes = (sessions: any[]) => {
    // Transform sessions into treatment notes format
    const notes = sessions.map((session: any) => ({
      id: session.id,
      client: session.client_name || 'Unknown Client',
      client_name: session.client_name || 'Unknown Client',
      date: session.session_date,
      type: session.session_type || 'Treatment Session',
      status: session.status || 'completed',
      notes: session.notes || 'No notes recorded',
      therapist: user?.user_metadata?.first_name || 'Therapist',
      client_id: session.client_id,
      duration: Number(session.duration_minutes) || 60,
      duration_minutes: Number(session.duration_minutes) || 60,
      session_date: session.session_date,
      session_type: session.session_type || 'Treatment Session',
      followUp: null
    }));

    setTreatmentNotes(notes);

    // Create unique clients list
    const uniqueClients = [{ id: 'all', name: 'All Clients' }];
    const clientMap = new Map();
    
    sessions.forEach((session: any) => {
      const clientId = session.client_id;
      const clientName = session.client_name || 'Unknown Client';
      
      if (clientId && !clientMap.has(clientId)) {
        clientMap.set(clientId, { id: clientId, name: clientName });
        uniqueClients.push({ id: clientId, name: clientName });
      }
    });

    setClients(uniqueClients);
  };

  const getNoteTypeColor = (noteType: string) => {
    switch (noteType.toLowerCase()) {
      case 'soap':
      case 'subjective':
      case 'objective':
      case 'assessment':
      case 'plan':
        return 'bg-blue-100 text-blue-800';
      case 'dap':
      case 'data':
        return 'bg-green-100 text-green-800';
      case 'free_text':
      case 'general':
        return 'bg-purple-100 text-purple-800';
      case 'hep':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteTypeLabel = (noteType: string) => {
    switch (noteType.toLowerCase()) {
      case 'hep':
        return 'HEP';
      case 'eps':
        return 'EPS';
      case 'soap':
        return 'SOAP';
      case 'dap':
        return 'DAP';
      case 'subjective':
        return 'SUBJECTIVE';
      case 'objective':
        return 'OBJECTIVE';
      case 'assessment':
        return 'ASSESSMENT';
      case 'plan':
        return 'PLAN';
      case 'general':
        return 'GENERAL';
      case 'free_text':
        return 'FREE TEXT';
      default:
        return noteType.toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const fetchTreatmentNotes = async () => {
    if (!user?.id) {
      console.error('No user ID available');
      toast.error('Please sign in to view treatment notes');
      return;
    }

    try {
      setLoading(true);
      
      // Fetch structured treatment notes from treatment_notes table (like clients see)
      // Use left join to include notes even if session doesn't exist
      const { data: treatmentNotesData, error: treatmentNotesError } = await supabase
        .from('treatment_notes')
        .select(`
          id,
          session_id,
          note_type,
          content,
          created_at,
          updated_at,
          client_id,
          session:client_sessions(
            session_date,
            client_name,
            start_time,
            duration_minutes,
            session_type
          )
        `)
        .eq('practitioner_id', user.id)
        .order('created_at', { ascending: false });

      if (treatmentNotesError) {
        console.error('Error fetching treatment notes:', treatmentNotesError);
        toast.error('Failed to load treatment notes');
      }

      // Also fetch sessions for legacy compatibility
      const { data: sessions, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user.id as any)
        .order('session_date', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      }

      // Fetch HEPs created by practitioner
      const heps = await HEPService.getPractitionerPrograms(user.id);

      // Get all client IDs from both sources (exclude null for standalone notes)
      const treatmentClientIds = [...new Set((treatmentNotesData?.map(note => note.client_id) || []).filter(Boolean))];
      const sessionClientIds = [...new Set((sessions?.map((s: any) => s.client_id) || []).filter(Boolean))];
      const hepClientIds = [...new Set(heps.map(hep => hep.client_id).filter(Boolean))];
      const allClientIds = [...new Set([...treatmentClientIds, ...sessionClientIds, ...hepClientIds])];

      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', allClientIds);

      if (clientError) {
        console.error('Error fetching clients:', clientError);
      }

      const clientMap = new Map(clientData?.map(c => [c.id, c]) || []);

      // Format structured treatment notes
      const formattedTreatmentNotes: UnifiedNote[] = (treatmentNotesData || []).map(note => {
        const client = note.client_id ? clientMap.get(note.client_id) : null;
        return {
          id: note.id,
          session_id: note.session_id,
          client_id: note.client_id ?? '',
          client_name: note.session?.client_name ||
                       (client ? `${client.first_name} ${client.last_name}` : note.client_id ? 'Unknown Client' : 'Standalone'),
          note_type: note.note_type,
          session_date: note.session?.session_date || note.created_at,
          created_at: note.created_at,
          updated_at: note.updated_at
        };
      });

      // Format HEPs as notes
      const formattedHEPNotes: UnifiedNote[] = heps.map(hep => {
        const client = clientMap.get(hep.client_id);
        return {
          id: `hep-${hep.id}`,
          program_id: hep.id,
          session_id: hep.session_id || undefined,
          client_id: hep.client_id,
          client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown Client',
          note_type: 'hep',
          session_date: hep.start_date || hep.created_at || new Date().toISOString(),
          created_at: hep.created_at || new Date().toISOString(),
          updated_at: hep.updated_at || new Date().toISOString(),
          hep_data: hep
        };
      });

      // Deduplicate HEPs by program_id to prevent showing the same HEP twice
      // Keep the most recent one if duplicates exist (prefer one with session_id)
      const seenHEPIds = new Map<string, UnifiedNote>();
      formattedHEPNotes.forEach(hep => {
        if (hep.program_id) {
          const existing = seenHEPIds.get(hep.program_id);
          if (!existing) {
            // First occurrence - keep it
            seenHEPIds.set(hep.program_id, hep);
          } else {
            // Duplicate found - keep the one with session_id if available, or most recent
            const shouldReplace = 
              (!existing.session_id && hep.session_id) || // New one has session_id, old doesn't
              (existing.session_id && hep.session_id && new Date(hep.created_at) > new Date(existing.created_at)) || // Both have session_id, new is more recent
              (!existing.session_id && !hep.session_id && new Date(hep.created_at) > new Date(existing.created_at)); // Neither has session_id, new is more recent
            
            if (shouldReplace) {
              seenHEPIds.set(hep.program_id, hep);
            }
          }
        }
      });
      const uniqueHEPNotes = Array.from(seenHEPIds.values());

      // Combine and sort by created_at (most recent first)
      const allNotes = [...formattedTreatmentNotes, ...uniqueHEPNotes].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setUnifiedNotes(allNotes);

      // Legacy format for backward compatibility
      const legacyNotes = (sessions || []).map((session: any) => ({
        id: session.id,
        client: session.client_name || 'Unknown Client',
        client_name: session.client_name || 'Unknown Client',
        date: session.session_date,
        type: session.session_type || 'Treatment Session',
        status: session.status || 'completed',
        notes: session.notes || 'No notes recorded',
        therapist: user?.user_metadata?.first_name || 'Therapist',
        client_id: session.client_id,
        duration: Number(session.duration_minutes) || 60,
        duration_minutes: Number(session.duration_minutes) || 60,
        session_date: session.session_date,
        session_type: session.session_type || 'Treatment Session',
        followUp: null
      }));

      setTreatmentNotes(legacyNotes);

      // Create unique clients list
      const uniqueClients = [{ id: 'all', name: 'All Clients' }];
      allClientIds.forEach(clientId => {
        const client = clientMap.get(clientId);
        if (client) {
          uniqueClients.push({
            id: clientId,
            name: `${client.first_name} ${client.last_name}`
          });
        }
      });

      setClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching treatment notes:', error);
      toast.error('Failed to load treatment notes');
    } finally {
      setLoading(false);
    }
  };

  const createTestSessions = async () => {
    try {
      // Use known existing user IDs from the database
      const knownUserIds = [
        '7c864fec-aa13-40f9-9109-dd4fefbce733',
        'c24ebefe-9b92-44f0-88da-f6379b7fcaa4',
        '7b63cfab-4df0-44ca-9462-45046be6ae0e'
      ];

      const testSessions = [
        {
          client_id: knownUserIds[0],
          client_name: 'John Doe',
          therapist_id: user.id,
          session_date: new Date().toISOString().split('T')[0],
          start_time: '10:00',
          session_type: 'Initial Consultation',
          notes: 'Client presented with lower back pain. Conducted initial assessment and discussed treatment plan.',
          duration_minutes: 60,
          status: 'completed',
          price: 80,
          payment_status: 'completed'
        },
        {
          client_id: knownUserIds[1],
          client_name: 'Jane Smith',
          therapist_id: user.id,
          session_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
          start_time: '14:00',
          session_type: 'Sports Therapy',
          notes: 'Follow-up session for shoulder injury. Progress noted, continued with rehabilitation exercises.',
          duration_minutes: 45,
          status: 'completed',
          price: 70,
          payment_status: 'completed'
        },
        {
          client_id: knownUserIds[2],
          client_name: 'Mike Johnson',
          therapist_id: user.id,
          session_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          start_time: '09:00',
          session_type: 'Massage Therapy',
          notes: 'Scheduled for deep tissue massage to address muscle tension.',
          duration_minutes: 90,
          status: 'scheduled',
          price: 100,
          payment_status: 'pending'
        }
      ];

      const { data: insertedSessions, error } = await supabase
        .from('client_sessions')
        .insert(testSessions)
        .select();

      if (error) {
        console.error('Error creating test sessions:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Provide more specific error messages
        if (error.code === '23503') {
          toast.error('Failed to create test sessions: One or more client IDs do not exist');
        } else if (error.code === '23505') {
          toast.error('Failed to create test sessions: Duplicate entry detected');
        } else if (error.code === '23514') {
          toast.error('Failed to create test sessions: Check constraint violation');
        } else {
          toast.error(`Failed to create test sessions: ${error.message || 'Unknown error'}`);
        }
      } else if (insertedSessions && insertedSessions.length > 0) {
        console.log('Test sessions created successfully:', insertedSessions.length);
        toast.success(`Successfully created ${insertedSessions.length} test session(s)`);
        // Refresh the treatment notes after creating test sessions
        fetchTreatmentNotes();
      }
    } catch (error: any) {
      console.error('Error creating test sessions:', error);
      toast.error(`Failed to create test sessions: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleNewNote = () => {
    setNewNoteData({
      client_id: '',
      session_date: new Date().toISOString().split('T')[0],
      session_type: 'Treatment Session',
      notes: '',
      duration_minutes: 60,
      status: 'completed'
    });
    setIsNewNoteModalOpen(true);
  };

  const handleViewDetails = (note) => {
    setSelectedSession(note);
    setIsDetailsModalOpen(true);
  };

  const handleSaveNewNote = async () => {
    if (!newNoteData.session_date || !newNoteData.notes.trim()) {
      toast.error('Please fill in session date and notes');
      return;
    }

    try {
      // Create treatment note – client_id can be null for standalone/guest notes
      const { error } = await supabase
        .from('treatment_notes')
        .insert({
          practitioner_id: user.id,
          client_id: newNoteData.client_id || null,
          note_type: 'general',
          template_type: 'FREE_TEXT',
          content: newNoteData.notes.trim(),
          timestamp: new Date(newNoteData.session_date).toISOString(),
          session_id: null // Standalone note not tied to a session
        });

      if (error) throw error;

      toast.success('Treatment note created successfully!');
      setIsNewNoteModalOpen(false);
      fetchTreatmentNotes(); // Refresh the list
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create treatment note');
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedSession || !selectedSession.notes.trim()) {
      toast.error('Please enter some notes');
      return;
    }

    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({
          notes: selectedSession.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSession.id);

      if (error) {
        console.error('Error updating note:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      toast.success('Treatment note updated successfully!');
      setIsEditingNote(false);
      setIsDetailsModalOpen(false);
      fetchTreatmentNotes(); // Refresh the list
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update treatment note');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Injury Assessment': return <Stethoscope className="h-4 w-4" />;
      case 'Massage Therapy': return <UserIcon className="h-4 w-4" />;
      case 'Osteopathic Treatment': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredNotes = treatmentNotes.filter(note => {
    const matchesSearch = note.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = selectedClient === 'all' || note.client === clients.find(c => c.id === selectedClient)?.name;
    return matchesSearch && matchesClient;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treatment Notes</h1>
          <p className="text-muted-foreground">
            Document and track patient treatment progress
          </p>
        </div>
        <Button onClick={handleNewNote}>
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unifiedNotes.length}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : 'All notes & HEPs'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {treatmentNotes.filter(n => n.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Treatment sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {treatmentNotes.filter(n => n.status === 'in-progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ongoing treatments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {treatmentNotes.length > 0 
                ? Math.round(treatmentNotes.reduce((sum, note) => sum + (note.duration || 0), 0) / treatmentNotes.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Minutes per session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="unified">All Notes & HEPs</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live-notes">
              Live Notes {selectedSession && <Badge variant="secondary" className="ml-2">Active</Badge>}
            </TabsTrigger>
            <TabsTrigger value="progress">
              Progress Tracking {selectedSession && <Badge variant="secondary" className="ml-2">Active</Badge>}
            </TabsTrigger>
          </TabsList>
          {selectedSession && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedSession(null)}
              className="ml-4"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          )}
        </div>

        {/* Unified Notes Tab - Shows all treatment notes + HEPs */}
        <TabsContent value="unified">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notes List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    All Notes & HEPs
                  </CardTitle>
                  <CardDescription>
                    {unifiedNotes.length} note{unifiedNotes.length !== 1 ? 's' : ''} available
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Client Filter */}
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Search */}
                  <Input
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />

                  {/* Notes List */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {unifiedNotes
                      .filter(note => {
                        if (selectedClient !== 'all' && note.client_id !== selectedClient) return false;
                        if (searchTerm && !note.client_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                            !note.note_type.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                        return true;
                      })
                      .map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedNote?.id === note.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedNote(note)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{note.client_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(note.session_date)}
                              </p>
                            </div>
                            <Badge className={getNoteTypeColor(note.note_type)}>
                              {getNoteTypeLabel(note.note_type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    {unifiedNotes.filter(note => {
                      if (selectedClient !== 'all' && note.client_id !== selectedClient) return false;
                      if (searchTerm && !note.client_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                          !note.note_type.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                      return true;
                    }).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notes found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Note Viewer */}
            <div className="lg:col-span-2">
              {selectedNote ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedNote.note_type === 'hep' ? (
                        <Activity className="h-5 w-5" />
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                      {selectedNote.client_name}
                    </CardTitle>
                    <CardDescription>
                      {selectedNote.note_type === 'hep' ? (
                        <>Exercise Program on {formatDate(selectedNote.session_date)} • Home Exercise Program (HEP)</>
                      ) : (
                        <>Session on {formatDate(selectedNote.session_date)} • {getNoteTypeLabel(selectedNote.note_type)} Note</>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedNote.note_type === 'hep' && selectedNote.program_id ? (
                      <HEPViewer programId={selectedNote.program_id} clientId={selectedNote.client_id} />
                    ) : selectedNote.session_id ? (
                      <SOAPNotesViewer sessionId={selectedNote.session_id} />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Note content not available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Select a Note</h3>
                    <p className="text-muted-foreground">
                      Choose a note or exercise program from the list to view its contents
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Treatment Notes Overview</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading treatment notes...</div>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">No treatment notes found</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((note) => (
                    <Card 
                      key={note.id} 
                      className={`cursor-pointer transition-[border-color,background-color] duration-200 ease-out ${
                        selectedSession?.id === note.id ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`} 
                      onClick={() => setSelectedSession(note)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={undefined} />
                              <AvatarFallback>
                                {note.client.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{note.client}</CardTitle>
                              <CardDescription className="flex items-center space-x-2">
                                {getTypeIcon(note.type)}
                                <span>{note.type}</span>
                                <span>•</span>
                                <span>{note.date}</span>
                                <span>•</span>
                                <span>{note.duration}min</span>
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(note.status)}>
                              {note.status}
                            </Badge>
                            {selectedSession?.id === note.id && (
                              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                                Selected
                              </Badge>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(note);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Treatment Notes:</p>
                            <p className="text-sm leading-relaxed">{note.notes}</p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Therapist: {note.therapist}</span>
                            {note.followUp && (
                              <span>Follow-up: {note.followUp}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Notes Tab */}
        <TabsContent value="live-notes">
          {selectedSession ? (
            <EnhancedTreatmentNotes
              sessionId={selectedSession.id}
              clientId={selectedSession.client_id}
              clientName={selectedSession.client_name || selectedSession.client}
              sessionStatus={selectedSession.status}
              onNotesUpdate={(notes) => {
                // Update the session notes in the overview
                setTreatmentNotes(prev =>
                  prev.map(note =>
                    note.id === selectedSession.id
                      ? { ...note, notes: notes.map(n => n.content).join('\n\n') }
                      : note
                  )
                );
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a session to start live note-taking</p>
                  <p className="text-sm">Choose a session from the overview tab to begin documenting in real-time</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tracking Tab */}
        <TabsContent value="progress">
          {!selectedSession ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a client to track progress</p>
                  <p className="text-sm">Choose a session from the overview tab to view and manage client progress</p>
                </div>
              </CardContent>
            </Card>
          ) : resolvingProgressClientId ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                  <p>Loading client progress...</p>
                </div>
              </CardContent>
            </Card>
          ) : !resolvedProgressClientId ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Unable to load progress</p>
                  <p className="text-sm">Could not resolve client ID for this session</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ClientProgressTracker
              clientId={resolvedProgressClientId}
              clientName={selectedSession.client_name || selectedSession.client}
              sessionId={selectedSession.id}
              readOnly={false}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* New Note Modal */}
      <Dialog open={isNewNoteModalOpen} onOpenChange={setIsNewNoteModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Treatment Note</DialogTitle>
            <DialogDescription>
              Add a new treatment note. Client is optional for standalone or guest notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Client</Label>
                <Select value={newNoteData.client_id || 'none'} onValueChange={(value) => setNewNoteData(prev => ({ ...prev, client_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (standalone note)</SelectItem>
                    {clients.filter(c => c.id !== 'all').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="session-date">Session Date *</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={newNoteData.session_date}
                  onChange={(e) => setNewNoteData(prev => ({ ...prev, session_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="session-type">Session Type</Label>
                <Select value={newNoteData.session_type} onValueChange={(value) => setNewNoteData(prev => ({ ...prev, session_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Treatment Session">Treatment Session</SelectItem>
                    <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
                    <SelectItem value="Follow-up Session">Follow-up Session</SelectItem>
                    <SelectItem value="Assessment">Assessment</SelectItem>
                    <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={newNoteData.duration_minutes.toString()} onValueChange={(value) => setNewNoteData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="75">75 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Treatment Notes *</Label>
              <Textarea
                id="notes"
                value={newNoteData.notes}
                onChange={(e) => setNewNoteData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter detailed treatment notes..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewNote}>
              <Save className="mr-2 h-4 w-4" />
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedSession?.client} - {selectedSession?.type}
            </DialogTitle>
            <DialogDescription>
              Session details and treatment notes
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-6">
              {/* Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Client</p>
                      <p className="text-base">{selectedSession.client}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date</p>
                      <p className="text-base">{new Date(selectedSession.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <p className="text-base">{selectedSession.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(selectedSession.status)}>
                        {selectedSession.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Duration</p>
                      <p className="text-base">{selectedSession.duration} minutes</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Therapist</p>
                      <p className="text-base">{selectedSession.therapist}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Treatment Notes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Treatment Notes</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNote(!isEditingNote)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      {isEditingNote ? 'Cancel Edit' : 'Edit Notes'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingNote ? (
                    <div className="space-y-4">
                      <Textarea
                        value={selectedSession.notes}
                        onChange={(e) => setSelectedSession(prev => ({ ...prev, notes: e.target.value }))}
                        className="min-h-[200px]"
                        placeholder="Enter treatment notes..."
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsEditingNote(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateNote}>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedSession.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentNotes;


