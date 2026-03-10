/**
 * Slot Generation Utilities
 * Helper functions for generating booking slots with 15-minute intervals and buffer enforcement
 */

import { BlockedTime, isTimeSlotBlocked } from './block-time-utils';

export interface BookingSlot {
  start_time: string;
  duration_minutes: number;
  end_time: string; // Calculated end time
}

export interface ExistingBooking {
  start_time: string;
  duration_minutes: number;
  status: string;
  expires_at?: string | null;
  appointment_type?: 'clinic' | 'mobile' | null;
}

export interface TimeSlotWithStatus {
  time: string;
  isAvailable: boolean;
  unavailableReason?: 'booked' | 'blocked' | 'outside_hours' | 'past';
}

const DEFAULT_BUFFER_MINUTES = 15;
const HYBRID_MOBILE_TO_CLINIC_BUFFER_MINUTES = 30;
/** Mobile→mobile travel buffer: aligns with accept_mobile_booking_request (30 min) */
const MOBILE_TO_MOBILE_BUFFER_MINUTES = 30;
const SLOT_INTERVAL_MINUTES = 15;

interface BookingConflictContext {
  therapistType?: 'clinic_based' | 'mobile' | 'hybrid' | null;
  requestedAppointmentType?: 'clinic' | 'mobile' | null;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function normalizeAppointmentType(value?: string | null): 'clinic' | 'mobile' {
  return value === 'mobile' ? 'mobile' : 'clinic';
}

function getDirectionalBufferMinutes(
  earlierAppointmentType: 'clinic' | 'mobile',
  laterAppointmentType: 'clinic' | 'mobile',
  therapistType?: 'clinic_based' | 'mobile' | 'hybrid' | null
): number {
  // Hybrid: mobile→clinic needs 30 min to return to clinic
  if (
    therapistType === 'hybrid' &&
    earlierAppointmentType === 'mobile' &&
    laterAppointmentType === 'clinic'
  ) {
    return HYBRID_MOBILE_TO_CLINIC_BUFFER_MINUTES;
  }

  // Mobile/hybrid: mobile→mobile needs 30 min travel between client locations (aligns with accept_mobile_booking_request)
  if (
    (therapistType === 'mobile' || therapistType === 'hybrid') &&
    earlierAppointmentType === 'mobile' &&
    laterAppointmentType === 'mobile'
  ) {
    return MOBILE_TO_MOBILE_BUFFER_MINUTES;
  }

  return DEFAULT_BUFFER_MINUTES;
}

/**
 * Check if a slot conflicts with existing bookings (including buffer time)
 */
function hasBookingConflict(
  slotStartMinutes: number,
  slotDurationMinutes: number,
  existingBookings: ExistingBooking[],
  nowIso: string,
  context: BookingConflictContext
): boolean {
  const slotEndMinutes = slotStartMinutes + slotDurationMinutes;
  const requestedAppointmentType = normalizeAppointmentType(context.requestedAppointmentType);

  return existingBookings.some(booking => {
    // Skip expired pending_payment sessions
    if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
      return false;
    }

    const bookingStartMinutes = timeToMinutes(booking.start_time);
    const bookingEndMinutes = bookingStartMinutes + booking.duration_minutes;
    const existingAppointmentType = normalizeAppointmentType(booking.appointment_type);
    const slotBufferAfterEnd = getDirectionalBufferMinutes(
      requestedAppointmentType,
      existingAppointmentType,
      context.therapistType
    );
    const bookingBufferAfterEnd = getDirectionalBufferMinutes(
      existingAppointmentType,
      requestedAppointmentType,
      context.therapistType
    );
    const slotWithBufferEndMinutes = slotEndMinutes + slotBufferAfterEnd;
    const bookingWithBufferEndMinutes = bookingEndMinutes + bookingBufferAfterEnd;

    // Conflict if:
    // 1. Slot overlaps with booking (slot starts before booking ends AND slot ends after booking starts)
    // 2. Slot starts within buffer period after booking ends (slot starts >= booking end AND slot starts < booking end + buffer)
    // 3. Booking starts within buffer period after slot ends (booking starts >= slot end AND booking starts < slot end + buffer)
    return (
      (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes) ||
      (slotStartMinutes >= bookingEndMinutes && slotStartMinutes < bookingWithBufferEndMinutes) ||
      (bookingStartMinutes >= slotEndMinutes && bookingStartMinutes < slotWithBufferEndMinutes)
    );
  });
}

