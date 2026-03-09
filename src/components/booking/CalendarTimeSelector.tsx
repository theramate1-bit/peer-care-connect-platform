import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getBlocksForDate } from '@/lib/block-time-utils';
import { generate15MinuteSlotsWithStatus, generateDefault15MinuteSlotsWithStatus, ExistingBooking, TimeSlotWithStatus } from '@/lib/slot-generation-utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
  blocked: boolean;
  duration: number;
  unavailableReason?: 'booked' | 'blocked' | 'outside_hours' | 'past';
}

interface DayAvailability {
  date: Date;
  hasAvailability: boolean;
  totalSlots: number;
  availableSlots: number;
  status: 'unavailable' | 'limited' | 'available' | 'fully-booked';
}

interface CalendarTimeSelectorProps {
  therapistId: string;
  duration: number;
  requestedAppointmentType?: 'clinic' | 'mobile';
  therapistType?: 'clinic_based' | 'mobile' | 'hybrid' | null;
  selectedDate?: string;
  selectedTime?: string;
  onDateTimeSelect: (date: string, time: string) => void;
  className?: string;
}

export const CalendarTimeSelector: React.FC<CalendarTimeSelectorProps> = ({
  therapistId,
  duration,
  requestedAppointmentType = 'clinic',
  therapistType = null,
  selectedDate: initialDateStr,
  selectedTime: initialTime,
  onDateTimeSelect,
  className
}) => {
  const { toast } = useToast();
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDateStr ? new Date(initialDateStr) : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string>(initialTime || '');
  const [monthAvailability, setMonthAvailability] = useState<Map<string, DayAvailability>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Clean up expired slots on mount (helps prevent stale holds blocking bookings)
  useEffect(() => {
    const cleanupExpiredSlots = async () => {
      try {
        await supabase.rpc('release_expired_slot_holds');
      } catch (error) {
        handleApiError(error, 'cleanup expired slots');
        // Non-fatal, continue loading
      }
    };
    cleanupExpiredSlots();
  }, []); // Run once on mount

  // Update internal state when props change
  useEffect(() => {
    if (initialDateStr) {
      const newDate = new Date(initialDateStr);
      setSelectedDate(newDate);
      if (initialDateStr.substring(0, 7) !== currentMonth.toISOString().substring(0, 7)) {
        setCurrentMonth(newDate);
      }
    }
  }, [initialDateStr]);

  useEffect(() => {
    if (initialTime) {
      setSelectedTime(initialTime);
    }
  }, [initialTime]);

  // Load month availability
  useEffect(() => {
    fetchMonthAvailability();
  }, [currentMonth, therapistId, duration, requestedAppointmentType, therapistType]);

  // Load slots when date selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, duration, therapistId, requestedAppointmentType, therapistType]);

  // Real-time subscription
  useEffect(() => {
    if (!therapistId || !selectedDate) return;

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const channel = supabase
      .channel(`calendar-selector-${therapistId}-${selectedDateStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${therapistId}` }, () => {
        fetchAvailableSlots();
        fetchMonthAvailability();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_sessions', filter: `therapist_id=eq.${therapistId}` }, () => {
        fetchAvailableSlots();
        fetchMonthAvailability();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practitioner_availability', filter: `user_id=eq.${therapistId}` }, () => {
        fetchAvailableSlots();
        fetchMonthAvailability();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_holds', filter: `practitioner_id=eq.${therapistId}` }, () => {
        fetchAvailableSlots();
        fetchMonthAvailability();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [therapistId, selectedDate]);

  const fetchMonthAvailability = async () => {
    if (!therapistId) return;

    setLoadingMonth(true);
    try {
      const availability = new Map<string, DayAvailability>();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // practitioner_availability may not be in generated types; RLS allows anon read for booking calendar
      interface PractitionerAvailability {
        working_hours: Record<string, { start: string; end: string }> | null;
      }
      const { data: practitionerAvailability } = await supabase
        .from('practitioner_availability')
        .select('working_hours')
        .eq('user_id', therapistId)
        .maybeSingle() as { data: PractitionerAvailability | null; error: unknown };

      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const date = new Date(d);
        if (date < today) continue;

        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = practitionerAvailability?.working_hours?.[dayOfWeek];

        if (!daySchedule?.enabled) {
          availability.set(dateStr, {
            date,
            hasAvailability: false,
            totalSlots: 0,
            availableSlots: 0,
            status: 'unavailable'
          });
          continue;
        }

        // We assume available if enabled for month view performance
        // A more detailed check could be done if needed, but might be slow
        availability.set(dateStr, {
          date,
          hasAvailability: true,
          totalSlots: 10,
          availableSlots: 10,
          status: 'available'
        });
      }

      setMonthAvailability(availability);
    } catch (error) {
      handleApiError(error, 'fetching month availability');
    } finally {
      setLoadingMonth(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !therapistId) return;

    setLoadingSlots(true);
    try {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];

      // Fetch availability
      // practitioner_availability may not be in generated types; RLS allows anon read for booking calendar
      interface PractitionerAvailability {
        working_hours: Record<string, { start: string; end: string }> | null;
      }
      const { data: availability, error: availabilityError } = await supabase
        .from('practitioner_availability')
        .select('working_hours')
        .eq('user_id', therapistId)
        .maybeSingle() as { data: PractitionerAvailability | null; error: unknown };

      if (availabilityError) {
        console.error('Error fetching practitioner availability:', availabilityError);
        // Fallback to default slots if error (e.g. permission issue?)
        // Or handle gracefully. For now, try default.
      }

      // Fetch bookings (RLS allows anon read for availability)
      const { data: bookings, error: bookingsError } = await supabase
        .from('client_sessions')
        .select('start_time, duration_minutes, status, expires_at, appointment_type')
        .eq('therapist_id', therapistId)
        .eq('session_date', selectedDateStr)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        // If we can't fetch bookings, we might show all slots which risks double booking,
        // or show no slots. Safer to show no slots or handle error.
        // However, RLS for guests might be the issue.
      }

      // Fetch active slot holds (temporary reservations)
      // These must be excluded from available slots to prevent double-booking
      const { data: slotHolds, error: slotHoldsError } = await supabase
        .from('slot_holds')
        .select('start_time, end_time, duration_minutes, expires_at, status')
        .eq('practitioner_id', therapistId)
        .eq('session_date', selectedDateStr)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      if (slotHoldsError) {
        console.error('Error fetching slot holds:', slotHoldsError);
        // Non-fatal, continue without slot holds (may show slots that are held)
      }

      // Convert slot holds to ExistingBooking format for conflict checking
      const holdBookings: ExistingBooking[] = (slotHolds || []).map(hold => ({
        start_time: typeof hold.start_time === 'string' 
          ? (hold.start_time.includes(':') && hold.start_time.split(':').length === 3
              ? hold.start_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
              : hold.start_time)
          : '',
        duration_minutes: hold.duration_minutes || 60,
        status: 'hold',
        expires_at: hold.expires_at,
        appointment_type: requestedAppointmentType
      }));

      // Combine bookings and slot holds for conflict checking
      const existingBookings: ExistingBooking[] = [
        ...(bookings || []),
        ...holdBookings
      ];

      // Fetch blocked time
      const blocks = await getBlocksForDate(therapistId, selectedDateStr);

      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = availability?.working_hours?.[dayOfWeek];

      if (!daySchedule || !daySchedule.enabled) {
        // Not working today
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      // Use the robust slot generation utility with status
      let slotsWithStatus: TimeSlotWithStatus[] = [];
      
      if (daySchedule.hours && daySchedule.hours.length > 0) {
        // Multiple time blocks
        for (const timeBlock of daySchedule.hours) {
          const slots = generate15MinuteSlotsWithStatus(
            timeBlock.start,
            timeBlock.end,
            duration,
            existingBookings,
            blocks,
            selectedDateStr,
            {
              requestedAppointmentType,
              therapistType
            }
          );
          slotsWithStatus.push(...slots);
        }
      } else if (daySchedule.start && daySchedule.end) {
        // Legacy single block
        slotsWithStatus = generate15MinuteSlotsWithStatus(
          daySchedule.start,
          daySchedule.end,
          duration,
          existingBookings,
          blocks,
          selectedDateStr,
          {
            requestedAppointmentType,
            therapistType
          }
        );
      } else {
        // Fallback if structure is unexpected but enabled is true
        slotsWithStatus = generateDefault15MinuteSlotsWithStatus(
          duration,
          existingBookings,
          blocks,
          selectedDateStr,
          {
            requestedAppointmentType,
            therapistType
          }
        );
      }

      // Remove duplicates by time and sort
      const uniqueTimes = new Set<string>();
      const uniqueSlots = slotsWithStatus.filter(slot => {
        if (uniqueTimes.has(slot.time)) return false;
        uniqueTimes.add(slot.time);
        return true;
      }).sort((a, b) => a.time.localeCompare(b.time));

      // Convert to TimeSlot format for UI
      const slots: TimeSlot[] = uniqueSlots.map(slot => ({
        time: slot.time,
        available: slot.isAvailable,
        booked: slot.unavailableReason === 'booked',
        blocked: slot.unavailableReason === 'blocked',
        duration: duration,
        unavailableReason: slot.unavailableReason
      }));

      setAvailableSlots(slots);
    } catch (error) {
      handleApiError(error, 'fetching available slots');
      toast({ title: "Error", description: "Failed to load slots", variant: "destructive" });
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
    onDateTimeSelect(date.toISOString().split('T')[0], '');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      onDateTimeSelect(selectedDate.toISOString().split('T')[0], time);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => {
    const today = new Date();
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (newMonth >= new Date(today.getFullYear(), today.getMonth(), 1)) setCurrentMonth(newMonth);
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
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 sm:h-12" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = selectedDate && dateStr === selectedDate.toISOString().split('T')[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = date < today;
      const dayInfo = monthAvailability.get(dateStr);

      // Check if day is actually unavailable (practitioner not working)
      // dayInfo might be undefined if monthAvailability failed or logic skipped it
      const isUnavailable = !dayInfo?.hasAvailability;

      days.push(
        <button
          key={day}
          type="button"
          aria-label={isPast ? `${day} (past)` : isUnavailable ? `${day} (unavailable)` : `${day} (available)`}
          onClick={() => !isPast && !isUnavailable && handleDateSelect(date)}
          disabled={isPast || isUnavailable}
          className={cn(
            "h-10 sm:h-12 rounded-md transition-[background-color,border-color] duration-200 ease-out relative flex flex-col items-center justify-center text-sm",
            !isPast && !isUnavailable ? "hover:bg-primary/10 text-foreground font-medium" : "text-muted-foreground opacity-50 cursor-not-allowed",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary",
            !isPast && !isUnavailable && !isSelected && "bg-green-50/50"
          )}
        >
          <span>{day}</span>
          {!isPast && !isUnavailable && !isSelected && (
            <div className="w-1 h-1 rounded-full bg-green-500 absolute bottom-1" />
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4", className)}>
      <Card className="border shadow-sm">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Select Date
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} disabled={loadingMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[100px] text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} disabled={loadingMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-muted-foreground">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Available</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-300" /> Unavailable</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm flex flex-col">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Available Times
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-y-auto min-h-[300px] max-h-[300px]">
          {!selectedDate ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
              <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Select a date to see times</p>
            </div>
          ) : loadingSlots ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableSlots.map((slot, i) => (
                <Button
                  key={i}
                  variant={slot.time === selectedTime ? "default" : "outline"}
                  disabled={!slot.available}
                  onClick={() => slot.available && handleTimeSelect(slot.time)}
                  className={cn(
                    "h-10 text-xs relative",
                    !slot.available && "opacity-60 cursor-not-allowed",
                    slot.blocked && "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900"
                  )}
                  title={
                    slot.booked ? "Already booked" : 
                    slot.blocked ? "Blocked by practitioner" : 
                    slot.unavailableReason === 'past' ? "Time has passed" :
                    undefined
                  }
                >
                  <span className={cn(
                    !slot.available && "line-through decoration-2",
                    slot.blocked && "text-orange-600 dark:text-orange-400"
                  )}>
                  {formatTime(slot.time)}
                  </span>
                  {slot.blocked && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white" title="Blocked" />
                  )}
                </Button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
              <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No available slots</p>
              <p className="text-xs">Try another date</p>
            </div>
          )}
          
          {/* Legend for slot status */}
          {availableSlots.length > 0 && availableSlots.some(s => !s.available) && (
            <div className="mt-4 pt-3 border-t flex flex-wrap gap-3 text-xs text-muted-foreground justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>Unavailable</span>
              </div>
              {availableSlots.some(s => s.blocked) && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>Blocked</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
