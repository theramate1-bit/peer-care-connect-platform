/**
 * Reschedule Service
 * Handles direct rescheduling of appointments with availability checking
 */

import { supabase } from '@/integrations/supabase/client';
import { RebookingService } from './rebooking-service';
import { hasConflictWithBuffer, type ExistingBooking } from './slot-generation-utils';
import { getOverlappingBlocks } from './block-time-utils';

export interface RescheduleOptions {
  sessionId: string;
  newDate: string;
  newTime: string;
  reason?: string;
}

export interface RescheduleResult {
  success: boolean;
  error?: string;
  sessionId?: string;
}

export class RescheduleService {
  /**
   * Check if a session can be rescheduled
   */
  static async canReschedule(sessionId: string): Promise<{
    canReschedule: boolean;
    reason?: string;
  }> {
    try {
      const { data: session, error } = await supabase
        .from('client_sessions')
        .select('id, session_date, start_time, status, therapist_id')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        return {
          canReschedule: false,
          reason: 'Session not found'
        };
      }

      // Check if session is in a reschedulable state
      if (!['scheduled', 'confirmed'].includes(session.status)) {
        return {
          canReschedule: false,
          reason: `Cannot reschedule a ${session.status} session`
        };
      }

      // Check if session is in the past
      const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
      const now = new Date();
      
      if (sessionDateTime < now) {
        return {
          canReschedule: false,
          reason: 'Cannot reschedule past sessions'
        };
      }

      // Check cancellation policy restrictions (24 hours notice typically)
      const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilSession < 24) {
        return {
          canReschedule: false,
          reason: 'Rescheduling requires at least 24 hours notice. Please contact your practitioner directly.'
        };
      }

      return {
        canReschedule: true
      };
    } catch (error) {
      console.error('Error checking reschedule eligibility:', error);
      return {
        canReschedule: false,
        reason: 'Unable to verify reschedule eligibility'
      };
    }
  }

  /**
   * Check availability for a new date/time with the same practitioner
   */
  static async checkAvailability(
    therapistId: string,
    newDate: string,
    newTime: string,
    durationMinutes: number,
    excludeSessionId?: string,
    requestedAppointmentType: 'clinic' | 'mobile' = 'clinic',
    therapistType?: 'clinic_based' | 'mobile' | 'hybrid' | null
  ): Promise<{
    available: boolean;
    conflictReason?: string;
  }> {
    try {
      // Check for conflicts with existing bookings
      const { data: conflicts, error } = await supabase
        .from('client_sessions')
        .select('id, start_time, duration_minutes, status, expires_at, appointment_type')
        .eq('therapist_id', therapistId)
        .eq('session_date', newDate)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      if (error) throw error;

      const existingBookings: ExistingBooking[] = (conflicts || [])
        .filter((booking) => !(excludeSessionId && booking.id === excludeSessionId))
        .map((booking) => ({
          start_time: booking.start_time,
          duration_minutes: booking.duration_minutes || 60,
          status: booking.status,
          expires_at: booking.expires_at,
          appointment_type: booking.appointment_type
        }));

      const hasConflict = hasConflictWithBuffer(
        newTime,
        durationMinutes,
        existingBookings,
        undefined,
        {
          requestedAppointmentType,
          therapistType
        }
      );

      if (hasConflict) {
        return {
          available: false,
          conflictReason: 'This time slot is already booked'
        };
      }

      // Check blocked/unavailable time separately from booking conflicts
      // so reschedule UX can explain the real cause.
      const blocks = await getOverlappingBlocks(
        therapistId,
        newDate,
        newTime,
        durationMinutes
      );
      if (blocks.length > 0) {
        const firstBlock = blocks[0];
        const blockLabel = firstBlock.event_type === 'unavailable' ? 'unavailable' : 'blocked';
        const titleSuffix = firstBlock.title ? `: ${firstBlock.title}` : '';
        return {
          available: false,
          conflictReason: `This time is ${blockLabel}${titleSuffix}`
        };
      }

      return { available: true };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        available: false,
        conflictReason: 'Unable to verify availability'
      };
    }
  }

  /**
   * Reschedule a session directly
   */
  static async rescheduleSession(options: RescheduleOptions): Promise<RescheduleResult> {
    try {
      const { sessionId, newDate, newTime, reason } = options;

      // Verify session can be rescheduled
      const eligibility = await this.canReschedule(sessionId);
      if (!eligibility.canReschedule) {
        return {
          success: false,
          error: eligibility.reason
        };
      }

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('*, appointment_type')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      const { data: practitioner } = await supabase
        .from('users')
        .select('therapist_type')
        .eq('id', session.therapist_id)
        .maybeSingle();

      // Check availability for new date/time
      const availability = await this.checkAvailability(
        session.therapist_id,
        newDate,
        newTime,
        session.duration_minutes,
        sessionId,
        session.appointment_type === 'mobile' ? 'mobile' : 'clinic',
        (practitioner?.therapist_type as 'clinic_based' | 'mobile' | 'hybrid' | null | undefined) ?? null
      );

      if (!availability.available) {
        return {
          success: false,
          error: availability.conflictReason || 'Time slot not available'
        };
      }

      // Update session with new date/time
      const { error: updateError } = await supabase
        .from('client_sessions')
        .update({
          session_date: newDate,
          start_time: newTime,
          rescheduled_at: new Date().toISOString(),
          reschedule_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        // Map DB trigger errors to clear UX messages.
        if (updateError.message?.includes('Blocked time conflict')) {
          return {
            success: false,
            error: 'This time is blocked or unavailable. Please choose another slot.'
          };
        }
        if (updateError.message?.includes('Booking conflict')) {
          return {
            success: false,
            error: 'This time slot conflicts with another booking or required buffer. Please choose another slot.'
          };
        }
        throw updateError;
      }

      // Send rescheduling email with location/directions (central helper)
      if (session.client_email) {
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              sessionId,
              emailType: 'rescheduling',
              originalDate: session.session_date,
              originalTime: session.start_time,
              newDate,
              newTime
            }
          });
        } catch (notifError) {
          console.warn('Reschedule email failed (non-critical):', notifError);
        }
      }

      return {
        success: true,
        sessionId: sessionId
      };
    } catch (error) {
      console.error('Error rescheduling session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule session'
      };
    }
  }

  /**
   * Get suggested available slots for rescheduling
   */
  static async getSuggestedSlots(
    sessionId: string,
    preferredDate?: string
  ): Promise<Array<{ date: string; time: string }>> {
    try {
      const { data: session, error } = await supabase
        .from('client_sessions')
        .select('therapist_id, duration_minutes, appointment_type')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        return [];
      }

      const { data: practitioner } = await supabase
        .from('users')
        .select('therapist_type')
        .eq('id', session.therapist_id)
        .maybeSingle();

      // Use RebookingService to find available slots
      const nextSlot = await RebookingService.getNextAvailableSlot(
        session.therapist_id,
        session.duration_minutes || 60,
        undefined,
        undefined,
        undefined,
        session.appointment_type === 'mobile' ? 'mobile' : 'clinic',
        (practitioner?.therapist_type as 'clinic_based' | 'mobile' | 'hybrid' | null | undefined) ?? null
      );

      if (!nextSlot) {
        return [];
      }

      return [{
        date: nextSlot.date,
        time: nextSlot.time
      }];
    } catch (error) {
      console.error('Error getting suggested slots:', error);
      return [];
    }
  }
}

