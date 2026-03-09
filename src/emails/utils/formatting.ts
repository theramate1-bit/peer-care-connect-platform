/**
 * Format session ID as a booking reference number
 * Example: "abc123-def456" -> "THM-ABC123"
 */
export function formatBookingReference(sessionId: string | undefined): string {
  if (!sessionId) {
    return 'N/A';
  }

  // Take first 6 characters, remove hyphens, uppercase
  const cleaned = sessionId.replace(/-/g, '').substring(0, 6).toUpperCase();
  return `THM-${cleaned}`;
}

/**
 * Format time string to HH:MM (removes seconds if present)
 * Examples: "14:00:00" -> "14:00", "14:00" -> "14:00"
 */
export function formatTimeForEmail(timeString: string | null | undefined): string {
  if (!timeString) return '';
  
  // If time string includes seconds (HH:MM:SS), remove them
  if (timeString.includes(':') && timeString.split(':').length === 3) {
    return timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
  }
  
  // If already in HH:MM format, return as is
  return timeString;
}

