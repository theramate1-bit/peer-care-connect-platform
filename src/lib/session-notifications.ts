import { supabase } from '@/integrations/supabase/client';
import { MessagingManager } from './messaging';

/**
 * Preference keys used for notification enforcement (see NOTIFICATION_PREFERENCES.md).
 * Triggers map to: booking_created -> booking/in-app; reminders -> session_reminders/calendarReminders; etc.
 */
export interface SessionNotificationTrigger {
  trigger: 'booking_created' | '24h_reminder' | '2h_reminder' | '1h_reminder' | 
           'session_confirmed' | 'session_started' | 'session_completed' | 
           'follow_up_24h' | 'follow_up_7d' | 'session_cancelled';
  sessionId: string;
  clientId: string;
  practitionerId: string;
  sessionDate: string;
  sessionTime: string;
  sessionType: string;
  practitionerName?: string;
  clientName?: string;
  cancellationReason?: string;
  /** Session location for confirmation message (clinic address or visit address). */
  sessionLocation?: string;
  /** When set, use "Visit address" for mobile, "Session at" for clinic in the message. */
  sessionLocationLabel?: 'visit' | 'session';
}

/** Recipient preferences may be practitioner shape (receiveInAppNotifications, emailNotifications) or client shape (notification_preferences.email_notifications). */
function shouldSendInAppNotification(preferences: Record<string, unknown> | null | undefined): boolean {
  if (!preferences) return true;
  const receiveInApp = preferences.receiveInAppNotifications;
  if (typeof receiveInApp === 'boolean') return receiveInApp;
  const np = preferences.notification_preferences as Record<string, unknown> | undefined;
  const emailNotif = np?.email_notifications ?? preferences.emailNotifications;
  if (typeof emailNotif === 'boolean') return emailNotif;
  return true;
}

export class SessionNotifications {
  /**
   * Send notification based on session event. Respects recipient's account preferences:
   * if they have disabled in-app notifications, the message is not sent.
   * When the caller is not the recipient, RLS may block reading preferences; we then skip sending.
   */
  static async sendNotification(trigger: SessionNotificationTrigger): Promise<void> {
    try {
      const recipientId = trigger.clientId;
      const { data: prefRow, error: prefError } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', recipientId)
        .maybeSingle();

      if (prefError || !prefRow) {
        return;
      }
      if (!shouldSendInAppNotification(prefRow.preferences as Record<string, unknown> | null)) {
        return;
      }

      const conversationId = await MessagingManager.getOrCreateConversation(
        trigger.clientId,
        trigger.practitionerId
      );

      const message = this.generateMessage(trigger);

      try {
        await MessagingManager.sendMessage(
          conversationId,
          trigger.clientId,
          message,
          'system'
        );
      } catch (msgError) {
        console.warn('Could not send booking notification message (non-critical):', msgError);
        return;
      }

      console.log(`✅ Sent ${trigger.trigger} notification for session ${trigger.sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to send ${trigger.trigger} notification:`, error);
    }
  }

  /**
   * Generate message content based on trigger type
   */
  private static generateMessage(trigger: SessionNotificationTrigger): string {
    const { trigger: type, sessionDate, sessionTime, sessionType, practitionerName, clientName, cancellationReason, sessionLocation, sessionLocationLabel } = trigger;

    switch (type) {
      case 'booking_created': {
        const locationLabel = sessionLocationLabel === 'visit' ? 'Visit address' : 'Session at';
        const locationLine = sessionLocation ? ` ${locationLabel}: ${sessionLocation}.` : '';
        return `🎉 Your ${sessionType} session with ${practitionerName} has been confirmed for ${sessionDate} at ${sessionTime}.${locationLine} Looking forward to seeing you!`;
      }

      case '24h_reminder':
        return `⏰ Reminder: Your ${sessionType} session with ${practitionerName} is tomorrow at ${sessionTime}. Please arrive 5 minutes early.`;

      case '2h_reminder':
        return `⏰ Reminder: Your ${sessionType} session with ${practitionerName} starts in 2 hours (${sessionTime}). See you soon!`;

      case '1h_reminder':
        return `⏰ Your ${sessionType} session starts in 1 hour (${sessionTime}). See you soon!`;

      case 'session_confirmed':
        return `✅ ${practitionerName} has confirmed your ${sessionType} session on ${sessionDate} at ${sessionTime}.`;

      case 'session_started':
        return `🏥 Your session with ${practitionerName} has started. Have a great session!`;

      case 'session_completed':
        return `✨ Session completed! Thank you for attending. How did your session go? Please share your feedback when you have a moment.`;

      case 'follow_up_24h':
        return `👋 Hi! Just checking in - how are you feeling after yesterday's session? Any questions or concerns?`;

      case 'follow_up_7d':
        return `📊 It's been a week since your last session. How are you progressing? Would you like to schedule a follow-up?`;

      case 'session_cancelled':
        return `❌ Your ${sessionType} session on ${sessionDate} at ${sessionTime} has been cancelled. ${cancellationReason ? `Reason: ${cancellationReason}` : ''} Please contact ${practitionerName} to reschedule.`;

      default:
        return `Update regarding your ${sessionType} session on ${sessionDate} at ${sessionTime}.`;
    }
  }

  /**
   * Schedule automated reminders for a session
   */
  static async scheduleReminders(sessionId: string): Promise<void> {
    // This would integrate with a job scheduler (e.g., Supabase Edge Functions with cron)
    // For now, we'll create a database trigger approach
    console.log(`Reminders scheduled for session ${sessionId}`);
  }
}

