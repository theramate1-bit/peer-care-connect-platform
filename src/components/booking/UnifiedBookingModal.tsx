import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SessionNotifications } from '@/lib/session-notifications';
import { getBlocksForDate, isTimeSlotBlocked } from '@/lib/block-time-utils';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  Mail, 
  Phone,
  CreditCard,
  CheckCircle,
  Star,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface Therapist {
  id: string;
  first_name?: string;
  last_name?: string;
  user_role?: string;
  bio?: string;
  location?: string;
  hourly_rate?: number;
  experience_years?: number;
  specializations?: string[];
}

interface UnifiedBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapist: Therapist;
  onBookingComplete?: (sessionId: string) => void;
}

export const UnifiedBookingModal: React.FC<UnifiedBookingModalProps> = ({
  open,
  onOpenChange,
  therapist,
  onBookingComplete
}) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  // Service state
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  
  // Load practitioner products
  useEffect(() => {
    if (open) {
      const loadServices = async () => {
        const { data } = await supabase
          .from('practitioner_products')
          .select('*')
          .eq('practitioner_id', therapist.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        setServices(data || []);
        if (data && data.length > 0) {
          // Set first service as selected - duration will be auto-set by another useEffect
          setSelectedServiceId(data[0].id);
        } else {
          setSelectedServiceId('');
        }
      };
      loadServices();
    }
  }, [open, therapist.id]);
  
  // Booking form state
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  
  // Client info (for non-authenticated users)
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);


  // Duration options
  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Auto-set duration and session type from selected service
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const selectedService = services.find(s => s.id === selectedServiceId);
      if (selectedService) {
        // Use service duration if available, otherwise keep current duration
        if (selectedService.duration_minutes) {
          setDuration(selectedService.duration_minutes);
        }
        // Auto-populate session type from service name
        if (selectedService.name) {
          setSessionType(selectedService.name);
        }
      }
    }
  }, [selectedServiceId, services]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedDate(undefined);
      setSelectedTime('');
      setSessionType('');
      setDuration(60);
      // Reset service selection
      if (services.length > 0) {
        setSelectedServiceId(services[0].id);
      } else {
        setSelectedServiceId('');
      }
      setNotes('');
      
      // Pre-fill client info if user is authenticated
      if (user && userProfile) {
        setClientName(`${userProfile.first_name} ${userProfile.last_name}`);
        setClientEmail(user.email || '');
      } else {
        setClientName('');
        setClientEmail('');
        setClientPhone('');
      }
    }
  }, [open, user, userProfile]);

  // Clean up expired slots on mount
  useEffect(() => {
    const cleanupExpiredSlots = async () => {
      try {
        await supabase.rpc('release_expired_slot_holds');
      } catch (error) {
        console.error('Failed to cleanup expired slots:', error);
      }
    };
    cleanupExpiredSlots();
  }, []); // Run once on mount

  // Fetch available time slots when date is selected
  useEffect(() => {
    if (selectedDate && therapist.id) {
      fetchAvailableSlots();

      // Set up real-time subscription
      const channel = supabase
        .channel(`availability-unified-${therapist.id}-${selectedDate.toISOString()}`)
        // Listen to postgres_changes for client_sessions (bookings)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_sessions',
            filter: `therapist_id=eq.${therapist.id}`
          },
          (payload: any) => {
            const sessionDate = payload.new?.session_date || payload.old?.session_date;
            if (sessionDate === selectedDate.toISOString().split('T')[0]) {
              fetchAvailableSlots();
            }
          }
        )
        // Listen to postgres_changes for calendar_events (blocked time)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calendar_events',
            filter: `user_id=eq.${therapist.id}`
          },
          (payload: any) => {
            const newEventType = payload.new?.event_type;
            const oldEventType = payload.old?.event_type;
            if (newEventType === 'block' || newEventType === 'unavailable' || 
                oldEventType === 'block' || oldEventType === 'unavailable') {
              const eventDate = payload.new?.start_time || payload.old?.start_time;
              const selectedDateStr = selectedDate.toISOString().split('T')[0];
              if (eventDate && typeof eventDate === 'string' && eventDate.startsWith(selectedDateStr)) {
                fetchAvailableSlots();
              }
            }
          }
        )
        // Listen to postgres_changes for practitioner_availability
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'practitioner_availability',
            filter: `user_id=eq.${therapist.id}`
          },
          () => {
            // Always refresh if availability changes
            fetchAvailableSlots();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedDate, therapist.id, duration]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !therapist.id) return;
    
    setLoadingSlots(true);
    try {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const serviceDuration = duration || 60;
      const serviceDurationHours = serviceDuration / 60;

      // 1. Fetch practitioner availability (working hours)
      const { data: availability, error: availabilityError } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', therapist.id)
        .maybeSingle();
      
      if (availabilityError) {
        console.error('Error fetching availability:', availabilityError);
        setAvailableSlots([]);
        return;
      }

      // If no availability data, return empty (or default)
      if (!availability || !availability.working_hours) {
        setAvailableSlots([]);
        return;
      }

      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = availability.working_hours[dayOfWeek];

      // Day not configured or explicitly disabled - no slots
      if (!daySchedule || daySchedule.enabled !== true) {
        setAvailableSlots([]);
        return;
      }

      // Must have either hours array (new format) or start/end (legacy format)
      const hasHoursArray = daySchedule.hours && Array.isArray(daySchedule.hours) && daySchedule.hours.length > 0;
      const hasLegacyFormat = daySchedule.start && daySchedule.end;
      if (!hasHoursArray && !hasLegacyFormat) {
        setAvailableSlots([]);
        return;
      }

      // 2. Fetch existing bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('client_sessions')
        .select('start_time, duration_minutes, status, expires_at')
        .eq('session_date', selectedDateStr)
        .in('status', ['scheduled', 'pending_payment', 'confirmed'])
        .or(`therapist_id.eq.${therapist.id},client_id.eq.${therapist.id}`);
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
      }

      // 3. Fetch blocked times
      const blocks = await getBlocksForDate(therapist.id, selectedDateStr);

      // 4. Generate available slots (support both hours array and legacy start/end)
      const timeSlots: string[] = [];
      const nowIso = new Date().toISOString();

      const timeBlocks: { start: string; end: string }[] = hasHoursArray
        ? daySchedule.hours
        : [{ start: daySchedule.start, end: daySchedule.end }];

      for (const timeBlock of timeBlocks) {
        const startHour = parseInt(timeBlock.start.split(':')[0]);
        const endHour = parseInt(timeBlock.end.split(':')[0]);

        for (let hour = startHour; hour < endHour; hour++) {
          // Check if slot can fit the service duration
          const slotEndHour = hour + serviceDurationHours;
          if (slotEndHour > endHour) {
            continue;
          }

          const timeString = `${hour.toString().padStart(2, '0')}:00`;

          // Check for booking conflicts
          const isBooked = bookings?.some(booking => {
            // Skip expired pending_payment sessions
            if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
              return false;
            }
            const bookingStart = parseInt(booking.start_time.split(':')[0]);
            const bookingEnd = bookingStart + Math.ceil(booking.duration_minutes / 60);
            return bookingStart < slotEndHour && bookingEnd > hour;
          });

          // Check for blocked time
          const isBlocked = isTimeSlotBlocked(timeString, serviceDuration, blocks, selectedDateStr);

          if (!isBooked && !isBlocked) {
            timeSlots.push(timeString);
          }
        }
      }

      setAvailableSlots(timeSlots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        title: "Error",
        description: "Failed to load available times",
        variant: "destructive"
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedDate || !selectedTime || !selectedServiceId) {
        toast({
          title: "Missing Information",
          description: "Please select a date, time, and service package",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (step === 2) {
      if (!user && (!clientName || !clientEmail)) {
        toast({
          title: "Missing Information",
          description: "Please provide your name and email",
          variant: "destructive"
        });
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleBooking = async () => {
    if (!therapist || !selectedDate || !selectedTime || !selectedServiceId) return;

    setLoading(true);
    try {
      // Calculate price from selected service (required)
      if (!selectedServiceId) {
        toast({
          title: "Service Required",
          description: "Please select a service package",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const svc = services.find(s => s.id === selectedServiceId);
      if (!svc) {
        toast({
          title: "Service Not Found",
          description: "Selected service not found. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Use service duration if service is selected, otherwise use selected duration
      const finalDuration = svc.duration_minutes || duration;
      const totalAmount = svc.price_amount / 100;
      
      // Generate idempotency key
      const clientId = user?.id || 'anonymous';
      const idempotencyKey = `${clientId}-${therapist.id}-${selectedDate.toISOString().split('T')[0]}-${selectedTime}-${Date.now()}`;

      // Create booking using RPC function with validation
      const { data: bookingResult, error: rpcError } = await supabase
        .rpc('create_booking_with_validation', {
          p_therapist_id: therapist.id,
          p_client_id: clientId,
          p_client_name: user ? `${userProfile?.first_name} ${userProfile?.last_name}` : clientName,
          p_client_email: user ? user.email : clientEmail,
          p_session_date: selectedDate.toISOString().split('T')[0],
          p_start_time: selectedTime,
          p_duration_minutes: finalDuration,
          p_session_type: sessionType || services.find(s => s.id === selectedServiceId)?.name || 'Session',
          p_price: totalAmount,
          p_client_phone: user ? userProfile?.phone : clientPhone || null,
          p_notes: notes || null,
          p_payment_status: 'pending',
          p_status: 'scheduled',
          p_idempotency_key: idempotencyKey
        });

      if (rpcError) throw rpcError;

      // Check RPC response (RPC returns JSONB, need to type assert)
      const result = bookingResult as any;
      if (!result || !result.success) {
        const errorCode = result?.error_code || 'UNKNOWN_ERROR';
        const errorMessage = result?.error_message || 'Failed to create booking';
        
        if (errorCode === 'CONFLICT_BOOKING' || errorCode === 'CONFLICT_BLOCKED') {
          toast({
            title: "Time Slot Unavailable",
            description: errorMessage,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Get the created session ID and fetch full data
      const sessionId = result.session_id;
      const { data: sessionData, error: fetchError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Send booking notification to practitioner
      await SessionNotifications.sendNotification({
        trigger: 'booking_created',
        sessionId: sessionData.id,
        clientId: clientId,
        practitionerId: therapist.id,
        sessionDate: selectedDate.toISOString().split('T')[0],
        sessionTime: selectedTime,
        sessionType: sessionType,
        practitionerName: `${therapist.first_name} ${therapist.last_name}`
      });

      toast({
        title: "Booking Created!",
        description: "Your session has been scheduled successfully",
      });

      onBookingComplete?.(sessionData.id);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    const svc = selectedServiceId ? services.find(s => s.id === selectedServiceId) : undefined;
    
    if (svc) {
      return (svc.price_amount / 100).toFixed(2);
    }
    
    return '0.00';
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Therapist Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {therapist.first_name?.[0]}{therapist.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {therapist.first_name} {therapist.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {therapist.user_role?.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">4.8</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Verified
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <div>
              <Label className="text-base font-medium">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border mt-2"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <Label className="text-base font-medium">Select Time</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading available times...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedTime === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(slot)}
                          className="justify-center"
                        >
                          {slot}
                        </Button>
                      ))
                    ) : (
                      <div className="col-span-3 py-4 px-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                        <span className="font-medium">{therapist.first_name || 'This practitioner'} is not available on {selectedDate && format(selectedDate, 'EEEE, MMMM d')}.</span>
                        <p className="text-xs mt-1 text-amber-700">Please select a different date to see available times.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Service Selection */}
            {services.length > 0 && (
              <div>
                <Label className="text-base font-medium">Service Package</Label>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a service package" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - £{(service.price_amount / 100).toFixed(2)} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}


            {/* Duration - Show read-only for services */}
            {selectedServiceId && services.length > 0 ? (
              <div>
                <Label className="text-base font-medium">Duration</Label>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">
                    {(() => {
                      const selectedService = services.find(s => s.id === selectedServiceId);
                      return selectedService ? `${selectedService.duration_minutes} minutes` : `${duration} minutes`;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration is set by the selected service package
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Booking Summary */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Therapist:</span>
                    <span>{therapist.first_name} {therapist.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{selectedDate && format(selectedDate, 'PPP')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{selectedTime}</span>
                  </div>
                  {selectedServiceId && (() => {
                    const selectedService = services.find(s => s.id === selectedServiceId);
                    return selectedService ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span>{selectedService.name}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{(() => {
                      const svc = selectedServiceId ? services.find(s => s.id === selectedServiceId) : undefined;
                      return svc ? svc.duration_minutes : duration;
                    })()} minutes</span>
                  </div>
                  {selectedServiceId && (() => {
                    const selectedService = services.find(s => s.id === selectedServiceId);
                    return selectedService ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span>{selectedService.name}</span>
                      </div>
                    ) : null;
                  })()}
                  {notes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Notes:</span>
                      <span className="text-right max-w-xs truncate">{notes}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>£{getTotalPrice()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            {!user && (
              <div className="space-y-4">
                <h3 className="text-base font-medium">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Full Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="clientPhone">Phone (Optional)</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requests or information for your therapist..."
                rows={3}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Final Confirmation */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Book?</h3>
              <p className="text-muted-foreground">
                Review your booking details and confirm to schedule your session.
              </p>
            </div>

            {/* Final Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session with:</span>
                    <span className="font-medium">{therapist.first_name} {therapist.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">When:</span>
                    <span className="font-medium">
                      {selectedDate && format(selectedDate, 'PPP')} at {selectedTime}
                    </span>
                  </div>
                  {selectedServiceId && selectedServiceId !== 'hourly' && (() => {
                    const selectedService = services.find(s => s.id === selectedServiceId);
                    return selectedService ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{selectedService.name}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{(() => {
                      const svc = selectedServiceId ? services.find(s => s.id === selectedServiceId) : undefined;
                      return svc ? svc.duration_minutes : duration;
                    })()} minutes</span>
                  </div>
                  {selectedServiceId && (() => {
                    const selectedService = services.find(s => s.id === selectedServiceId);
                    return selectedService ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{selectedService.name}</span>
                      </div>
                    ) : null;
                  })()}
                  {notes && (
                    <div className="flex flex-col gap-1 pt-2 border-t">
                      <span className="text-muted-foreground text-sm">Additional Notes:</span>
                      <span className="text-sm font-medium">{notes}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total Cost:</span>
                    <span>£{getTotalPrice()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Payment</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Payment will be processed after your session is confirmed by the therapist.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Select Date & Time";
      case 2: return "Review & Confirm";
      case 3: return "Final Confirmation";
      default: return "Book Session";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{getStepTitle()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex-1 h-2 rounded-full ${
                  stepNumber <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={step === 1 ? () => onOpenChange(false) : handleBack}
              disabled={loading}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
              </Button>
            ) : (
              <Button onClick={handleBooking} disabled={loading}>
                {loading ? 'Booking...' : 'Confirm Booking'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
