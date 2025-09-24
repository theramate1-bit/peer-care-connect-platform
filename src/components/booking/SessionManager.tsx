import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Edit3,
  MessageSquare,
  PhoneCall,
  Video,
  MapPin as LocationIcon
} from 'lucide-react';

interface ClientSession {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number;
  notes: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  location: string;
  session_notes: string;
  created_at: string;
  updated_at: string;
}

interface SessionManagerProps {
  view?: 'today' | 'upcoming' | 'all';
}

export const SessionManager: React.FC<SessionManagerProps> = ({ view = 'today' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ClientSession | null>(null);
  const [editingSession, setEditingSession] = useState<ClientSession | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, view, statusFilter, dateFilter]);

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user.id)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply view filters
      if (view === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('session_date', today);
      } else if (view === 'upcoming') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('session_date', today);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      if (dateFilter) {
        query = query.eq('session_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (sessionId: string, newStatus: ClientSession['status']) => {
    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: newStatus, updated_at: new Date().toISOString() }
          : session
      ));

      toast({
        title: "Status Updated",
        description: `Session status changed to ${newStatus.replace('_', ' ')}`,
      });

      // Close editing if this was the selected session
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setEditingSession(null);
      }
    } catch (error) {
      console.error('Error updating session status:', error);
      toast({
        title: "Error",
        description: "Failed to update session status",
        variant: "destructive"
      });
    }
  };

  const updateSessionNotes = async (sessionId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({ 
          session_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, session_notes: notes, updated_at: new Date().toISOString() }
          : session
      ));

      toast({
        title: "Notes Updated",
        description: "Session notes saved successfully",
      });
    } catch (error) {
      console.error('Error updating session notes:', error);
      toast({
        title: "Error",
        description: "Failed to save session notes",
        variant: "destructive"
      });
    }
  };

  const cancelSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'cancelled', updated_at: new Date().toISOString() }
          : session
      ));

      toast({
        title: "Session Cancelled",
        description: "The session has been cancelled",
      });
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Error",
        description: "Failed to cancel session",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      case 'no_show': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSessionActions = (session: ClientSession) => {
    const actions = [];

    if (session.status === 'scheduled') {
      actions.push(
        <Button
          key="confirm"
          size="sm"
          onClick={() => updateSessionStatus(session.id, 'confirmed')}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Confirm
        </Button>
      );
    }

    if (session.status === 'confirmed') {
      actions.push(
        <Button
          key="start"
          size="sm"
          onClick={() => updateSessionStatus(session.id, 'in_progress')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Start Session
        </Button>
      );
    }

    if (session.status === 'in_progress') {
      actions.push(
        <Button
          key="complete"
          size="sm"
          onClick={() => updateSessionStatus(session.id, 'completed')}
          className="bg-green-600 hover:bg-green-700"
        >
          Complete
        </Button>
      );
    }

    if (['scheduled', 'confirmed'].includes(session.status)) {
      actions.push(
        <Button
          key="cancel"
          size="sm"
          variant="destructive"
          onClick={() => cancelSession(session.id)}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading sessions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session Management</h2>
          <p className="text-muted-foreground">
            Manage your client sessions and appointments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Filter by date"
            className="w-40"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {sessions.filter(s => s.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {sessions.filter(s => ['scheduled', 'confirmed'].includes(s.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  {sessions.filter(s => s.payment_status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">No sessions found</p>
              <p>There are no sessions matching your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">{session.client_name}</h3>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPaymentStatusColor(session.payment_status)}>
                        {session.payment_status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(session.session_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(session.start_time)} ({session.duration_minutes} min)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <LocationIcon className="h-4 w-4" />
                        <span>{session.location || 'Location TBD'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{session.client_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{session.client_phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">£{session.price}</span>
                      </div>
                    </div>

                    {session.notes && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Client Notes:</p>
                        <p className="text-sm">{session.notes}</p>
                      </div>
                    )}

                    {session.session_notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Session Notes:</p>
                        <p className="text-sm">{session.session_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {getSessionActions(session)}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSession(session)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Session Management Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Session</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSession(null)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={selectedSession.status}
                    onValueChange={(value) => updateSessionStatus(selectedSession.id, value as ClientSession['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Payment Status</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <Badge className={getPaymentStatusColor(selectedSession.payment_status)}>
                      {selectedSession.payment_status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label>Session Notes</Label>
                <Textarea
                  value={selectedSession.session_notes || ''}
                  onChange={(e) => setSelectedSession({...selectedSession, session_notes: e.target.value})}
                  placeholder="Add session notes..."
                  rows={4}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => updateSessionNotes(selectedSession.id, selectedSession.session_notes || '')}
                >
                  Save Notes
                </Button>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSession(null)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    cancelSession(selectedSession.id);
                    setSelectedSession(null);
                  }}
                >
                  Cancel Session
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
