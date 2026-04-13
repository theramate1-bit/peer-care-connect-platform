/**
 * Sessions API
 * API functions for session/booking operations
 */

import { supabase } from '../supabase';
import type { ClientSession } from '@/types/database';

export interface CreateSessionParams {
  therapistId: string;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  productId?: string;
  notes?: string;
}

/**
 * Get user's sessions
 */
export async function getUserSessions(
  clientId: string,
  options: {
    status?: 'upcoming' | 'past' | 'all';
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status = 'all', limit = 20, offset = 0 } = options;
  const now = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('client_sessions')
    .select(`
      *,
      therapist:therapist_id (
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq('client_id', clientId);

  if (status === 'upcoming') {
    query = query
      .gte('session_date', now)
      .in('status', ['scheduled', 'confirmed'])
      .order('session_date', { ascending: true });
  } else if (status === 'past') {
    query = query
      .or(`session_date.lt.${now},status.eq.completed,status.eq.cancelled`)
      .order('session_date', { ascending: false });
  } else {
    query = query.order('session_date', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  return { data, error, count };
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string) {
  const { data, error } = await supabase
    .from('client_sessions')
    .select(`
      *,
      therapist:therapist_id (
        first_name,
        last_name,
        email,
        phone,
        bio
      )
    `)
    .eq('id', sessionId)
    .single();

  return { data, error };
}

/**
 * Create a new session/booking
 */
export async function createSession(params: CreateSessionParams & { clientId: string; clientName: string; clientEmail: string }) {
  const {
    therapistId,
    clientId,
    clientName,
    clientEmail,
    sessionDate,
    startTime,
    durationMinutes,
    productId,
    notes,
  } = params;

  // Use validated booking function if available
  if (productId) {
    const { data, error } = await supabase.rpc('create_booking_with_validation', {
      therapist_id: therapistId,
      client_id: clientId,
      session_date: sessionDate,
      start_time: startTime,
      duration_minutes: durationMinutes,
      product_id: productId,
    });

    return { data, error };
  }

  // Fallback to direct insert
  const { data, error } = await supabase
    .from('client_sessions')
    .insert({
      therapist_id: therapistId,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      session_date: sessionDate,
      start_time: startTime,
      duration_minutes: durationMinutes,
      notes,
      status: 'scheduled',
      payment_status: 'pending',
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Cancel a session
 */
export async function cancelSession(sessionId: string, reason?: string) {
  const { data, error } = await supabase
    .from('client_sessions')
    .update({
      status: 'cancelled',
      notes: reason ? `Cancellation reason: ${reason}` : undefined,
    })
    .eq('id', sessionId)
    .select()
    .single();

  return { data, error };
}

/**
 * Create a slot hold for booking
 */
export async function createSlotHold(params: {
  therapistId: string;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  holdMinutes?: number;
}) {
  const { therapistId, sessionDate, startTime, durationMinutes, holdMinutes = 10 } = params;

  const { data, error } = await supabase.rpc('create_slot_hold', {
    therapist_id: therapistId,
    session_date: sessionDate,
    start_time: startTime,
    duration_minutes: durationMinutes,
    hold_minutes: holdMinutes,
  });

  return { data, error };
}

/**
 * Release a slot hold
 */
export async function releaseSlotHold(holdId: string) {
  const { data, error } = await supabase.rpc('release_slot_hold', {
    hold_id: holdId,
  });

  return { data, error };
}

/**
 * Get available time slots for a date
 */
export async function getAvailableSlots(
  therapistId: string,
  date: string,
  durationMinutes: number
) {
  const dayOfWeek = new Date(date).getDay();

  // Get therapist's availability for this day
  const { data: availability, error: availError } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('therapist_id', therapistId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_available', true);

  if (availError) return { data: null, error: availError };

  // Get existing bookings for this date
  const { data: bookings, error: bookingsError } = await supabase
    .from('client_sessions')
    .select('start_time, duration_minutes')
    .eq('therapist_id', therapistId)
    .eq('session_date', date)
    .in('status', ['scheduled', 'confirmed', 'in_progress']);

  if (bookingsError) return { data: null, error: bookingsError };

  // Get active slot holds
  const { data: holds, error: holdsError } = await supabase
    .from('slot_holds')
    .select('start_time, duration_minutes')
    .eq('practitioner_id', therapistId)
    .eq('session_date', date)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (holdsError) return { data: null, error: holdsError };

  // Calculate available slots
  const slots: { time: string; available: boolean }[] = [];
  const blockedTimes = [
    ...(bookings || []).map((b) => ({ start: b.start_time, duration: b.duration_minutes })),
    ...(holds || []).map((h) => ({ start: h.start_time, duration: h.duration_minutes })),
  ];

  // Generate slots based on availability windows
  for (const window of availability || []) {
    const startHour = parseInt(window.start_time.split(':')[0]);
    const endHour = parseInt(window.end_time.split(':')[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      for (const minute of [0, 15, 30, 45]) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotEnd = new Date(`2000-01-01T${time}`);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);
        const endTime = slotEnd.toTimeString().slice(0, 5);

        // Check if slot end is within window
        if (endTime > window.end_time) continue;

        // Check if slot conflicts with existing bookings/holds
        const isBlocked = blockedTimes.some((blocked) => {
          const blockedEnd = new Date(`2000-01-01T${blocked.start}`);
          blockedEnd.setMinutes(blockedEnd.getMinutes() + blocked.duration);
          return time < blockedEnd.toTimeString().slice(0, 5) && endTime > blocked.start;
        });

        slots.push({ time, available: !isBlocked });
      }
    }
  }

  return { data: slots, error: null };
}

