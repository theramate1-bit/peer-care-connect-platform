import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Clock, MapPin, User as UserIcon, ChevronLeft, ChevronRight, Search, X, Phone, Mail, ExternalLink, FileText, Settings, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addDays, subDays, startOfMonth, endOfMonth, isSameDay, isSameMonth, getDay } from "date-fns";
import { getBlocksForDate, type BlockedTime } from "@/lib/block-time-utils";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { BlockTimeManager } from "@/components/practice/BlockTimeManager";
import { AvailabilitySettings } from "@/components/practice/AvailabilitySettings";
import { getSessionLocation } from "@/utils/sessionLocation";
import { getDisplaySessionStatus, getDisplaySessionStatusLabel } from "@/lib/session-display-status";

interface BookingEvent {
  id: string;
  date: Date;
  title: string;
  time: string;
  duration: number;
  status: string;
  type: 'client' | 'peer' | 'guest';
  bookingType: 'treatment_exchange' | 'client' | 'guest';
  role: 'providing' | 'receiving';
  clientName?: string;
  therapistName?: string;
  sessionType?: string;
  location?: string;
  price?: number;
  is_peer_booking?: boolean;
  client_id?: string | null;
  payment_status?: string | null;
}

interface BookingCalendarProps {
  userType: 'therapist' | 'client';
}

type ViewMode = 'day' | 'week' | 'month';

