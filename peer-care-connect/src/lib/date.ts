/**
 * Safely parses a date string, handling date-only formats (YYYY-MM-DD) as local dates
 * to avoid timezone shifts. For datetime strings, uses standard Date parsing.
 */
export function parseDateSafe(dateString: string): Date {
  // Check if it's a date-only format (YYYY-MM-DD)
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  
  if (dateOnlyPattern.test(dateString)) {
    // Parse as local date to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // For datetime strings, use standard parsing
  return new Date(dateString);
}

export function getFriendlyDateLabel(dateString: string, locale: string = 'en-GB'): string {
  try {
    const target = parseDateSafe(dateString);
    const today = getCurrentDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const targetDateOnly = new Date(target);
    targetDateOnly.setHours(0, 0, 0, 0);

    if (targetDateOnly.getTime() === today.getTime()) {
      return 'Today';
    }
    if (targetDateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return target.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats a date string to a readable format, handling timezone issues
 */
export function formatDateSafe(dateString: string, format: 'short' | 'long' | 'full' = 'long', locale: string = 'en-GB'): string {
  try {
    const date = parseDateSafe(dateString);
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? 'short' : 'long',
      day: 'numeric'
    };
    
    if (format === 'full') {
      options.weekday = 'long';
    }
    
    return date.toLocaleDateString(locale, options);
  } catch {
    return dateString;
  }
}

export function formatTimeHHMM(timeString: string, locale: string = 'en-GB', options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = new Date(`2000-01-01T${timeString}`);
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...(options || {})
    });
  } catch {
    return timeString;
  }
}

/**
 * Formats a time string to HH:MM format (removes seconds if present)
 * Examples: "14:00:00" -> "14:00", "14:00" -> "14:00"
 */
export function formatTimeWithoutSeconds(timeString: string | null | undefined): string {
  if (!timeString) return '';
  
  // If time string includes seconds (HH:MM:SS), remove them
  if (timeString.includes(':') && timeString.split(':').length === 3) {
    return timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
  }
  
  // If already in HH:MM format, return as is
  return timeString;
}

/**
 * Get the current date accurately, accounting for timezone
 * Returns a Date object set to midnight in the user's local timezone
 * This ensures consistent date comparison regardless of server time
 */
export function getCurrentDate(): Date {
  const now = new Date();
  // Set to midnight in local timezone for accurate date comparison
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Check if a date is today
 * @param date - Date object or date string (YYYY-MM-DD)
 * @returns true if the date is today
 */
export function isToday(date: Date | string): boolean {
  const today = getCurrentDate();
  const targetDate = typeof date === 'string' ? parseDateSafe(date) : date;
  targetDate.setHours(0, 0, 0, 0);
  return targetDate.getTime() === today.getTime();
}

