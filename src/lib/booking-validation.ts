/**
 * Booking Validation Utilities
 * Comprehensive validation for booking conflicts and availability
 */

import { supabase } from '@/integrations/supabase/client';
import { TimezoneUtils } from './timezone-utils';

export interface BookingValidationResult {
  isValid: boolean;
  conflicts: BookingConflict[];
  warnings: string[];
  errors: string[];
}

export interface BookingConflict {
  type: 'time_conflict' | 'availability_conflict' | 'practitioner_unavailable' | 'invalid_time';
  message: string;
  conflictingSession?: any;
}

export class BookingValidator {
  /**
   * Validate a booking request comprehensively
   */
  static async validateBooking(
    practitionerId: string,
    sessionDate: string,
    startTime: string,
    durationMinutes: number,
    clientId?: string
  ): Promise<BookingValidationResult> {
    const result: BookingValidationResult = {
      isValid: true,
      conflicts: [],
      warnings: [],
      errors: []
    };

    try {
      // 1. Validate basic parameters
      const basicValidation = this.validateBasicParameters(sessionDate, startTime, durationMinutes);
      if (!basicValidation.isValid) {
        result.errors.push(...basicValidation.errors);
        result.isValid = false;
        return result;
      }

      // 2. Check practitioner availability
      const availabilityCheck = await this.checkPractitionerAvailability(
        practitionerId, 
        sessionDate, 
        startTime, 
        durationMinutes
      );
      if (!availabilityCheck.isValid) {
        result.conflicts.push(...availabilityCheck.conflicts);
        result.warnings.push(...availabilityCheck.warnings);
        result.isValid = false;
      }

      // 3. Check for time conflicts
      const conflictCheck = await this.checkTimeConflicts(
        practitionerId, 
        sessionDate, 
        startTime, 
        durationMinutes
      );
      if (!conflictCheck.isValid) {
        result.conflicts.push(...conflictCheck.conflicts);
        result.isValid = false;
      }

      // 4. Check practitioner working hours
      const workingHoursCheck = await this.checkWorkingHours(
        practitionerId, 
        sessionDate, 
        startTime, 
        durationMinutes
      );
      if (!workingHoursCheck.isValid) {
        result.conflicts.push(...workingHoursCheck.conflicts);
        result.isValid = false;
      }

      // 5. Check for duplicate bookings (same client, same practitioner, same time)
      if (clientId) {
        const duplicateCheck = await this.checkDuplicateBookings(
          practitionerId, 
          clientId, 
          sessionDate, 
          startTime
        );
        if (!duplicateCheck.isValid) {
          result.conflicts.push(...duplicateCheck.conflicts);
          result.isValid = false;
        }
      }

      // 6. Check for future date
      const futureDateCheck = this.checkFutureDate(sessionDate);
      if (!futureDateCheck.isValid) {
        result.errors.push(...futureDateCheck.errors);
        result.isValid = false;
      }

      // 7. Check for reasonable booking advance (not too far in future)
      const advanceBookingCheck = this.checkBookingAdvance(sessionDate);
      if (!advanceBookingCheck.isValid) {
        result.warnings.push(...advanceBookingCheck.warnings);
      }

    } catch (error) {
      console.error('Booking validation error:', error);
      result.errors.push('Validation failed due to system error');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate basic booking parameters
   */
  private static validateBasicParameters(
    sessionDate: string, 
    startTime: string, 
    durationMinutes: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check date format
    if (!sessionDate || isNaN(Date.parse(sessionDate))) {
      errors.push('Invalid session date');
    }

    // Check time format
    if (!startTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      errors.push('Invalid start time format');
    }

    // Check duration
    if (!durationMinutes || durationMinutes < 15 || durationMinutes > 480) {
      errors.push('Duration must be between 15 minutes and 8 hours');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check practitioner availability for the requested time
   */
  private static async checkPractitionerAvailability(
    practitionerId: string,
    sessionDate: string,
    startTime: string,
    durationMinutes: number
  ): Promise<{ isValid: boolean; conflicts: BookingConflict[]; warnings: string[] }> {
    const conflicts: BookingConflict[] = [];
    const warnings: string[] = [];

    try {
      // Get practitioner availability
      const { data: availability, error } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', practitionerId)
        .single();

      if (error || !availability) {
        conflicts.push({
          type: 'practitioner_unavailable',
          message: 'Practitioner availability not configured'
        });
        return { isValid: false, conflicts, warnings };
      }

      // Check if practitioner has availability for this day
      const dayOfWeek = new Date(sessionDate).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      const workingHours = availability.working_hours;
      if (!workingHours[dayName] || !workingHours[dayName].enabled) {
        conflicts.push({
          type: 'availability_conflict',
          message: `Practitioner is not available on ${dayName}`
        });
        return { isValid: false, conflicts, warnings };
      }

      // Check if requested time is within working hours
      const dayConfig = workingHours[dayName];
      const [startHour, startMinute] = dayConfig.start.split(':').map(Number);
      const [endHour, endMinute] = dayConfig.end.split(':').map(Number);
      const [requestedHour, requestedMinute] = startTime.split(':').map(Number);

      const workingStartMinutes = startHour * 60 + startMinute;
      const workingEndMinutes = endHour * 60 + endMinute;
      const requestedStartMinutes = requestedHour * 60 + requestedMinute;
      const requestedEndMinutes = requestedStartMinutes + durationMinutes;

      if (requestedStartMinutes < workingStartMinutes || requestedEndMinutes > workingEndMinutes) {
        conflicts.push({
          type: 'availability_conflict',
          message: `Requested time is outside working hours (${dayConfig.start} - ${dayConfig.end})`
        });
        return { isValid: false, conflicts, warnings };
      }

      // Check for timezone conversion if needed
      if (availability.timezone && availability.timezone !== TimezoneUtils.getUserTimezone()) {
        warnings.push(`Time displayed in ${availability.timezone} timezone`);
      }

    } catch (error) {
      console.error('Error checking practitioner availability:', error);
      conflicts.push({
        type: 'practitioner_unavailable',
        message: 'Unable to verify practitioner availability'
      });
    }

    return { isValid: conflicts.length === 0, conflicts, warnings };
  }

  /**
   * Check for time conflicts with existing bookings
   */
  private static async checkTimeConflicts(
    practitionerId: string,
    sessionDate: string,
    startTime: string,
    durationMinutes: number
  ): Promise<{ isValid: boolean; conflicts: BookingConflict[] }> {
    const conflicts: BookingConflict[] = [];

    try {
      const { data: existingBookings, error } = await supabase
        .from('client_sessions')
        .select('id, start_time, duration_minutes, status, client_name')
        .eq('therapist_id', practitionerId)
        .eq('session_date', sessionDate)
        .in('status', ['scheduled', 'confirmed', 'in-progress']);

      if (error) {
        console.error('Error fetching existing bookings:', error);
        return { isValid: true, conflicts }; // Don't fail validation on query error
      }

      if (existingBookings) {
        const [requestedHour, requestedMinute] = startTime.split(':').map(Number);
        const requestedStartMinutes = requestedHour * 60 + requestedMinute;
        const requestedEndMinutes = requestedStartMinutes + durationMinutes;

        for (const booking of existingBookings) {
          const [bookingHour, bookingMinute] = booking.start_time.split(':').map(Number);
          const bookingStartMinutes = bookingHour * 60 + bookingMinute;
          const bookingEndMinutes = bookingStartMinutes + (booking.duration_minutes || 60);

          // Check for overlap
          if (requestedStartMinutes < bookingEndMinutes && requestedEndMinutes > bookingStartMinutes) {
            conflicts.push({
              type: 'time_conflict',
              message: `Time conflicts with existing booking for ${booking.client_name} (${booking.start_time})`,
              conflictingSession: booking
            });
          }
        }
      }

    } catch (error) {
      console.error('Error checking time conflicts:', error);
    }

    return { isValid: conflicts.length === 0, conflicts };
  }

  /**
   * Check practitioner working hours
   */
  private static async checkWorkingHours(
    practitionerId: string,
    sessionDate: string,
    startTime: string,
    durationMinutes: number
  ): Promise<{ isValid: boolean; conflicts: BookingConflict[] }> {
    const conflicts: BookingConflict[] = [];

    try {
      // This is already covered in checkPractitionerAvailability
      // but we can add additional checks here for special cases
      
      // Check for holidays or special unavailable dates
      const { data: unavailableDates } = await supabase
        .from('practitioner_unavailable_dates')
        .select('date, reason')
        .eq('user_id', practitionerId)
        .eq('date', sessionDate);

      if (unavailableDates && unavailableDates.length > 0) {
        conflicts.push({
          type: 'availability_conflict',
          message: `Practitioner is unavailable on ${sessionDate}: ${unavailableDates[0].reason}`
        });
      }

    } catch (error) {
      console.error('Error checking working hours:', error);
    }

    return { isValid: conflicts.length === 0, conflicts };
  }

  /**
   * Check for duplicate bookings
   */
  private static async checkDuplicateBookings(
    practitionerId: string,
    clientId: string,
    sessionDate: string,
    startTime: string
  ): Promise<{ isValid: boolean; conflicts: BookingConflict[] }> {
    const conflicts: BookingConflict[] = [];

    try {
      const { data: existingBookings } = await supabase
        .from('client_sessions')
        .select('id, start_time, status')
        .eq('therapist_id', practitionerId)
        .eq('client_id', clientId)
        .eq('session_date', sessionDate)
        .eq('start_time', startTime)
        .in('status', ['scheduled', 'confirmed', 'pending']);

      if (existingBookings && existingBookings.length > 0) {
        conflicts.push({
          type: 'time_conflict',
          message: 'You already have a booking at this time with this practitioner'
        });
      }

    } catch (error) {
      console.error('Error checking duplicate bookings:', error);
    }

    return { isValid: conflicts.length === 0, conflicts };
  }

  /**
   * Check if booking date is in the future
   */
  private static checkFutureDate(sessionDate: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const today = new Date();
    const bookingDate = new Date(sessionDate);

    // Set time to start of day for comparison
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      errors.push('Cannot book sessions in the past');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if booking is too far in advance
   */
  private static checkBookingAdvance(sessionDate: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const today = new Date();
    const bookingDate = new Date(sessionDate);
    const daysDifference = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference > 90) {
      warnings.push('Booking is more than 90 days in advance');
    }

    return { isValid: true, warnings };
  }
}
