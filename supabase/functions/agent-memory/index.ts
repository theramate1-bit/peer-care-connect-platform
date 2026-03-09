import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemoryRequest {
  userId: string;
  conversationId?: string;
  contextId?: string;
  contextType?: string;
  interfaceType: string;
  action: 'store' | 'retrieve' | 'get_preferences' | 'get_corrections' | 'get_state' | 'set_state';
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: MemoryRequest = await req.json();
    const { action, userId, conversationId, contextId, contextType, interfaceType, data } = body;

    // Verify user can only access their own data
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'store': {
        // Store an interaction in memory
        const { role, content, contentType = 'text', metadata = {}, parentMemoryId } = data;
        
        // Get or create conversation
        const { data: convData, error: convError } = await supabase.rpc('get_or_create_conversation', {
          p_user_id: userId,
          p_interface_type: interfaceType,
          p_context_id: contextId || null,
          p_context_type: contextType || null,
          p_metadata: metadata
        });

        if (convError) throw convError;
        const convId = convData;

        // Store memory entry
        const { data: memoryData, error: memoryError } = await supabase
          .from('agent_memory')
          .insert({
            conversation_id: convId,
            user_id: userId,
            role,
            content,
            content_type: contentType,
            metadata,
            parent_memory_id: parentMemoryId || null
          })
          .select()
          .single();

        if (memoryError) throw memoryError;

        return new Response(JSON.stringify({ success: true, memoryId: memoryData.id, conversationId: convId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'retrieve': {
        // Retrieve memory for user/context
        const limit = data?.limit || 50;
        const { data: memoryData, error } = await supabase.rpc('get_agent_memory', {
          p_user_id: userId,
          p_context_id: contextId || null,
          p_limit: limit
        });

        if (error) throw error;

        return new Response(JSON.stringify({ memory: memoryData }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_preferences': {
        // Get practitioner preferences
        const { data: prefsData, error } = await supabase.rpc('get_practitioner_preferences', {
          p_user_id: userId
        });

        if (error) throw error;

        const preferences = prefsData && prefsData.length > 0 ? prefsData[0] : {
          soap_style: {},
          common_phrases: [],
          preferred_structure: {},
          corrections_history: [],
          terminology_preferences: {},
          detail_level: 'moderate',
          learning_enabled: true
        };

        return new Response(JSON.stringify({ preferences }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_corrections': {
        // Get recent corrections
        const limit = data?.limit || 10;
        const { data: correctionsData, error } = await supabase.rpc('get_recent_corrections', {
          p_user_id: userId,
          p_limit: limit
        });

        if (error) throw error;

        return new Response(JSON.stringify({ corrections: correctionsData || [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_state': {
        // Get agent state
        const stateKey = data?.stateKey || 'default';
        const { data: stateData, error } = await supabase.rpc('get_agent_state', {
          p_user_id: userId,
          p_state_key: stateKey
        });

        if (error) throw error;

        return new Response(JSON.stringify({ state: stateData }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'set_state': {
        // Set agent state
        const { stateKey, stateData, expiresAt } = data;
        
        const { error } = await supabase
          .from('agent_state')
          .upsert({
            user_id: userId,
            state_key: stateKey,
            state_data: stateData,
            expires_at: expiresAt || null
          }, {
            onConflict: 'user_id,state_key'
          });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error('[AGENT-MEMORY] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

