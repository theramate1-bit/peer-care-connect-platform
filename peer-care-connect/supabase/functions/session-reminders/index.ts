import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SessionNotificationTrigger {
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
}

async function sendNotification(
  supabase: any,
  trigger: SessionNotificationTrigger
): Promise<void> {
  try {
    // Get or create conversation
    const conversationKey = [trigger.clientId, trigger.practitionerId].sort().join('_');
    
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('conversation_key', conversationKey)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          conversation_key: conversationKey,
          participant_1_id: trigger.clientId,
          participant_2_id: trigger.practitionerId,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      conversation = newConv;
    }

    if (!conversation) {
      throw new Error('Failed to get or create conversation');
    }

    // Generate message based on trigger
    const message = generateMessage(trigger);

    // Send system message
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: 'system',
        content: message,
        message_type: 'system',
        message_status: 'sent',
        created_at: new Date().toISOString()
      });

    console.log(`✅ Sent ${trigger.trigger} notification for session ${trigger.sessionId}`);
  } catch (error) {
    console.error(`❌ Failed to send ${trigger.trigger} notification:`, error);
  }
}

function generateMessage(trigger: SessionNotificationTrigger): string {
  const { trigger: type, sessionDate, sessionTime, sessionType, practitionerName } = trigger;

  switch (type) {
    case '24h_reminder':
      return `⏰ Reminder: Your ${sessionType} session with ${practitionerName} is tomorrow at ${sessionTime}. Please arrive 5 minutes early.`;

    case '2h_reminder':
      return `⏰ Reminder: Your ${sessionType} session with ${practitionerName} starts in 2 hours (${sessionTime}). See you soon!`;

    case '1h_reminder':
      return `⏰ Your ${sessionType} session starts in 1 hour (${sessionTime}). See you soon!`;

    case 'follow_up_24h':
      return `👋 Hi! Just checking in - how are you feeling after yesterday's session? Any questions or concerns?`;

    case 'follow_up_7d':
      return `📊 It's been a week since your last session. How are you progressing? Would you like to schedule a follow-up?`;

    default:
      return `Update regarding your ${sessionType} session on ${sessionDate} at ${sessionTime}.`;
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get sessions needing 24h reminder
    const { data: sessions24h } = await supabase
      .from('client_sessions')
      .select('*, therapist:users!client_sessions_therapist_id_fkey(first_name, last_name)')
      .eq('status', 'scheduled')
      .gte('session_date', tomorrow.toISOString().split('T')[0])
      .lte('session_date', tomorrow.toISOString().split('T')[0]);

    // Send 24h reminders
    for (const session of sessions24h || []) {
      await sendNotification(supabase, {
        trigger: '24h_reminder',
        sessionId: session.id,
        clientId: session.client_id,
        practitionerId: session.therapist_id,
        sessionDate: session.session_date,
        sessionTime: session.start_time,
        sessionType: session.session_type,
        practitionerName: `${session.therapist.first_name} ${session.therapist.last_name}`
      });
    }

    // Get sessions needing 2h reminder (today, within next 2 hours)
    const { data: sessions2h } = await supabase
      .from('client_sessions')
      .select('*, therapist:users!client_sessions_therapist_id_fkey(first_name, last_name)')
      .eq('status', 'scheduled')
      .eq('session_date', now.toISOString().split('T')[0]);

    // Filter for sessions starting in the next 2 hours
    const sessions2hFiltered = (sessions2h || []).filter(session => {
      const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
      const diffMs = sessionDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours >= 1.9 && diffHours <= 2.1; // Within 2 hour window
    });

    // Send 2h reminders
    for (const session of sessions2hFiltered) {
      await sendNotification(supabase, {
        trigger: '2h_reminder',
        sessionId: session.id,
        clientId: session.client_id,
        practitionerId: session.therapist_id,
        sessionDate: session.session_date,
        sessionTime: session.start_time,
        sessionType: session.session_type,
        practitionerName: `${session.therapist.first_name} ${session.therapist.last_name}`
      });
    }

    // Get sessions needing 1h reminder (today, within next hour)
    const { data: sessions1h } = await supabase
      .from('client_sessions')
      .select('*, therapist:users!client_sessions_therapist_id_fkey(first_name, last_name)')
      .eq('status', 'scheduled')
      .eq('session_date', now.toISOString().split('T')[0]);

    // Filter for sessions starting in the next hour
    const sessions1hFiltered = (sessions1h || []).filter(session => {
      const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
      const diffMs = sessionDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours >= 0.9 && diffHours <= 1.1; // Within 1 hour window
    });

    // Send 1h reminders
    for (const session of sessions1hFiltered) {
      await sendNotification(supabase, {
        trigger: '1h_reminder',
        sessionId: session.id,
        clientId: session.client_id,
        practitionerId: session.therapist_id,
        sessionDate: session.session_date,
        sessionTime: session.start_time,
        sessionType: session.session_type,
        practitionerName: `${session.therapist.first_name} ${session.therapist.last_name}`
      });
    }

    // Get sessions completed yesterday for 24h follow-up
    const { data: sessionsFollowUp24h } = await supabase
      .from('client_sessions')
      .select('*, therapist:users!client_sessions_therapist_id_fkey(first_name, last_name)')
      .eq('status', 'completed')
      .eq('session_date', yesterday.toISOString().split('T')[0]);

    // Send 24h follow-ups
    for (const session of sessionsFollowUp24h || []) {
      await sendNotification(supabase, {
        trigger: 'follow_up_24h',
        sessionId: session.id,
        clientId: session.client_id,
        practitionerId: session.therapist_id,
        sessionDate: session.session_date,
        sessionTime: session.start_time,
        sessionType: session.session_type,
        practitionerName: `${session.therapist.first_name} ${session.therapist.last_name}`
      });
    }

    // Get sessions completed 7 days ago for weekly follow-up
    const { data: sessionsFollowUp7d } = await supabase
      .from('client_sessions')
      .select('*, therapist:users!client_sessions_therapist_id_fkey(first_name, last_name)')
      .eq('status', 'completed')
      .eq('session_date', oneWeekAgo.toISOString().split('T')[0]);

    // Send 7d follow-ups
    for (const session of sessionsFollowUp7d || []) {
      await sendNotification(supabase, {
        trigger: 'follow_up_7d',
        sessionId: session.id,
        clientId: session.client_id,
        practitionerId: session.therapist_id,
        sessionDate: session.session_date,
        sessionTime: session.start_time,
        sessionType: session.session_type,
        practitionerName: `${session.therapist.first_name} ${session.therapist.last_name}`
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        reminders_sent: {
          '24h': sessions24h?.length || 0,
          '2h': sessions2hFiltered.length,
          '1h': sessions1hFiltered.length,
          'follow_up_24h': sessionsFollowUp24h?.length || 0,
          'follow_up_7d': sessionsFollowUp7d?.length || 0
        }
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in session-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

