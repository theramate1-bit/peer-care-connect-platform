import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAdminAccess } from '../_shared/admin-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowed origins for admin functions (add your admin dashboard URL)
const ALLOWED_ORIGINS = Deno.env.get('ADMIN_ALLOWED_ORIGINS')?.split(',') || []

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify admin access
  const authResult = await verifyAdminAccess(req, ALLOWED_ORIGINS)
  if (!authResult.isAdmin) {
    return new Response(
      JSON.stringify({ 
        error: 'Unauthorized',
        message: authResult.error || 'Admin access required'
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

    // Get health check from database
    const { data: healthData, error: healthError } = await supabaseClient
      .rpc('check_email_system_health')

    if (healthError) {
      throw healthError
    }

    // Get recent email stats
    const { data: recentStats, error: statsError } = await supabaseClient
      .from('email_system_stats')
      .select('*')
      .order('hour', { ascending: false })
      .limit(24)

    // Get pending reminders count
    const { data: pendingReminders, error: remindersError } = await supabaseClient
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('reminder_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

    // Get failed emails count (last 24h)
    const { data: failedEmails, error: failedError } = await supabaseClient
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const response = {
      status: healthData?.status || 'unknown',
      timestamp: new Date().toISOString(),
      health: healthData,
      metrics: {
        recent_stats: recentStats || [],
        pending_reminders: pendingReminders?.length || 0,
        failed_emails_24h: failedEmails?.length || 0,
      },
      checks: {
        database: !healthError ? 'ok' : 'error',
        stats: !statsError ? 'ok' : 'error',
        reminders: !remindersError ? 'ok' : 'error',
        failed_emails: !failedError ? 'ok' : 'error',
      }
    }

    const statusCode = healthData?.status === 'critical' ? 503 : 
                      healthData?.status === 'warning' ? 200 : 200

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Health check error:', error)
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
