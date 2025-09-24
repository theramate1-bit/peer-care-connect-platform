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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code, state } = await req.json()
    
    if (!code) {
      throw new Error('No authorization code provided')
    }

    // Exchange the authorization code for a session
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code)
    
    if (error) {
      throw new Error(`Auth error: ${error.message}`)
    }

    if (!data.session?.user) {
      throw new Error('No user in session')
    }

    const user = data.session.user
    console.log('OAuth user:', user.email)

    // Extract intended role from state parameter
    let intendedRole = 'client' // default
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state))
        intendedRole = stateData.intendedRole || 'client'
      } catch (e) {
        console.log('Could not parse state, using default role')
      }
    }

    console.log('Intended role:', intendedRole)

    // Update user metadata with the intended role
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          user_role: intendedRole,
          oauth_completed: true
        }
      }
    )

    if (updateError) {
      console.error('Failed to update user metadata:', updateError)
      throw new Error(`Failed to update user metadata: ${updateError.message}`)
    }

    // Create or update user profile in database
    const { error: profileError } = await supabaseClient
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || 'User',
        last_name: user.user_metadata?.last_name || 'User',
        user_role: intendedRole,
        onboarding_status: 'pending',
        profile_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Failed to create user profile:', profileError)
      // Don't throw here - the user is authenticated, just profile creation failed
    }

    // Redirect back to the client app with session
    const redirectUrl = new URL('https://theramate-dr1vzfs7v-theras-projects-6dfd5a34.vercel.app/auth/callback')
    redirectUrl.searchParams.set('session', JSON.stringify(data.session))
    redirectUrl.searchParams.set('intendedRole', intendedRole)
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString()
      }
    })

  } catch (error) {
    console.error('OAuth callback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
