/**
 * Block Time Utilities
 * Helper functions for checking and managing blocked/unavailable time
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface BlockedTime {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  event_type: 'block' | 'unavailable';
  title: string;
  description?: string;
}

/**
 * Check if a time range overlaps with blocked periods
 */
export function isTimeOverlapping(
  blockStart: Date,
  blockEnd: Date,
  bookingStart: Date,
  bookingEnd: Date
): boolean {
  return blockStart < bookingEnd && blockEnd > bookingStart;
}

/**
 * Query calendar_events for blocked/unavailable time overlapping with a booking request
 */
export async function getOverlappingBlocks(
  practitionerId: string,
  sessionDate: string,
  startTime: string,
  durationMinutes: number
): Promise<BlockedTime[]> {
  try {
    // Convert session date and time to timestamps
    // Use local time to match isTimeSlotBlocked behavior
    const [hour, minute] = startTime.split(':').map(Number);
    const bookingStart = new Date(sessionDate);
    bookingStart.setHours(hour, minute, 0, 0);
    
    const bookingEnd = new Date(bookingStart);
    bookingEnd.setMinutes(bookingEnd.getMinutes() + durationMinutes);

    // Query for overlapping blocks
    // We need events where:
    // - event_type is 'block' or 'unavailable'
    // - status is 'confirmed'
    // - The event overlaps with our booking time range
    // Overlap condition: block.start < booking.end AND block.end > booking.start
    // Convert to ISO string for database query (database stores UTC)
    
    const { data: blocks, error } = await supabase
      .from('calendar_events')
      .select('id, user_id, start_time, end_time, event_type, title, description')
      .eq('user_id', practitionerId)
      .in('event_type', ['block', 'unavailable'])
      .eq('status', 'confirmed')
      .lt('start_time', bookingEnd.toISOString())
      .gt('end_time', bookingStart.toISOString());

    if (error) {
      logger.error('Error fetching blocked time', error, 'getOverlappingBlocks');
      return [];
    }

    return (blocks || []) as BlockedTime[];
  } catch (error) {
    logger.error('Error checking blocked time', error, 'getOverlappingBlocks');
    return [];
  }
}

/**
 * Get all blocks for a practitioner on a specific date
 */
export async function getBlocksForDate(
  practitionerId: string,
  date: string
): Promise<BlockedTime[]> {
  try {
    // Parse date in UTC to avoid timezone issues
    // date is expected in YYYY-MM-DD format
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Use overlap logic to catch blocks that span across day boundaries or partially overlap
    // Overlap condition: block.start < endOfDay AND block.end > startOfDay
    const { data: blocks, error } = await supabase
      .from('calendar_events')
      .select('id, user_id, start_time, end_time, event_type, title, description')
      .eq('user_id', practitionerId)
      .in('event_type', ['block', 'unavailable'])
      .eq('status', 'confirmed')
      .lt('start_time', endOfDay.toISOString())
      .gt('end_time', startOfDay.toISOString())
      .order('start_time', { ascending: true });

    // Debug logging
    logger.debug('getBlocksForDate called', {
      date,
      practitionerId,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    }, 'getBlocksForDate');
    
    if (error) {
      logger.error('Error fetching blocks', error, 'getBlocksForDate');
      return [];
    }
    
    if (blocks && blocks.length > 0) {
      logger.debug('Found blocks', {
        date,
        practitionerId,
        blockCount: blocks.length,
        blocks: blocks.map(b => ({
          title: b.title,
          start: b.start_time,
          end: b.end_time,
          type: b.event_type
        }))
      }, 'getBlocksForDate');
    } else {
      logger.debug('No blocks found for date', { date, practitionerId, queryResult: blocks }, 'getBlocksForDate');
    }

    return (blocks || []) as BlockedTime[];
  } catch (error) {
    logger.error('Error getting blocks for date', error, 'getBlocksForDate');
    return [];
  }
}

/**
 * Check if a time slot is blocked
 */
export function isTimeSlotBlocked(
  slotTime: string,
  slotDurationMinutes: number,
  blocks: BlockedTime[],
  sessionDate: string
): boolean {
  // CRITICAL: Validate blocks array first
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return false; // No blocks = not blocked
  }

  const [hour, minute = 0] = slotTime.split(':').map(Number);
  
  // Validate inputs
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    logger.warn('Invalid slot time format', { slotTime }, 'isTimeSlotBlocked');
    return false;
  }
  
  // Validate sessionDate format (YYYY-MM-DD)
  if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    logger.warn('Invalid session date format', { sessionDate }, 'isTimeSlotBlocked');
    return false;
  }

  // Build slot start/end in LOCAL time so we match getOverlappingBlocks (used on submit).
  // Previously we used UTC (…Z) here, so calendar showed slots as available but submit said "blocked".
  const slotStart = new Date(sessionDate);
  slotStart.setHours(hour, minute, 0, 0);
  if (isNaN(slotStart.getTime())) {
    return false;
  }
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);

  // Check each block for overlap
  const isBlocked = blocks.some(block => {
    // Validate block has required properties
    if (!block || !block.start_time || !block.end_time) {
      logger.warn('Invalid block structure', { block }, 'isTimeSlotBlocked');
      return false;
    }
    
    const blockStart = new Date(block.start_time);
    const blockEnd = new Date(block.end_time);
    
    // Validate block dates
    if (isNaN(blockStart.getTime()) || isNaN(blockEnd.getTime())) {
      logger.warn('Invalid block dates', { block }, 'isTimeSlotBlocked');
      return false;
    }
    
    // Use overlap logic: block overlaps slot if blockStart < slotEnd AND blockEnd > slotStart
    const overlaps = isTimeOverlapping(blockStart, blockEnd, slotStart, slotEnd);
    
    if (overlaps) {
      logger.debug('Overlap detected', {
        slotTime,
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
        blockTitle: block.title || 'Untitled',
        blockStart: blockStart.toISOString(),
        blockEnd: blockEnd.toISOString(),
        blockType: block.event_type
      }, 'isTimeSlotBlocked');
    }
    
    return overlaps;
  });

  if (isBlocked) {
    logger.debug('Slot is blocked', {
      slotTime,
      sessionDate,
      totalBlocks: blocks.length,
      matchingBlocks: blocks.filter(b => {
        const bs = new Date(b.start_time);
        const be = new Date(b.end_time);
        return isTimeOverlapping(bs, be, slotStart, slotEnd);
      }).map(b => ({ title: b.title, start: b.start_time, end: b.end_time }))
    }, 'isTimeSlotBlocked');
  }

  return isBlocked;
}

