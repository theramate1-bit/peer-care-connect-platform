/**
 * Next available slot for a practitioner (marketplace cards).
 * Caches result per therapist to reduce API calls.
 */

import { supabase } from '@/integrations/supabase/client';
import { getBlocksForDate } from '@/lib/block-time-utils';
import {
  generate15MinuteSlotsWithStatus,
  generateDefault15MinuteSlotsWithStatus,
  type ExistingBooking,
  type TimeSlotWithStatus
} from '@/lib/slot-generation-utils';
import type { BlockedTime } from '@/lib/block-time-utils';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_DAYS_TO_CHECK = 14;
const DEFAULT_DURATION_MINUTES = 60;

interface DaySchedule {
  enabled?: boolean;
  start?: string;
  end?: string;
  hours?: Array<{ start: string; end: string }>;
}

interface PractitionerAvailabilityRow {
  working_hours: Record<string, DaySchedule> | null;
}

const cache = new Map<
  string,
  { result: { date: string; time: string } | null; fetchedAt: number }
>();

function getDaySchedule(workingHours: Record<string, DaySchedule> | null, date: Date): DaySchedule | null {
  if (!workingHours) return null;
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return workingHours[dayOfWeek] ?? null;
}

function getFirstAvailableTime(slots: TimeSlotWithStatus[]): string | null {
  const first = slots.find((s) => s.isAvailable);
  return first ? first.time : null;
}

export interface NextAvailableSlotResult {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  label: string; // "Today at 2:00 PM", "Tomorrow at 10:00 AM", "Monday at 9:00 AM"
}

/**
 * Format time as 12-hour with AM/PM (e.g. "2:00 PM").
 */
function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Return display label for "Next available: [Day] at [Time]".
 */
export function formatNextAvailableLabel(dateStr: string, timeStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  date.setHours(0, 0, 0, 0);

  const timeFormatted = formatTime12h(timeStr);
  if (date.getTime() === today.getTime()) return `Today at ${timeFormatted}`;
  if (date.getTime() === tomorrow.getTime()) return `Tomorrow at ${timeFormatted}`;
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName} at ${timeFormatted}`;
}

/**
 * Fetch next available slot for a practitioner. Uses cache to reduce API calls.
 */
export async function getNextAvailableSlot(
  therapistId: string,
  durationMinutes: number = DEFAULT_DURATION_MINUTES
): Promise<NextAvailableSlotResult | null> {
  const cacheKey = `${therapistId}:${durationMinutes}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    if (!cached.result) return null;
    return {
      ...cached.result,
      label: formatNextAvailableLabel(cached.result.date, cached.result.time)
    };
  }

  const result = await fetchNextAvailableSlotUncached(therapistId, durationMinutes);
  cache.set(cacheKey, { result, fetchedAt: Date.now() });

  if (!result) return null;
  return {
    ...result,
    label: formatNextAvailableLabel(result.date, result.time)
  };
}

/**
 * Internal: no cache. Finds first available slot from today up to MAX_DAYS_TO_CHECK.
 */
async function fetchNextAvailableSlotUncached(
  therapistId: string,
  durationMinutes: number
): Promise<{ date: string; time: string } | null> {
  const { data: availability, error: availabilityError } = await supabase
    .from('practitioner_availability')
    .select('working_hours')
    .eq('user_id', therapistId)
    .maybeSingle() as { data: PractitionerAvailabilityRow | null; error: unknown };

  if (availabilityError || !availability?.working_hours) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < MAX_DAYS_TO_CHECK; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    const daySchedule = getDaySchedule(availability.working_hours, d);
    if (!daySchedule?.enabled) continue;

    const [bookings, slotHolds, blocks] = await Promise.all([
      supabase
        .from('client_sessions')
        .select('start_time, duration_minutes, status, expires_at')
        .eq('therapist_id', therapistId)
        .eq('session_date', dateStr)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']),
      supabase
        .from('slot_holds')
        .select('start_time, duration_minutes, expires_at')
        .eq('practitioner_id', therapistId)
        .eq('session_date', dateStr)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString()),
      getBlocksForDate(therapistId, dateStr)
    ]);

    const holdBookings: ExistingBooking[] = (slotHolds.data || []).map((hold: { start_time: string; duration_minutes: number; expires_at: string | null }) => ({
      start_time: typeof hold.start_time === 'string' && hold.start_time.includes(':')
        ? hold.start_time.substring(0, 5)
        : '',
      duration_minutes: hold.duration_minutes || 60,
      status: 'hold',
      expires_at: hold.expires_at
    }));

    const existingBookings: ExistingBooking[] = [...(bookings.data || []), ...holdBookings];

    let slotsWithStatus: TimeSlotWithStatus[] = [];

    if (daySchedule.hours && daySchedule.hours.length > 0) {
      for (const block of daySchedule.hours) {
        slotsWithStatus.push(
          ...generate15MinuteSlotsWithStatus(
            block.start,
            block.end,
            durationMinutes,
            existingBookings,
            blocks as BlockedTime[],
            dateStr
          )
        );
      }
    } else if (daySchedule.start && daySchedule.end) {
      slotsWithStatus = generate15MinuteSlotsWithStatus(
        daySchedule.start,
        daySchedule.end,
        durationMinutes,
        existingBookings,
        blocks as BlockedTime[],
        dateStr
      );
    } else {
      slotsWithStatus = generateDefault15MinuteSlotsWithStatus(
        durationMinutes,
        existingBookings,
        blocks as BlockedTime[],
        dateStr
      );
    }

    const uniqueByTime = slotsWithStatus.filter((s, i, arr) => arr.findIndex((x) => x.time === s.time) === i);
    const sorted = uniqueByTime.sort((a, b) => a.time.localeCompare(b.time));
    const firstTime = getFirstAvailableTime(sorted);
    if (firstTime) return { date: dateStr, time: firstTime };
  }

  return null;
}

/**
 * Invalidate cache for a therapist (e.g. after booking).
 */
export function invalidateNextAvailableCache(therapistId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${therapistId}:`)) cache.delete(key);
  }
}
