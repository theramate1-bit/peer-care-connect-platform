import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Filter, Calendar, User, Stethoscope, TrendingUp, X, Save, Edit } from 'lucide-react';
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
import { useRealtimeSubscription } from '@/hooks/use-realtime';

const TreatmentNotes = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [treatmentNotes, setTreatmentNotes] = useState([]);
  const [clients, setClients] = useState([{ id: 'all', name: 'All Clients' }]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
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

  // Real-time subscription for treatment notes/sessions
  const { data: realtimeSessions, loading: sessionsLoading } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=${user?.id}`,
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

  const fetchTreatmentNotes = async () => {
    if (!user?.id) {
      console.error('No user ID available');
      toast.error('Please sign in to view treatment notes');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching sessions for user:', user.id);
      
      // Fetch treatment notes/sessions
      const { data: sessions, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user.id as any)
        .order('session_date', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to load sessions: ${error.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      console.log('Sessions found:', sessions?.length || 0);
      console.log('Sessions data:', sessions);

      if (!sessions) {
        console.error('No sessions data returned');
        toast.error('No sessions found');
        return;
      }

      // Transform sessions into treatment notes format
      const notes = sessions.map((session: any) => ({
        id: session.id,
        client: session.client_name || 'Unknown Client',
        client_name: session.client_name || 'Unknown Client', // Keep original field name
        date: session.session_date,
        type: session.session_type || 'Treatment Session',
        status: session.status || 'completed',
        notes: session.notes || 'No notes recorded',
        therapist: user?.user_metadata?.first_name || 'Therapist',
        client_id: session.client_id,
        duration: Number(session.duration_minutes) || 60,
        duration_minutes: Number(session.duration_minutes) || 60, // Keep original field name
        session_date: session.session_date, // Keep original field name
        session_type: session.session_type || 'Treatment Session', // Keep original field name
        followUp: null // follow_up_date doesn't exist in schema
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

      // If no sessions found, create some test sessions
      if (sessions.length === 0) {
        console.log('No sessions found for user, creating test sessions...');
        await createTestSessions();
        // Don't refetch here to avoid infinite loop - the test sessions will be visible on next page load
      }
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

      const { error } = await supabase
        .from('client_sessions')
        .insert(testSessions as any);

      if (error) {
        console.error('Error creating test sessions:', error);
        toast.error('Failed to create test sessions');
      } else {
        console.log('Test sessions created successfully');
        toast.success('Test sessions created for demonstration');
      }
    } catch (error) {
      console.error('Error creating test sessions:', error);
      toast.error('Failed to create test sessions');
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
    if (!newNoteData.client_id || !newNoteData.session_date || !newNoteData.notes.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Get client name from the clients list
      const selectedClient = clients.find(c => c.id === newNoteData.client_id);
      const clientName = selectedClient ? selectedClient.name : 'Unknown Client';

      const { error } = await supabase
        .from('client_sessions')
        .insert({
          client_id: newNoteData.client_id,
          client_name: clientName,
          therapist_id: user.id,
          session_date: newNoteData.session_date,
          start_time: '09:00', // Default start time for note entries
          session_type: newNoteData.session_type,
          notes: newNoteData.notes,
          duration_minutes: newNoteData.duration_minutes,
          status: newNoteData.status as any,
          price: 0, // Free note entry
          payment_status: 'completed'
        } as any);

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
          notes: selectedSession.notes
        } as any)
        .eq('id', selectedSession.id);

      if (error) throw error;

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
      case 'Massage Therapy': return <User className="h-4 w-4" />;
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
            <div className="text-2xl font-bold">{treatmentNotes.length}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : 'All time notes'}
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
          <TabsList className="grid w-full grid-cols-3">
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
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
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
          {selectedSession ? (
            <ClientProgressTracker
              clientId={selectedSession.client_id}
              clientName={selectedSession.client_name || selectedSession.client}
              sessionId={selectedSession.id}
            />
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a client to track progress</p>
                  <p className="text-sm">Choose a session from the overview tab to view and manage client progress</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* New Note Modal */}
      <Dialog open={isNewNoteModalOpen} onOpenChange={setIsNewNoteModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Treatment Note</DialogTitle>
            <DialogDescription>
              Add a new treatment note for a client session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Client *</Label>
                <Select value={newNoteData.client_id} onValueChange={(value) => setNewNoteData(prev => ({ ...prev, client_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
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
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
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