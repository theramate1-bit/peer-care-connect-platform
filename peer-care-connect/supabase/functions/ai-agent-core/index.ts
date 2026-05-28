import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

// Unified agent protocol interface
interface AgentRequest {
  interface_type: 'soap-notes' | 'transcription' | 'progress' | 'chat' | 'voice' | 'email';
  action: string;
  context?: {
    session_id?: string;
    client_id?: string;
    context_type?: string;
  };
  input: {
    content: string;
    content_type?: string;
    metadata?: Record<string, any>;
  };
  options?: Record<string, any>;
}

interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  memory_id?: string;
  conversation_id?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    const body: AgentRequest = await req.json();
    const { interface_type, action, context, input, options } = body;

    // Route to appropriate handler based on interface type
    let response: AgentResponse;

    switch (interface_type) {
      case 'soap-notes':
        response = await handleSoapNotes(supabase, user.id, action, context, input, options);
        break;
      
      case 'transcription':
        response = await handleTranscription(supabase, user.id, action, context, input, options);
        break;
      
      case 'progress':
        response = await handleProgress(supabase, user.id, action, context, input, options);
        break;
      
      case 'chat':
        response = await handleChat(supabase, user.id, action, context, input, options);
        break;
      
      case 'voice':
        response = await handleVoice(supabase, user.id, action, context, input, options);
        break;
      
      default:
        response = { success: false, error: `Unsupported interface type: ${interface_type}` };
    }

    return new Response(JSON.stringify(response), {
      status: response.success ? 200 : 400,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[AI-AGENT-CORE] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
    });
  }
});

// Handler for SOAP notes interface
async function handleSoapNotes(
  supabase: any,
  userId: string,
  action: string,
  context: any,
  input: any,
  options: any
): Promise<AgentResponse> {
  if (action === 'generate') {
    // Call the soap-notes function via HTTP fetch
    // The soap-notes function already handles memory storage internally
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    try {
      // Call the soap-notes function via HTTP
      const response = await fetch(`${supabaseUrl}/functions/v1/soap-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          transcript: input.content,
          session_type: options?.session_type,
          chief_complaint: options?.chief_complaint,
          session_id: context?.session_id,
          client_id: context?.client_id,
          save: options?.save || false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get conversation ID for response (already created by soap-notes function)
      const convId = await getOrCreateConversation(supabase, userId, 'soap-notes', context);
      
      return {
        success: true,
        data: data,
        conversation_id: convId
      };
    } catch (error: any) {
      console.error('[AI-AGENT-CORE] SOAP notes error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate SOAP notes'
      };
    }
  }
  
  return { success: false, error: `Unknown action: ${action} for soap-notes interface` };
}

// Handler for transcription interface
async function handleTranscription(
  supabase: any,
  userId: string,
  action: string,
  context: any,
  input: any,
  options: any
): Promise<AgentResponse> {
  if (action === 'transcribe') {
    // Delegate to voice-to-text function
    return {
      success: true,
      data: {
        message: 'Transcription should be called via voice-to-text function',
        redirect: '/functions/v1/voice-to-text'
      }
    };
  }
  
  return { success: false, error: `Unknown action: ${action} for transcription interface` };
}

// Handler for progress interface
async function handleProgress(
  supabase: any,
  userId: string,
  action: string,
  context: any,
  input: any,
  options: any
): Promise<AgentResponse> {
  // Store interaction in memory
  const convId = await getOrCreateConversation(supabase, userId, 'progress', context);
  
  if (action === 'extract_metrics') {
    // Future: Extract metrics from SOAP notes
    return {
      success: true,
      data: { message: 'Progress extraction not yet implemented' },
      conversation_id: convId
    };
  }
  
  return { success: false, error: `Unknown action: ${action} for progress interface` };
}

// Handler for chat interface
async function handleChat(
  supabase: any,
  userId: string,
  action: string,
  context: any,
  input: any,
  options: any
): Promise<AgentResponse> {
  const convId = await getOrCreateConversation(supabase, userId, 'chat', context);
  
  if (action === 'send_message') {
    // Store user message
    const { data: memoryData } = await supabase
      .from('agent_memory')
      .insert({
        conversation_id: convId,
        user_id: userId,
        role: 'user',
        content: input.content,
        content_type: input.content_type || 'text',
        metadata: input.metadata || {}
      })
      .select()
      .single();
    
    // Future: Process chat message with AI
    return {
      success: true,
      data: { message: 'Chat processing not yet implemented' },
      memory_id: memoryData?.id,
      conversation_id: convId
    };
  }
  
  return { success: false, error: `Unknown action: ${action} for chat interface` };
}

// Handler for voice interface
async function handleVoice(
  supabase: any,
  userId: string,
  action: string,
  context: any,
  input: any,
  options: any
): Promise<AgentResponse> {
  if (action === 'process') {
    // Future: Process voice input
    return {
      success: true,
      data: { message: 'Voice processing not yet implemented' }
    };
  }
  
  return { success: false, error: `Unknown action: ${action} for voice interface` };
}

// Helper: Get or create conversation
async function getOrCreateConversation(
  supabase: any,
  userId: string,
  interfaceType: string,
  context: any
): Promise<string> {
  const { data: convId } = await supabase.rpc('get_or_create_conversation', {
    p_user_id: userId,
    p_interface_type: interfaceType,
    p_context_id: context?.session_id || context?.client_id || null,
    p_context_type: context?.context_type || (context?.session_id ? 'session' : context?.client_id ? 'client' : null),
    p_metadata: context || {}
  });
  
  return convId;
}

