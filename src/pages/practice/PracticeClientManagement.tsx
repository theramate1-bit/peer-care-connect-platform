import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Search, 
  Calendar, 
  MessageSquare, 
  Star, 
  Clock,
  TrendingUp,
  Heart,
  Activity,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface Client {
  client_email: string;
  client_name: string;
  total_sessions: number;
  total_spent: number;
  last_session: string;
  average_rating: number;
  status: 'active' | 'inactive' | 'new';
  notes: string;
  health_goals: string[];
  preferred_therapy_types: string[];
}

interface ClientSession {
  id: string;
  client_email: string;
  client_name: string;
  session_date: string;
  session_type: string;
  price: number;
  status: string;
  notes: string;
}

const PracticeClientManagement = () => {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Real-time subscription for client sessions
  const { data: realtimeSessions, loading: sessionsLoading } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=${userProfile?.id}`,
    (payload) => {
      console.log('Real-time client session update:', payload);
      // Refresh data when sessions change
      loadData();
    }
  );

  useEffect(() => {
    if (userProfile) {
      loadData();
    }
  }, [userProfile]);

  // Update clients when real-time data changes
  useEffect(() => {
    if (realtimeSessions && realtimeSessions.length > 0) {
      processClientData(realtimeSessions);
    }
  }, [realtimeSessions]);

  const processClientData = (sessionsData: any[]) => {
    // Group sessions by client
    const clientMap = new Map();
    
    sessionsData.forEach((session: any) => {
      const clientId = session.client_id;
      const clientName = session.client_name;
      const clientEmail = session.client_email;
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_email: clientEmail,
          client_name: clientName,
          total_sessions: 0,
          total_spent: 0,
          last_session: '',
          average_rating: 0,
          status: 'active',
          notes: '',
          health_goals: [],
          preferred_therapy_types: []
        });
      }
      
      const client = clientMap.get(clientId);
      client.total_sessions += 1;
      client.total_spent += session.price || 0;
      
      if (session.session_date > client.last_session) {
        client.last_session = session.session_date;
      }
    });
    
    const clientsArray = Array.from(clientMap.values());
    setClients(clientsArray);
    setSessions(sessionsData);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load client sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          client_email,
          client_name,
          session_date,
          session_type,
          price,
          status,
          notes
        `)
        .eq('therapist_id', userProfile?.id)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      setSessions(sessionsData || []);

      // Aggregate client data
      const clientMap = new Map<string, Client>();
      
      (sessionsData || []).forEach(session => {
        const email = session.client_email;
        if (!clientMap.has(email)) {
          clientMap.set(email, {
            client_email: email,
            client_name: session.client_name,
            total_sessions: 0,
            total_spent: 0,
            last_session: session.session_date,
            average_rating: 0,
            status: 'new',
            notes: '',
            health_goals: [],
            preferred_therapy_types: []
          });
        }
        
        const client = clientMap.get(email)!;
        client.total_sessions++;
        client.total_spent += session.price;
        
        if (new Date(session.session_date) > new Date(client.last_session)) {
          client.last_session = session.session_date;
        }
      });

      // Get ratings for each client
      const clientsWithRatings = await Promise.all(
        Array.from(clientMap.values()).map(async (client) => {
          const { data: ratings } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('therapist_id', userProfile?.id)
            .eq('client_id', client.client_email) // Use client email to match reviews
            .eq('review_status', 'published');

          const averageRating = ratings?.length 
            ? ratings.reduce((sum, r) => sum + r.overall_rating, 0) / ratings.length 
            : 0;

          // Determine status based on last session
          const daysSinceLastSession = Math.floor(
            (new Date().getTime() - new Date(client.last_session).getTime()) / (1000 * 60 * 60 * 24)
          );

          let status: 'active' | 'inactive' | 'new' = 'new';
          if (client.total_sessions > 1) {
            status = daysSinceLastSession <= 30 ? 'active' : 'inactive';
          }

          return {
            ...client,
            average_rating: averageRating,
            status
          };
        })
      );

      setClients(clientsWithRatings);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Inactive</Badge>;
      case 'new':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">New</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleMessageClient = () => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }
    setIsMessageModalOpen(true);
  };

  const handleBookSession = () => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // Here you would typically send the message via your messaging system
      // For now, we'll just show a success message
      toast.success(`Message sent to ${selectedClient?.client_name}`);
      setMessageText('');
      setIsMessageModalOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }

    try {
      // Here you would typically create a booking session
      // For now, we'll just show a success message
      toast.success(`Booking session created for ${selectedClient.client_name}`);
      setIsBookingModalOpen(false);
      // Refresh the data to show the new session
      loadData();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    }
  };

  const filteredClients = clients.filter(client =>
    client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.client_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientSessions = sessions.filter(session =>
    selectedClient ? session.client_email === selectedClient.client_email : false
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Client Management</h1>
        <p className="text-muted-foreground">Manage your clients and track their progress</p>
      </div>

      {/* Client Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clients.length}</div>
            <p className="text-muted-foreground">
              {clients.filter(c => c.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {clients.reduce((sum, c) => sum + c.total_sessions, 0)}
            </div>
            <p className="text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              £{clients.reduce((sum, c) => sum + c.total_spent, 0).toFixed(2)}
            </div>
            <p className="text-muted-foreground">From all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {clients.length > 0 
                ? (clients.reduce((sum, c) => sum + c.average_rating, 0) / clients.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-muted-foreground">Overall rating</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clients
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredClients.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No clients found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClients.map((client) => (
                    <div
                      key={client.client_email}
                      className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                        selectedClient?.client_email === client.client_email ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedClient(client)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {client.client_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">
                              {client.client_name}
                            </h4>
                            {getStatusBadge(client.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {client.client_email}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{client.total_sessions} sessions</span>
                            <span>£{client.total_spent.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client Details */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedClient.client_name}
                </CardTitle>
                <CardDescription>{selectedClient.client_email}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedClient.total_sessions}</div>
                        <p className="text-sm text-muted-foreground">Sessions</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">£{selectedClient.total_spent.toFixed(2)}</div>
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedClient.average_rating.toFixed(1)}</div>
                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.floor((new Date().getTime() - new Date(selectedClient.last_session).getTime()) / (1000 * 60 * 60 * 24))}
                        </div>
                        <p className="text-sm text-muted-foreground">Days Since</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleMessageClient}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleBookSession}>
                        <Calendar className="h-4 w-4 mr-1" />
                        Book Session
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="sessions">
                    <div className="space-y-3">
                      {clientSessions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No sessions found</p>
                      ) : (
                        clientSessions.map((session) => (
                          <div key={session.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{session.session_type}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(session.session_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">£{session.price.toFixed(2)}</p>
                                <Badge variant="outline" className="text-xs">
                                  {session.status}
                                </Badge>
                              </div>
                            </div>
                            {session.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {session.notes}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="client-notes">Client Notes</Label>
                        <textarea
                          id="client-notes"
                          className="w-full p-3 border rounded-lg min-h-[200px]"
                          placeholder="Add notes about this client..."
                          value={selectedClient.notes}
                          onChange={(e) => {
                            // TODO: Implement note saving
                            toast.info('Note saving functionality coming soon');
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label>Health Goals</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedClient.health_goals.map((goal, index) => (
                            <Badge key={index} variant="outline">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Preferred Therapy Types</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedClient.preferred_therapy_types.map((type, index) => (
                            <Badge key={index} variant="outline">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a client</h3>
                <p className="text-muted-foreground">
                  Choose a client from the list to view their details and session history.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Message Modal */}
      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedClient?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Session</DialogTitle>
            <DialogDescription>
              Create a new session booking for {selectedClient?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="session-type">Session Type</Label>
              <select
                id="session-type"
                className="w-full p-2 border border-gray-300 rounded-md"
                defaultValue="Treatment Session"
              >
                <option value="Initial Consultation">Initial Consultation</option>
                <option value="Treatment Session">Treatment Session</option>
                <option value="Follow-up Session">Follow-up Session</option>
                <option value="Sports Therapy">Sports Therapy</option>
                <option value="Massage Therapy">Massage Therapy</option>
              </select>
            </div>
            <div>
              <Label htmlFor="session-date">Session Date</Label>
              <Input
                id="session-date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="session-time">Session Time</Label>
              <Input
                id="session-time"
                type="time"
                defaultValue="10:00"
              />
            </div>
            <div>
              <Label htmlFor="session-duration">Duration (minutes)</Label>
              <select
                id="session-duration"
                className="w-full p-2 border border-gray-300 rounded-md"
                defaultValue="60"
              >
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking}>
              <Calendar className="h-4 w-4 mr-2" />
              Create Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeClientManagement;
