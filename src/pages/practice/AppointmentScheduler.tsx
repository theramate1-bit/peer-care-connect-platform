import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Filter, ChevronLeft, ChevronRight, Settings, Users, AlertCircle, CheckCircle, X, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

const AppointmentScheduler = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newAppointment, setNewAppointment] = useState({
    client_name: '',
    client_email: '',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    duration_minutes: 60,
    session_type: 'Treatment Session',
    notes: '',
    status: 'scheduled'
  });
  const [availability, setAvailability] = useState({
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '15:00', enabled: false },
    sunday: { start: '10:00', end: '15:00', enabled: false }
  });

  // Real-time subscription for appointments
  const { data: realtimeAppointments, loading: appointmentsLoading } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=${user?.id}`,
    (payload) => {
      console.log('Real-time appointment update:', payload);
      // Refresh appointments when sessions change
      fetchAppointments();
    }
  );

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, currentDate]);

  // Update appointments when real-time data changes
  useEffect(() => {
    if (realtimeAppointments && realtimeAppointments.length > 0) {
      // Filter appointments for current date range
      const today = new Date().toISOString().split('T')[0];
      const filteredAppointments = realtimeAppointments.filter(apt => 
        apt.session_date >= today
      );
      setAppointments(filteredAppointments);
    }
  }, [realtimeAppointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('Fetching appointments for user:', user?.id);
      
      const { data, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }
      
      console.log('Appointments found:', data?.length || 0);
      console.log('Appointments data:', data);
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      case 'no_show': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      toast.success('Appointment status updated');
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const handleCreateAppointment = async () => {
    if (!newAppointment.client_name || !newAppointment.client_email || !newAppointment.session_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('client_sessions')
        .insert({
          client_name: newAppointment.client_name,
          client_email: newAppointment.client_email,
          therapist_id: user?.id,
          session_date: newAppointment.session_date,
          start_time: newAppointment.start_time,
          duration_minutes: newAppointment.duration_minutes,
          session_type: newAppointment.session_type,
          notes: newAppointment.notes,
          status: newAppointment.status,
          price: 0,
          payment_status: 'pending'
        } as any);

      if (error) throw error;
      
      toast.success('Appointment created successfully');
      setShowAddDialog(false);
      setNewAppointment({
        client_name: '',
        client_email: '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        duration_minutes: 60,
        session_type: 'Treatment Session',
        notes: '',
        status: 'scheduled'
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const hasAppointment = appointments.some(apt => apt.start_time === time);
        slots.push({ time, hasAppointment });
      }
    }
    return slots;
  };

  const timeSlots = getTimeSlots();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointment Scheduler</h1>
          <p className="text-muted-foreground">
            Manage your appointments and availability
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={view} onValueChange={(value: 'day' | 'week' | 'month') => setView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'confirmed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to go
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'scheduled').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Scheduled appointments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.reduce((total, apt) => total + (apt.duration_minutes || 0), 0) / 60}
            </div>
            <p className="text-xs text-muted-foreground">
              Hours scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Schedule</CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <div
                  key={slot.time}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    slot.hasAppointment 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{slot.time}</span>
                  </div>
                  {slot.hasAppointment && (
                    <Badge variant="secondary">Booked</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} />
                    <AvatarFallback>
                      {appointment.client_name?.split(' ').map(n => n[0]).join('') || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {appointment.client_name}
                      </p>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {appointment.start_time} • {appointment.duration_minutes}min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.session_type}
                    </p>
                    {appointment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Availability Settings</span>
              </CardTitle>
              <CardDescription>
                Set your working hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(availability).map(([day, settings]) => (
                <div key={day} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(checked) => 
                        setAvailability(prev => ({
                          ...prev,
                          [day]: { ...prev[day], enabled: checked }
                        }))
                      }
                    />
                    <div>
                      <h3 className="font-medium capitalize">{day}</h3>
                      <p className="text-sm text-muted-foreground">
                        {settings.enabled ? `${settings.start} - ${settings.end}` : 'Not available'}
                      </p>
                    </div>
                  </div>
                  {settings.enabled && (
                    <div className="flex space-x-2">
                      <Input
                        type="time"
                        value={settings.start}
                        onChange={(e) => 
                          setAvailability(prev => ({
                            ...prev,
                            [day]: { ...prev[day], start: e.target.value }
                          }))
                        }
                        className="w-24"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={settings.end}
                        onChange={(e) => 
                          setAvailability(prev => ({
                            ...prev,
                            [day]: { ...prev[day], end: e.target.value }
                          }))
                        }
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    // TODO: Implement save availability functionality
                    toast.info('Save availability functionality coming soon!');
                  }}
                >
                  Save Availability
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Analytics</CardTitle>
              <CardDescription>
                Insights into your appointment patterns and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground">Analytics Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed appointment analytics and insights will be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Appointment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment with a client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Client Name *</Label>
              <Input
                id="client-name"
                value={newAppointment.client_name}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label htmlFor="client-email">Client Email *</Label>
              <Input
                id="client-email"
                type="email"
                value={newAppointment.client_email}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, client_email: e.target.value }))}
                placeholder="Enter client email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session-date">Date *</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={newAppointment.session_date}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, session_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newAppointment.start_time}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <select
                  id="duration"
                  value={newAppointment.duration_minutes}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
              <div>
                <Label htmlFor="session-type">Session Type</Label>
                <select
                  id="session-type"
                  value={newAppointment.session_type}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, session_type: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="Initial Consultation">Initial Consultation</option>
                  <option value="Treatment Session">Treatment Session</option>
                  <option value="Follow-up Session">Follow-up Session</option>
                  <option value="Sports Therapy">Sports Therapy</option>
                  <option value="Massage Therapy">Massage Therapy</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this appointment..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAppointment}>
              <Plus className="h-4 w-4 mr-2" />
              Create Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentScheduler;