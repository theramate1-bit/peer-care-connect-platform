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

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const hoursBack = body.hours_back || 24
    const maxRetries = body.max_retries || 3

    // Call retry function
    const { data: retryResults, error: retryError } = await supabaseClient
      .rpc('retry_failed_emails', {
        p_hours_back: hoursBack,
        p_max_retries: maxRetries
      })

    if (retryError) {
      throw retryError
    }

    const response = {
      success: true,
      retried_count: retryResults?.length || 0,
      results: retryResults || [],
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Retry failed emails error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
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
