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
import { hasValidAvailability } from '@/lib/profile-completion';

type AppointmentSchedulerProps = { embedded?: boolean; className?: string };

const AppointmentScheduler = ({ embedded, className }: AppointmentSchedulerProps) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  // Practitioner preferences state
  const [practitionerPreferences, setPractitionerPreferences] = useState<{
    default_session_time: string;
    default_duration_minutes: number;
    default_session_type: string;
  } | null>(null);

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
      fetchAvailability();
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

  // Load practitioner preferences
  const loadPractitionerPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('practitioner_availability')
        .select('default_session_time, default_duration_minutes, default_session_type, working_hours')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        const preferences = {
          default_session_time: data.default_session_time || '10:00',
          default_duration_minutes: data.default_duration_minutes || 60,
          default_session_type: data.default_session_type || 'Treatment Session'
        };
        setPractitionerPreferences(preferences);
        
        // Update new appointment form with preferences
        setNewAppointment(prev => ({
          ...prev,
          start_time: preferences.default_session_time,
          duration_minutes: preferences.default_duration_minutes,
          session_type: preferences.default_session_type
        }));

        if (data.working_hours) {
          setAvailability(data.working_hours);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const fetchAvailability = async () => {
    await loadPractitionerPreferences();
  };

  // Real-time subscription for practitioner preferences
  useRealtimeSubscription(
    'practitioner_availability',
    `user_id=eq.${user?.id}`,
    async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await loadPractitionerPreferences();
      }
    }
  );

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
      // Check for conflicts before creating
      const { data: conflictingBookings, error: conflictError } = await supabase
        .from('client_sessions')
        .select('id, start_time, duration_minutes, status, expires_at, client_name, session_type')
        .eq('therapist_id', user?.id)
        .eq('session_date', newAppointment.session_date)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      if (conflictError) {
        console.error('Error checking conflicts:', conflictError);
      }

      // Check for overlapping bookings
      const nowIso = new Date().toISOString();
      const bookingStart = new Date(`${newAppointment.session_date}T${newAppointment.start_time}`);
      const bookingEnd = new Date(bookingStart.getTime() + newAppointment.duration_minutes * 60000);

      const hasConflict = conflictingBookings?.some((booking: any) => {
        // Skip expired pending_payment sessions
        if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
          return false;
        }

        const existingStart = new Date(`${newAppointment.session_date}T${booking.start_time}`);
        const existingEnd = new Date(existingStart.getTime() + (booking.duration_minutes || 60) * 60000);

        // Check for overlap (including 15-minute buffer)
        const bufferMs = 15 * 60000; // 15 minutes in milliseconds
        return (
          (bookingStart < existingEnd && bookingEnd > existingStart) ||
          (bookingStart >= existingEnd && bookingStart < new Date(existingEnd.getTime() + bufferMs)) ||
          (existingStart >= bookingEnd && existingStart < new Date(bookingEnd.getTime() + bufferMs))
        );
      });

      if (hasConflict) {
        const conflictingBooking = conflictingBookings?.find((booking: any) => {
          const existingStart = new Date(`${newAppointment.session_date}T${booking.start_time}`);
          const existingEnd = new Date(existingStart.getTime() + (booking.duration_minutes || 60) * 60000);
          const bufferMs = 15 * 60000;
          return (
            (bookingStart < existingEnd && bookingEnd > existingStart) ||
            (bookingStart >= existingEnd && bookingStart < new Date(existingEnd.getTime() + bufferMs)) ||
            (existingStart >= bookingEnd && existingStart < new Date(bookingEnd.getTime() + bufferMs))
          );
        });

        const conflictMessage = conflictingBooking
          ? `This time slot conflicts with an existing appointment: ${conflictingBooking.client_name || 'Client'} at ${conflictingBooking.start_time} (${conflictingBooking.session_type || 'Session'}). Please select another time.`
          : 'This time slot conflicts with an existing appointment. Please select another time.';

        toast.error(conflictMessage, {
          duration: 5000
        });
        return;
      }

      // Check for blocked time
      const { data: blockedTime, error: blockedError } = await supabase
        .from('calendar_events')
        .select('id, start_time, end_time, event_type, title')
        .eq('user_id', user?.id)
        .in('event_type', ['block', 'unavailable'])
        .eq('status', 'confirmed');

      if (blockedError) {
        console.error('Error checking blocked time:', blockedError);
      }

      const hasBlockedTime = blockedTime?.some((block: any) => {
        const blockStart = new Date(block.start_time);
        const blockEnd = new Date(block.end_time);
        return bookingStart < blockEnd && bookingEnd > blockStart;
      });

      if (hasBlockedTime) {
        const block = blockedTime?.find((block: any) => {
          const blockStart = new Date(block.start_time);
          const blockEnd = new Date(block.end_time);
          return bookingStart < blockEnd && bookingEnd > blockStart;
        });

        const blockType = block?.event_type === 'block' ? 'blocked' : 'unavailable';
        const blockTitle = block?.title ? `: ${block.title}` : '';
        toast.error(`This time slot is ${blockType}${blockTitle}. Please select another time.`, {
          duration: 5000
        });
        return;
      }

      // No conflicts, proceed with creation
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
          start_time: practitionerPreferences?.default_session_time || '10:00',
          duration_minutes: practitionerPreferences?.default_duration_minutes || 60,
          session_type: practitionerPreferences?.default_session_type || 'Treatment Session',
          notes: '',
          status: 'scheduled'
        });
      fetchAppointments();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      
      // Check if it's a conflict error from database trigger
      if (error?.code === '23505' || error?.message?.includes('conflict') || error?.message?.includes('overlap')) {
        toast.error('This time slot conflicts with an existing appointment. Please select another time.', {
          duration: 5000
        });
      } else {
        toast.error(error?.message || 'Failed to create appointment');
      }
    }
  };

  const handleSaveAvailability = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    try {
      setSavingAvailability(true);

      // Use shared validation function for consistency
      if (!hasValidAvailability(availability)) {
        toast.error('Please enable at least one day with valid working hours');
        setSavingAvailability(false);
        return;
      }

      // Fetch existing timezone or use default
      const { data: existing } = await supabase
        .from('practitioner_availability')
        .select('timezone')
        .eq('user_id', user.id)
        .maybeSingle();

      // Save availability to database
      const { error } = await supabase
        .from('practitioner_availability')
        .upsert({
          user_id: user.id,
          working_hours: availability,
          timezone: existing?.timezone || 'Europe/London',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      toast.success('Availability settings saved successfully');
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability settings');
    } finally {
      setSavingAvailability(false);
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
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      {!embedded && (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedule & Availability</h1>
        <p className="text-muted-foreground">
          Set your working hours and availability
        </p>
      </div>
      )}

      {/* Availability Interface */}
      <div className="space-y-6">
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
                  onClick={handleSaveAvailability}
                  disabled={savingAvailability}
                >
                  {savingAvailability ? 'Saving...' : 'Save Availability'}
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>

    </div>
  );
};

export default AppointmentScheduler;