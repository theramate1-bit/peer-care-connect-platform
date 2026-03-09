import { supabase } from '@/integrations/supabase/client';
import { PushNotificationService } from './push-notifications';

/**
 * Format time from HH:mm:ss or HH:mm to 12-hour format (e.g., "9:00am")
 */
function formatTimeTo12Hour(timeString: string): string {
  if (!timeString) return timeString;
  
  // Handle both HH:mm:ss and HH:mm formats
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1] || '00';
  
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.padStart(2, '0')}${period}`;
}

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
  ): Promise<string> {
    const notificationId = await this.createNotification({
      recipient_id: recipientId,
      type: payload.type || 'exchange_request',
      title: `New Treatment Exchange Request`,
      body: `${payload.practitionerName} has requested a ${payload.duration}-minute treatment exchange on ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)}`,
      payload: {
        requestId: payload.requestId,
        practitionerName: payload.practitionerName,
        sessionDate: payload.sessionDate,
        startTime: payload.startTime,
        duration: payload.duration,
        expiresAt: payload.expiresAt,
        action_required: true
      },
      source_type: 'treatment_exchange_request',
      source_id: payload.requestId
    });

    // Send push notification
    await this.sendPushNotification(recipientId, {
      title: `New Treatment Exchange Request`,
      body: `${payload.practitionerName} has requested a ${payload.duration}-minute treatment exchange on ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)}`,
      data: {
        type: 'exchange_request',
        requestId: payload.requestId,
        action: 'view_request'
      }
    });

    // Send email notification
    try {
      const { data: recipientData } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', recipientId)
        .single();

      if (recipientData?.email) {
        const baseUrl = window.location.origin;
        const recipientName = recipientData.first_name && recipientData.last_name
          ? `${recipientData.first_name} ${recipientData.last_name}`
          : recipientData.first_name || 'there';

        await supabase.functions.invoke('send-email', {
          body: {
            emailType: 'peer_request_received',
            recipientEmail: recipientData.email,
            recipientName: recipientName,
            data: {
              requestId: payload.requestId,
              requesterName: payload.practitionerName,
              sessionDate: payload.sessionDate,
              sessionTime: payload.startTime,
              sessionDuration: payload.duration,
              expiresAt: payload.expiresAt,
              bookingUrl: `${baseUrl}/practice/exchange-requests?request=${payload.requestId}`,
              acceptUrl: `${baseUrl}/practice/exchange-requests?request=${payload.requestId}&action=accept`,
              declineUrl: `${baseUrl}/practice/exchange-requests?request=${payload.requestId}&action=decline`
            }
          }
        });
      }
    } catch (error) {
      console.warn('Failed to send exchange request email:', error);
      // Don't throw - emails are non-critical
    }

    return notificationId;
  }

  /**
   * Send exchange response notification
   */
  static async sendExchangeResponseNotification(
    requesterId: string,
    payload: ExchangeNotificationPayload,
    response: 'accepted' | 'declined'
  ): Promise<string> {
    const isAccepted = response === 'accepted';
    const notificationId = await this.createNotification({
      recipient_id: requesterId,
      type: isAccepted ? ExchangeNotificationType.EXCHANGE_REQUEST_ACCEPTED : ExchangeNotificationType.EXCHANGE_REQUEST_DECLINED,
      title: `Exchange Request ${isAccepted ? 'Accepted' : 'Declined'}`,
      body: `${payload.practitionerName} has ${isAccepted ? 'accepted' : 'declined'} your treatment exchange request for ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)}`,
      payload: {
        requestId: payload.requestId,
        practitionerName: payload.practitionerName,
        sessionDate: payload.sessionDate,
        startTime: payload.startTime,
        duration: payload.duration,
        action_required: isAccepted
      },
      source_type: 'treatment_exchange_request',
      source_id: payload.requestId
    });

    // Send push notification
    await this.sendPushNotification(requesterId, {
      title: `Exchange Request ${isAccepted ? 'Accepted' : 'Declined'}`,
      body: `${payload.practitionerName} has ${isAccepted ? 'accepted' : 'declined'} your treatment exchange request for ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)}`,
      data: {
        type: 'exchange_response',
        requestId: payload.requestId,
        response: response,
        action: isAccepted ? 'view_session' : 'browse_alternatives'
      }
    });

    // Send email notification
    try {
      const { data: requesterData } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', requesterId)
        .single();

      if (requesterData?.email) {
        const baseUrl = window.location.origin;
        const requesterName = requesterData.first_name && requesterData.last_name
          ? `${requesterData.first_name} ${requesterData.last_name}`
          : requesterData.first_name || 'there';

        const emailType = isAccepted ? 'peer_request_accepted' : 'peer_request_declined';
        const emailData: any = {
          requestId: payload.requestId,
          practitionerName: payload.practitionerName,
          sessionDate: payload.sessionDate,
          sessionTime: payload.startTime,
          sessionDuration: payload.duration
        };

        if (isAccepted) {
          // Fixed credit cost: 20 credits per 60-minute session
          const creditCost = 20;
          emailData.paymentAmount = creditCost;
          emailData.bookingUrl = `${baseUrl}/credits#peer-treatment`;
        } else {
          emailData.bookingUrl = `${baseUrl}/credits#peer-treatment`;
        }

        await supabase.functions.invoke('send-email', {
          body: {
            emailType: emailType,
            recipientEmail: requesterData.email,
            recipientName: requesterName,
            data: emailData
          }
        });
      }
    } catch (error) {
      console.warn('Failed to send exchange response email:', error);
      // Don't throw - emails are non-critical
    }

    return notificationId;
  }

  /**
   * Send slot held notification
   */
  static async sendSlotHeldNotification(
    practitionerId: string,
    payload: ExchangeNotificationPayload
  ): Promise<string> {
    const notificationId = await this.createNotification({
      recipient_id: practitionerId,
      type: ExchangeNotificationType.EXCHANGE_SLOT_HELD,
      title: `Slot Reserved for Exchange`,
      body: `Your slot on ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)} has been temporarily reserved for the treatment exchange request`,
      payload: {
        requestId: payload.requestId,
        sessionDate: payload.sessionDate,
        startTime: payload.startTime,
        expiresAt: payload.expiresAt
      },
      source_type: 'slot_hold',
      source_id: payload.requestId
    });

    return notificationId;
  }

  /**
   * Send slot released notification
   */
  static async sendSlotReleasedNotification(
    practitionerId: string,
    payload: ExchangeNotificationPayload
  ): Promise<string> {
    const notificationId = await this.createNotification({
      recipient_id: practitionerId,
      type: ExchangeNotificationType.EXCHANGE_SLOT_RELEASED,
      title: `Slot Released`,
      body: `The slot on ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)} is now available again`,
      payload: {
        requestId: payload.requestId,
        sessionDate: payload.sessionDate,
        startTime: payload.startTime
      },
      source_type: 'slot_hold',
      source_id: payload.requestId
    });

    return notificationId;
  }

  /**
   * Send session confirmed notification
   */
  static async sendSessionConfirmedNotification(
    practitionerId: string,
    payload: ExchangeNotificationPayload
  ): Promise<string> {
    const notificationId = await this.createNotification({
      recipient_id: practitionerId,
      type: ExchangeNotificationType.EXCHANGE_SESSION_CONFIRMED,
      title: `Exchange Session Confirmed`,
      body: `Your treatment exchange session with ${payload.practitionerName} on ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)} has been confirmed`,
      payload: {
        requestId: payload.requestId,
        practitionerName: payload.practitionerName,
        sessionDate: payload.sessionDate,
        startTime: payload.startTime,
        duration: payload.duration
      },
      source_type: 'mutual_exchange_session',
      source_id: payload.requestId
    });

    // Send push notification
    await this.sendPushNotification(practitionerId, {
      title: `Exchange Session Confirmed`,
      body: `Your treatment exchange session with ${payload.practitionerName} on ${payload.sessionDate} at ${formatTimeTo12Hour(payload.startTime)} has been confirmed`,
      data: {
        type: 'session_confirmed',
        requestId: payload.requestId,
        action: 'view_session'
      }
    });

    return notificationId;
  }

  /**
   * Create notification in database using RPC function
   */
  private static async createNotification(notificationData: {
    recipient_id: string;
    type: string;
    title: string;
    body: string;
    payload?: any;
    source_type?: string;
    source_id?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('create_notification', {
      p_recipient_id: notificationData.recipient_id,
      p_type: notificationData.type,
      p_title: notificationData.title,
      p_body: notificationData.body,
      p_payload: notificationData.payload || {},
      p_source_type: notificationData.source_type || null,
      p_source_id: notificationData.source_id || null
    });

    if (error) throw error;
    return data as string;
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
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Mark all notifications related to a request as read
   * This is called when a request is accepted/declined to clean up old notifications
   */
  static async markRequestNotificationsAsRead(
    requestId: string,
    recipientId: string
  ): Promise<void> {
    try {
      // Find all notifications related to this request for the recipient
      const { data: relatedNotifications, error: fetchError } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', recipientId)
        .eq('source_id', requestId)
        .in('source_type', ['treatment_exchange_request', 'slot_hold'])
        .is('read_at', null);

      if (fetchError) {
        console.warn('Error fetching related notifications:', fetchError);
        return;
      }

      if (!relatedNotifications || relatedNotifications.length === 0) {
        return; // No notifications to mark as read
      }

      // Mark all related notifications as read using RPC function
      const notificationIds = relatedNotifications.map(n => n.id);
      const { error: markError } = await supabase.rpc('mark_notifications_read', {
        p_ids: notificationIds
      });

      if (markError) {
        console.warn('Error marking request notifications as read:', markError);
      } else {
        console.log(`Marked ${notificationIds.length} related notifications as read for request ${requestId}`);
      }
    } catch (error) {
      console.warn('Error in markRequestNotificationsAsRead:', error);
      // Don't throw - notification cleanup is non-critical
    }
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