/**
 * Check if a requested time conflicts with existing bookings including 15-minute buffer.
 * Use this on submit to match the same rules as slot generation (so available slots stay valid).
 */
export function hasConflictWithBuffer(
  startTime: string,
  durationMinutes: number,
  existingBookings: ExistingBooking[],
  nowIso?: string,
  context: BookingConflictContext = {}
): boolean {
  const now = nowIso ?? new Date().toISOString();
  const slotStartMinutes = timeToMinutes(startTime);
  return hasBookingConflict(slotStartMinutes, durationMinutes, existingBookings, now, context);
}

/**
 * Check if a slot meets the minimum advance booking requirement (e.g., 2 hours)
 * @param sessionDate - Date in YYYY-MM-DD format
 * @param slotTime - Time in HH:MM format
 * @param minimumHours - Minimum hours in advance (default: 2)
 * @returns true if slot is at least minimumHours in the future
 */
function isSlotWithinMinimumAdvance(
  sessionDate: string,
  slotTime: string,
  minimumHours: number = 2
): boolean {
  const now = new Date();
  const [hours, minutes] = slotTime.split(':').map(Number);
  
  // Create slot datetime
  const slotDateTime = new Date(sessionDate);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Calculate difference in milliseconds
  const diffMs = slotDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Return true if slot is at least minimumHours in the future
  return diffHours >= minimumHours;
}

/**
 * Generate time slots with 15-minute intervals and buffer enforcement
 * 
 * @param startTime - Start time in HH:MM format (e.g., "09:00")
 * @param endTime - End time in HH:MM format (e.g., "18:00")
 * @param serviceDurationMinutes - Duration of the service (must be 30, 45, 60, 75, or 90)
 * @param existingBookings - Array of existing bookings for the date
 * @param blocks - Array of blocked time periods
 * @param sessionDate - Date in YYYY-MM-DD format
 * @returns Array of available time slots in HH:MM format
 */
