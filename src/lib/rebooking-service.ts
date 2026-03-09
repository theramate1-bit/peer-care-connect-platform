/**
 * Rebooking Service
 * Handles quick rebooking from past sessions with auto-suggested next available slots
 */

import { supabase } from '@/integrations/supabase/client';

export interface RebookingData {
  practitionerId: string;
  practitionerName: string;
  serviceId?: string;
  serviceName?: string;
  durationMinutes: number;
  sessionType: string;
  preferredTime?: string;
  preferredDate?: string;
  notes?: string;
  appointmentType?: 'clinic' | 'mobile';
  therapistType?: 'clinic_based' | 'mobile' | 'hybrid' | null;
}

export interface NextAvailableSlot {
  date: string;
  time: string;
  available: boolean;
}

interface RebookingPractitioner {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid' | null;
}

interface RebookingServiceRow {
  id?: string;
  name?: string;
  duration_minutes?: number;
}

export class RebookingService {
  /**
   * Get rebooking data from a past session
   */
  static async getRebookingData(sessionId: string): Promise<RebookingData | null> {
    try {
      const { data: session, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          therapist:users!client_sessions_therapist_id_fkey (
            id,
            first_name,
            last_name,
            user_id,
            therapist_type
          ),
          service:practitioner_products (
            id,
            name,
            duration_minutes
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!session) return null;

      const practitioner = (session.therapist ?? {}) as RebookingPractitioner;
      const service = (session.service ?? {}) as RebookingServiceRow;
      const sessionDate = session.session_date ? new Date(session.session_date + 'T12:00:00') : null;
      const sameDayNextWeek =
        sessionDate &&
        (() => {
          const d = new Date(sessionDate);
          d.setDate(d.getDate() + 7);
          return d.toISOString().split('T')[0];
        })();

      return {
        practitionerId: practitioner?.user_id || practitioner?.id,
        practitionerName: `${practitioner?.first_name || ''} ${practitioner?.last_name || ''}`.trim(),
        serviceId: session.service_id || service.id,
        serviceName: service.name || session.session_type,
        durationMinutes: service.duration_minutes || session.duration_minutes || 60,
        sessionType: session.session_type,
        preferredTime: session.start_time,
        preferredDate: sameDayNextWeek ?? undefined,
        notes: session.notes,
        appointmentType: session.appointment_type === 'mobile' ? 'mobile' : 'clinic',
        therapistType: practitioner?.therapist_type ?? null
      };
    } catch (error) {
      console.error('Error fetching rebooking data:', error);
      return null;
    }
  }

  /**
   * Get next available slot for a practitioner matching the session preferences.
   * When preferredDate is set (e.g. same day next week), tries that date first.
   */
  static async getNextAvailableSlot(
    practitionerId: string,
    durationMinutes: number,
    preferredTime?: string,
    serviceId?: string,
    preferredDate?: string,
    requestedAppointmentType: 'clinic' | 'mobile' = 'clinic',
    therapistType?: 'clinic_based' | 'mobile' | 'hybrid' | null
  ): Promise<NextAvailableSlot | null> {
    try {
      const minDate = preferredDate || new Date().toISOString().split('T')[0];
      const baseArgs = {
        p_practitioner_id: practitionerId,
        p_duration_minutes: durationMinutes,
        p_service_id: serviceId || null,
        p_preferred_time: preferredTime || null,
        p_min_date: minDate
      };

      let { data, error } = await supabase.rpc('get_next_available_slot', {
        ...baseArgs,
        p_requested_appointment_type: requestedAppointmentType
      });

      if (error) {
        const message = `${error.message ?? ''} ${error.details ?? ''}`;
        const shouldRetryLegacySignature =
          /p_requested_appointment_type|named argument|function .*get_next_available_slot.*does not exist/i.test(message);

        if (shouldRetryLegacySignature) {
          const legacyResult = await supabase.rpc('get_next_available_slot', baseArgs);
          data = legacyResult.data;
          error = legacyResult.error;
        }
      }

      if (error) {
        console.error('RPC error while getting next available slot:', error);
        return null;
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return null;
      }

      const slot = Array.isArray(data) ? data[0] : data;
      if (!slot || !slot.session_date || !slot.start_time) {
        return null;
      }

      return {
        date: slot.session_date,
        time: typeof slot.start_time === 'string' ? slot.start_time : slot.start_time.toString(),
        available: true
      };
    } catch (error) {
      console.error('Error getting next available slot:', error);
      return null;
    }
  }

  /**
   * Prepare rebooking payload for BookingFlow component
   */
  static async prepareRebookingPayload(sessionId: string): Promise<{
    rebookingData: RebookingData | null;
    nextSlot: NextAvailableSlot | null;
  }> {
    const rebookingData = await this.getRebookingData(sessionId);
    
    if (!rebookingData) {
      return { rebookingData: null, nextSlot: null };
    }

    const nextSlot = await this.getNextAvailableSlot(
      rebookingData.practitionerId,
      rebookingData.durationMinutes,
      rebookingData.preferredTime,
      rebookingData.serviceId,
      rebookingData.preferredDate,
      rebookingData.appointmentType ?? 'clinic',
      rebookingData.therapistType ?? null
    );

    return { rebookingData, nextSlot };
  }
}