export const BookingCalendar = ({ userType }: BookingCalendarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(() => {
    const today = getCurrentDate();
    return today;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string[]>(['client', 'peer', 'guest']);
  const [categorySearch, setCategorySearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blockedTimes, setBlockedTimes] = useState<Record<string, BlockedTime[]>>({});
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<BookingEvent | null>(null);
  const [practitionerAvailability, setPractitionerAvailability] = useState<{
    working_hours: any;
    timezone: string | null;
  } | null>(null);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [blockedTimeModalOpen, setBlockedTimeModalOpen] = useState(false);

  const formatTime = (timeStr: string): string => {
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  const formatTimeDisplay = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'am' : 'pm';
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      let allBookings: BookingEvent[] = [];

      if (userType === 'therapist') {
        // Calculate date range based on current view
        const today = getCurrentDate();
        const startDate = viewMode === 'day' 
          ? format(currentDate, 'yyyy-MM-dd')
          : viewMode === 'week'
          ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          : format(startOfMonth(currentDate), 'yyyy-MM-dd');
        
        const endDate = viewMode === 'day'
          ? format(currentDate, 'yyyy-MM-dd')
          : viewMode === 'week'
          ? format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          : format(endOfMonth(currentDate), 'yyyy-MM-dd');

        // Fetch all sessions where user is therapist OR client (for reciprocal bookings)
        // Include all active statuses, not just completed
        // Include both regular client sessions and peer bookings (treatment exchanges)
        const { data: allSessions } = await supabase
          .from('client_sessions')
          .select(`
            *,
            therapist:users!client_sessions_therapist_id_fkey(
              first_name,
              last_name,
              location,
              clinic_address
            ),
            client:users!client_sessions_client_id_fkey(
              first_name,
              last_name
            )
          `)
          .or(`therapist_id.eq.${user?.id},client_id.eq.${user?.id}`)
          .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
          .not('status', 'eq', 'cancelled')
          .not('status', 'eq', 'no_show')
          .gte('session_date', startDate)
          .lte('session_date', endDate);

        if (allSessions) {
          const sessionBookings: BookingEvent[] = allSessions.map(session => {
            const isTherapist = session.therapist_id === user?.id;
            const isClient = session.client_id === user?.id;
            
            let bookingType: 'treatment_exchange' | 'client' | 'guest' = 'client';
            if (session.is_peer_booking) {
              bookingType = 'treatment_exchange';
            } else if (session.is_guest_booking === true) {
              bookingType = 'guest';
            }
            // Do not infer guest from !client_id or missing join — use is_guest_booking only.
            
            const role: 'providing' | 'receiving' = isTherapist ? 'providing' : 'receiving';
            
            const { sessionLocation } = getSessionLocation(session, session.therapist);
            return {
              id: session.id,
              date: new Date(session.session_date),
              title: session.session_type || (session.is_peer_booking ? 'Treatment Exchange' : bookingType === 'guest' ? 'Guest Session' : 'Client Session'),
              time: formatTime(session.start_time),
              duration: session.duration_minutes,
              status: getDisplaySessionStatus(session),
              payment_status: session.payment_status,
              type: session.is_peer_booking ? 'peer' : bookingType === 'guest' ? 'guest' : 'client',
              bookingType,
              role,
              clientName: isTherapist 
                ? (session.client_name || `${session.client?.first_name || ''} ${session.client?.last_name || ''}`.trim() || 'Client')
                : undefined,
              therapistName: isClient
                ? `${session.therapist?.first_name || ''} ${session.therapist?.last_name || ''}`.trim() || 'Practitioner'
                : undefined,
              sessionType: session.session_type,
              price: session.price,
              is_peer_booking: session.is_peer_booking,
              client_id: session.client_id,
              location: sessionLocation || undefined,
            };
          });
          allBookings = [...allBookings, ...sessionBookings];
        }
      } else {
        const { data: clientSessions } = await supabase
          .from('client_sessions')
          .select(`
            *,
            therapist:users!client_sessions_therapist_id_fkey(
              first_name,
              last_name,
              location,
              clinic_address
            )
          `)
          .eq('client_id', user?.id)
          .eq('status', 'completed')
          .not('status', 'eq', 'cancelled')
          .not('status', 'eq', 'no_show');

        if (clientSessions) {
          const clientBookings: BookingEvent[] = clientSessions.map(session => {
            let bookingType: 'treatment_exchange' | 'client' | 'guest' = 'client';
            if (session.is_peer_booking) {
              bookingType = 'treatment_exchange';
            } else if (session.is_guest_booking === true) {
              bookingType = 'guest';
            }
            // Do not infer guest from !client_id or missing join — use is_guest_booking only.
            
            const { sessionLocation } = getSessionLocation(session, session.therapist);
            return {
              id: session.id,
              date: new Date(session.session_date),
              title: session.session_type || 'Therapy Session',
              time: formatTime(session.start_time),
              duration: session.duration_minutes,
              status: getDisplaySessionStatus(session),
              payment_status: session.payment_status,
              type: session.is_peer_booking ? 'peer' : bookingType === 'guest' ? 'guest' : 'client',
              bookingType,
              role: 'receiving' as const,
              therapistName: `${session.therapist?.first_name || ''} ${session.therapist?.last_name || ''}`.trim() || 'Practitioner',
              sessionType: session.session_type,
              price: session.price,
              is_peer_booking: session.is_peer_booking,
              client_id: session.client_id,
              location: sessionLocation || undefined,
            };
          });
          allBookings = clientBookings;
        }
      }

      setBookings(allBookings);
      setError(null);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [user, userType, currentDate, viewMode]);

  // Update selectedBookingForModal when bookings change to reflect latest status
  useEffect(() => {
    if (selectedBookingForModal && bookings.length > 0) {
      const updatedBooking = bookings.find(b => b.id === selectedBookingForModal.id);
      if (updatedBooking && updatedBooking.status !== selectedBookingForModal.status) {
        setSelectedBookingForModal(updatedBooking);
      }
    }
  }, [bookings, selectedBookingForModal?.id]);

  // Fetch blocked times - defined before useEffects that use it
  const fetchBlockedTimes = useCallback(async () => {
    if (!user || userType !== 'therapist') return;
    
    try {
      const datesToFetch: Date[] = [];
      
      if (viewMode === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        datesToFetch.push(...eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 1 }) }));
      } else if (viewMode === 'day') {
        datesToFetch.push(currentDate);
      } else {
        // Month view - fetch for visible days
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        datesToFetch.push(...eachDayOfInterval({ start, end }));
      }

      const blocksMap: Record<string, BlockedTime[]> = {};
      
      for (const date of datesToFetch) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const blocks = await getBlocksForDate(user.id, dateStr);
        if (blocks.length > 0) {
          blocksMap[dateStr] = blocks;
        }
      }
      
      console.log('[BLOCKED TIME] Fetched blocks for dates:', Object.keys(blocksMap), 'Total blocks:', Object.values(blocksMap).flat().length);
      setBlockedTimes(blocksMap);
    } catch (error) {
      console.error('Error fetching blocked times:', error);
    }
  }, [user, userType, currentDate, viewMode]);

  // Fetch practitioner availability
  const fetchPractitionerAvailability = useCallback(async () => {
    if (userType !== 'therapist' || !user?.id) {
      setPractitionerAvailability(null);
      return;
    }

    try {
      const { data: availability, error } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching practitioner availability:', error);
        setPractitionerAvailability(null);
        return;
      }

      setPractitionerAvailability(availability || null);
    } catch (error) {
      console.error('Error fetching practitioner availability:', error);
      setPractitionerAvailability(null);
    }
  }, [user, userType]);

  useEffect(() => {
    if (user) {
      fetchBookings();
      fetchBlockedTimes();
      fetchPractitionerAvailability();
    }
  }, [user, userType, currentDate, viewMode, fetchBookings, fetchBlockedTimes, fetchPractitionerAvailability]);

  // Real-time subscription for client_sessions to update calendar in real-time
  useRealtimeSubscription(
    'client_sessions',
    userType === 'therapist' 
      ? `therapist_id=eq.${user?.id}` 
      : `client_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update in calendar:', payload);
      // Refresh bookings when sessions change (status, price, etc.)
      if (user) {
        fetchBookings();
      }
    }
  );

  // Real-time subscription for practitioner_availability to update time slots
  useRealtimeSubscription(
    'practitioner_availability',
    userType === 'therapist' && user?.id ? `user_id=eq.${user.id}` : 'user_id=eq.null',
    (payload) => {
      console.log('Real-time availability update in calendar:', payload);
      // Refresh availability when it changes
      if (userType === 'therapist' && user) {
        fetchPractitionerAvailability();
      }
    }
  );

  // Real-time subscription for calendar_events (blocked time) to update calendar
  useRealtimeSubscription(
    'calendar_events',
    userType === 'therapist' && user?.id ? `user_id=eq.${user.id}` : 'user_id=eq.null',
    (payload) => {
      console.log('Real-time blocked time update in calendar:', payload);
      // Refresh blocked times when they change
      if (userType === 'therapist' && user) {
        fetchBlockedTimes();
      }
    }
  );


  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(booking.date, date) && categoryFilter.includes(booking.type)
    );
  };

  const getBlockedTimesForDate = (date: Date): BlockedTime[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedTimes[dateStr] || [];
  };

  const getBookingTypeColor = (booking: BookingEvent) => {
    if (booking.bookingType === 'treatment_exchange') {
      return 'bg-blue-50 border-blue-200 text-blue-900';
    } else if (booking.bookingType === 'guest') {
      return 'bg-gray-50 border-gray-200 text-gray-900';
    } else {
      return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const handleBookingClick = (booking: BookingEvent) => {
    setSelectedBookingForModal(booking);
    setBookingModalOpen(true);
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'client': return 'Clients';
      case 'peer': return 'Treatment Exchange';
      case 'guest': return 'Guests';
      default: return type;
    }
  };

  const getCategoryCount = (type: string) => {
    return bookings.filter(b => b.type === type).length;
  };

  const getCategoryPercentage = (type: string) => {
    const total = bookings.length;
    if (total === 0) return 0;
    return Math.round((getCategoryCount(type) / total) * 100);
  };

  // Helper function to convert time string (HH:MM) to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to convert minutes to time string (HH:MM)
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Get day name from date (lowercase, e.g., "monday")
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  };

  // Get week days helper
  const getWeekDays = () => {
    try {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } catch (error) {
      console.error('Error calculating week days:', error);
      return [currentDate];
    }
  };

  // Calculate time range for week view (earliest start, latest end across all enabled days)
  const getWeekTimeRange = useCallback((): { startHour: number; endHour: number; startMinutes: number; endMinutes: number } => {
    const defaultStart = 9; // 9am
    const defaultEnd = 17; // 5pm

    if (!practitionerAvailability?.working_hours) {
      return { startHour: defaultStart, endHour: defaultEnd, startMinutes: defaultStart * 60, endMinutes: defaultEnd * 60 };
    }

    try {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start, end });
      
      let earliestStart = 24 * 60; // Start with latest possible time
      let latestEnd = 0; // Start with earliest possible time
      let hasEnabledDay = false;

      weekDays.forEach(day => {
        const dayName = getDayName(day);
        const daySchedule = practitionerAvailability.working_hours[dayName];
        
        if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
          hasEnabledDay = true;
          const startMins = timeToMinutes(daySchedule.start);
          const endMins = timeToMinutes(daySchedule.end);
          
          if (startMins < earliestStart) {
            earliestStart = startMins;
          }
          if (endMins > latestEnd) {
            latestEnd = endMins;
          }
        }
      });

      if (!hasEnabledDay) {
        return { startHour: defaultStart, endHour: defaultEnd, startMinutes: defaultStart * 60, endMinutes: defaultEnd * 60 };
      }

      return {
        startHour: Math.floor(earliestStart / 60),
        endHour: Math.ceil(latestEnd / 60),
        startMinutes: earliestStart,
        endMinutes: latestEnd
      };
    } catch (error) {
      console.error('Error calculating week time range:', error);
      return { startHour: defaultStart, endHour: defaultEnd, startMinutes: defaultStart * 60, endMinutes: defaultEnd * 60 };
    }
  }, [practitionerAvailability, currentDate]);

  // Calculate time range for day view (specific day's working hours)
  const getDayTimeRange = useCallback((date: Date): { startHour: number; endHour: number; startMinutes: number; endMinutes: number } => {
    const defaultStart = 9; // 9am
    const defaultEnd = 17; // 5pm

    if (!practitionerAvailability?.working_hours) {
      return { startHour: defaultStart, endHour: defaultEnd, startMinutes: defaultStart * 60, endMinutes: defaultEnd * 60 };
    }

    const dayName = getDayName(date);
    const daySchedule = practitionerAvailability.working_hours[dayName];

    if (!daySchedule?.enabled || !daySchedule.start || !daySchedule.end) {
      return { startHour: defaultStart, endHour: defaultEnd, startMinutes: defaultStart * 60, endMinutes: defaultEnd * 60 };
    }

    const startMins = timeToMinutes(daySchedule.start);
    const endMins = timeToMinutes(daySchedule.end);

    return {
      startHour: Math.floor(startMins / 60),
      endHour: Math.ceil(endMins / 60),
      startMinutes: startMins,
      endMinutes: endMins
    };
  }, [practitionerAvailability]);

  // Calculate overall time range for month view (earliest/latest across all enabled days)
  const getMonthTimeRange = useCallback((): { startHour: number; endHour: number; startMinutes: number; endMinutes: number } => {
    const defaultStart = 9; // 9am
    const defaultEnd = 17; // 5pm

    if (!practitionerAvailability?.working_hours) {
      return { startHour: defaultStart, endHour: defaultEnd, startMinutes: defaultStart * 60, endMinutes: defaultEnd * 60 };
    }

    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let earliestStart = 24 * 60;
    let latestEnd = 0;
    let hasEnabledDay = false;

    dayNames.forEach(dayName => {
      const daySchedule = practitionerAvailability.working_hours[dayName];
      
      if (daySchedule?.enabled && daySchedule.start && daySchedule.end) {
        hasEnabledDay = true;
        const startMins = timeToMinutes(daySchedule.start);
        const endMins = timeToMinutes(daySchedule.end);
        
        if (startMins < earliestStart) {
          earliestStart = startMins;
        }
        if (endMins > latestEnd) {
          latestEnd = endMins;
        }
      }
    });

    if (!hasEnabledDay) {
      return { startHour: defaultStart, endHour: defaultEnd, startMinutes: defaultStart * 60, endMinutes: defaultEnd * 60 };
    }

    return {
      startHour: Math.floor(earliestStart / 60),
      endHour: Math.ceil(latestEnd / 60),
      startMinutes: earliestStart,
      endMinutes: latestEnd
    };
  }, [practitionerAvailability]);

  // Get current time range based on view mode
  const getCurrentTimeRange = useCallback((): { startHour: number; endHour: number; startMinutes: number; endMinutes: number } => {
    if (viewMode === 'day') {
      return getDayTimeRange(currentDate);
    } else if (viewMode === 'week') {
      return getWeekTimeRange();
    } else {
      return getMonthTimeRange();
    }
  }, [viewMode, currentDate, getDayTimeRange, getWeekTimeRange, getMonthTimeRange]);

  // Generate dynamic time slots based on current time range
  const timeRange = getCurrentTimeRange();
  const timeSlots = Array.from(
    { length: timeRange.endHour - timeRange.startHour + 1 },
    (_, i) => timeRange.startHour + i
  );
  
  // Generate 15-minute time slots for day view based on dynamic time range
  const get15MinuteSlots = () => {
    const dayRange = getDayTimeRange(currentDate);
    const slots = [];
    for (let hour = dayRange.startHour; hour <= dayRange.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Skip slots that are outside the actual working hours
        const slotMinutes = hour * 60 + minute;
        if (slotMinutes >= dayRange.startMinutes && slotMinutes < dayRange.endMinutes) {
          slots.push({ hour, minute });
        }
      }
    }
    return slots;
  };

  const getBookingPosition = (booking: BookingEvent) => {
    const [hours, minutes] = booking.time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + booking.duration;
    
    // Get the time range for the booking's date
    const bookingDate = booking.date;
    const dayRange = getDayTimeRange(bookingDate);
    const rangeDuration = dayRange.endMinutes - dayRange.startMinutes;
    
    // Calculate position relative to the dynamic start time
    const startPercent = ((startMinutes - dayRange.startMinutes) / rangeDuration) * 100;
    const heightPercent = (booking.duration / rangeDuration) * 100;
    
    return { top: startPercent, height: heightPercent };
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    } else {
      // month view
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1));
        return newDate;
      });
    }
  };

  const weekDays = viewMode === 'week' ? getWeekDays() : [currentDate];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  if (loading) {
    return (
      <Card className="border border-gray-200 bg-white shadow-sm rounded-xl w-full">
        <CardContent className="p-8">
          <div className="flex h-96 items-center justify-center text-sm text-gray-500">
            Loading calendar...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
  return (
      <Card className="border border-gray-200 bg-white shadow-sm rounded-xl w-full">
        <CardContent className="p-8">
          <div className="flex h-96 items-center justify-center text-sm text-red-500">
            {error}
        </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full" data-testid="booking-calendar">
      {/* Grid Container - 12 column system */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* Main Calendar Area - 9 columns */}
        <main className="lg:col-span-9 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {format(currentDate, 'MMMM, yyyy')}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {userType === 'therapist' && (
                <>
                      <Button
                        variant="outline"
                    size="sm"
                    onClick={() => setAvailabilityModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Manage Availability
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlockedTimeModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    Block Time
                  </Button>
                </>
              )}
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex text-sm font-medium">
                <button
                  onClick={() => setViewMode('day')}
                        className={cn(
                    "px-4 py-1.5 rounded-md transition-colors",
                    viewMode === 'day'
                      ? "bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    "px-4 py-1.5 rounded-md transition-colors",
                    viewMode === 'week'
                      ? "bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    "px-4 py-1.5 rounded-md transition-colors",
                    viewMode === 'month'
                      ? "bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  Month
                </button>
                              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                            </div>
                          </div>
                        </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            {viewMode === 'week' && (
              <div className="w-full min-w-0">
                {/* Day Headers */}
                <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                  <div className="py-4 border-r border-slate-200 dark:border-slate-700"></div>
                  {weekDays.map((day, idx) => {
                    const isSelected = isSameDay(day, currentDate);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "py-3 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0",
                          isSelected && "bg-blue-50/50 dark:bg-blue-900/10"
                        )}
                      >
                        <span className={cn(
                          "block text-xs font-semibold uppercase",
                          isSelected ? "text-primary dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                        )}>
                          {format(day, 'EEE')}
                        </span>
                        {isSelected ? (
                          <div className="w-8 h-8 rounded-full bg-primary dark:bg-slate-600 text-white flex items-center justify-center mx-auto mt-1 text-sm font-bold shadow-md">
                            {format(day, 'd')}
                          </div>
                        ) : (
                          <span className="block text-xl font-bold text-slate-900 dark:text-white mt-1">
                            {format(day, 'd')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                        </div>
                        
                {/* Time Grid */}
                <div className="relative grid grid-cols-8">
                  {/* Time Column */}
                  <div className="col-span-1 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
                    {timeSlots.map((hour) => (
                      <div key={hour} className="h-24 border-b border-slate-200 dark:border-slate-800 relative">
                        <span className="absolute -top-2.5 right-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1">
                          {formatTimeDisplay(`${hour}:00`)}
                        </span>
                        <div className="h-full flex flex-col justify-evenly pl-4 pr-2 py-2">
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 text-right">15</span>
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 text-right">30</span>
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 text-right">45</span>
                        </div>
                      </div>
                    ))}
                          </div>
                          
                  {/* Day Columns */}
                  <div className="col-span-7 grid grid-cols-7 relative">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                      {weekDays.map((_, idx) => (
                        <div key={idx} className={cn(
                          "border-r border-slate-200 dark:border-slate-700 h-full",
                          idx === weekDays.length - 1 && "border-r-0"
                        )}></div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex flex-col pointer-events-none">
                      {timeSlots.map((hour) => (
                        <div key={hour} className="h-24 border-b border-dashed border-slate-200 dark:border-slate-800 w-full">
                          <div className="h-12 border-b border-dotted border-slate-100 dark:border-slate-800/50"></div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Bookings and Blocked Time */}
                    {weekDays.map((day, dayIdx) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayBlocks = blockedTimes[dateStr] || [];
                      const dayBookings = getBookingsForDate(day);
                      const columnWidth = 100 / 7;
                      const leftOffset = (dayIdx * columnWidth);
                      
                      return (
                        <React.Fragment key={dayIdx}>
                          {/* Blocked Time */}
                          {dayBlocks.map((block) => {
                            // Parse block times - they come as ISO strings from the database
                            const blockStart = new Date(block.start_time);
                            const blockEnd = new Date(block.end_time);
                            
                            // Get the date string for this day to compare with block date
                            const blockDateStr = format(blockStart, 'yyyy-MM-dd');
                            const dayDateStr = format(day, 'yyyy-MM-dd');
                            
                            // Only show blocks that are on this specific day
                            if (blockDateStr !== dayDateStr) {
                              console.log('[BLOCKED TIME] Block date mismatch:', { blockDateStr, dayDateStr, blockTitle: block.title });
                              return null;
                            }
                            
                            // Extract hours and minutes from the block time (in local timezone)
                            const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                            const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
                            
                            console.log('[BLOCKED TIME] Rendering block:', { 
                              title: block.title, 
                              dayDateStr, 
                              startMinutes, 
                              endMinutes,
                              startTime: block.start_time,
                              endTime: block.end_time
                            });
                            
                            // Get day-specific time range
                            const dayRange = getDayTimeRange(day);
                            
                            // Check if block is within working hours (but don't filter out if it's close)
                            // Allow blocks that are slightly outside to still show
                            if (endMinutes < dayRange.startMinutes || startMinutes > dayRange.endMinutes) {
                              console.log('[BLOCKED TIME] Block outside working hours:', { startMinutes, endMinutes, dayRange });
                              return null;
                            }
                            
                            // Calculate position based on 15-minute intervals
                            const slotHeight = 96; // h-24 = 96px (4 slots per hour, so 24px per slot)
                            const minutesPerSlot = 15;
                            const slotsFromStart = (startMinutes - dayRange.startMinutes) / minutesPerSlot;
                            const top = slotsFromStart * (slotHeight / 4); // 24px per 15-minute slot
                            const height = ((endMinutes - startMinutes) / minutesPerSlot) * (slotHeight / 4);
                            
                            return (
                              <div
                                key={block.id}
                                className="absolute z-10 p-1"
                                style={{ 
                                  top: `${top}px`, 
                                  left: `${leftOffset}%`,
                                  width: `${columnWidth}%`,
                                  height: `${Math.max(height, 96)}px`
                                }}
                              >
                                <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-lg h-full flex items-center justify-center">
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium transform -rotate-12">Unavailable</span>
                                </div>
                          </div>
                            );
                          })}
                          
                          {/* Bookings */}
                          {dayBookings.map((booking) => {
                            const [hours, minutes] = booking.time.split(':').map(Number);
                            const startMinutes = hours * 60 + minutes;
                            const slotHeight = 96; // h-24 = 96px
                            const minutesPerSlot = 15;
                            const top = ((startMinutes - 9 * 60) / minutesPerSlot) * (slotHeight / 4);
                            const height = ((booking.duration / minutesPerSlot) * (slotHeight / 4));
                            
                            return (
                              <div
                                key={booking.id}
                                onClick={() => handleBookingClick(booking)}
                                className="absolute z-20 px-1 py-1 cursor-pointer"
                                style={{ 
                                  top: `${top}px`, 
                                  left: `${leftOffset}%`,
                                  width: `${columnWidth}%`,
                                  height: `${Math.max(height, 78)}px`
                                }}
                              >
                                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-2 shadow-sm transition-[border-color,background-color] duration-200 ease-out cursor-pointer h-full border-l-4 border-l-primary dark:border-l-slate-500 overflow-hidden">
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{formatTimeDisplay(booking.time)}</div>
                                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">{booking.title}</div>
                          {booking.clientName && (
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{booking.clientName}</div>
                                  )}
        </div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
                            </div>
                          )}
                          
            {viewMode === 'day' && (
              <div className="w-full min-w-0">
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
            {/* Day Header - Clean, centered, plenty of whitespace */}
            <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[120px_1fr] border-b border-gray-200">
              <div className="p-4 sm:p-8 border-r border-gray-200 bg-white"></div>
              <div className="p-4 sm:p-8 flex flex-col items-center justify-center bg-gray-50/30">
                <div className="text-[11px] font-bold text-gray-500 uppercase mb-2 tracking-widest">
                  {format(currentDate, 'EEE')}
                            </div>
                <div className="text-2xl sm:text-4xl font-bold text-gray-900 leading-none">
                  {format(currentDate, 'd')}
                </div>
              </div>
                            </div>
            
            {/* Day Grid */}
            <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[120px_1fr] relative bg-white">
              {/* Time Column */}
              <div className="border-r border-gray-200 bg-white py-2">
                {timeSlots.map((hour) => {
                  const hourSlots = [
                    { minute: 0, label: formatTimeDisplay(`${hour}:00`), isMajor: true },
                    { minute: 15, label: '15', isMajor: false },
                    { minute: 30, label: '30', isMajor: false },
                    { minute: 45, label: '45', isMajor: false }
                  ];
                  
                  return (
                    <div key={hour} className="relative">
                      {hourSlots.map((slot) => (
                        <div
                          key={`${hour}-${slot.minute}`}
                          className={cn(
                            "flex items-start pl-2 sm:pl-4 h-8 border-t border-transparent overflow-visible",
                            slot.isMajor ? "border-gray-100" : ""
                          )}
                        >
                          {slot.isMajor ? (
                            <span className="text-xs sm:text-sm font-semibold text-gray-500 -mt-2.5 bg-white pr-2 relative z-10 whitespace-nowrap min-w-[52px] sm:min-w-[70px]">
                              {slot.label}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-gray-400 -mt-2 pl-1 bg-white pr-2 relative z-10">
                              {slot.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              
              {/* Day Column */}
              <div className="relative bg-white py-0">
                {timeSlots.map((hour) => {
                  const hourSlots = [0, 15, 30, 45];
                  return (
                    <div key={hour} className="relative">
                      {hourSlots.map((minute) => (
                        <div
                          key={`${hour}-${minute}`}
                        className={cn(
                            "border-t h-8 box-border",
                            minute === 0 ? "border-gray-200 border-solid" : "border-gray-100 border-dashed"
                          )}
                        />
                      ))}
                    </div>
                  );
                })}
                
                {/* Blocked Time */}
                {(() => {
                  const dateStr = format(currentDate, 'yyyy-MM-dd');
                  const dayBlocks = blockedTimes[dateStr] || [];
                  const dayRange = getDayTimeRange(currentDate);
                  const rangeDuration = dayRange.endMinutes - dayRange.startMinutes;
                  
                  return dayBlocks.map((block) => {
                    const blockStart = new Date(block.start_time);
                    const blockEnd = new Date(block.end_time);
                    const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                    const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
                    
                    // Check if block is within working hours
                    if (startMinutes < dayRange.startMinutes || startMinutes > dayRange.endMinutes) return null;
                    
                    // Calculate position based on 15-minute intervals
                    const slotHeight = 32; // h-8 = 32px per 15-minute slot in day view
                    const minutesPerSlot = 15;
                    const slotsFromStart = (startMinutes - dayRange.startMinutes) / minutesPerSlot;
                    const top = slotsFromStart * slotHeight;
                    const height = ((endMinutes - startMinutes) / minutesPerSlot) * slotHeight;
                    
                    return (
                      <div
                        key={block.id}
                        className="absolute left-0 right-0 mx-4 rounded bg-gray-50/80 border border-gray-100 flex items-center justify-center z-0 backdrop-blur-[1px]"
                        style={{ top: `${top}px`, height: `${Math.max(height, 32) - 2}px` }}
                      >
                        <span className="text-xs text-gray-400 font-medium">Unavailable</span>
                            </div>
                    );
                  });
                })()}
                
                {/* Bookings */}
                {getBookingsForDate(currentDate).map((booking) => {
                  const [hours, minutes] = booking.time.split(':').map(Number);
                  const startMinutes = hours * 60 + minutes;
                  const endMinutes = startMinutes + booking.duration;
                  const slotHeight = 32;
                  const minutesPerSlot = 15;
                  const top = ((startMinutes - 9 * 60) / minutesPerSlot) * slotHeight;
                  const height = ((booking.duration / minutesPerSlot) * slotHeight);
                  
                  return (
                    <div
                      key={booking.id}
                      onClick={() => handleBookingClick(booking)}
                      className={cn(
                        "absolute left-0 right-0 mx-4 rounded-md cursor-pointer transition-[transform,border-color] duration-200 ease-out z-10 overflow-hidden border shadow-sm",
                        "hover:shadow-md hover:scale-[1.01] hover:z-20",
                        booking.type === 'client' 
                          ? "bg-blue-50/90 border-blue-200" :
                        booking.type === 'peer' 
                          ? "bg-purple-50/90 border-purple-200" :
                          "bg-white/90 border-gray-200"
                      )}
                      style={{ 
                        top: `${top}px`, 
                        height: `${Math.max(height, 36) - 2}px`,
                        padding: '4px 12px'
                      }}
                    >
                      <div className="flex flex-col h-full justify-center">
                            <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-gray-500">
                            {formatTimeDisplay(booking.time)} - {formatTimeDisplay(`${Math.floor(endMinutes / 60)}:${String(endMinutes % 60).padStart(2, '0')}`)}
                          </span>
                              </div>
                        <div className="font-semibold text-sm text-gray-900 truncate">
                          {booking.title}
                            </div>
                          </div>
                        </div>
                  );
                })}
              </div>
            </div>
          </div>
                            </div>
                          )}
                          
            {viewMode === 'month' && (
              <div className="w-full min-w-0">
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm w-full">
            {/* Month Header - 7 column grid, equal width distribution */}
            <div className="grid grid-cols-7 w-full border-b border-gray-100 bg-white">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div 
                  key={day} 
                  className="p-4 text-center border-r border-gray-100 last:border-r-0"
                >
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{day}</div>
                            </div>
              ))}
            </div>
            {/* Month Grid - 7 column grid, equal width, proper sizing */}
            <div className="grid grid-cols-7 w-full">
              {monthDays.map((day, idx) => {
                const dayBookings = getBookingsForDate(day);
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayBlocks = blockedTimes[dateStr] || [];
                const totalItems = dayBookings.length + dayBlocks.length;
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[88px] sm:min-h-[120px] border-r border-b border-gray-100 p-2 sm:p-3 transition-colors duration-150",
                      "flex flex-col w-full",
                      !isCurrentMonth ? "bg-gray-50/50" : "bg-white hover:bg-gray-50/30"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold transition-[background-color] duration-200 ease-out",
                        isSameDay(day, new Date()) 
                          ? "bg-gray-900 text-white shadow-md" 
                          : isCurrentMonth ? "text-gray-700" : "text-gray-400"
                      )}>
                        {format(day, 'd')}
                      </div>
                        </div>
                        
                    <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
                      {/* Show blocked time */}
                      {dayBlocks.slice(0, 1).map((block) => (
                        <div
                          key={block.id}
                          className="text-[10px] px-2 py-1 rounded bg-gray-100 border border-gray-200 text-gray-500 font-medium flex-shrink-0 truncate"
                          title={block.title || 'Blocked time'}
                        >
                          Blocked
                            </div>
                      ))}
                      {/* Show bookings */}
                      {dayBookings.slice(0, totalItems > 0 ? 1 : 2).map((booking) => (
                        <div
                          key={booking.id}
                          onClick={() => handleBookingClick(booking)}
                          className={cn(
                            "px-2 py-1.5 rounded text-[10px] font-medium cursor-pointer transition-[transform,background-color] duration-200 ease-out hover:scale-[1.02]",
                            "flex items-center gap-1.5 truncate shadow-sm border",
                            booking.type === 'client' ? "bg-white border-blue-100 text-blue-900" :
                            booking.type === 'peer' ? "bg-white border-purple-100 text-purple-900" :
                            "bg-white border-gray-200 text-gray-900"
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            booking.type === 'client' ? "bg-blue-500" :
                            booking.type === 'peer' ? "bg-purple-500" :
                            "bg-gray-500"
                          )} />
                          <span className="truncate">{booking.title}</span>
                        </div>
                      ))}
                      {(dayBookings.length + dayBlocks.length) > 2 && (
                        <div className="text-[10px] text-gray-400 pl-1 font-medium flex-shrink-0 hover:text-gray-600 cursor-pointer">
                          +{(dayBookings.length + dayBlocks.length) - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
                </div>
            )}
          </div>
      </main>

      {/* Sidebar - 3 columns - Hidden on mobile */}
      <aside className="hidden lg:flex lg:col-span-3 flex-col gap-6">
        {/* Mini Calendar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
                            </div>
          <div className="grid grid-cols-7 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day} className="text-[10px] text-slate-400 font-medium uppercase py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center text-xs gap-y-3">
            {monthDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, currentDate);
              
              return (
                <span
                  key={idx}
                  onClick={() => setCurrentDate(day)}
                  className={cn(
                    "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center mx-auto cursor-pointer transition-colors",
                    isSelected && "bg-primary dark:bg-slate-600 text-white rounded-full font-bold shadow-sm",
                    !isCurrentMonth && "text-slate-300 dark:text-slate-600"
                  )}
                >
                  {format(day, 'd')}
                </span>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Categories</h3>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary block pl-3 p-2.5"
            />
          </div>
          <div className="space-y-3">
            {['client', 'peer', 'guest'].map((category) => {
              const percentage = getCategoryPercentage(category);
              const isChecked = categoryFilter.includes(category);
              
              return (
                <div
                  key={category}
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => {
                    if (isChecked) {
                      setCategoryFilter(categoryFilter.filter(c => c !== category));
                    } else {
                      setCategoryFilter([...categoryFilter, category]);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCategoryFilter([...categoryFilter, category]);
                        } else {
                          setCategoryFilter(categoryFilter.filter(c => c !== category));
                        }
                      }}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors cursor-pointer">
                      {getCategoryLabel(category)}
                    </label>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
      </div>

      {/* Booking Details Modal - Cozy, Rounded Design */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-800">
          {selectedBookingForModal && (
            <div className="bg-white dark:bg-slate-800">
              {/* Header - Cozy, rounded design */}
              <DialogHeader className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-700">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                  {selectedBookingForModal.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {format(selectedBookingForModal.date, 'EEEE, MMMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>

              {/* Content - Cozy spacing and layout */}
              <div className="px-8 py-6 space-y-6">
                {/* Time & Duration - Side by side */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{formatTimeDisplay(selectedBookingForModal.time)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{selectedBookingForModal.duration} minutes</div>
                  </div>
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-700" />

                {/* Client - Prominent display */}
                {selectedBookingForModal.clientName && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</div>
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedBookingForModal.clientName}</span>
                    </div>
                            </div>
                          )}
                          
                {selectedBookingForModal.therapistName && (
                  <>
                    <Separator className="bg-slate-100 dark:bg-slate-700" />
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Therapist</div>
                      <div className="flex items-center gap-2.5">
                        <UserIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedBookingForModal.therapistName}</span>
                            </div>
                    </div>
                  </>
                )}

                {selectedBookingForModal.location && (
                  <>
                    <Separator className="bg-slate-100 dark:bg-slate-700" />
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</div>
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedBookingForModal.location}</span>
                        </div>
                    </div>
                  </>
                )}

                <Separator className="bg-slate-100 dark:bg-slate-700" />

                {/* Type & Status - Badges side by side */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</div>
                        <Badge 
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-full border-0",
                        getBookingTypeColor(selectedBookingForModal)
                      )}
                        >
                      {getCategoryLabel(selectedBookingForModal.type)}
                        </Badge>
                      </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</div>
                    <Badge 
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-full border-0",
                        selectedBookingForModal.status === 'confirmed' || selectedBookingForModal.status === 'scheduled'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : selectedBookingForModal.status === 'completed'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : selectedBookingForModal.status === 'cancelled'
                          ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                          : selectedBookingForModal.status === 'in_progress'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {getDisplaySessionStatusLabel(selectedBookingForModal)}
                    </Badge>
              </div>
                </div>

                {/* Price - Bottom section */}
                {(selectedBookingForModal.price !== undefined && selectedBookingForModal.price !== null) && (
                  <>
                    <Separator className="bg-slate-100 dark:bg-slate-700" />
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Price</div>
                      <div className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedBookingForModal.price > 0 ? `£${Number(selectedBookingForModal.price).toFixed(2)}` : 'Treatment Exchange (Credits)'}
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <Separator className="bg-slate-100 dark:bg-slate-700" />
                <div className="pt-2 space-y-3">
                  {userType === 'therapist' && (
                    <Button
                      onClick={() => {
                        const sessionId = selectedBookingForModal.id;
                        navigate(`/practice/sessions/${sessionId}`);
                        setBookingModalOpen(false);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg py-2.5 shadow-sm transition-[background-color] duration-200 ease-out"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Treatment Notes
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      const sessionId = selectedBookingForModal.id;
                      if (userType === 'client') {
                        navigate(`/client/sessions?sessionId=${sessionId}`);
                      } else {
                        navigate(`/practice/sessions/${sessionId}`);
                      }
                      setBookingModalOpen(false);
                    }}
                    className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-medium rounded-lg py-2.5 shadow-sm transition-[background-color] duration-200 ease-out"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Session Details
                  </Button>
                </div>
              </div>
          </div>
        )}
        </DialogContent>
      </Dialog>

      {/* Availability Management Modal */}
      <Dialog open={availabilityModalOpen} onOpenChange={setAvailabilityModalOpen}>
        <DialogContent className="max-w-5xl w-[95vw] overflow-visible flex flex-col p-0 gap-0">
          {/* Enhanced Header with Icon and Better Visual Hierarchy */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Manage Availability
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Configure your working hours and block time for breaks. Click Save when you're done.
            </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Content Area - No Scroll */}
          <div className="px-6 py-3 overflow-visible">
          <AvailabilitySettings
            embedded={true}
          />
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked Time Management Modal */}
      <Dialog open={blockedTimeModalOpen} onOpenChange={setBlockedTimeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Block Time</DialogTitle>
            <DialogDescription>
              Block time slots for lunch breaks, personal appointments, or unavailability
            </DialogDescription>
          </DialogHeader>
          <BlockTimeManager
            embedded={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