export function generate15MinuteSlots(
  startTime: string,
  endTime: string,
  serviceDurationMinutes: number,
  existingBookings: ExistingBooking[],
  blocks: BlockedTime[],
  sessionDate: string,
  context: BookingConflictContext = {}
): string[] {
  // Validate service duration is in allowed increments
  const allowedDurations = [30, 45, 60, 75, 90];
  if (!allowedDurations.includes(serviceDurationMinutes)) {
    console.warn(`Service duration ${serviceDurationMinutes} is not in allowed increments (30, 45, 60, 75, 90). Using 60 minutes.`);
    serviceDurationMinutes = 60;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const nowIso = new Date().toISOString();
  const availableSlots: string[] = [];

  // Generate slots every 15 minutes
  for (let slotStartMinutes = startMinutes; slotStartMinutes < endMinutes; slotStartMinutes += SLOT_INTERVAL_MINUTES) {
    const slotEndMinutes = slotStartMinutes + serviceDurationMinutes;

    // Check if slot fits within working hours
    if (slotEndMinutes > endMinutes) {
      continue;
    }

    const slotTime = minutesToTime(slotStartMinutes);

    // Check for booking conflicts (including buffer)
    const hasConflict = hasBookingConflict(
      slotStartMinutes,
      serviceDurationMinutes,
      existingBookings,
      nowIso,
      context
    );

    // Check if time slot is blocked
    const isBlocked = isTimeSlotBlocked(slotTime, serviceDurationMinutes, blocks, sessionDate);

    // Check if slot meets 2-hour minimum advance requirement
    const meetsMinimumAdvance = isSlotWithinMinimumAdvance(sessionDate, slotTime, 2); // 2 hours minimum

    if (!hasConflict && !isBlocked && meetsMinimumAdvance) {
      availableSlots.push(slotTime);
    }
  }

  return availableSlots;
}

/**
 * Generate default time slots (9 AM to 6 PM) with 15-minute intervals
 */
export function generateDefault15MinuteSlots(
  serviceDurationMinutes: number,
  existingBookings: ExistingBooking[],
  blocks: BlockedTime[],
  sessionDate: string,
  context: BookingConflictContext = {}
): string[] {
  return generate15MinuteSlots(
    '09:00',
    '18:00',
    serviceDurationMinutes,
    existingBookings,
    blocks,
    sessionDate,
    context
  );
}

/**
 * Generate ALL time slots with availability status (including unavailable ones)
 * This allows UI to display blocked/booked slots visually (crossed out)
 */
export function generate15MinuteSlotsWithStatus(
  startTime: string,
  endTime: string,
  serviceDurationMinutes: number,
  existingBookings: ExistingBooking[],
  blocks: BlockedTime[],
  sessionDate: string,
  context: BookingConflictContext = {}
): TimeSlotWithStatus[] {
  // Validate service duration is in allowed increments
  const allowedDurations = [30, 45, 60, 75, 90];
  if (!allowedDurations.includes(serviceDurationMinutes)) {
    console.warn(`Service duration ${serviceDurationMinutes} is not in allowed increments (30, 45, 60, 75, 90). Using 60 minutes.`);
    serviceDurationMinutes = 60;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const nowIso = new Date().toISOString();
  const allSlots: TimeSlotWithStatus[] = [];

  // Check if date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sessionDateObj = new Date(sessionDate);
  sessionDateObj.setHours(0, 0, 0, 0);
  const isToday = sessionDateObj.getTime() === today.getTime();
  const currentTimeMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 0;

  // Generate slots every 15 minutes
  for (let slotStartMinutes = startMinutes; slotStartMinutes < endMinutes; slotStartMinutes += SLOT_INTERVAL_MINUTES) {
    const slotEndMinutes = slotStartMinutes + serviceDurationMinutes;
    const slotTime = minutesToTime(slotStartMinutes);

    // Check if slot fits within working hours
    if (slotEndMinutes > endMinutes) {
      allSlots.push({
        time: slotTime,
        isAvailable: false,
        unavailableReason: 'outside_hours'
      });
      continue;
    }

    // Check if slot is in the past (for today)
    if (isToday && slotStartMinutes <= currentTimeMinutes) {
      allSlots.push({
        time: slotTime,
        isAvailable: false,
        unavailableReason: 'past'
      });
      continue;
    }

    // Check for booking conflicts (including buffer)
    const hasConflict = hasBookingConflict(
      slotStartMinutes,
      serviceDurationMinutes,
      existingBookings,
      nowIso,
      context
    );

    if (hasConflict) {
      allSlots.push({
        time: slotTime,
        isAvailable: false,
        unavailableReason: 'booked'
      });
      continue;
    }

    // Check if time slot is blocked
    const isBlocked = isTimeSlotBlocked(slotTime, serviceDurationMinutes, blocks, sessionDate);

    if (isBlocked) {
      allSlots.push({
        time: slotTime,
        isAvailable: false,
        unavailableReason: 'blocked'
      });
      continue;
    }

    // Check if slot meets 2-hour minimum advance requirement
    const meetsMinimumAdvance = isSlotWithinMinimumAdvance(sessionDate, slotTime, 2); // 2 hours minimum

    if (!meetsMinimumAdvance) {
      allSlots.push({
        time: slotTime,
        isAvailable: false,
        unavailableReason: 'past'
      });
      continue;
    }

    // Slot is available
    allSlots.push({
      time: slotTime,
      isAvailable: true
    });
  }

  return allSlots;
}

/**
 * Generate default time slots (9 AM to 6 PM) with status
 */
export function generateDefault15MinuteSlotsWithStatus(
  serviceDurationMinutes: number,
  existingBookings: ExistingBooking[],
  blocks: BlockedTime[],
  sessionDate: string,
  context: BookingConflictContext = {}
): TimeSlotWithStatus[] {
  return generate15MinuteSlotsWithStatus(
    '09:00',
    '18:00',
    serviceDurationMinutes,
    existingBookings,
    blocks,
    sessionDate,
    context
  );
}

