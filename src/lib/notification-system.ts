/**
 * Complete Notification System
 * Handles all platform notifications including booking, payment, and session reminders
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationData {
  user_id: string;
  type: 'booking_confirmed' | 'payment_confirmed' | 'session_reminder' | 'session_cancelled' | 'new_message' | 'review_received';
  title: string;
  message: string;
  data?: any;
}

export class NotificationSystem {
  /**
   * Send booking confirmation notifications
   */
  static async sendBookingConfirmation(sessionId: string): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:users!client_sessions_client_id_fkey(first_name, last_name, email),
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const notifications = [
        {
          user_id: session.client_id,
          type: 'booking_confirmed',
          title: 'Booking Confirmed',
          message: `Your ${session.session_type} session with ${session.practitioner?.first_name} ${session.practitioner?.last_name} on ${session.session_date} at ${session.start_time} has been confirmed.`,
          data: {
            session_id: sessionId,
            practitioner_name: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
            session_date: session.session_date,
            start_time: session.start_time,
            session_type: session.session_type
          }
        },
        {
          user_id: session.therapist_id,
          type: 'booking_confirmed',
          title: 'New Booking Received',
          message: `You have a new ${session.session_type} session with ${session.client?.first_name} ${session.client?.last_name} on ${session.session_date} at ${session.start_time}.`,
          data: {
            session_id: sessionId,
            client_name: `${session.client?.first_name} ${session.client?.last_name}`,
            session_date: session.session_date,
            start_time: session.start_time,
            session_type: session.session_type
          }
        }
      ];

      await supabase
        .from('notifications')
        .insert(notifications);

      // Schedule session reminders
      await this.scheduleSessionReminders(sessionId);

    } catch (error) {
      console.error('Error sending booking confirmation:', error);
    }
  }

  /**
   * Schedule session reminders
   */
  static async scheduleSessionReminders(sessionId: string): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('client_sessions')
        .select('session_date, start_time, client_id, therapist_id')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
      const now = new Date();

      // Schedule reminders at 24 hours and 2 hours before
      const reminders = [
        {
          session_id: sessionId,
          reminder_type: 'email',
          reminder_time: new Date(sessionDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          message: 'Your session is tomorrow',
          status: 'pending'
        },
        {
          session_id: sessionId,
          reminder_type: 'email',
          reminder_time: new Date(sessionDateTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          message: 'Your session is in 2 hours',
          status: 'pending'
        }
      ];

      // Only schedule future reminders
      const futureReminders = reminders.filter(r => new Date(r.reminder_time) > now);

      if (futureReminders.length > 0) {
        await supabase
          .from('reminders')
          .insert(futureReminders);
      }

    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }

  /**
   * Send session cancellation notifications
   */
  static async sendCancellationNotification(sessionId: string, cancelledBy: string): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:users!client_sessions_client_id_fkey(first_name, last_name, email),
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const isClientCancellation = cancelledBy === session.client_id;
      const recipientId = isClientCancellation ? session.therapist_id : session.client_id;
      const recipientName = isClientCancellation ? 
        `${session.practitioner?.first_name} ${session.practitioner?.last_name}` :
        `${session.client?.first_name} ${session.client?.last_name}`;

      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'session_cancelled',
          title: 'Session Cancelled',
          message: `Your ${session.session_type} session on ${session.session_date} at ${session.start_time} has been cancelled.`,
          data: {
            session_id: sessionId,
            cancelled_by: cancelledBy,
            session_date: session.session_date,
            start_time: session.start_time,
            session_type: session.session_type
          }
        });

    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  /**
   * Send new message notification
   */
  static async sendMessageNotification(
    conversationId: string,
    senderId: string,
    recipientId: string,
    messagePreview: string
  ): Promise<void> {
    try {
      // Get sender name
      const { data: sender } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', senderId)
        .single();

      if (!sender) return;

      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'new_message',
          title: 'New Message',
          message: `${sender.first_name} ${sender.last_name}: ${messagePreview.substring(0, 50)}...`,
          data: {
            conversation_id: conversationId,
            sender_id: senderId,
            sender_name: `${sender.first_name} ${sender.last_name}`
          }
        });

    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }

  /**
   * Send review notification
   */
  static async sendReviewNotification(
    practitionerId: string,
    clientName: string,
    rating: number,
    reviewId: string
  ): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: practitionerId,
          type: 'review_received',
          title: 'New Review Received',
          message: `${clientName} left you a ${rating}-star review!`,
          data: {
            review_id: reviewId,
            client_name: clientName,
            rating: rating
          }
        });

    } catch (error) {
      console.error('Error sending review notification:', error);
    }
  }

  /**
   * Process pending reminders
   */
  static async processPendingReminders(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get pending reminders that are due
      const { data: reminders } = await supabase
        .from('reminders')
        .select(`
          *,
          session:client_sessions(
            session_date,
            start_time,
            client_id,
            therapist_id,
            session_type,
            client:users!client_sessions_client_id_fkey(first_name, last_name),
            practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name)
          )
        `)
        .eq('status', 'pending')
        .lte('reminder_time', now);

      if (!reminders || reminders.length === 0) return;

      for (const reminder of reminders) {
        try {
          const session = reminder.session;
          if (!session) continue;

          // Create notifications for both client and practitioner
          const notifications = [
            {
              user_id: session.client_id,
              type: 'session_reminder',
              title: 'Session Reminder',
              message: `Your ${session.session_type} session with ${session.practitioner?.first_name} ${session.practitioner?.last_name} is ${reminder.message.toLowerCase()}.`,
              data: {
                session_id: reminder.session_id,
                practitioner_name: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
                session_date: session.session_date,
                start_time: session.start_time,
                session_type: session.session_type
              }
            },
            {
              user_id: session.therapist_id,
              type: 'session_reminder',
              title: 'Session Reminder',
              message: `Your ${session.session_type} session with ${session.client?.first_name} ${session.client?.last_name} is ${reminder.message.toLowerCase()}.`,
              data: {
                session_id: reminder.session_id,
                client_name: `${session.client?.first_name} ${session.client?.last_name}`,
                session_date: session.session_date,
                start_time: session.start_time,
                session_type: session.session_type
              }
            }
          ];

          await supabase
            .from('notifications')
            .insert(notifications);

          // Mark reminder as sent
          await supabase
            .from('reminders')
            .update({
              status: 'sent',
              sent_at: now
            })
            .eq('id', reminder.id);

        } catch (error) {
          console.error('Error processing reminder:', error);
          
          // Mark reminder as failed
          await supabase
            .from('reminders')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', reminder.id);
        }
      }

    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}
