/**
 * Booking Validation Utilities
 * Comprehensive validation for booking conflicts and availability
 */

import { supabase } from '@/integrations/supabase/client';
import { TimezoneUtils } from './timezone-utils';
import { getOverlappingBlocks } from './block-time-utils';

export interface BookingValidationResult {
  isValid: boolean;
  conflicts: BookingConflict[];
  warnings: string[];
  errors: string[];
}

export interface BookingConflict {
  type: 'time_conflict' | 'availability_conflict' | 'practitioner_unavailable' | 'invalid_time' | 'blocked_time';
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

      // 3. Check for blocked/unavailable time
      const blockedTimeCheck = await this.checkBlockedTime(
        practitionerId,
        sessionDate,
        startTime,
        durationMinutes
      );
      if (!blockedTimeCheck.isValid) {
        result.conflicts.push(...blockedTimeCheck.conflicts);
        result.isValid = false;
      }

      // 4. Check for time conflicts
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

      // 5. Check practitioner working hours
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

      // 6. Check for duplicate bookings (same client, same practitioner, same time)
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

      // 7. Check for future date
      const futureDateCheck = this.checkFutureDate(sessionDate);
      if (!futureDateCheck.isValid) {
        result.errors.push(...futureDateCheck.errors);
        result.isValid = false;
      }

      // 8. Check for 2-hour minimum booking advance
      const minimumAdvanceCheck = this.checkMinimumBookingAdvance(sessionDate, startTime);
      if (!minimumAdvanceCheck.isValid) {
        result.errors.push(...minimumAdvanceCheck.errors);
        result.isValid = false;
      }

      // 9. Check for reasonable booking advance (not too far in future)
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

    // Check duration - must be one of: 30, 45, 60, 75, 90 minutes
    const allowedDurations = [30, 45, 60, 75, 90];
    if (!durationMinutes || !allowedDurations.includes(durationMinutes)) {
      errors.push('Duration must be 30, 45, 60, 75, or 90 minutes');
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
   * Check for blocked/unavailable time
   */
  private static async checkBlockedTime(
    practitionerId: string,
    sessionDate: string,
    startTime: string,
    durationMinutes: number
  ): Promise<{ isValid: boolean; conflicts: BookingConflict[] }> {
    const conflicts: BookingConflict[] = [];

    try {
      const blocks = await getOverlappingBlocks(
        practitionerId,
        sessionDate,
        startTime,
        durationMinutes
      );

      if (blocks.length > 0) {
        for (const block of blocks) {
          const blockType = block.event_type === 'block' ? 'blocked' : 'unavailable';
          conflicts.push({
            type: 'blocked_time',
            message: `This time is ${blockType}${block.title ? `: ${block.title}` : ''}`
          });
        }
      }
    } catch (error) {
      console.error('Error checking blocked time:', error);
      // Don't fail validation on query error, but log it
    }

    return { isValid: conflicts.length === 0, conflicts };
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
        .select('id, start_time, duration_minutes, status, client_name, expires_at')
        .eq('therapist_id', practitionerId)
        .eq('session_date', sessionDate)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      if (error) {
        console.error('Error fetching existing bookings:', error);
        return { isValid: true, conflicts }; // Don't fail validation on query error
      }

      if (existingBookings) {
        const [requestedHour, requestedMinute] = startTime.split(':').map(Number);
        const requestedStartMinutes = requestedHour * 60 + requestedMinute;
        const requestedEndMinutes = requestedStartMinutes + durationMinutes;
        const nowIso = new Date().toISOString();

        for (const booking of existingBookings) {
          // Skip expired pending_payment sessions (they've expired and slot is available)
          if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
            continue;
          }

          const [bookingHour, bookingMinute] = booking.start_time.split(':').map(Number);
          const bookingStartMinutes = bookingHour * 60 + bookingMinute;
          const bookingEndMinutes = bookingStartMinutes + (booking.duration_minutes || 60);
          const bookingWithBufferEnd = bookingEndMinutes + 15;
          const requestedWithBufferEnd = requestedEndMinutes + 15;

          // Conflict: direct overlap or 15-minute buffer violation
          const overlaps =
            (requestedStartMinutes < bookingEndMinutes && requestedEndMinutes > bookingStartMinutes) ||
            (requestedStartMinutes >= bookingEndMinutes && requestedStartMinutes < bookingWithBufferEnd) ||
            (bookingStartMinutes >= requestedEndMinutes && bookingStartMinutes < requestedWithBufferEnd);
          if (overlaps) {
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
        .select('id, start_time, status, expires_at')
        .eq('therapist_id', practitionerId)
        .eq('client_id', clientId)
        .eq('session_date', sessionDate)
        .eq('start_time', startTime)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      // Filter out expired pending_payment sessions
      const nowIso = new Date().toISOString();
      const activeBookings = existingBookings?.filter(booking => {
        if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
          return false;
        }
        return true;
      });

      if (activeBookings && activeBookings.length > 0) {
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
   * Check if booking meets minimum 2-hour advance requirement
   */
  private static checkMinimumBookingAdvance(
    sessionDate: string,
    startTime: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Create booking datetime
    const bookingDateTime = new Date(sessionDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    
    // Calculate difference in milliseconds
    const diffMs = bookingDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Check if booking is at least 2 hours in the future
    if (diffHours < 2) {
      errors.push('Bookings must be made at least 2 hours in advance');
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
