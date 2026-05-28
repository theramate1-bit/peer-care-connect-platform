/**
 * Real-time Calendar Service
 * Handles calendar availability and booking management
 */

import { supabase } from '@/integrations/supabase/client';

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  bookingId?: string;
  clientName?: string;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
  isAvailable: boolean;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  therapistId: string;
  clientId?: string;
  status: 'available' | 'booked' | 'blocked' | 'completed';
  type: 'session' | 'break' | 'unavailable';
  description?: string;
  location?: string;
}

export class CalendarService {
  /**
   * Get therapist availability for a date range
   */
  static async getTherapistAvailability(
    therapistId: string,
    startDate: string,
    endDate: string
  ): Promise<DayAvailability[]> {
    try {
      // Get therapist's working hours and availability
      const { data: availability } = await supabase
        .from('therapist_availability')
        .select('*')
        .eq('therapist_id', therapistId)
        .gte('date', startDate)
        .lte('date', endDate);

      // Get existing bookings
      const { data: bookings } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', therapistId)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .in('status', ['scheduled', 'in-progress']);

      // Process availability data
      const days: DayAvailability[] = [];
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayAvailability = availability?.find(a => a.date === dateStr);
        const dayBookings = bookings?.filter(b => b.session_date === dateStr) || [];

        // Generate time slots
        const slots = this.generateTimeSlots(dayAvailability, dayBookings);

        days.push({
          date: dateStr,
          slots,
          isAvailable: slots.some(slot => slot.isAvailable),
          totalSlots: slots.length,
          availableSlots: slots.filter(slot => slot.isAvailable).length,
          bookedSlots: slots.filter(slot => slot.isBooked).length
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return days;
    } catch (error) {
      console.error('Error fetching therapist availability:', error);
      throw new Error('Failed to fetch therapist availability');
    }
  }

  /**
   * Generate time slots for a day
   */
  private static generateTimeSlots(
    availability: any,
    bookings: any[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    if (!availability) {
      return slots;
    }

    const startTime = availability.start_time || '09:00';
    const endTime = availability.end_time || '17:00';
    const slotDuration = availability.slot_duration || 60; // minutes

    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    for (let time = start; time < end; time += slotDuration) {
      const slotStart = this.minutesToTime(time);
      const slotEnd = this.minutesToTime(time + slotDuration);

      // Check if this slot is booked
      const booking = bookings.find(b => {
        const bookingStart = this.timeToMinutes(b.session_time);
        const bookingEnd = bookingStart + (b.duration || 60);
        return time >= bookingStart && time < bookingEnd;
      });

      slots.push({
        id: `${availability.date}_${slotStart}`,
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: !booking && availability.is_available,
        isBooked: !!booking,
        bookingId: booking?.id,
        clientName: booking ? `${booking.client?.first_name} ${booking.client?.last_name}` : undefined
      });
    }

    return slots;
  }

  /**
   * Book a time slot
   */
  static async bookTimeSlot(
    therapistId: string,
    clientId: string,
    date: string,
    time: string,
    duration: number = 60
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      // Check if slot is still available
      const availability = await this.getTherapistAvailability(
        therapistId,
        date,
        date
      );

      const dayAvailability = availability[0];
      if (!dayAvailability) {
        return { success: false, error: 'Therapist not available on this date' };
      }

      const slot = dayAvailability.slots.find(s => s.startTime === time);
      if (!slot || !slot.isAvailable) {
        return { success: false, error: 'Time slot is no longer available' };
      }

      // Create session booking
      const { data: session, error } = await supabase
        .from('client_sessions')
        .insert({
          therapist_id: therapistId,
          client_id: clientId,
          session_date: date,
          session_time: time,
          duration: duration,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error('Error booking time slot:', error);
      return { success: false, error: 'Failed to book time slot' };
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return { success: false, error: 'Failed to cancel booking' };
    }
  }

  /**
   * Get calendar events for a therapist
   */
  static async getCalendarEvents(
    therapistId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    try {
      const { data: sessions } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:client_id (
            first_name,
            last_name
          )
        `)
        .eq('therapist_id', therapistId)
        .gte('session_date', startDate)
        .lte('session_date', endDate);

      const events: CalendarEvent[] = sessions?.map(session => ({
        id: session.id,
        title: session.client 
          ? `${session.client.first_name} ${session.client.last_name}` 
          : 'Available Slot',
        start: `${session.session_date}T${session.session_time}`,
        end: `${session.session_date}T${this.addMinutesToTime(session.session_time, session.duration || 60)}`,
        therapistId: session.therapist_id,
        clientId: session.client_id,
        status: session.status === 'scheduled' ? 'booked' : session.status,
        type: 'session',
        description: session.notes,
        location: session.location
      })) || [];

      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  /**
   * Update therapist availability
   */
  static async updateAvailability(
    therapistId: string,
    date: string,
    availability: {
      start_time?: string;
      end_time?: string;
      slot_duration?: number;
      is_available?: boolean;
      breaks?: Array<{ start: string; end: string }>;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('therapist_availability')
        .upsert({
          therapist_id: therapistId,
          date: date,
          ...availability
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating availability:', error);
      return { success: false, error: 'Failed to update availability' };
    }
  }

  /**
   * Get real-time availability updates
   */
  static subscribeToAvailabilityUpdates(
    therapistId: string,
    onUpdate: (availability: DayAvailability[]) => void
  ): () => void {
    const channel = supabase
      .channel(`availability-${therapistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_sessions',
          filter: `therapist_id=eq.${therapistId}`
        },
        async () => {
          // Refetch availability when sessions change
          const today = new Date().toISOString().split('T')[0];
          const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          const availability = await this.getTherapistAvailability(
            therapistId,
            today,
            nextWeek
          );
          
          onUpdate(availability);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Helper: Convert time string to minutes
   */
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Convert minutes to time string
   */
  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Helper: Add minutes to time string
   */
  private static addMinutesToTime(time: string, minutes: number): string {
    const totalMinutes = this.timeToMinutes(time) + minutes;
    return this.minutesToTime(totalMinutes);
  }

  /**
   * Check if a time slot conflicts with existing bookings
   */
  static async checkSlotConflict(
    therapistId: string,
    date: string,
    startTime: string,
    duration: number
  ): Promise<boolean> {
    try {
      const { data: conflicts } = await supabase
        .from('client_sessions')
        .select('session_time, duration')
        .eq('therapist_id', therapistId)
        .eq('session_date', date)
        .in('status', ['scheduled', 'in-progress']);

      if (!conflicts) return false;

      const requestedStart = this.timeToMinutes(startTime);
      const requestedEnd = requestedStart + duration;

      return conflicts.some(conflict => {
        const conflictStart = this.timeToMinutes(conflict.session_time);
        const conflictEnd = conflictStart + (conflict.duration || 60);
        
        return (requestedStart < conflictEnd && requestedEnd > conflictStart);
      });
    } catch (error) {
      console.error('Error checking slot conflict:', error);
      return true; // Assume conflict if error
    }
  }
}
