// Centralized real-time availability subscription manager
// Handles connection pooling and reconnection for availability updates

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AvailabilitySubscription {
  channel: RealtimeChannel;
  practitionerId: string;
  sessionDate: string;
  callback: () => void;
}

class RealtimeAvailabilityService {
  private subscriptions: Map<string, AvailabilitySubscription> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  /**
   * Subscribe to availability changes for a practitioner and date
   */
  subscribe(
    practitionerId: string,
    sessionDate: string,
    callback: () => void
  ): () => void {
    const key = `${practitionerId}-${sessionDate}`;

    // If already subscribed, just update callback
    if (this.subscriptions.has(key)) {
      const sub = this.subscriptions.get(key)!;
      sub.callback = callback;
      return () => this.unsubscribe(key);
    }

    const channel = supabase
      .channel(`availability-${key}`)
      // Listen to postgres_changes for calendar_events (blocked time)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${practitionerId}`
        },
        (payload: any) => {
          const newEventType = payload.new?.event_type;
          const oldEventType = payload.old?.event_type;
          if (newEventType === 'block' || newEventType === 'unavailable' || 
              oldEventType === 'block' || oldEventType === 'unavailable') {
            const eventDate = payload.new?.start_time || payload.old?.start_time;
            if (eventDate && typeof eventDate === 'string' && eventDate.startsWith(sessionDate)) {
              callback();
            }
          }
        }
      )
      // Listen to postgres_changes for client_sessions (bookings)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_sessions',
          filter: `therapist_id=eq.${practitionerId}`
        },
        (payload: any) => {
          const sessionDatePayload = payload.new?.session_date || payload.old?.session_date;
          if (sessionDatePayload === sessionDate) {
            callback();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts.delete(key);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.handleReconnect(key, practitionerId, sessionDate, callback);
        }
      });

    this.subscriptions.set(key, {
      channel,
      practitionerId,
      sessionDate,
      callback
    });

    return () => this.unsubscribe(key);
  }

  /**
   * Unsubscribe from availability changes
   */
  private unsubscribe(key: string): void {
    const sub = this.subscriptions.get(key);
    if (sub) {
      supabase.removeChannel(sub.channel);
      this.subscriptions.delete(key);
      this.reconnectAttempts.delete(key);
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(
    key: string,
    practitionerId: string,
    sessionDate: string,
    callback: () => void
  ): void {
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnect attempts reached for ${key}`);
      return;
    }

    this.reconnectAttempts.set(key, attempts + 1);
    const delay = Math.min(1000 * Math.pow(2, attempts), 10000); // Max 10s

    setTimeout(() => {
      // Unsubscribe and resubscribe
      this.unsubscribe(key);
      this.subscribe(practitionerId, sessionDate, callback);
    }, delay);
  }

  /**
   * Unsubscribe all
   */
  unsubscribeAll(): void {
    for (const key of this.subscriptions.keys()) {
      this.unsubscribe(key);
    }
  }
}

// Singleton instance
export const realtimeAvailabilityService = new RealtimeAvailabilityService();

