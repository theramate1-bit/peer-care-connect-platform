/**
 * Complete Notification System
 * Handles all platform notifications including booking, payment, and session reminders
 * Now includes email notifications via Resend API
 */
// @ts-nocheck - Supabase generated types are strict; relax for runtime-correct code until types are aligned
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CancellationPolicyService } from './cancellation-policy';
import { formatTimeWithoutSeconds } from './date';
import { getSessionLocation } from '@/utils/sessionLocation';
import { createInAppNotification } from '@/lib/notification-utils';

/**
 * Generate calendar download URL (.ics format)
 */
function generateCalendarUrl(
  title: string,
  description: string,
  startDate: string,
  startTime: string,
  durationMinutes: number,
  location?: string
): string {
  // Parse date and time
  const startDateTime = new Date(`${startDate}T${startTime}`)
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000)
  
  // Format dates for ICS (YYYYMMDDTHHMMSS)
  const formatICSDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}`
  }
  
  // Escape text for ICS format
  const escapeICS = (text: string) => {
    return text.replace(/\\/g, '\\\\')
               .replace(/;/g, '\\;')
               .replace(/,/g, '\\,')
               .replace(/\n/g, '\\n')
  }
  
  // Generate ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Theramate//Session Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(startDateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    `UID:${Date.now()}@theramate.co.uk`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\\r\\n')
  
  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`
}

/**
 * Generate Google Maps directions URL
 */
function generateDirectionsUrl(location: string): string {
  if (!location || location.trim() === '') {
    return '#'
  }
  
  const encodedLocation = encodeURIComponent(location)
  return `https://maps.google.com/maps?q=${encodedLocation}`
}

export interface NotificationData {
  user_id: string;
  type: 'booking_confirmed' | 'payment_confirmed' | 'session_reminder' | 'session_cancelled' | 'new_message' | 'review_received';
  title: string;
  message: string;
  data?: any;
}

export class NotificationSystem {
  /**
   * Send email notification via Edge Function
   */
  private static async sendEmailNotification(
    emailType: string,
    recipientEmail: string,
    recipientName: string,
    data: any
  ): Promise<void> {
    try {
      const { data: responseData, error } = await supabase.functions.invoke('send-email', {
        body: {
          emailType,
          recipientEmail,
          recipientName,
          data
        }
      });

      if (error) {
        console.error(`[Email Error] ${emailType} to ${recipientEmail}:`, error);
        // Log to error tracking service if available
        // Don't throw - email failures shouldn't block booking flow
        return;
      }

      // Verify email was actually sent successfully
      if (responseData && !responseData.success) {
        console.error(`[Email Failed] ${emailType} to ${recipientEmail}:`, responseData.error || responseData.message);
        // Don't throw - email failures shouldn't block booking flow
        return;
      }

      // Log successful send for debugging
      if (responseData && responseData.success) {
        console.log(`[Email Sent] ${emailType} to ${recipientEmail} (ID: ${responseData.emailId})`);
      }
    } catch (error) {
      console.error(`[Email Exception] ${emailType} to ${recipientEmail}:`, error);
      // Don't throw - email failures shouldn't block booking flow
    }
  }

