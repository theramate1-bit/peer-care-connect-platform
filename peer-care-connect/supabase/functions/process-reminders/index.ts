import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm'
import { verifyAdminAccess } from '../_shared/admin-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowed origins for cron jobs (Supabase cron service)
const ALLOWED_ORIGINS = Deno.env.get('CRON_ALLOWED_ORIGINS')?.split(',') || []

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify admin/cron access
  const authResult = await verifyAdminAccess(req, ALLOWED_ORIGINS)
  if (!authResult.isAdmin) {
    return new Response(
      JSON.stringify({ 
        error: 'Unauthorized',
        message: authResult.error || 'Cron/admin access required'
      }),
      { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Process pending reminders
    await processPendingReminders(supabaseClient);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reminder processing completed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Reminder processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process reminders', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processPendingReminders(supabaseClient: any) {
  try {
    const now = new Date().toISOString();
    
    // Get pending reminders that are due
    const { data: reminders, error: remindersError } = await supabaseClient
      .from('reminders')
      .select(`
        *,
        session:client_sessions(
          id,
          session_date,
          start_time,
          client_id,
          client_email,
          client_name,
          therapist_id,
          session_type,
          duration_minutes,
          location,
          client:users!client_sessions_client_id_fkey(first_name, last_name, email, user_role),
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email)
        )
      `)
      .eq('status', 'pending')
      .lte('reminder_time', now);

    if (remindersError) {
      throw remindersError;
    }

    if (!reminders || reminders.length === 0) {
      console.log('No pending reminders to process');
      return;
    }

    console.log(`Processing ${reminders.length} pending reminders`);

    for (const reminder of reminders) {
      try {
        const session = reminder.session;
        if (!session) {
          console.log(`No session found for reminder ${reminder.id}`);
          continue;
        }

        // Determine reminder type based on message content
        let reminderType: 'session_reminder_24h' | 'session_reminder_2h' | 'session_reminder_1h';
        if (reminder.message.includes('tomorrow')) {
          reminderType = 'session_reminder_24h';
        } else if (reminder.message.includes('2 hours')) {
          reminderType = 'session_reminder_2h';
        } else {
          reminderType = 'session_reminder_1h';
        }
        
        // Send email to client (both logged-in and guest)
        const clientEmail = session.client?.email || session.client_email;
        const clientName = session.client
          ? `${session.client.first_name} ${session.client.last_name}`
          : session.client_name || 'Client';
        const isGuest = !session.client || session.client.user_role === 'guest';
        const baseUrl = Deno.env.get('SITE_URL') || 'https://theramate.co.uk';
        const clientBookingUrl = isGuest && clientEmail
          ? `${baseUrl}/booking/view/${reminder.session_id}?email=${encodeURIComponent(clientEmail)}`
          : `${baseUrl}/client/sessions`;
        const clientMessageUrl = isGuest && clientEmail
          ? `${baseUrl}/register?email=${encodeURIComponent(clientEmail)}&redirect=${encodeURIComponent('/messages')}`
          : `${baseUrl}/messages`;

        if (clientEmail) {
          await sendReminderEmail(supabaseClient, {
            emailType: reminderType,
            recipientEmail: clientEmail,
            recipientName: clientName,
            data: {
              sessionId: reminder.session_id,
              sessionType: session.session_type,
              sessionDate: session.session_date,
              sessionTime: session.start_time,
              sessionDuration: session.duration_minutes || 60,
              practitionerName: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
              sessionLocation: session.location || '',
              bookingUrl: clientBookingUrl,
              messageUrl: clientMessageUrl
            }
          });
        }

        // Send email to practitioner
        if (session.practitioner?.email) {
          await sendReminderEmail(supabaseClient, {
            emailType: reminderType,
            recipientEmail: session.practitioner.email,
            recipientName: `${session.practitioner.first_name} ${session.practitioner.last_name}`,
            data: {
              sessionId: reminder.session_id,
              sessionType: session.session_type,
              sessionDate: session.session_date,
              sessionTime: session.start_time,
              sessionDuration: session.duration_minutes || 60,
              clientName: clientName,
              sessionLocation: session.location || '',
              bookingUrl: `${baseUrl}/practice/sessions/${reminder.session_id}`,
              messageUrl: `${baseUrl}/messages`
            }
          });
        }

        // Create in-app notifications (skip client if no user_id)
        const notifications = [
          ...(session.client_id ? [{
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
          }] : []),
          {
            user_id: session.therapist_id,
            type: 'session_reminder',
            title: 'Session Reminder',
            message: `Your ${session.session_type} session with ${clientName} is ${reminder.message.toLowerCase()}.`,
            data: {
              session_id: reminder.session_id,
              client_name: `${session.client?.first_name} ${session.client?.last_name}`,
              session_date: session.session_date,
              start_time: session.start_time,
              session_type: session.session_type
            }
          }
        ];

        await supabaseClient
          .from('notifications')
          .insert(notifications);

        // Mark reminder as sent
        await supabaseClient
          .from('reminders')
          .update({
            status: 'sent',
            sent_at: now
          })
          .eq('id', reminder.id);

        console.log(`Processed reminder ${reminder.id} for session ${reminder.session_id}`);

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        
        // Mark reminder as failed
        await supabaseClient
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
    throw error;
  }
}

async function sendReminderEmail(supabaseClient: any, emailData: any) {
  try {
    const { data: responseData, error } = await supabaseClient.functions.invoke('send-email', {
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: emailData
    });

    if (error) {
      console.error(`[Reminder Email Error] ${emailData.emailType} to ${emailData.recipientEmail}:`, error);
      // Don't throw - email failures shouldn't block reminder processing
      return;
    }

    // Verify email was actually sent successfully
    if (responseData && !responseData.success) {
      console.error(`[Reminder Email Failed] ${emailData.emailType} to ${emailData.recipientEmail}:`, responseData.error || responseData.message);
      // Don't throw - email failures shouldn't block reminder processing
      return;
    }

    // Log successful send for debugging
    if (responseData && responseData.success) {
      console.log(`[Reminder Email Sent] ${emailData.emailType} to ${emailData.recipientEmail} (ID: ${responseData.emailId})`);
    }
  } catch (error) {
    console.error(`[Reminder Email Exception] ${emailData.emailType} to ${emailData.recipientEmail}:`, error);
    // Don't throw - email failures shouldn't block reminder processing
  }
}
