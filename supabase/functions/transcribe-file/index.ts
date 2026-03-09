import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

// CORS headers - restrict to allowed origins in production
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
}

interface TranscribeRequest {
  audio_url?: string;
  storage_path?: string;
  speaker_labels?: boolean;
  language_code?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    // Auth check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
    }

    // Pro gate (allow clinic as well)
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan,status')
      .eq('user_id', user.id)
      .in('plan', ['pro', 'clinic'])
      .eq('status', 'active')
      .maybeSingle();
    if (!sub) {
      return new Response(JSON.stringify({ error: 'Pro plan required' }), { status: 403, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
    }
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
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
    let body: TranscribeRequest;
    try {
      const bodyText = await req.text();
      if (bodyText.length > 10 * 1024 * 1024) { // 10MB limit
        return new Response(JSON.stringify({ error: 'Request body is too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
        });
      }
      body = JSON.parse(bodyText) as TranscribeRequest;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate at least one audio source is provided
    if (!body?.audio_url && !body?.storage_path) {
      return new Response(JSON.stringify({ error: 'audio_url or storage_path is required' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate audio_url format if provided
    if (body.audio_url && typeof body.audio_url === 'string') {
      try {
        new URL(body.audio_url);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid audio_url format (must be a valid URL)' }), {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate storage_path format if provided (should be a path, not a full URL)
    if (body.storage_path && typeof body.storage_path === 'string') {
      if (body.storage_path.length > 500 || body.storage_path.includes('..')) {
        return new Response(JSON.stringify({ error: 'Invalid storage_path format' }), {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
        });
      }
    }

    let submitAudioUrl = body.audio_url || '';
    if (!submitAudioUrl && body.storage_path) {
      // sign private storage path
      const [bucket, ...rest] = body.storage_path.split('/');
      const path = rest.join('/');
      const storageClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: signed, error: signErr } = await storageClient.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60); // 60 minutes
      if (signErr || !signed?.signedUrl) {
        return new Response(JSON.stringify({ error: 'Failed to sign URL', details: signErr?.message }), { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
      }
      submitAudioUrl = signed.signedUrl;
    }

    // 1) Create transcription
    const createRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: submitAudioUrl,
        speaker_labels: !!body.speaker_labels,
        language_code: body.language_code || undefined,
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create transcript', details: created }), { status: 502, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
    }

    const id = created.id as string;

    // 2) Poll for up to ~60s
    const started = Date.now();
    let status = created.status as string;
    let transcript = created;
    while (status && status !== 'completed' && status !== 'error' && Date.now() - started < 60000) {
      await new Promise((r) => setTimeout(r, 2000));
      const getRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { 'Authorization': assemblyKey },
      });
      transcript = await getRes.json();
      status = transcript.status;
    }

    // Extract utterances if speaker_labels was enabled and available
    const utterances = transcript.utterances || null;
    
    return new Response(JSON.stringify({ 
      id, 
      status, 
      text: transcript.text || null, 
      utterances: utterances,
      transcript // Keep full transcript object for backward compatibility
    }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal error', details: e?.message }), { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
  }
});


