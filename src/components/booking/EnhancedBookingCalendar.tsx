import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { getBlocksForDate, isTimeSlotBlocked } from '@/lib/block-time-utils';
import { getCurrentDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import StripePaymentForm from '@/components/payments/StripePaymentForm';
import { PaymentIntegration } from '@/lib/payment-integration';

interface TherapistProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specializations: string[];
  hourly_rate: number;
  location: string;
  profile_verified: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
  duration: number;
}

interface DayAvailability {
  date: Date;
  hasAvailability: boolean;
  totalSlots: number;
  availableSlots: number;
  status: 'unavailable' | 'limited' | 'available' | 'fully-booked';
}

interface EnhancedBookingCalendarProps {
  therapist: TherapistProfile;
  onBookingComplete?: (bookingId: string) => void;
}

export const EnhancedBookingCalendar: React.FC<EnhancedBookingCalendarProps> = ({
  therapist,
  onBookingComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [monthAvailability, setMonthAvailability] = useState<Map<string, DayAvailability>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState(false);
  
  // Booking state
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [sessionType, setSessionType] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const DURATION_OPTIONS = [30, 45, 60, 90, 120];
  const SESSION_TYPES = [
    'Initial Consultation',
    'Treatment Session',
    'Follow-up Session',
    'Rehabilitation',
    'Maintenance Care',
    'Sports Therapy',
    'Massage Therapy',
    'Osteopathy',
    'Other'
  ];

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

  // Load month availability on mount and when month changes
  useEffect(() => {
    fetchMonthAvailability();
  }, [currentMonth, therapist, selectedDuration]);

  // Load day slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedDuration, therapist]);

  // Real-time subscription for the selected date
  useEffect(() => {
    if (!therapist?.user_id || !selectedDate) return;

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const channel = supabase
      .channel(`enhanced-booking-${therapist.user_id}-${selectedDateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${therapist.user_id}`
        },
        (payload: any) => {
          const eventDate = payload.new?.start_time || payload.old?.start_time;
          if (eventDate && typeof eventDate === 'string' && eventDate.startsWith(selectedDateStr)) {
            fetchAvailableSlots();
            fetchMonthAvailability(); // Refresh month view too
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_sessions',
          filter: `therapist_id=eq.${therapist.user_id}`
        },
        (payload: any) => {
          const sessionDate = payload.new?.session_date || payload.old?.session_date;
          if (sessionDate === selectedDateStr) {
            fetchAvailableSlots();
            fetchMonthAvailability();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practitioner_availability',
          filter: `user_id=eq.${therapist.user_id}`
        },
        () => {
          fetchAvailableSlots();
          fetchMonthAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [therapist?.user_id, selectedDate]);

  const fetchMonthAvailability = async () => {
    if (!therapist) return;

    setLoadingMonth(true);
    try {
      const availability = new Map<string, DayAvailability>();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const today = getCurrentDate();

      // Fetch practitioner availability
      const { data: practitionerAvailability } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', therapist.user_id)
        .maybeSingle();

      if (!practitionerAvailability?.working_hours) {
        setMonthAvailability(availability);
        return;
      }

      // Fetch all bookings and blocks for the month
      const { data: bookings } = await supabase
        .from('client_sessions')
        .select('session_date, start_time, duration_minutes, status, expires_at')
        .eq('therapist_id', therapist.user_id)
        .gte('session_date', firstDay.toISOString().split('T')[0])
        .lte('session_date', lastDay.toISOString().split('T')[0])
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      // Check each day in the month
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const date = new Date(d);
        if (date < today) continue; // Skip past dates

        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = practitionerAvailability.working_hours[dayOfWeek];

        if (!daySchedule?.enabled || !daySchedule?.hours?.length) {
          availability.set(dateStr, {
            date,
            hasAvailability: false,
            totalSlots: 0,
            availableSlots: 0,
            status: 'unavailable'
          });
          continue;
        }

        // Get blocks for this date
        const blocks = await getBlocksForDate(therapist.user_id, dateStr);

        // Calculate available slots
        let totalSlots = 0;
        let availableSlots = 0;
        const serviceDurationHours = selectedDuration / 60;
        const nowIso = new Date().toISOString();

        daySchedule.hours.forEach((timeBlock: any) => {
          const startHour = parseInt(timeBlock.start.split(':')[0]);
          const endHour = parseInt(timeBlock.end.split(':')[0]);
          
          for (let hour = startHour; hour < endHour; hour++) {
            const slotEndHour = hour + serviceDurationHours;
            if (slotEndHour > endHour) continue;
            
            totalSlots++;
            const timeString = `${hour.toString().padStart(2, '0')}:00`;
            
            // Check for booking conflicts
            const isBooked = bookings?.some(booking => {
              if (booking.session_date !== dateStr) return false;
              if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
                return false;
              }
              const bookingStart = parseInt(booking.start_time.split(':')[0]);
              const bookingEnd = bookingStart + Math.ceil(booking.duration_minutes / 60);
              return bookingStart < slotEndHour && bookingEnd > hour;
            }) || false;

            const isBlocked = isTimeSlotBlocked(timeString, selectedDuration, blocks, dateStr);

            if (!isBooked && !isBlocked) {
              availableSlots++;
            }
          }
        });

        let status: 'unavailable' | 'limited' | 'available' | 'fully-booked' = 'unavailable';
        if (availableSlots === 0 && totalSlots > 0) {
          status = 'fully-booked';
        } else if (availableSlots > 0 && availableSlots < totalSlots * 0.5) {
          status = 'limited';
        } else if (availableSlots >= totalSlots * 0.5) {
          status = 'available';
        }

        availability.set(dateStr, {
          date,
          hasAvailability: availableSlots > 0,
          totalSlots,
          availableSlots,
          status
        });
      }

      setMonthAvailability(availability);
    } catch (error) {
      console.error('Error fetching month availability:', error);
    } finally {
      setLoadingMonth(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !therapist) return;

    setLoadingSlots(true);
    try {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const serviceDurationHours = selectedDuration / 60;

      const { data: availability } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', therapist.user_id)
        .maybeSingle();

      const { data: existingBookings } = await supabase
        .from('client_sessions')
        .select('start_time, duration_minutes, status, expires_at')
        .eq('therapist_id', therapist.user_id)
        .eq('session_date', selectedDateStr)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      const blocks = await getBlocksForDate(therapist.user_id, selectedDateStr);

      const slots: TimeSlot[] = [];
      const nowIso = new Date().toISOString();

      if (availability?.working_hours) {
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = availability.working_hours[dayOfWeek];

        if (daySchedule?.enabled && daySchedule?.hours?.length) {
          daySchedule.hours.forEach((timeBlock: any) => {
            const startHour = parseInt(timeBlock.start.split(':')[0]);
            const endHour = parseInt(timeBlock.end.split(':')[0]);
            
            for (let hour = startHour; hour < endHour; hour++) {
              const slotEndHour = hour + serviceDurationHours;
              if (slotEndHour > endHour) continue;
              
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              
              const isBooked = existingBookings?.some(booking => {
                if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
                  return false;
                }
                const bookingStart = parseInt(booking.start_time.split(':')[0]);
                const bookingEnd = bookingStart + Math.ceil(booking.duration_minutes / 60);
                return bookingStart < slotEndHour && bookingEnd > hour;
              }) || false;

              const isBlocked = isTimeSlotBlocked(timeString, selectedDuration, blocks, selectedDateStr);

              slots.push({
                time: timeString,
                available: !isBooked && !isBlocked,
                booked: isBooked,
                duration: selectedDuration
              });
            }
          });
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive"
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const getDayStyle = (date: Date): string => {
    const dateStr = date.toISOString().split('T')[0];
    const dayInfo = monthAvailability.get(dateStr);
    const today = getCurrentDate();

    if (date < today) {
      return 'text-muted-foreground opacity-40 cursor-not-allowed';
    }

    if (!dayInfo) {
      return 'text-muted-foreground';
    }

    switch (dayInfo.status) {
      case 'available':
        return 'bg-green-100 text-green-900 hover:bg-green-200 font-medium';
      case 'limited':
        return 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200';
      case 'fully-booked':
        return 'bg-gray-100 text-gray-500 cursor-not-allowed';
      case 'unavailable':
      default:
        return 'text-muted-foreground opacity-60';
    }
  };

  const getDayBadge = (date: Date): React.ReactNode => {
    const dateStr = date.toISOString().split('T')[0];
    const dayInfo = monthAvailability.get(dateStr);

    if (!dayInfo?.hasAvailability) return null;

    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          dayInfo.status === 'available' && "bg-green-500",
          dayInfo.status === 'limited' && "bg-yellow-500"
        )} />
      </div>
    );
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Fix: Convert Sunday=0 to Monday=0 (week starts on Monday)
    // JavaScript getDay() returns 0-6 (Sunday-Saturday)
    // We need 0-6 (Monday-Sunday), so: (day + 6) % 7
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-16" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = selectedDate && dateStr === selectedDate.toISOString().split('T')[0];
      const today = getCurrentDate();
      const isPast = date < today;
      const dayInfo = monthAvailability.get(dateStr);

      days.push(
        <button
          key={day}
          onClick={() => !isPast && dayInfo?.hasAvailability && setSelectedDate(date)}
          disabled={isPast || !dayInfo?.hasAvailability}
          className={cn(
            "h-16 rounded-lg transition-[background-color,border-color] duration-200 ease-out relative flex flex-col items-center justify-center",
            getDayStyle(date),
            isSelected && "ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground hover:bg-primary"
          )}
        >
          <span className="text-sm font-medium">{day}</span>
          {dayInfo?.hasAvailability && (
            <span className="text-xs mt-0.5">
              {dayInfo.availableSlots} left
            </span>
          )}
          {getDayBadge(date)}
        </button>
      );
    }

    return days;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !user || !sessionType) {
      toast({
        title: "Missing Information",
        description: "Please select a date, time, and session type",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    try {
      const estimatedPrice = (therapist.hourly_rate / 60) * selectedDuration;
      const totalAmount = estimatedPrice > 0 ? estimatedPrice : 50;
      
      const { data: sessionData, error: bookingError } = await supabase
        .from('client_sessions')
        .insert({
          therapist_id: therapist.user_id,
          client_name: `${user.user_metadata?.first_name || 'Client'} ${user.user_metadata?.last_name || ''}`,
          client_email: user.email,
          session_date: selectedDate.toISOString().split('T')[0],
          start_time: selectedTime,
          duration_minutes: selectedDuration,
          session_type: sessionType,
          price: totalAmount,
          notes: notes,
          status: 'scheduled',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const payment = await PaymentIntegration.createSessionPayment({
        sessionId: sessionData.id,
        practitionerId: therapist.user_id,
        clientId: user.id,
        amount: Math.round(totalAmount * 100),
        currency: 'gbp',
        description: `${sessionType} on ${selectedDate.toISOString().split('T')[0]} at ${selectedTime}`
      });

      if (!payment.success || !payment.paymentIntentId) {
        throw new Error(payment.error || 'Failed to create payment');
      }

      toast({
        title: "Booking Created!",
        description: "Please complete payment to confirm your session.",
      });

      setPaymentIntentId(payment.paymentIntentId);
      setShowPaymentForm(true);

      if (onBookingComplete) {
        onBookingComplete(sessionData.id);
      }

      setSelectedTime('');
      setSessionType('');
      setNotes('');

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) {
      return 'Not selected';
    }
    
    const timeWithoutSeconds = time.split(':').length === 3 ? time.substring(0, 5) : time;
    const [hours, minutes] = timeWithoutSeconds.split(':');
    
    if (!hours || !minutes) return 'Not selected';
    
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    if (isNaN(hour) || isNaN(minute)) return 'Invalid time';
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
  };

  const calculatePrice = () => {
    return (therapist.hourly_rate / 60) * selectedDuration;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    const today = getCurrentDate();
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (newMonth >= new Date(today.getFullYear(), today.getMonth(), 1)) {
      setCurrentMonth(newMonth);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Book with {therapist.first_name} {therapist.last_name}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {therapist.location}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              £{therapist.hourly_rate}/hour
            </div>
            {therapist.profile_verified && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
              <span>Highly Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
              <span>Limited Availability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
              <span>Fully Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500 border-2 border-blue-600" />
              <span>Selected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMonth}
                  disabled={loadingMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  disabled={loadingMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(duration => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMonth ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendar()}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {selectedDate ? `Available Times - ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a date from the calendar</p>
                <p className="text-sm mt-1">Days with availability are highlighted</p>
              </div>
            ) : loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={slot.time === selectedTime ? "default" : "outline"}
                    disabled={!slot.available}
                    onClick={() => handleTimeSelect(slot.time)}
                    className={cn(
                      "h-12 relative",
                      !slot.available && "opacity-50"
                    )}
                  >
                    {formatTime(slot.time)}
                    {!slot.available && slot.booked && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No available slots</p>
                <p className="text-sm mt-1">Try a different date or duration</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Form */}
      {selectedDate && selectedTime && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Session Type *</label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific requirements..."
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Booking Summary</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(selectedTime)} • {selectedDuration} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">£{calculatePrice().toFixed(2)}</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleBooking} 
              disabled={booking || !sessionType}
              className="w-full"
              size="lg"
            >
              {booking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Booking...
                </>
              ) : (
                `Confirm Booking - £${calculatePrice().toFixed(2)}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && paymentIntentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Complete Payment</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPaymentForm(false)}
              >
                ×
              </Button>
            </div>
            
            <StripePaymentForm
              amount={Math.round(calculatePrice() * 100)}
              currency="gbp"
              description={`Session with ${therapist.first_name} ${therapist.last_name}`}
              onSuccess={(paymentIntent) => {
                toast({
                  title: "Payment Successful!",
                  description: "Your booking is confirmed.",
                });
                setShowPaymentForm(false);
                setPaymentIntentId(null);
                setSelectedTime('');
                setSessionType('');
                setNotes('');
                if (onBookingComplete) {
                  onBookingComplete(paymentIntent.id);
                }
              }}
              onError={(error) => {
                toast({
                  title: "Payment Failed",
                  description: error.message || "Please try again.",
                  variant: "destructive"
                });
              }}
              metadata={{
                session_id: paymentIntentId,
                therapist_id: therapist.user_id,
                session_type: sessionType,
                duration: selectedDuration
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
