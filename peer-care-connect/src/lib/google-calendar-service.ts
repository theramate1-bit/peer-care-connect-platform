import { supabase } from '@/integrations/supabase/client';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  status?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  syncedCount?: number;
  error?: string;
}

export class GoogleCalendarService {
  private static get edgeFunctionUrl(): string {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return `${url?.replace('/rest/v1', '') || 'https://aikqnvltuwwgifuocvto.supabase.co'}/functions/v1/google-calendar-sync`;
  }

  /**
   * Get Google OAuth authorization URL
   */
  static async getAuthUrl(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'get_auth_url' }),
    });

    if (!response.ok) {
      throw new Error('Failed to get auth URL');
    }

    const { authUrl } = await response.json();
    return authUrl;
  }

  /**
   * Exchange OAuth code for tokens
   */
  static async exchangeCode(code: string): Promise<{ success: boolean; calendarId?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'exchange_code', code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to exchange code');
    }

    return await response.json();
  }

  /**
   * Sync calendar events (two-way sync)
   * Fetches from Google Calendar and pushes internal events to Google
   */
  static async syncEvents(): Promise<CalendarSyncResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'sync_events' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json();
      return { success: true, syncedCount: result.synced };
    } catch (error) {
      console.error('Calendar sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Push a single event to Google Calendar
   */
  static async pushEvent(event: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendees?: string[];
  }): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'push_event', event }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to push event');
      }

      const result = await response.json();
      return { success: true, eventId: result.eventId };
    } catch (error) {
      console.error('Push event error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch events from Google Calendar for a date range
   */
  static async fetchEvents(startTime: string, endTime: string): Promise<GoogleCalendarEvent[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'fetch_events',
        startTime,
        endTime,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch events');
    }

    const { events } = await response.json();
    return events || [];
  }

  /**
   * Check if user has Google Calendar connected
   */
  static async isConnected(): Promise<boolean> {
    const { data, error } = await supabase
      .from('calendar_sync_configs')
      .select('enabled')
      .eq('provider', 'google')
      .eq('enabled', true)
      .single();

    return !error && data?.enabled === true;
  }

  /**
   * Disconnect Google Calendar
   */
  static async disconnect(): Promise<void> {
    const { error } = await supabase
      .from('calendar_sync_configs')
      .update({ enabled: false })
      .eq('provider', 'google');

    if (error) throw error;
  }
}