  /**
   * Send booking confirmation notifications
   */
  static async sendBookingConfirmation(sessionId: string): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:users!client_sessions_client_id_fkey(first_name, last_name, email, user_role),
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email, therapist_type, clinic_address, location),
          service:practitioner_products!client_sessions_service_id_fkey(service_type)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const { sessionLocation, locationLabel } = getSessionLocation(session, session.practitioner ?? undefined);
      const locationLine = sessionLocation
        ? locationLabel === 'Visit address'
          ? (sessionLocation === 'Visit address to be confirmed' ? ' Visit address to be confirmed.' : ` Visit at: ${sessionLocation}.`)
          : ` Location: ${sessionLocation}.`
        : '';

      const notifications = [
        {
          user_id: session.client_id,
          type: 'booking_confirmed',
          title: 'Booking Confirmed',
          message: `Your ${session.session_type} session with ${session.practitioner?.first_name} ${session.practitioner?.last_name} on ${session.session_date} at ${formatTimeWithoutSeconds(session.start_time)} has been confirmed.${locationLine}`,
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
          message: `You have a new ${session.session_type} session with ${session.client?.first_name} ${session.client?.last_name} on ${session.session_date} at ${formatTimeWithoutSeconds(session.start_time)}.${locationLine}`,
          data: {
            session_id: sessionId,
            client_name: `${session.client?.first_name} ${session.client?.last_name}`,
            session_date: session.session_date,
            start_time: session.start_time,
            session_type: session.session_type
          }
        }
      ];

      // Create notifications using RPC function
      for (const notif of notifications) {
        await createInAppNotification({
          recipientId: notif.user_id,
          type: notif.type,
          title: notif.title,
          body: notif.message,
          payload: notif.data || {},
          sourceType: 'booking',
          sourceId: sessionId
        }).catch(error => {
          console.error('Error creating booking notification:', error);
        });
      }

      // Get cancellation policy for email
      const cancellationPolicy = await CancellationPolicyService.getPolicy(session.therapist_id);
      const policySummary = CancellationPolicyService.getPolicySummary(cancellationPolicy);

      // Send email notifications
      // Handle both authenticated clients (session.client.email) and guest bookings (session.client_email)
      const clientEmail = session.client?.email || session.client_email;
      const clientName = session.client 
        ? `${session.client.first_name} ${session.client.last_name}` 
        : session.client_name || 'Client';
      const isGuestRecipient = session.client?.user_role === 'guest' || !session.client;
      const bookingUrl = isGuestRecipient
        ? (
            session.guest_view_token
              ? `${window.location.origin}/booking/view/${sessionId}?token=${encodeURIComponent(session.guest_view_token)}`
              : `${window.location.origin}/booking/view/${sessionId}${clientEmail ? `?email=${encodeURIComponent(clientEmail)}` : ''}`
          )
        : `${window.location.origin}/client/sessions`;
      const messageUrl = isGuestRecipient && clientEmail
        ? `${window.location.origin}/register?email=${encodeURIComponent(clientEmail)}&redirect=${encodeURIComponent('/messages')}`
        : `${window.location.origin}/messages`;

      if (clientEmail) {
        await this.sendEmailNotification(
          'booking_confirmation_client',
          clientEmail,
          clientName,
          {
            sessionId: sessionId,
            sessionType: session.session_type,
            sessionDate: session.session_date,
            sessionTime: formatTimeWithoutSeconds(session.start_time),
            sessionPrice: session.price,
            sessionDuration: session.duration_minutes,
            sessionLocation: session.location,
            practitionerName: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
            practitionerId: session.therapist_id, // For profile links
            therapistType: (session.practitioner as any)?.therapist_type || undefined,
            serviceType: (session.service as any)?.service_type || undefined,
            paymentStatus: session.payment_status || undefined,
            sessionStatus: session.status || undefined,
            requiresApproval: session.requires_approval || undefined,
            cancellationPolicySummary: policySummary,
            bookingUrl,
            calendarUrl: generateCalendarUrl(
              `${session.session_type} with ${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
              `Session: ${session.session_type}\\nPractitioner: ${session.practitioner?.first_name} ${session.practitioner?.last_name}\\nDuration: ${session.duration_minutes} minutes`,
              session.session_date,
              session.start_time,
              session.duration_minutes || 60,
              session.location || undefined
            ),
            messageUrl,
            directionsUrl: generateDirectionsUrl(session.location || '')
          }
        );
      }

      if (session.practitioner?.email) {
        await this.sendEmailNotification(
          'booking_confirmation_practitioner',
          session.practitioner.email,
          `${session.practitioner.first_name} ${session.practitioner.last_name}`,
          {
            sessionId: sessionId,
            sessionType: session.session_type,
            sessionDate: session.session_date,
            sessionTime: formatTimeWithoutSeconds(session.start_time),
            sessionPrice: session.price,
            sessionDuration: session.duration_minutes,
            clientName: `${session.client?.first_name} ${session.client?.last_name}`,
            clientEmail: session.client?.email,
            paymentStatus: session.payment_status,
            bookingUrl: `${window.location.origin}/practice/sessions/${sessionId}`,
            messageUrl: `${window.location.origin}/messages`
          }
        );
      }

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

      // Schedule reminders at 24 hours, 2 hours, and 1 hour before
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
          message: 'Your session starts in 2 hours',
          status: 'pending'
        },
        {
          session_id: sessionId,
          reminder_type: 'email',
          reminder_time: new Date(sessionDateTime.getTime() - 60 * 60 * 1000).toISOString(),
          message: 'Your session starts in 1 hour',
          status: 'pending'
        }
      ];

      // Only schedule future reminders
      const futureReminders = reminders.filter(r => new Date(r.reminder_time) > now);

      if (futureReminders.length > 0) {
        // Check for existing reminders to prevent duplicates
        const { data: existingReminders } = await supabase
          .from('reminders')
          .select('reminder_time')
          .eq('session_id', sessionId)
          .in('status', ['pending', 'sent']);

        const existingTimes = new Set(
          (existingReminders || []).map(r => r.reminder_time)
        );

        // Filter out reminders that already exist
        const newReminders = futureReminders.filter(
          r => !existingTimes.has(r.reminder_time)
        );

        if (newReminders.length > 0) {
        await supabase
          .from('reminders')
            .insert(newReminders);
        }
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
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email, clinic_address, location)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const { sessionLocation, locationLabel } = getSessionLocation(session, session.practitioner ?? undefined);
      const locationLine = sessionLocation
        ? locationLabel === 'Visit address'
          ? (sessionLocation === 'Visit address to be confirmed' ? ' (Visit – address TBC).' : ` (Visit at: ${sessionLocation}).`)
          : ` (${sessionLocation}).`
        : '';

      const isClientCancellation = cancelledBy === session.client_id;
      const recipientId = isClientCancellation ? session.therapist_id : session.client_id;
      const recipientName = isClientCancellation ? 
        `${session.practitioner?.first_name} ${session.practitioner?.last_name}` :
        `${session.client?.first_name} ${session.client?.last_name}`;

      await createInAppNotification({
        recipientId,
        type: 'session_cancelled',
        title: 'Session Cancelled',
        body: `Your ${session.session_type} session on ${session.session_date} at ${session.start_time} has been cancelled.${locationLine}`,
        payload: {
          session_id: sessionId,
          cancelled_by: cancelledBy,
          session_date: session.session_date,
          start_time: session.start_time,
          session_type: session.session_type
        },
        sourceType: 'session',
        sourceId: sessionId
      });

      // Send email notification to the recipient
      const recipientEmail = isClientCancellation ? session.practitioner?.email : session.client?.email;
      if (recipientEmail) {
        await this.sendEmailNotification(
          'cancellation',
          recipientEmail,
          recipientName,
          {
            sessionId: sessionId,
            sessionType: session.session_type,
            sessionDate: session.session_date,
            sessionTime: formatTimeWithoutSeconds(session.start_time),
            practitionerName: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
            cancellationReason: 'Session cancelled by participant',
            refundAmount: session.payment_status === 'completed' ? session.price : 0
          }
        );
      }

    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  /**
   * Send session rescheduling notifications
   */
  static async sendReschedulingNotification(
    sessionId: string,
    originalDate: string,
    originalTime: string,
    newDate: string,
    newTime: string
  ): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:users!client_sessions_client_id_fkey(first_name, last_name, email),
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email, clinic_address, location)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const { sessionLocation, locationLabel } = getSessionLocation(session, session.practitioner ?? undefined);
      const locationLine = sessionLocation
        ? locationLabel === 'Visit address'
          ? (sessionLocation === 'Visit address to be confirmed' ? ' Visit address TBC.' : ` Visit at: ${sessionLocation}.`)
          : ` Location: ${sessionLocation}.`
        : '';

      // Create notifications for both parties using RPC
      await createInAppNotification({
        recipientId: session.client_id,
        type: 'session_rescheduled',
        title: 'Session Rescheduled',
        body: `Your ${session.session_type} session has been rescheduled to ${newDate} at ${newTime}.${locationLine}`,
        payload: {
          session_id: sessionId,
          original_date: originalDate,
          original_time: originalTime,
          new_date: newDate,
          new_time: newTime,
          session_type: session.session_type
        },
        sourceType: 'session',
        sourceId: sessionId
      });

      await createInAppNotification({
        recipientId: session.therapist_id,
        type: 'session_rescheduled',
        title: 'Session Rescheduled',
        body: `Your ${session.session_type} session has been rescheduled to ${newDate} at ${newTime}.${locationLine}`,
        payload: {
          session_id: sessionId,
          original_date: originalDate,
          original_time: originalTime,
          new_date: newDate,
          new_time: newTime,
          session_type: session.session_type
        },
        sourceType: 'session',
        sourceId: sessionId
      });

      // Send email to client
      if (session.client?.email) {
        await this.sendEmailNotification(
          'rescheduling',
          session.client.email,
          `${session.client.first_name} ${session.client.last_name}`,
          {
            sessionId: sessionId,
            sessionType: session.session_type,
            originalDate: originalDate,
            originalTime: originalTime,
            newDate: newDate,
            newTime: newTime,
            practitionerName: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
            bookingUrl: `${window.location.origin}/client/sessions`,
            calendarUrl: generateCalendarUrl(
              `Rescheduled: ${session.session_type}`,
              `Session rescheduled to ${newDate} at ${newTime}\\nPractitioner: ${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
              newDate,
              newTime,
              session.duration_minutes || 60,
              session.location || undefined
            )
          }
        );
      }

      // Send email to practitioner
      if (session.practitioner?.email) {
        await this.sendEmailNotification(
          'rescheduling',
          session.practitioner.email,
          `${session.practitioner.first_name} ${session.practitioner.last_name}`,
          {
            sessionId: sessionId,
            sessionType: session.session_type,
            originalDate: originalDate,
            originalTime: originalTime,
            newDate: newDate,
            newTime: newTime,
            practitionerName: `${session.practitioner.first_name} ${session.practitioner.last_name}`,
            bookingUrl: `${window.location.origin}/practice/sessions/${sessionId}`,
            calendarUrl: generateCalendarUrl(
              `Rescheduled: ${session.session_type}`,
              `Session rescheduled to ${newDate} at ${newTime}\\nClient: ${session.client?.first_name} ${session.client?.last_name}`,
              newDate,
              newTime,
              session.duration_minutes || 60,
              session.location || undefined
            )
          }
        );
      }

    } catch (error) {
      console.error('Error sending rescheduling notification:', error);
    }
  }

  /**
   * Send payment confirmation notifications
   */
  static async sendPaymentConfirmation(paymentId: string): Promise<void> {
    try {
      const { data: payment } = await supabase
        .from('payments')
        .select(`
          *,
          session:client_sessions(
            *,
            client:users!client_sessions_client_id_fkey(first_name, last_name, email, phone),
            practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email, phone)
          )
        `)
        .eq('id', paymentId)
        .single();

      if (!payment || !payment.session) return;

      const session = payment.session;

      // Send email to client
      if (session.client?.email) {
        await this.sendEmailNotification(
          'payment_confirmation_client',
          session.client.email,
          `${session.client.first_name} ${session.client.last_name}`,
          {
            paymentId: paymentId,
            paymentAmount: payment.amount,
            sessionType: session.session_type,
            sessionDate: session.session_date,
            sessionTime: formatTimeWithoutSeconds(session.start_time),
            practitionerName: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
            bookingUrl: `${window.location.origin}/client/sessions`
          }
        );
      }

      // Send email to practitioner
      if (session.practitioner?.email) {
        await this.sendEmailNotification(
          'payment_received_practitioner',
          session.practitioner.email,
          `${session.practitioner.first_name} ${session.practitioner.last_name}`,
          {
            paymentId: paymentId,
            paymentAmount: payment.amount,
            platformFee: payment.platform_fee_amount || 0,
            practitionerAmount: payment.practitioner_amount || payment.amount,
            clientName: `${session.client?.first_name} ${session.client?.last_name}`,
            sessionType: session.session_type,
            sessionDate: session.session_date
          }
        );
      }

    } catch (error) {
      console.error('Error sending payment confirmation:', error);
    }
  }

  /**
   * Send review request email to client after session completion
   */
  static async sendReviewRequest(sessionId: string): Promise<void> {
    try {
      // Fetch session details
      const { data: session } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:users!client_sessions_client_id_fkey(id, first_name, last_name, email)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) {
        console.warn('Session not found for review request:', sessionId);
        return;
      }

      // Only send for completed sessions with completed payment
      if (session.status !== 'completed') {
        console.warn('Review request skipped: Session not completed', sessionId);
        return;
      }

      if (session.payment_status !== 'completed') {
        console.warn('Review request skipped: Payment not completed', sessionId);
        return;
      }

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingReview) {
        console.log('Review request skipped: Review already exists', sessionId);
        return;
      }

      // Determine recipient email and name
      // Handle both guest clients (client_email) and authenticated clients (client.email)
      const recipientEmail = session.client_email || session.client?.email;
      const recipientName = session.client_name || 
        (session.client ? `${session.client.first_name} ${session.client.last_name}` : 'there');

      if (!recipientEmail) {
        console.warn('Review request skipped: No email found for session', sessionId);
        return;
      }

      // Get practitioner name for email
      const { data: practitioner } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', session.therapist_id)
        .single();

      const practitionerName = practitioner 
        ? `${practitioner.first_name} ${practitioner.last_name}`
        : 'your practitioner';

      // Send review request email
      await this.sendEmailNotification(
        'review_request_client',
        recipientEmail,
        recipientName,
        {
          sessionId: sessionId,
          sessionType: session.session_type,
          sessionDate: session.session_date,
          sessionTime: session.start_time,
          sessionDuration: session.duration_minutes,
          sessionLocation: session.location,
          practitionerName: practitionerName
        }
      );

    } catch (error) {
      console.error('Error sending review request:', error);
      // Don't throw - email failures shouldn't block session completion
    }
  }

  /**
   * Send guest message notification email
   */
  static async sendGuestMessageNotification(
    conversationId: string,
    guestEmail: string,
    messagePreview: string,
    practitionerName: string
  ): Promise<void> {
    try {
      // Try to get guest name from sessions if available
      const { data: guestSession } = await supabase
        .from('client_sessions')
        .select('client_name')
        .eq('client_email', guestEmail)
        .limit(1)
        .single();

      const recipientName = guestSession?.client_name || guestEmail.split('@')[0];

      // Send guest message notification email
      await this.sendEmailNotification(
        'message_received_guest',
        guestEmail,
        recipientName,
        {
          conversationId: conversationId,
          messagePreview: messagePreview.substring(0, 200),
          practitionerName: practitionerName
        }
      );

    } catch (error) {
      console.error('Error sending guest message notification:', error);
      // Don't throw - email failures shouldn't block messaging
    }
  }

  /**
   * Send new message notification
   */
  static async sendMessageNotification(
    conversationId: string,
    messageId: string,
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

      // Get recipient details for email
      const { data: recipient } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, user_role')
        .eq('id', recipientId)
        .single();

      // Create in-app notification
      await createInAppNotification({
        recipientId,
        type: 'new_message',
        title: 'New Message',
        body: `${sender.first_name} ${sender.last_name}: ${messagePreview.substring(0, 50)}...`,
        payload: {
          conversation_id: conversationId,
          message_id: messageId,
          sender_id: senderId,
          sender_name: `${sender.first_name} ${sender.last_name}`
        },
        sourceType: 'message',
        sourceId: messageId
      });

      // Send email notification to practitioner if recipient is a practitioner
      if (recipient && recipient.email && recipient.user_role !== 'client' && recipient.user_role !== 'guest') {
        // Check if user has opted out of email notifications
        const optedOut = await this.checkNotificationOptOut(recipientId, 'email');
        if (!optedOut) {
          await this.sendEmailNotification(
            'message_received_practitioner',
            recipient.email,
            `${recipient.first_name} ${recipient.last_name}`,
            {
              conversationId: conversationId,
              senderName: `${sender.first_name} ${sender.last_name}`,
              messagePreview: messagePreview.substring(0, 200),
              messageUrl: `${window.location.origin}/messages`
            }
          );
        }
      }

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
      await createInAppNotification({
        recipientId: practitionerId,
        type: 'review_received',
        title: 'New Review Received',
        body: `${clientName} left you a ${rating}-star review!`,
        payload: {
          review_id: reviewId,
          client_name: clientName,
          rating: rating
        },
        sourceType: 'review',
        sourceId: reviewId
      });

    } catch (error) {
      console.error('Error sending review notification:', error);
    }
  }

  /**
   * Send mobile booking request email notification to practitioner
   */
  static async sendMobileBookingRequestNotification(
    practitionerId: string,
    requestData: {
      requestId: string;
      clientName: string;
      serviceType: string;
      requestedDate: string;
      requestedTime: string;
      clientAddress: string;
      distanceKm?: number;
      price?: number;
    }
  ): Promise<void> {
    try {
      // Get practitioner details
      const { data: practitioner } = await supabase
        .from('users')
        .select('email, first_name, last_name, user_role')
        .eq('id', practitionerId)
        .maybeSingle();

      if (!practitioner || !practitioner.email) return;

      // Check if user has opted out of email notifications
      const optedOut = await this.checkNotificationOptOut(practitionerId, 'email');
      if (optedOut) return;

      // Send email notification
      await this.sendEmailNotification(
        'booking_request_practitioner',
        practitioner.email,
        `${practitioner.first_name} ${practitioner.last_name}`,
        {
          requestId: requestData.requestId,
          clientName: requestData.clientName,
          serviceType: requestData.serviceType,
          requestedDate: requestData.requestedDate,
          requestedTime: requestData.requestedTime,
          clientAddress: requestData.clientAddress,
          distanceKm: requestData.distanceKm,
          price: requestData.price,
          requestUrl: `${window.location.origin}/practice/mobile-requests`
        }
      );

    } catch (error) {
      console.error('Error sending mobile booking request notification:', error);
      // Don't throw - email failures shouldn't block request creation
    }
  }

  /**
   * Send mobile booking accepted email to client/guest.
   */
  static async sendMobileBookingAcceptedNotification(
    clientId: string,
    data: {
      requestId: string;
      practitionerName: string;
      serviceType: string;
      sessionDate: string;
      sessionTime: string;
      clientAddress: string;
      pricePence?: number;
    }
  ): Promise<void> {
    try {
      const { data: client } = await supabase
        .from('users')
        .select('email, first_name, last_name, user_role')
        .eq('id', clientId)
        .maybeSingle();

      if (!client?.email) return;
      const optedOut = await this.checkNotificationOptOut(clientId, 'email');
      if (optedOut) return;

      const requestUrl =
        client.user_role === 'client'
          ? `${window.location.origin}/client/mobile-requests`
          : `${window.location.origin}/guest/mobile-requests?email=${encodeURIComponent(client.email)}`;

      await this.sendEmailNotification(
        'mobile_request_accepted_client',
        client.email,
        `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        {
          requestId: data.requestId,
          practitionerName: data.practitionerName,
          serviceType: data.serviceType,
          requestedDate: data.sessionDate,
          requestedTime: data.sessionTime,
          clientAddress: data.clientAddress,
          price: data.pricePence,
          requestUrl,
        }
      );
    } catch (error) {
      console.error('Error sending mobile accepted email:', error);
    }
  }

  /**
   * Send mobile booking declined email to client/guest.
   */
  static async sendMobileBookingDeclinedNotification(
    clientId: string,
    data: {
      requestId: string;
      practitionerName: string;
      serviceType: string;
      requestedDate: string;
      requestedTime: string;
      declineReason?: string | null;
      alternateDate?: string | null;
      alternateTime?: string | null;
    }
  ): Promise<void> {
    try {
      const { data: client } = await supabase
        .from('users')
        .select('email, first_name, last_name, user_role')
        .eq('id', clientId)
        .maybeSingle();

      if (!client?.email) return;
      const optedOut = await this.checkNotificationOptOut(clientId, 'email');
      if (optedOut) return;

      const requestUrl =
        client.user_role === 'client'
          ? `${window.location.origin}/client/mobile-requests?requestId=${data.requestId}`
          : `${window.location.origin}/guest/mobile-requests?email=${encodeURIComponent(client.email)}&requestId=${data.requestId}`;

      await this.sendEmailNotification(
        'mobile_request_declined_client',
        client.email,
        `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        {
          requestId: data.requestId,
          practitionerName: data.practitionerName,
          serviceType: data.serviceType,
          requestedDate: data.requestedDate,
          requestedTime: data.requestedTime,
          cancellationReason: data.declineReason || undefined,
          newDate: data.alternateDate || undefined,
          newTime: data.alternateTime || undefined,
          requestUrl,
        }
      );
    } catch (error) {
      console.error('Error sending mobile declined email:', error);
    }
  }

  /**
   * Send mobile booking expired email to client/guest.
   */
  static async sendMobileBookingExpiredNotification(
    clientId: string,
    data: {
      requestId: string;
      practitionerName: string;
      serviceType: string;
      requestedDate: string;
      requestedTime: string;
    }
  ): Promise<void> {
    try {
      const { data: client } = await supabase
        .from('users')
        .select('email, first_name, last_name, user_role')
        .eq('id', clientId)
        .maybeSingle();

      if (!client?.email) return;
      const optedOut = await this.checkNotificationOptOut(clientId, 'email');
      if (optedOut) return;

      const requestUrl =
        client.user_role === 'client'
          ? `${window.location.origin}/client/mobile-requests`
          : `${window.location.origin}/guest/mobile-requests?email=${encodeURIComponent(client.email)}`;

      await this.sendEmailNotification(
        'mobile_request_expired_client',
        client.email,
        `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        {
          requestId: data.requestId,
          practitionerName: data.practitionerName,
          serviceType: data.serviceType,
          requestedDate: data.requestedDate,
          requestedTime: data.requestedTime,
          requestUrl,
        }
      );
    } catch (error) {
      console.error('Error sending mobile expired email:', error);
    }
  }

  /**
   * Check if user has opted out of notifications
   */
  private static async checkNotificationOptOut(userId: string, notificationType: 'email' | 'push' | 'sms' = 'email'): Promise<boolean> {
    try {
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select(`${notificationType}`)
        .eq('user_id', userId)
        .maybeSingle();

      if (preferences) {
        if (notificationType === 'email') {
          return !preferences.email;
        } else if (notificationType === 'sms') {
          return !preferences.sms;
        } else {
          return !preferences.push;
        }
      }

      // Backward compatibility: fallback to users.preferences JSON when row doesn't exist.
      const { data: user } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle();
      const legacy = (user as { preferences?: Record<string, unknown> | null } | null)?.preferences ?? null;
      if (!legacy || typeof legacy !== 'object') return false;

      if (notificationType === 'email') {
        return legacy.emailNotifications === false;
      }
      if (notificationType === 'sms') {
        return legacy.smsNotifications !== true;
      }
      return legacy.receiveInAppNotifications === false;
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return false; // Default to allowing notifications on error
    }
  }

  /**
   * Format phone number to E.164 format (required by Twilio)
   */
  private static formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If already starts with +, return as is (assuming it's already E.164)
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // If starts with 0, replace with country code (UK: +44)
    if (digits.startsWith('0')) {
      return `+44${digits.substring(1)}`;
    }
    
    // If starts with 44 (UK country code without +), add +
    if (digits.startsWith('44')) {
      return `+${digits}`;
    }
    
    // If it's a UK number (10 digits starting with 7), add +44
    if (digits.length === 10 && digits.startsWith('7')) {
      return `+44${digits}`;
    }
    
    // If it's 11 digits and starts with 1 (US), add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Default: assume UK and add +44
    if (digits.length >= 10) {
      return `+44${digits}`;
    }
    
    return null; // Invalid format
  }

  /**
   * Send SMS notification via Edge Function
   */
  private static async sendSMSNotification(
    phoneNumber: string,
    message: string,
    sessionId?: string,
    reminderType?: '24h' | '2h' | '1h'
  ): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        console.error(`[SMS Error] Invalid phone number format: ${phoneNumber}`);
        return;
      }

      const { data: responseData, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: formattedPhone,
          message: message,
          sessionId: sessionId,
          reminderType: reminderType
        }
      });

      if (error) {
        console.error(`[SMS Error] ${reminderType || 'notification'} to ${formattedPhone}:`, error);
        // Don't throw - SMS failures shouldn't block reminder flow
        return;
      }

      // Verify SMS was actually sent successfully
      if (responseData && !responseData.success) {
        console.error(`[SMS Failed] ${reminderType || 'notification'} to ${formattedPhone}:`, responseData.error || responseData.message);
        // Don't throw - SMS failures shouldn't block reminder flow
        return;
      }

      // Log successful send for debugging
      if (responseData && responseData.success) {
        console.log(`[SMS Sent] ${reminderType || 'notification'} to ${formattedPhone} (SID: ${responseData.messageSid})`);
      }
    } catch (error) {
      console.error(`[SMS Exception] ${reminderType || 'notification'} to ${phoneNumber}:`, error);
      // Don't throw - SMS failures shouldn't block reminder flow
    }
  }

  /**
   * Process pending reminders
   */
  static async processPendingReminders(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get pending reminders that are due
      const { data } = await supabase
        .from('reminders')
        .select(`
          *,
          session:client_sessions(
            session_date,
            start_time,
            client_id,
            therapist_id,
            session_type,
            location,
            duration_minutes,
            appointment_type,
            visit_address,
            client:users!client_sessions_client_id_fkey(first_name, last_name, email, phone),
            practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email, phone, clinic_address, location)
          )
        `)
        .eq('status', 'pending')
        .lte('reminder_time', now);

      type ReminderRow = {
        id: string;
        session_id: string;
        message: string;
        session: {
          session_date?: string;
          start_time?: string;
          client_id?: string;
          therapist_id?: string;
          session_type?: string;
          location?: string;
          duration_minutes?: number;
          appointment_type?: string | null;
          visit_address?: string | null;
          client?: { first_name?: string; last_name?: string; email?: string; phone?: string };
          practitioner?: { first_name?: string; last_name?: string; email?: string; phone?: string; clinic_address?: string | null; location?: string | null };
        } | null;
      };
      const reminders = (data ?? []) as unknown as ReminderRow[];

      if (reminders.length === 0) return;

      for (const reminder of reminders) {
        try {
          const session = reminder.session;
          if (!session) continue;

          // Check if users have opted out of email notifications
          const clientOptedOut = await this.checkNotificationOptOut(session.client_id, 'email');
          const practitionerOptedOut = await this.checkNotificationOptOut(session.therapist_id, 'email');

          // Skip if both users have opted out
          if (clientOptedOut && practitionerOptedOut) {
            await supabase
              .from('reminders')
              .update({ status: 'skipped', sent_at: now } as any)
              .eq('id', reminder.id as any);
            continue;
          }

          // Determine reminder type for personalized messaging
          let reminderType: 'session_reminder_24h' | 'session_reminder_2h' | 'session_reminder_1h';
          let personalizedMessage: string;
          
          if (reminder.message.includes('tomorrow')) {
            reminderType = 'session_reminder_24h';
            personalizedMessage = 'tomorrow';
          } else if (reminder.message.includes('2 hours')) {
            reminderType = 'session_reminder_2h';
            personalizedMessage = 'in 2 hours';
          } else {
            reminderType = 'session_reminder_1h';
            personalizedMessage = 'in 1 hour';
          }

          const { sessionLocation, locationLabel } = getSessionLocation(session, session.practitioner ?? undefined);
          const locationLine = sessionLocation
            ? locationLabel === 'Visit address'
              ? (sessionLocation === 'Visit address to be confirmed' ? ' Visit address TBC.' : ` Visit at: ${sessionLocation}.`)
              : ` Location: ${sessionLocation}.`
            : '';

          // Create notifications for both client and practitioner (respect opt-out)
          const notifications = [];
          
          if (!clientOptedOut) {
            notifications.push({
              user_id: session.client_id,
              type: 'session_reminder',
              title: 'Session Reminder',
              message: `Hi ${session.client?.first_name}! Your ${session.session_type} session with ${session.practitioner?.first_name} ${session.practitioner?.last_name} is ${personalizedMessage}.${locationLine}`,
              data: {
                session_id: reminder.session_id,
                practitioner_name: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
                session_date: session.session_date,
                start_time: session.start_time,
                session_type: session.session_type
              }
            });
          }

          if (!practitionerOptedOut) {
            notifications.push({
              user_id: session.therapist_id,
              type: 'session_reminder',
              title: 'Session Reminder',
              message: `Hi ${session.practitioner?.first_name}! Your ${session.session_type} session with ${session.client?.first_name} ${session.client?.last_name} is ${personalizedMessage}.${locationLine}`,
              data: {
                session_id: reminder.session_id,
                client_name: `${session.client?.first_name} ${session.client?.last_name}`,
                session_date: session.session_date,
                start_time: session.start_time,
                session_type: session.session_type
              }
            });
          }

          // Create notifications using RPC function
          for (const notif of notifications) {
            try {
              await createInAppNotification({
                recipientId: notif.user_id,
                type: notif.type,
                title: notif.title,
                body: notif.message,
                payload: notif.data || {},
                sourceType: 'session_reminder',
                sourceId: reminder.session_id
              });
            } catch (error) {
              console.error('Error creating reminder notification:', error);
            }
          }

          // Get cancellation policy for reminder emails
          const policy = await CancellationPolicyService.getPolicy(session.therapist_id);
          const policySummary = CancellationPolicyService.getPolicySummary(policy);

          // Check SMS opt-out preferences
          const clientSmsOptedOut = await this.checkNotificationOptOut(session.client_id, 'sms');
          const practitionerSmsOptedOut = await this.checkNotificationOptOut(session.therapist_id, 'sms');

          // Send email reminders (respect opt-out)
          if (!clientOptedOut && session.client?.email) {
            await this.sendEmailNotification(
              reminderType,
              session.client.email,
              `${session.client.first_name} ${session.client.last_name}`,
              {
                sessionId: reminder.session_id,
                sessionType: session.session_type,
                sessionDate: session.session_date,
                sessionTime: formatTimeWithoutSeconds(session.start_time),
                sessionDuration: session.duration_minutes || 60,
                practitionerName: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
                sessionLocation: session.location || '',
                clientFirstName: session.client.first_name,
                practitionerFirstName: session.practitioner?.first_name || '',
                cancellationPolicySummary: policySummary,
                bookingUrl: `${window.location.origin}/client/sessions`,
                messageUrl: `${window.location.origin}/messages`,
                directionsUrl: generateDirectionsUrl(session.location || '')
              }
            );
          }

          if (!practitionerOptedOut && session.practitioner?.email) {
            await this.sendEmailNotification(
              reminderType,
              session.practitioner.email,
              `${session.practitioner.first_name} ${session.practitioner.last_name}`,
              {
                sessionId: reminder.session_id,
                sessionType: session.session_type,
                sessionDate: session.session_date,
                sessionTime: formatTimeWithoutSeconds(session.start_time),
                sessionDuration: session.duration_minutes || 60,
                clientName: `${session.client?.first_name} ${session.client?.last_name}`,
                clientFirstName: session.client?.first_name || '',
                sessionLocation: session.location || '',
                bookingUrl: `${window.location.origin}/practice/sessions/${reminder.session_id}`,
                messageUrl: `${window.location.origin}/messages`,
                directionsUrl: generateDirectionsUrl(session.location || '')
              }
            );
          }

          // Send SMS reminders (respect opt-out and only for 24h and 2h reminders)
          if ((reminderType === 'session_reminder_24h' || reminderType === 'session_reminder_2h')) {
            // Format session date and time for SMS
            const sessionDate = new Date(session.session_date).toLocaleDateString('en-GB', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            });
            const sessionTime = formatTimeWithoutSeconds(session.start_time);
            const practitionerName = `${session.practitioner?.first_name} ${session.practitioner?.last_name}`;
            const sessionLocation = session.location || 'Location TBD';
            const cancellationUrl = `${window.location.origin}/my-bookings?cancel=${reminder.session_id}`;

            // Send SMS to client
            if (!clientSmsOptedOut && session.client?.phone) {
              const smsMessage = reminderType === 'session_reminder_24h'
                ? `Reminder: Session with ${practitionerName} on ${sessionDate} at ${sessionTime} at ${sessionLocation}. Cancel: ${cancellationUrl}`
                : `Final Reminder: Session in 2 hours at ${sessionLocation} with ${practitionerName}. Cancel: ${cancellationUrl}`;
              
              await this.sendSMSNotification(
                session.client.phone,
                smsMessage,
                reminder.session_id,
                reminderType === 'session_reminder_24h' ? '24h' : '2h'
              );
            }

            // Send SMS to practitioner (optional - only if they have opted in)
            if (!practitionerSmsOptedOut && session.practitioner?.phone) {
              const clientName = `${session.client?.first_name} ${session.client?.last_name}`;
              const smsMessage = reminderType === 'session_reminder_24h'
                ? `Reminder: Session with ${clientName} on ${sessionDate} at ${sessionTime} at ${sessionLocation}`
                : `Final Reminder: Session in 2 hours with ${clientName} at ${sessionLocation}`;
              
              await this.sendSMSNotification(
                session.practitioner.phone,
                smsMessage,
                reminder.session_id,
                reminderType === 'session_reminder_24h' ? '24h' : '2h'
              );
            }
          }

          // Mark reminder as sent
          await supabase
            .from('reminders')
            .update({
              status: 'sent',
              sent_at: now
            } as any)
            .eq('id', reminder.id as any);

        } catch (error) {
          console.error('Error processing reminder:', error);
          
          // Mark reminder as failed
          await supabase
            .from('reminders')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            } as any)
            .eq('id', reminder.id as any);
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
        .eq('recipient_id', userId as never)
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
        .update({ read_at: new Date().toISOString() } as any)
        .eq('id', notificationId as any);
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
        .eq('recipient_id', userId as never)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Send peer booking confirmation notifications
   */
  static async sendPeerBookingNotifications(
    sessionId: string,
    clientId: string,
    practitionerId: string,
    sessionData: {
      sessionType: string;
      sessionDate: string;
      sessionTime: string;
      sessionDuration: number;
      creditCost: number;
    },
    clientName: string,
    clientEmail: string,
    practitionerName: string,
    practitionerEmail: string
  ): Promise<void> {
    try {
      const baseUrl = window.location.origin;
      
      // Generate calendar URL
      const calendarUrl = generateCalendarUrl(
        `Peer Treatment: ${sessionData.sessionType}`,
        `Peer treatment session with ${practitionerName}`,
        sessionData.sessionDate,
        sessionData.sessionTime,
        sessionData.sessionDuration
      );

      // Send confirmation to client
      await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'peer_booking_confirmed_client',
          recipientEmail: clientEmail,
          recipientName: clientName,
          data: {
            sessionId,
            sessionType: sessionData.sessionType,
            sessionDate: sessionData.sessionDate,
            sessionTime: formatTimeWithoutSeconds(sessionData.sessionTime),
            sessionDuration: sessionData.sessionDuration,
            practitionerName,
            paymentAmount: sessionData.creditCost,
            bookingUrl: `${baseUrl}/credits#peer-treatment`,
            calendarUrl
          }
        }
      });

      // Send credits deducted notification to client
      await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'peer_credits_deducted',
          recipientEmail: clientEmail,
          recipientName: clientName,
          data: {
            sessionId,
            sessionType: sessionData.sessionType,
            sessionDate: sessionData.sessionDate,
            sessionTime: formatTimeWithoutSeconds(sessionData.sessionTime),
            practitionerName,
            paymentAmount: sessionData.creditCost
          }
        }
      });

      // Send confirmation to practitioner
      await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'peer_booking_confirmed_practitioner',
          recipientEmail: practitionerEmail,
          recipientName: practitionerName,
          data: {
            sessionId,
            sessionType: sessionData.sessionType,
            sessionDate: sessionData.sessionDate,
            sessionTime: formatTimeWithoutSeconds(sessionData.sessionTime),
            sessionDuration: sessionData.sessionDuration,
            clientName,
            clientEmail,
            paymentAmount: sessionData.creditCost,
            bookingUrl: `${baseUrl}/practice/sessions/${sessionId}`
          }
        }
      });

      // REMOVED: Do NOT send "credits earned" email for peer treatment sessions
      // Practitioners do NOT earn credits from peer treatment bookings
      // Credits are only earned from client and guest bookings
      // The peer_credits_earned email was incorrectly being sent

    } catch (error) {
      console.error('Error sending peer booking notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send peer booking cancellation notification with refund
   */
  static async sendPeerCancellationNotification(
    sessionId: string,
    cancelledBy: 'client' | 'practitioner',
    clientId: string,
    practitionerId: string,
    sessionData: {
      sessionType: string;
      sessionDate: string;
      sessionTime: string;
      creditCost: number;
    },
    clientName: string,
    clientEmail: string,
    practitionerName: string,
    practitionerEmail: string,
    cancellationReason?: string
  ): Promise<void> {
    try {
      const baseUrl = window.location.origin;
      const refundAmount = sessionData.creditCost;

      // Send refund notification to client (they get credits back)
      await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'peer_booking_cancelled_refunded',
          recipientEmail: clientEmail,
          recipientName: clientName,
          data: {
            sessionId,
            sessionType: sessionData.sessionType,
            sessionDate: sessionData.sessionDate,
            sessionTime: formatTimeWithoutSeconds(sessionData.sessionTime),
            practitionerName,
            refundAmount,
            cancellationReason: cancellationReason || 'Cancelled by participant',
            bookingUrl: `${baseUrl}/credits#peer-treatment`
          }
        }
      });

      // Send cancellation notification to practitioner (they lose the earned credits)
      await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'peer_booking_cancelled_refunded',
          recipientEmail: practitionerEmail,
          recipientName: practitionerName,
          data: {
            sessionId,
            sessionType: sessionData.sessionType,
            sessionDate: sessionData.sessionDate,
            sessionTime: formatTimeWithoutSeconds(sessionData.sessionTime),
            clientName,
            refundAmount: 0, // Practitioner doesn't get refund, they just lose the credits they earned
            cancellationReason: cancellationReason || 'Cancelled by participant',
            bookingUrl: `${baseUrl}/practice/sessions/${sessionId}`
          }
        }
      });

    } catch (error) {
      console.error('Error sending peer cancellation notification:', error);
      // Don't throw - notifications are non-critical
    }
  }
}
