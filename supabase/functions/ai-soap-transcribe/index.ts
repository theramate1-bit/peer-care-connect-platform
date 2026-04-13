import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

// CORS headers — align with `soap-notes`
const getAllowedOrigin = (): string => {
  const origin = Deno.env.get('ALLOWED_ORIGINS') || '';
  const allowedOrigins = origin.split(',').map(o => o.trim()).filter(Boolean);

  if (allowedOrigins.length > 0) {
    return allowedOrigins[0];
  }

  return Deno.env.get('ENVIRONMENT') === 'production' ? '' : '*';
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = origin || '*';

  const corsOrigin = allowedOrigin === '*' || Deno.env.get('ENVIRONMENT') !== 'production'
    ? '*'
    : (allowedOrigin.includes(requestOrigin) ? requestOrigin : '');

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

interface TranscribeRequest {
  audio_url?: string;
  diarization?: boolean;
  language_code?: string;
}

async function createTranscript(apiKey: string, body: Record<string, unknown>) {
  const res = await fetch('https://api.assemblyai.com/v2/transcripts', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AssemblyAI create failed: ${res.status}`);
  return await res.json();
}

async function getTranscript(apiKey: string, id: string) {
  const res = await fetch(`https://api.assemblyai.com/v2/transcripts/${id}`, {
    headers: { 'Authorization': apiKey }
  });
  if (!res.ok) throw new Error(`AssemblyAI get failed: ${res.status}`);
  return await res.json();
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan,status')
      .eq('user_id', user.id)
      .in('plan', ['pro', 'clinic'])
      .eq('status', 'active')
      .maybeSingle();
    if (!sub) {
      return new Response(JSON.stringify({ error: 'Pro plan required' }), {
        status: 403,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing ASSEMBLYAI_API_KEY' }), { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
    }

    // Validate Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    let payload: TranscribeRequest;
    try {
      const bodyText = await req.text();
      if (bodyText.length > 10 * 1024 * 1024) { // 10MB limit
        return new Response(JSON.stringify({ error: 'Request body is too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
        });
      }
      payload = JSON.parse(bodyText);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate audio_url
    if (!payload.audio_url || typeof payload.audio_url !== 'string') {
      return new Response(JSON.stringify({ error: 'audio_url is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate audio_url is a valid URL
    try {
      new URL(payload.audio_url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid audio_url format (must be a valid URL)' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate audio_url length
    if (payload.audio_url.length > 2048) {
      return new Response(JSON.stringify({ error: 'audio_url is too long (max 2048 characters)' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    const requestBody: Record<string, unknown> = {
      audio_url: payload.audio_url,
      speaker_labels: !!payload.diarization,
      language_code: payload.language_code || undefined,
    };

    const created = await createTranscript(apiKey, requestBody);
    const id = created.id as string;

    // Poll until completed or failed (max ~60s)
    const start = Date.now();
    const timeoutMs = 60000;
    let status = created.status as string;
    let transcript = created;
    while (!['completed', 'error'].includes(status) && Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 1500));
      transcript = await getTranscript(apiKey, id);
      status = transcript.status as string;
    }

    if (status !== 'completed') {
      return new Response(JSON.stringify({ success: false, status, id, error: transcript.error }), { status: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
    }

    const text = transcript.text as string;
    const words = transcript.words || [];
    const utterances = transcript.utterances || [];
    return new Response(JSON.stringify({ success: true, id, text, words, utterances }), { status: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal error', details: e?.message }), { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
  }
});


