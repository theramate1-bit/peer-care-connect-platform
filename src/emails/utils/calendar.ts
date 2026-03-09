/**
 * Generate Google Calendar URL for Add to Calendar button
 */
export function generateCalendarUrl(
  title: string,
  description: string,
  startDate: string,
  startTime: string,
  durationMinutes: number,
  location?: string
): string {
  try {
    // Parse date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(
      startDateTime.getTime() + durationMinutes * 60 * 1000
    );

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatGC = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Build Google Calendar URL
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGC(startDateTime)}/${formatGC(endDateTime)}`,
      details: description,
    });

    if (location && location.trim() !== '') {
      params.append('location', location);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch (error) {
    console.error('Error generating calendar URL:', error);
    return '#';
  }
}


