import { format, addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

// Calendar Integration Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  source: 'internal' | 'google' | 'outlook' | 'apple';
}

export interface CalendarSyncConfig {
  provider: 'google' | 'outlook' | 'apple' | 'ical';
  enabled: boolean;
  syncInterval: number; // minutes
  lastSync?: Date;
  calendarId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
  reason?: string;
}

// Calendar Integration Service
export class CalendarIntegrationService {
  private config: CalendarSyncConfig;

  constructor(config: CalendarSyncConfig) {
    this.config = config;
  }

  // Generate ICS (iCalendar) format for external calendar import
  generateICS(events: CalendarEvent[]): string {
    const icsHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Peer Care Connect//Calendar Integration//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n');

    const icsEvents = events.map(event => {
      const startDate = format(event.start, "yyyyMMdd'T'HHmmss'Z'");
      const endDate = format(event.end, "yyyyMMdd'T'HHmmss'Z'");
      
      return [
        'BEGIN:VEVENT',
        `UID:${event.id}@peer-care-connect.com`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description}` : '',
        event.location ? `LOCATION:${event.location}` : '',
        `STATUS:${event.status.toUpperCase()}`,
        'END:VEVENT'
      ].filter(line => line !== '').join('\r\n');
    });

    const icsFooter = 'END:VCALENDAR';

    return [icsHeader, ...icsEvents, icsFooter].join('\r\n');
  }

  // Generate Google Calendar URL
  generateGoogleCalendarURL(event: CalendarEvent): string {
    const startDate = format(event.start, "yyyyMMdd'T'HHmmss'Z'");
    const endDate = format(event.end, "yyyyMMdd'T'HHmmss'Z'");
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDate}/${endDate}`,
      details: event.description || '',
      location: event.location || '',
      trp: 'false'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // Generate Outlook Calendar URL
  generateOutlookCalendarURL(event: CalendarEvent): string {
    const startDate = format(event.start, "yyyy-MM-dd'T'HH:mm:ss");
    const endDate = format(event.end, "yyyy-MM-dd'T'HH:mm:ss");
    
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      startdt: startDate,
      enddt: endDate,
      body: event.description || '',
      location: event.location || ''
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  // Generate Apple Calendar URL
  generateAppleCalendarURL(event: CalendarEvent): string {
    const startDate = format(event.start, "yyyyMMdd'T'HHmmss'Z'");
    const endDate = format(event.end, "yyyyMMdd'T'HHmmss'Z'");
    
    const params = new URLSearchParams({
      title: event.title,
      startdt: startDate,
      enddt: endDate,
      description: event.description || '',
      location: event.location || ''
    });

    return `webcal://calendar.apple.com/event?${params.toString()}`;
  }

  // Check for conflicts with external calendar
  async checkConflicts(events: CalendarEvent[], externalEvents: CalendarEvent[]): Promise<CalendarEvent[]> {
    const conflicts: CalendarEvent[] = [];

    for (const event of events) {
      for (const externalEvent of externalEvents) {
        if (this.eventsOverlap(event, externalEvent)) {
          conflicts.push(event);
          break;
        }
      }
    }

    return conflicts;
  }

  // Check if two events overlap
  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return (
      event1.start < event2.end &&
      event2.start < event1.end
    );
  }

  // Generate availability slots based on practitioner schedule
  generateAvailabilitySlots(
    startDate: Date,
    endDate: Date,
    workingHours: { [key: string]: { start: string; end: string; enabled: boolean } },
    existingEvents: CalendarEvent[],
    slotDuration: number = 30 // minutes
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.toLocaleLowerCase().substring(0, 3);
      const dayConfig = workingHours[dayOfWeek];

      if (dayConfig?.enabled) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        
        const [startHour, startMinute] = dayConfig.start.split(':').map(Number);
        const [endHour, endMinute] = dayConfig.end.split(':').map(Number);
        
        dayStart.setHours(startHour, startMinute, 0, 0);
        dayEnd.setHours(endHour, endMinute, 0, 0);

        // Generate slots for this day
        const daySlots = this.generateDaySlots(dayStart, dayEnd, slotDuration, existingEvents);
        slots.push(...daySlots);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  // Generate slots for a specific day
  private generateDaySlots(
    dayStart: Date,
    dayEnd: Date,
    slotDuration: number,
    existingEvents: CalendarEvent[]
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const currentSlot = new Date(dayStart);

    while (currentSlot < dayEnd) {
      const slotEnd = new Date(currentSlot.getTime() + slotDuration * 60000);
      
      // Check if this slot conflicts with existing events
      const hasConflict = existingEvents.some(event => 
        this.eventsOverlap(
          { start: currentSlot, end: slotEnd, id: '', title: '', status: 'confirmed', source: 'internal' },
          event
        )
      );

      slots.push({
        start: new Date(currentSlot),
        end: new Date(slotEnd),
        available: !hasConflict,
        reason: hasConflict ? 'Conflicts with existing appointment' : undefined
      });

      currentSlot.setTime(currentSlot.getTime() + slotDuration * 60000);
    }

    return slots;
  }

  // Sync with external calendar (placeholder for actual implementation)
  async syncWithExternalCalendar(): Promise<CalendarEvent[]> {
    // This would integrate with actual calendar APIs
    // For now, return empty array
    return [];
  }

  // Export calendar events to various formats
  exportEvents(events: CalendarEvent[], format: 'ics' | 'json' | 'csv'): string {
    switch (format) {
      case 'ics':
        return this.generateICS(events);
      case 'json':
        return JSON.stringify(events, null, 2);
      case 'csv':
        return this.generateCSV(events);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Generate CSV format
  private generateCSV(events: CalendarEvent[]): string {
    const headers = ['Title', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Description', 'Location', 'Status'];
    const rows = events.map(event => [
      event.title,
      format(event.start, 'yyyy-MM-dd'),
      format(event.start, 'HH:mm'),
      format(event.end, 'yyyy-MM-dd'),
      format(event.end, 'HH:mm'),
      event.description || '',
      event.location || '',
      event.status
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}

// Calendar Integration Hooks
export const useCalendarIntegration = () => {
  const generateCalendarLinks = (event: CalendarEvent) => ({
    google: new CalendarIntegrationService({ provider: 'google', enabled: true, syncInterval: 30 }).generateGoogleCalendarURL(event),
    outlook: new CalendarIntegrationService({ provider: 'outlook', enabled: true, syncInterval: 30 }).generateOutlookCalendarURL(event),
    apple: new CalendarIntegrationService({ provider: 'apple', enabled: true, syncInterval: 30 }).generateAppleCalendarURL(event),
    ics: new CalendarIntegrationService({ provider: 'ical', enabled: true, syncInterval: 30 }).generateICS([event])
  });

  const exportToCalendar = (event: CalendarEvent, provider: 'google' | 'outlook' | 'apple' | 'ics') => {
    const service = new CalendarIntegrationService({ provider: 'google', enabled: true, syncInterval: 30 });
    
    switch (provider) {
      case 'google':
        window.open(service.generateGoogleCalendarURL(event), '_blank');
        break;
      case 'outlook':
        window.open(service.generateOutlookCalendarURL(event), '_blank');
        break;
      case 'apple':
        window.open(service.generateAppleCalendarURL(event), '_blank');
        break;
      case 'ics':
        const icsContent = service.generateICS([event]);
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        link.click();
        URL.revokeObjectURL(url);
        break;
    }
  };

  return {
    generateCalendarLinks,
    exportToCalendar
  };
};
