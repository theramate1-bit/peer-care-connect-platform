/**
 * Timezone Utilities for Peer Care Connect
 * Handles timezone detection, conversion, and display
 */

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  displayName: string;
}

export class TimezoneUtils {
  /**
   * Get user's browser timezone
   */
  static getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Get common timezones for UK practitioners
   */
  static getCommonTimezones(): TimezoneInfo[] {
    return [
      { timezone: 'Europe/London', offset: 'GMT/BST', displayName: 'London (GMT/BST)' },
      { timezone: 'Europe/Dublin', offset: 'GMT/IST', displayName: 'Dublin (GMT/IST)' },
      { timezone: 'Europe/Edinburgh', offset: 'GMT/BST', displayName: 'Edinburgh (GMT/BST)' },
      { timezone: 'Europe/Belfast', offset: 'GMT/BST', displayName: 'Belfast (GMT/BST)' },
      { timezone: 'UTC', offset: 'UTC', displayName: 'UTC' },
      { timezone: 'America/New_York', offset: 'EST/EDT', displayName: 'New York (EST/EDT)' },
      { timezone: 'America/Los_Angeles', offset: 'PST/PDT', displayName: 'Los Angeles (PST/PDT)' },
      { timezone: 'Europe/Paris', offset: 'CET/CEST', displayName: 'Paris (CET/CEST)' },
      { timezone: 'Europe/Berlin', offset: 'CET/CEST', displayName: 'Berlin (CET/CEST)' },
      { timezone: 'Australia/Sydney', offset: 'AEST/AEDT', displayName: 'Sydney (AEST/AEDT)' }
    ];
  }

  /**
   * Convert time from one timezone to another
   */
  static convertTime(
    time: string, 
    fromTimezone: string, 
    toTimezone: string
  ): string {
    try {
      const date = new Date(`2000-01-01T${time}`);
      const fromDate = new Date(date.toLocaleString('en-US', { timeZone: fromTimezone }));
      const toDate = new Date(date.toLocaleString('en-US', { timeZone: toTimezone }));
      
      const diff = toDate.getTime() - fromDate.getTime();
      const convertedDate = new Date(date.getTime() + diff);
      
      return convertedDate.toTimeString().slice(0, 5);
    } catch (error) {
      console.error('Timezone conversion error:', error);
      return time; // Return original time if conversion fails
    }
  }

  /**
   * Check if a timezone supports daylight saving time
   */
  static hasDST(timezone: string): boolean {
    try {
      const now = new Date();
      const jan = new Date(now.getFullYear(), 0, 1);
      const jul = new Date(now.getFullYear(), 6, 1);
      
      const janOffset = jan.getTimezoneOffset();
      const julOffset = jul.getTimezoneOffset();
      
      return janOffset !== julOffset;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current time in a specific timezone
   */
  static getCurrentTimeInTimezone(timezone: string): string {
    try {
      const now = new Date();
      return now.toLocaleTimeString('en-GB', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error getting current time:', error);
      return '00:00';
    }
  }

  /**
   * Validate if a timezone string is valid
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get timezone offset in minutes
   */
  static getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
      return (target.getTime() - utc.getTime()) / 60000;
    } catch (error) {
      return 0;
    }
  }
}
