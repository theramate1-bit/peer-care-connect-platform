import { supabase } from '@/integrations/supabase/client';
import { PushNotificationService } from './push-notifications';

export enum ExchangeNotificationType {
  EXCHANGE_REQUEST_RECEIVED = 'exchange_request_received',
  EXCHANGE_REQUEST_ACCEPTED = 'exchange_request_accepted', 
  EXCHANGE_REQUEST_DECLINED = 'exchange_request_declined',
  EXCHANGE_REQUEST_EXPIRED = 'exchange_request_expired',
  EXCHANGE_SLOT_HELD = 'exchange_slot_held',
  EXCHANGE_SLOT_RELEASED = 'exchange_slot_released',
  EXCHANGE_SESSION_CONFIRMED = 'exchange_session_confirmed'
}

export interface ExchangeNotificationPayload {
  type: ExchangeNotificationType;
  requestId: string;
  practitionerId: string;
  practitionerName: string;
  sessionDate: string;
  startTime: string;
  duration: number;
  actionRequired: boolean;
  expiresAt?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_entity_id?: string;
  related_entity_type?: string;
  action_required: boolean;
  expires_at?: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export class ExchangeNotificationService {
  /**
   * Send exchange request notification
   */
  static async sendExchangeRequestNotification(
    recipientId: string,
    payload: ExchangeNotificationPayload
  ): Promise<Notification> {
    const notification = await this.createNotification({
      user_id: recipientId,
      title: `New Treatment Exchange Request`,
      message: `${payload.practitionerName} has requested a ${payload.duration}-minute treatment exchange on ${payload.sessionDate} at ${payload.startTime}`,
      notification_type: payload.type,
      related_entity_id: payload.requestId,
      related_entity_type: 'treatment_exchange_request',
      action_required: true,
      expires_at: payload.expiresAt,
      read: false
    });

    // Send push notification
    await this.sendPushNotification(recipientId, {
      title: notification.title,
      body: notification.message,
      data: {
        type: 'exchange_request',
        requestId: payload.requestId,
        action: 'view_request'
      }
    });

    return notification;
  }

  /**
   * Send exchange response notification
   */
  static async sendExchangeResponseNotification(
    requesterId: string,
    payload: ExchangeNotificationPayload,
    response: 'accepted' | 'declined'
  ): Promise<Notification> {
    const isAccepted = response === 'accepted';
    const notification = await this.createNotification({
      user_id: requesterId,
      title: `Exchange Request ${isAccepted ? 'Accepted' : 'Declined'}`,
      message: `${payload.practitionerName} has ${isAccepted ? 'accepted' : 'declined'} your treatment exchange request for ${payload.sessionDate} at ${payload.startTime}`,
      notification_type: isAccepted ? ExchangeNotificationType.EXCHANGE_REQUEST_ACCEPTED : ExchangeNotificationType.EXCHANGE_REQUEST_DECLINED,
      related_entity_id: payload.requestId,
      related_entity_type: 'treatment_exchange_request',
      action_required: isAccepted,
      read: false
    });

    // Send push notification
    await this.sendPushNotification(requesterId, {
      title: notification.title,
      body: notification.message,
      data: {
        type: 'exchange_response',
        requestId: payload.requestId,
        response: response,
        action: isAccepted ? 'view_session' : 'browse_alternatives'
      }
    });

    return notification;
  }

  /**
   * Send slot held notification
   */
  static async sendSlotHeldNotification(
    practitionerId: string,
    payload: ExchangeNotificationPayload
  ): Promise<Notification> {
    const notification = await this.createNotification({
      user_id: practitionerId,
      title: `Slot Reserved for Exchange`,
      message: `Your slot on ${payload.sessionDate} at ${payload.startTime} has been temporarily reserved for the treatment exchange request`,
      notification_type: ExchangeNotificationType.EXCHANGE_SLOT_HELD,
      related_entity_id: payload.requestId,
      related_entity_type: 'slot_hold',
      action_required: false,
      expires_at: payload.expiresAt,
      read: false
    });

    return notification;
  }

  /**
   * Send slot released notification
   */
  static async sendSlotReleasedNotification(
    practitionerId: string,
    payload: ExchangeNotificationPayload
  ): Promise<Notification> {
    const notification = await this.createNotification({
      user_id: practitionerId,
      title: `Slot Released`,
      message: `The slot on ${payload.sessionDate} at ${payload.startTime} is now available again`,
      notification_type: ExchangeNotificationType.EXCHANGE_SLOT_RELEASED,
      related_entity_id: payload.requestId,
      related_entity_type: 'slot_hold',
      action_required: false,
      read: false
    });

    return notification;
  }

  /**
   * Send session confirmed notification
   */
  static async sendSessionConfirmedNotification(
    practitionerId: string,
    payload: ExchangeNotificationPayload
  ): Promise<Notification> {
    const notification = await this.createNotification({
      user_id: practitionerId,
      title: `Exchange Session Confirmed`,
      message: `Your treatment exchange session with ${payload.practitionerName} on ${payload.sessionDate} at ${payload.startTime} has been confirmed`,
      notification_type: ExchangeNotificationType.EXCHANGE_SESSION_CONFIRMED,
      related_entity_id: payload.requestId,
      related_entity_type: 'mutual_exchange_session',
      action_required: false,
      read: false
    });

    // Send push notification
    await this.sendPushNotification(practitionerId, {
      title: notification.title,
      body: notification.message,
      data: {
        type: 'session_confirmed',
        requestId: payload.requestId,
        action: 'view_session'
      }
    });

    return notification;
  }

  /**
   * Create notification in database
   */
  private static async createNotification(notificationData: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(
    userId: string,
    payload: {
      title: string;
      body: string;
      data?: any;
    }
  ): Promise<void> {
    try {
      const pushService = PushNotificationService.getInstance();
      await pushService.sendLocalNotification({
        title: payload.title,
        body: payload.body,
        data: payload.data,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true
      });
    } catch (error) {
      console.warn('Failed to send push notification:', error);
      // Don't throw - push notifications are optional
    }
  }

  /**
   * Get exchange notifications for a user
   */
  static async getExchangeNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .like('notification_type', 'exchange_%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    const { data, error } = await supabase
      .rpc('expire_old_notifications');
      
    if (error) throw error;
    return data || 0;
  }
}
