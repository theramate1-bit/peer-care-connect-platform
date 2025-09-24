import { supabase } from '@/integrations/supabase/client';

export interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: boolean;
  day_of_week: number;
}

export interface MutualAvailabilitySlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  date: string;
  day_of_week: number;
  practitioner_a_available: boolean;
  practitioner_b_available: boolean;
  mutual_availability: boolean;
}

export interface WorkingHours {
  [key: string]: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

export class MutualAvailabilityService {
  /**
   * Get mutual availability between two practitioners for a specific date range
   */
  static async getMutualAvailability(
    practitionerAId: string,
    practitionerBId: string,
    startDate: Date,
    endDate: Date,
    slotDuration: number = 60 // minutes
  ): Promise<MutualAvailabilitySlot[]> {
    try {
      // Get both practitioners' availability settings
      const [practitionerAAvailability, practitionerBAvailability] = await Promise.all([
        this.getPractitionerAvailability(practitionerAId),
        this.getPractitionerAvailability(practitionerBId)
      ]);

      if (!practitionerAAvailability || !practitionerBAvailability) {
        return [];
      }

      // Get existing bookings for both practitioners
      const [practitionerABookings, practitionerBBookings] = await Promise.all([
        this.getPractitionerBookings(practitionerAId, startDate, endDate),
        this.getPractitionerBookings(practitionerBId, startDate, endDate)
      ]);

      // Generate mutual availability slots
      const mutualSlots: MutualAvailabilitySlot[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];

        // Check if both practitioners are available on this day
        const practitionerADayConfig = practitionerAAvailability.working_hours[dayName];
        const practitionerBDayConfig = practitionerBAvailability.working_hours[dayName];

        if (practitionerADayConfig?.enabled && practitionerBDayConfig?.enabled) {
          // Generate slots for this day
          const daySlots = this.generateMutualDaySlots(
            currentDate,
            practitionerADayConfig,
            practitionerBDayConfig,
            practitionerABookings,
            practitionerBBookings,
            slotDuration
          );
          mutualSlots.push(...daySlots);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mutualSlots.filter(slot => slot.mutual_availability);
    } catch (error) {
      console.error('Error getting mutual availability:', error);
      return [];
    }
  }

  /**
   * Get practitioner availability settings
   */
  private static async getPractitionerAvailability(practitionerId: string): Promise<{
    working_hours: WorkingHours;
    timezone: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', practitionerId)
        .single();

      if (error) {
        console.error('Error fetching practitioner availability:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching practitioner availability:', error);
      return null;
    }
  }

  /**
   * Get practitioner bookings for a date range
   */
  private static async getPractitionerBookings(
    practitionerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ session_date: string; start_time: string; duration_minutes: number }>> {
    try {
      const { data, error } = await supabase
        .from('client_sessions')
        .select('session_date, start_time, duration_minutes')
        .eq('therapist_id', practitionerId)
        .eq('status', 'scheduled')
        .gte('session_date', startDate.toISOString().split('T')[0])
        .lte('session_date', endDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching practitioner bookings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching practitioner bookings:', error);
      return [];
    }
  }

  /**
   * Generate mutual availability slots for a specific day
   */
  private static generateMutualDaySlots(
    date: Date,
    practitionerADayConfig: { start: string; end: string; enabled: boolean },
    practitionerBDayConfig: { start: string; end: string; enabled: boolean },
    practitionerABookings: Array<{ session_date: string; start_time: string; duration_minutes: number }>,
    practitionerBBookings: Array<{ session_date: string; start_time: string; duration_minutes: number }>,
    slotDuration: number
  ): MutualAvailabilitySlot[] {
    const slots: MutualAvailabilitySlot[] = [];
    const dateString = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Parse working hours
    const [aStartHour, aStartMinute] = practitionerADayConfig.start.split(':').map(Number);
    const [aEndHour, aEndMinute] = practitionerADayConfig.end.split(':').map(Number);
    const [bStartHour, bStartMinute] = practitionerBDayConfig.start.split(':').map(Number);
    const [bEndHour, bEndMinute] = practitionerBDayConfig.end.split(':').map(Number);

    // Find the overlap period
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    
    dayStart.setHours(
      Math.max(aStartHour, bStartHour),
      Math.max(aStartMinute, bStartMinute),
      0,
      0
    );
    
    dayEnd.setHours(
      Math.min(aEndHour, bEndHour),
      Math.min(aEndMinute, bEndMinute),
      0,
      0
    );

    // Generate slots within the overlap period
    const currentTime = new Date(dayStart);
    while (currentTime < dayEnd) {
      const slotEndTime = new Date(currentTime.getTime() + slotDuration * 60000);
      
      // Check if slot extends beyond working hours
      if (slotEndTime > dayEnd) {
        break;
      }

      const startTimeString = currentTime.toTimeString().substring(0, 5);
      const endTimeString = slotEndTime.toTimeString().substring(0, 5);

      // Check for conflicts with existing bookings
      const practitionerAConflict = this.hasBookingConflict(
        dateString,
        startTimeString,
        slotDuration,
        practitionerABookings
      );

      const practitionerBConflict = this.hasBookingConflict(
        dateString,
        startTimeString,
        slotDuration,
        practitionerBBookings
      );

      slots.push({
        start_time: startTimeString,
        end_time: endTimeString,
        duration_minutes: slotDuration,
        date: dateString,
        day_of_week: dayOfWeek,
        practitioner_a_available: !practitionerAConflict,
        practitioner_b_available: !practitionerBConflict,
        mutual_availability: !practitionerAConflict && !practitionerBConflict
      });

      currentTime.setTime(currentTime.getTime() + slotDuration * 60000);
    }

    return slots;
  }

  /**
   * Check if a time slot conflicts with existing bookings
   */
  private static hasBookingConflict(
    date: string,
    startTime: string,
    durationMinutes: number,
    bookings: Array<{ session_date: string; start_time: string; duration_minutes: number }>
  ): boolean {
    const slotStartMinutes = this.timeToMinutes(startTime);
    const slotEndMinutes = slotStartMinutes + durationMinutes;

    return bookings.some(booking => {
      if (booking.session_date !== date) return false;

      const bookingStartMinutes = this.timeToMinutes(booking.start_time);
      const bookingEndMinutes = bookingStartMinutes + booking.duration_minutes;

      // Check for overlap
      return (
        (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes)
      );
    });
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private static timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get next available mutual slot for quick booking
   */
  static async getNextAvailableMutualSlot(
    practitionerAId: string,
    practitionerBId: string,
    preferredDuration: number = 60
  ): Promise<MutualAvailabilitySlot | null> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // Look ahead 2 weeks

      const mutualSlots = await this.getMutualAvailability(
        practitionerAId,
        practitionerBId,
        startDate,
        endDate,
        preferredDuration
      );

      // Return the first available slot
      return mutualSlots.length > 0 ? mutualSlots[0] : null;
    } catch (error) {
      console.error('Error getting next available mutual slot:', error);
      return null;
    }
  }

  /**
   * Get mutual availability summary for a practitioner pair
   */
  static async getMutualAvailabilitySummary(
    practitionerAId: string,
    practitionerBId: string,
    daysAhead: number = 7
  ): Promise<{
    totalSlots: number;
    availableSlots: number;
    nextAvailableSlot?: MutualAvailabilitySlot;
    availabilityByDay: { [key: string]: number };
  }> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      const mutualSlots = await this.getMutualAvailability(
        practitionerAId,
        practitionerBId,
        startDate,
        endDate,
        60
      );

      const totalSlots = mutualSlots.length;
      const availableSlots = mutualSlots.filter(slot => slot.mutual_availability).length;
      const nextAvailableSlot = mutualSlots.find(slot => slot.mutual_availability) || undefined;

      // Group by day
      const availabilityByDay: { [key: string]: number } = {};
      mutualSlots.forEach(slot => {
        const dayKey = slot.date;
        availabilityByDay[dayKey] = (availabilityByDay[dayKey] || 0) + (slot.mutual_availability ? 1 : 0);
      });

      return {
        totalSlots,
        availableSlots,
        nextAvailableSlot,
        availabilityByDay
      };
    } catch (error) {
      console.error('Error getting mutual availability summary:', error);
      return {
        totalSlots: 0,
        availableSlots: 0,
        availabilityByDay: {}
      };
    }
  }
}
