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
    const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
    
    // Check for conflicts
    const conflicts = await this.checkSlotConflicts(practitionerId, sessionDate, startTime, endTime);
    if (conflicts.length > 0) {
      throw new Error('Slot is no longer available - conflicts detected');
    }
    
    // Create slot hold
    const { data, error } = await supabase
      .from('slot_holds')
      .insert({
        practitioner_id: practitionerId,
        request_id: requestId,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  /**
   * Check for slot conflicts (existing bookings or holds)
   */
  static async checkSlotConflicts(
    practitionerId: string,
    sessionDate: string,
    startTime: string,
    endTime: string
  ): Promise<SlotConflict[]> {
    const conflicts: SlotConflict[] = [];
    // Normalize requested window
    const reqStart = startTime;
    const reqEnd = endTime;

    // Check existing bookings (note: therapist_id column, no end_time column)
    const { data: bookings, error: bookingError } = await supabase
      .from('client_sessions')
      .select('id, session_date, start_time, duration_minutes')
      .eq('therapist_id', practitionerId)
      .eq('session_date', sessionDate)
      .eq('status', 'scheduled');
    if (bookingError) throw bookingError;

    if (bookings && bookings.length > 0) {
      for (const b of bookings as any[]) {
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

    // Check active slot holds
    const { data: holds, error: holdError } = await supabase
      .from('slot_holds')
      .select('id, session_date, start_time, end_time, expires_at, status')
      .eq('practitioner_id', practitionerId)
      .eq('session_date', sessionDate)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());
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
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return data;
  }
}
