import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ClientManagement = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Fetch clients who have sessions with this therapist
      const { data: sessions, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          users!client_sessions_client_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('therapist_id', user?.id)
        .order('session_date', { ascending: false });

      if (error) throw error;

      // Group sessions by client and create client objects
      const clientMap = new Map();
      
      sessions?.forEach(session => {
        const clientId = session.client_id;
        const clientData = session.users;
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            id: clientId,
            name: `${clientData.first_name} ${clientData.last_name}`,
            email: clientData.email,
            phone: clientData.phone || 'No phone',
            status: 'active',
            lastSession: session.session_date,
            totalSessions: 1,
            avatar: null
          });
        } else {
          const existingClient = clientMap.get(clientId);
          existingClient.totalSessions += 1;
          // Keep the most recent session date
          if (new Date(session.session_date) > new Date(existingClient.lastSession)) {
            existingClient.lastSession = session.session_date;
          }
        }
      });

      setClients(Array.from(clientMap.values()));
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground">
            Manage your athlete clients and their treatment progress
          </p>
        </div>
        <Button
          onClick={() => {
            // TODO: Implement add client functionality
            toast.info('Add client functionality coming soon!');
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : 'All time clients'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((total, client) => total + client.totalSessions, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.length > 0 ? (clients.reduce((total, client) => total + client.totalSessions, 0) / clients.length).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per client
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clients</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // TODO: Implement filter functionality
                  toast.info('Filter functionality coming soon!');
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading clients...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {clients
                .filter(client => 
                  client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.email.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={client.avatar || undefined} />
                    <AvatarFallback>
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {client.email} • {client.phone}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last session: {client.lastSession} • {client.totalSessions} sessions
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit Client</DropdownMenuItem>
                      <DropdownMenuItem>View Sessions</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Remove Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientManagement;