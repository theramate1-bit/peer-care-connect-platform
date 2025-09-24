/**
 * Real-time Updates Service
 * Provides WebSocket connections and real-time subscriptions
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SessionStatusUpdate {
  session_id: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  check_in_time?: string;
  check_out_time?: string;
  updated_at: string;
}

export interface NotificationUpdate {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read_at?: string;
  created_at: string;
}

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to session status updates
   */
  subscribeToSessionUpdates(
    sessionId: string,
    onUpdate: (update: SessionStatusUpdate) => void
  ): RealtimeChannel {
    const channelName = `session-${sessionId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const update: SessionStatusUpdate = {
            session_id: payload.new.id,
            status: payload.new.status,
            check_in_time: payload.new.check_in_time,
            check_out_time: payload.new.check_out_time,
            updated_at: payload.new.updated_at
          };
          onUpdate(update);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: NotificationUpdate) => void
  ): RealtimeChannel {
    const channelName = `notifications-${userId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification: NotificationUpdate = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            read_at: payload.new.read_at,
            created_at: payload.new.created_at
          };
          onNotification(notification);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to conversation messages
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: any) => void
  ): RealtimeChannel {
    const channelName = `messages-${conversationId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onMessage(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to therapist availability updates
   */
  subscribeToTherapistAvailability(
    therapistId: string,
    onAvailabilityChange: (availability: any) => void
  ): RealtimeChannel {
    const channelName = `availability-${therapistId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'therapist_availability',
          filter: `therapist_id=eq.${therapistId}`
        },
        (payload) => {
          onAvailabilityChange(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to payment status updates
   */
  subscribeToPaymentUpdates(
    paymentId: string,
    onPaymentUpdate: (payment: any) => void
  ): RealtimeChannel {
    const channelName = `payment-${paymentId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`
        },
        (payload) => {
          onPaymentUpdate(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelName: string): boolean {
    return this.channels.has(channelName);
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
