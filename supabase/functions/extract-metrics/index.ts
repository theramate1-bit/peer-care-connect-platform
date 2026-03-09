import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { generateObject } from "npm:ai";
import { openai } from "npm:@ai-sdk/openai";
import { z } from "npm:zod";

// CORS headers
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

interface ExtractMetricsRequest {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders(origin) 
    });
  }

  let user: any = null;
  let body: ExtractMetricsRequest | null = null;

  try {
    // Auth check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } 
      });
    }

    // Validate Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    try {
      const bodyText = await req.text();
      if (bodyText.length > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Request body is too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
        });
      }
      body = JSON.parse(bodyText) as ExtractMetricsRequest;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    const { subjective, objective, assessment, plan } = body!;

    // Validate inputs
    if (!subjective && !objective && !assessment && !plan) {
      return new Response(JSON.stringify({ error: 'At least one SOAP section is required' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate OpenAI API Key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OPENAI_API_KEY environment variable is not set',
        details: 'OpenAI API key is required for metric extraction'
      }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Define metric extraction schema with structured metadata
    const metricSchema = z.object({
      metric_type: z.enum(['pain_level', 'mobility', 'strength', 'flexibility', 'function', 'custom']),
      metric_name: z.string().describe('Name of the metric (e.g., "Shoulder Flexion", "Lower Back Pain")'),
      value: z.number().describe('Current value of the metric'),
      max_value: z.number().describe('Maximum possible value (e.g., 10 for pain scale, 180 for degrees)'),
      unit: z.string().describe('Unit of measurement (e.g., "degrees", "/10", "kg", "")'),
      notes: z.string().optional().describe('Additional context or notes about the metric'),
      confidence: z.number().min(0).max(1).describe('Confidence score (0-1) for the extraction accuracy'),
      source_section: z.enum(['subjective', 'objective', 'assessment', 'plan']).describe('Which SOAP section this metric was found in'),
      metadata: z.object({
        joint: z.string().optional().describe('Joint name (e.g., "Knee", "Hip", "Shoulder", "Neck") - required for mobility and strength metrics'),
        movement: z.string().optional().describe('Movement type (e.g., "Flexion", "Extension", "Abduction", "Rotation") - required for mobility and strength metrics'),
        side: z.enum(['left', 'right', 'bilateral']).optional().describe('Side of body (left, right, or bilateral) - required for mobility and strength metrics')
      }).optional().describe('Structured metadata for mobility and strength metrics')
    });

    const metricsSchema = z.object({
      metrics: z.array(metricSchema).describe('Array of extracted metrics from the SOAP note')
    });

    // Build extraction prompt
    const fullText = `Subjective:\n${subjective || 'N/A'}\n\nObjective:\n${objective || 'N/A'}\n\nAssessment:\n${assessment || 'N/A'}\n\nPlan:\n${plan || 'N/A'}`;

    const extractionPrompt = `You are a medical data extraction expert. Analyze the following SOAP note and extract all measurable metrics that could be tracked as progress indicators.

Extract the following types of metrics:
1. **Pain Levels**: Look for pain scores (e.g., "6/10 pain", "pain level 7 out of 10", "moderate pain" ≈ 5/10)
2. **Range of Motion (Mobility)**: Look for ROM measurements (e.g., "Right knee flexion 120°", "Left shoulder abduction 90°", "Hip flexion limited to 100°")
3. **Strength**: Look for strength scores (e.g., "Right quad strength 4/5", "Left hip abduction strength 3/5", "Oxford scale 2/5")
4. **Flexibility**: Look for flexibility measurements (e.g., "hamstring flexibility limited", "can touch toes")
5. **Function**: Look for functional assessments (e.g., "can lift 5kg", "walking distance 100m")
6. **Custom**: Any other measurable clinical findings

For each metric, extract:
- Metric type (pain_level, mobility, strength, flexibility, function, or custom)
- Metric name (be specific, e.g., "Right Knee Flexion" not just "Flexion")
- Current value (the measured number)
- Maximum value (e.g., 10 for pain scale, 180 for degrees, 5 for strength scale)
- Unit (e.g., "degrees", "/10", "kg", "m", or empty string)
- Notes (any additional context)
- Confidence (0-1, how confident you are in the extraction)
- Source section (which SOAP section the metric was found in)

**IMPORTANT for Mobility and Strength metrics:**
- Extract structured metadata: joint (e.g., "Knee", "Hip", "Shoulder", "Neck"), movement (e.g., "Flexion", "Extension", "Abduction", "Rotation"), and side ("left", "right", or "bilateral")
- Parse the metric name to identify joint, movement, and side if not explicitly stated
- For example: "Right knee flexion 120°" → joint: "Knee", movement: "Flexion", side: "right"
- For example: "Left hip abduction strength 4/5" → joint: "Hip", movement: "Abduction", side: "left"

SOAP Note:
${fullText}

Extract all measurable metrics now:`;

    // Use OpenAI model for extraction
    const model = openai('gpt-4o-mini', {
      apiKey: openaiApiKey,
    });

    let result;
    try {
      console.log('[EXTRACT-METRICS] Calling OpenAI API for metric extraction');
      result = await generateObject({
        model,
        schema: metricsSchema,
        prompt: extractionPrompt,
        temperature: 0.2, // Lower temperature for more consistent extraction
        maxTokens: 2000,
      });
      console.log('[EXTRACT-METRICS] Extraction successful, found', result.object.metrics.length, 'metrics');
    } catch (openaiError: any) {
      console.error('[EXTRACT-METRICS] OpenAI API error:', {
        message: openaiError?.message,
        statusCode: openaiError?.statusCode,
      });

      let errorMessage = 'AI service error occurred';
      let errorDetails = openaiError?.message || 'Unknown error';
      let httpStatus = 500;

      if (openaiError?.statusCode === 429) {
        errorMessage = 'Rate limit exceeded';
        errorDetails = 'Too many requests. Please try again in a few moments.';
        httpStatus = 429;
      } else if (openaiError?.statusCode === 401) {
        errorMessage = 'Invalid API key';
        errorDetails = 'The AI service API key is invalid or expired.';
        httpStatus = 500;
      }

      return new Response(JSON.stringify({ 
        error: errorMessage, 
        details: errorDetails,
        type: 'openai_api_error'
      }), { 
        status: httpStatus, 
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } 
      });
    }

    // Filter out low-confidence metrics (optional - can be done client-side)
    const filteredMetrics = result.object.metrics.filter(m => m.confidence >= 0.5);

    return new Response(JSON.stringify({ 
      metrics: filteredMetrics,
      total_found: result.object.metrics.length,
      filtered_count: filteredMetrics.length
    }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[EXTRACT-METRICS] Unexpected error:', {
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      user_id: user?.id || 'unknown',
    });
    
    return new Response(JSON.stringify({ 
      error: 'Internal error', 
      details: e?.message || 'An unexpected error occurred',
      type: 'unknown_error'
    }), { 
      status: 500, 
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } 
    });
  }
});

