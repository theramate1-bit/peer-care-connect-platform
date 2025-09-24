import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) {
      return new Response(JSON.stringify({ error: 'No authorization code provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Parse state parameter to get intended role
    let intendedRole = 'client' // Default role
    if (state) {
      try {
        const decodedState = JSON.parse(decodeURIComponent(state))
        intendedRole = decodedState.intendedRole || 'client'
      } catch (e) {
        console.error('Failed to parse state parameter:', e)
      }
    }

    console.log('Processing OAuth callback with intended role:', intendedRole)

    // Exchange code for session
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!data.user) {
      return new Response(JSON.stringify({ error: 'No user data received' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('User authenticated:', data.user.email)

    // Update user metadata with intended role
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      data.user.id,
      {
        user_metadata: {
          ...data.user.user_metadata,
          user_role: intendedRole,
          oauth_provider: 'google',
          oauth_completed: true,
        },
      }
    )

    if (updateError) {
      console.error('Failed to update user metadata:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update user metadata' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Create or update user profile in public.users table
    const profileData = {
      id: data.user.id,
      email: data.user.email,
      first_name: data.user.user_metadata?.first_name || data.user.user_metadata?.full_name?.split(' ')[0] || 'User',
      last_name: data.user.user_metadata?.last_name || data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'User',
      user_role: intendedRole,
      onboarding_status: intendedRole === 'client' ? 'pending' : 'role_selected',
      profile_completed: false,
      is_verified: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: profileError } = await supabaseClient
      .from('users')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error('Failed to create user profile:', profileError)
      return new Response(JSON.stringify({ error: 'Failed to create user profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('User profile created successfully')

    // Determine redirect URL based on role
    let redirectUrl = 'https://theramate-4gh9ondh9-theras-projects-6dfd5a34.vercel.app'
    
    if (intendedRole === 'client') {
      redirectUrl = 'https://theramate-4gh9ondh9-theras-projects-6dfd5a34.vercel.app/onboarding'
    } else {
      // For practitioners, redirect to role selection to choose specific type
      redirectUrl = 'https://theramate-4gh9ondh9-theras-projects-6dfd5a34.vercel.app/auth/role-selection'
    }

    // Redirect back to the client app
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    })

  } catch (error) {
    console.error('OAuth callback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
