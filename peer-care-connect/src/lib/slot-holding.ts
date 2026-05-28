import { supabase } from '@/integrations/supabase/client';

export interface SlotHold {
  id: string;
  practitioner_id: string;
  request_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  expires_at: string;
  status: 'active' | 'released' | 'converted';
  created_at: string;
  updated_at: string;
}

export interface SlotConflict {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  type: 'booking' | 'hold';
}

export class SlotHoldingService {
  private static toMinutes(timeStr: string): number {
    const [h, m, s] = timeStr.split(':');
    const hours = parseInt(h, 10) || 0;
    const minutes = parseInt(m, 10) || 0;
    // ignore seconds
    return hours * 60 + minutes;
  }

  private static overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
    const aStart = this.toMinutes(startA);
    const aEnd = this.toMinutes(endA);
    const bStart = this.toMinutes(startB);
    const bEnd = this.toMinutes(endB);
    return aStart < bEnd && aEnd > bStart; // [aStart, aEnd) vs [bStart, bEnd)
  }
  /**
   * Hold a slot for a treatment exchange request
   */
  static async holdSlot(
    practitionerId: string,
    requestId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    durationMinutes: number,
    holdDurationMinutes: number = 10
  ): Promise<SlotHold> {
    // Validate practitioner ID - must be a valid UUID, not empty string
    if (!practitionerId || typeof practitionerId !== 'string' || practitionerId.trim() === '') {
      console.error('Invalid practitionerId in holdSlot:', practitionerId);
      throw new Error(`Invalid practitioner ID: ${practitionerId}. Must be a valid UUID.`);
    }
    
    // UUID format validation (matches pattern used in treatment-exchange.ts)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(practitionerId)) {
      console.error('Practitioner ID does not match UUID format:', practitionerId);
      throw new Error(`Invalid practitioner ID format: ${practitionerId}. Expected UUID format.`);
    }
    
    // Validate requestId - can be empty string (will be converted to null)
    const normalizedRequestId = requestId && requestId.trim() !== '' ? requestId : null;
    
    // Validate time formats
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime)) {
      throw new Error(`Invalid start time format: ${startTime}. Expected format: HH:MM`);
    }
    if (!timeRegex.test(endTime)) {
      throw new Error(`Invalid end time format: ${endTime}. Expected format: HH:MM`);
    }
    
    if (!durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
      throw new Error(`Invalid duration: ${durationMinutes}. Must be a positive number.`);
    }
    
    const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
    
    // Check for conflicts (exclude existing slot hold for this request if recreating)
    const conflicts = await this.checkSlotConflicts(practitionerId, sessionDate, startTime, endTime, normalizedRequestId);
    if (conflicts.length > 0) {
      throw new Error('Slot is no longer available - conflicts detected');
    }
    
    // Create slot hold using RPC function to bypass RLS
    // This function validates the practitioner and creates the hold with SECURITY DEFINER
    // It returns the full slot hold record, so we don't need a separate SELECT query
    const { data: slotHoldData, error: rpcError } = await supabase.rpc(
      'create_slot_hold_for_treatment_exchange',
      {
        p_practitioner_id: practitionerId,
        p_request_id: normalizedRequestId,
        p_session_date: sessionDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_duration_minutes: durationMinutes,
        p_expires_at: expiresAt.toISOString()
      }
    );
    
    if (rpcError) {
      console.error('Error creating slot hold via RPC:', rpcError, {
        practitionerId,
        requestId: normalizedRequestId,
        sessionDate,
        startTime,
        endTime,
        durationMinutes
      });
      throw rpcError;
    }
    
    // The RPC function returns an array with one element (the slot hold record)
    if (!slotHoldData || !Array.isArray(slotHoldData) || slotHoldData.length === 0) {
      throw new Error('Slot hold was not created - no data returned from RPC function');
    }
    
    return slotHoldData[0] as SlotHold;
  }
  
  /**
   * Check for slot conflicts (existing bookings or holds)
   * @param excludeRequestId - Optional request ID to exclude from conflict checks (for recreating slot holds)
   */
  static async checkSlotConflicts(
    practitionerId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    excludeRequestId?: string | null
  ): Promise<SlotConflict[]> {
    const conflicts: SlotConflict[] = [];
    // Normalize requested window
    const reqStart = startTime;
    const reqEnd = endTime;

    // Check existing bookings (note: therapist_id column, no end_time column)
    const { data: bookings, error: bookingError } = await supabase
      .from('client_sessions')
      .select('id, session_date, start_time, duration_minutes, status, expires_at')
      .eq('session_date', sessionDate)
      .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
      .or(`therapist_id.eq.${practitionerId},client_id.eq.${practitionerId}`);
    if (bookingError) throw bookingError;

    if (bookings && bookings.length > 0) {
      for (const b of bookings as any[]) {
        // Filter out expired pending_payment sessions
        if (b.status === 'pending_payment' && b.expires_at && new Date(b.expires_at) < new Date()) {
          continue;
        }
        const bookingStart = b.start_time as string;
        const bookingEndMinutes = this.toMinutes(bookingStart) + (parseInt(b.duration_minutes, 10) || 0);
        const bookingEnd = `${Math.floor(bookingEndMinutes / 60).toString().padStart(2, '0')}:${(bookingEndMinutes % 60).toString().padStart(2, '0')}`;
        if (this.overlaps(reqStart, reqEnd, bookingStart, bookingEnd)) {
          conflicts.push({
            id: b.id,
            session_date: b.session_date,
            start_time: bookingStart,
            end_time: bookingEnd,
            type: 'booking'
          });
        }
      }
    }

    // Check active slot holds (exclude the one we're recreating if excludeRequestId is provided)
    let holdsQuery = supabase
      .from('slot_holds')
      .select('id, session_date, start_time, end_time, expires_at, status, request_id')
      .eq('practitioner_id', practitionerId)
      .eq('session_date', sessionDate)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());
    
    if (excludeRequestId) {
      // Exclude slot holds with the same request_id (we're recreating this one)
      // Note: We can't easily exclude null request_id slot holds here because we'd need to check time overlap
      // Instead, we rely on the acceptExchangeRequest logic to find and update orphaned slot holds first
      holdsQuery = holdsQuery.neq('request_id', excludeRequestId);
    }
    
    const { data: holds, error: holdError } = await holdsQuery;
    if (holdError) throw holdError;

    if (holds && holds.length > 0) {
      for (const h of holds as any[]) {
        const holdStart = h.start_time as string;
        const holdEnd = h.end_time as string;
        if (this.overlaps(reqStart, reqEnd, holdStart, holdEnd)) {
          conflicts.push({
            id: h.id,
            session_date: h.session_date,
            start_time: holdStart,
            end_time: holdEnd,
            type: 'hold'
          });
        }
      }
    }

    return conflicts;
  }
  
  /**
   * Release a slot hold
   */
  static async releaseSlot(holdId: string): Promise<void> {
    const { error } = await supabase
      .from('slot_holds')
      .update({ 
        status: 'released',
        updated_at: new Date().toISOString()
      })
      .eq('id', holdId);
      
    if (error) throw error;
  }
  
  /**
   * Convert a slot hold to a confirmed booking
   */
  static async convertSlotToBooking(holdId: string): Promise<void> {
    const { error } = await supabase
      .from('slot_holds')
      .update({ 
        status: 'converted',
        updated_at: new Date().toISOString()
      })
      .eq('id', holdId);
      
    if (error) throw error;
  }
  
  /**
   * Get active slot holds for a practitioner
   */
  static async getActiveSlotHolds(practitionerId: string): Promise<SlotHold[]> {
    const { data, error } = await supabase
      .from('slot_holds')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Clean up expired slot holds
   */
  static async cleanupExpiredHolds(): Promise<number> {
    const { data, error } = await supabase
      .rpc('release_expired_slot_holds');
      
    if (error) throw error;
    return data || 0;
  }
  
  /**
   * Get slot hold by request ID
   */
  static async getSlotHoldByRequest(requestId: string): Promise<SlotHold | null> {
    const { data, error } = await supabase
      .from('slot_holds')
      .select('*')
      .eq('request_id', requestId)
      .eq('status', 'active')
      .maybeSingle();
      
    if (error) {
      // If there's an error that's not "no rows found", throw it
      if (error.code !== 'PGRST116') {
        console.error('Error fetching slot hold by request:', error);
      throw error;
      }
      return null;
    }
    return data;
  }
}
