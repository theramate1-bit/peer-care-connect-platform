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

interface ExtractGoalsRequest {
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
  let body: ExtractGoalsRequest | null = null;

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
      body = JSON.parse(bodyText) as ExtractGoalsRequest;
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
        details: 'OpenAI API key is required for goal extraction'
      }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Define goal extraction schema
    const goalSchema = z.object({
      goal_name: z.string().describe('Short, clear name for the goal (e.g., "Increase Shoulder ROM", "Reduce Pain Level")'),
      description: z.string().describe('Detailed description of the goal from the SOAP note'),
      target_value: z.number().describe('Target value to achieve (e.g., 90 for degrees, 3 for pain level)'),
      target_unit: z.string().describe('Unit of measurement (e.g., "degrees", "/10", "kg", "" for count)'),
      target_date: z.string().describe('Target date in ISO format (YYYY-MM-DD). Extract from text if mentioned, otherwise estimate 3 months from now'),
      confidence: z.number().min(0).max(1).describe('Confidence score (0-1) for the extraction accuracy'),
      source_section: z.enum(['subjective', 'objective', 'assessment', 'plan']).describe('Which SOAP section this goal was found in (typically plan or assessment)'),
      notes: z.string().optional().describe('Additional context or notes about the goal')
    });

    const goalsSchema = z.object({
      goals: z.array(goalSchema).describe('Array of extracted goals from the SOAP note')
    });

    // Build extraction prompt - focus on Plan and Assessment sections
    const fullText = `Subjective:\n${subjective || 'N/A'}\n\nObjective:\n${objective || 'N/A'}\n\nAssessment:\n${assessment || 'N/A'}\n\nPlan:\n${plan || 'N/A'}`;

    const extractionPrompt = `You are a medical data extraction expert. Analyze the following SOAP note and extract all treatment goals that could be tracked as long-term objectives.

Focus on the Plan and Assessment sections where goals are typically stated. Look for:
1. **Functional Goals**: Goals related to improving function (e.g., "Goal: Increase shoulder flexion to 90 degrees", "Aim to walk 100m without assistance")
2. **Pain Reduction Goals**: Goals to reduce pain levels (e.g., "Target: Reduce pain to 3/10", "Goal: Decrease pain from 7/10 to 4/10")
3. **Mobility Goals**: Goals to improve range of motion (e.g., "Objective: Achieve 120° knee flexion", "Target ROM: 90° abduction")
4. **Strength Goals**: Goals to improve strength (e.g., "Goal: Increase quad strength to 4/5", "Target: Achieve 5/5 strength")
5. **Activity Goals**: Goals related to returning to activities (e.g., "Goal: Return to running", "Target: Resume work duties")

For each goal, extract:
- Goal name (short, clear title)
- Description (the full goal statement from the note)
- Target value (the numeric target, e.g., 90 for degrees, 3 for pain level)
- Target unit (e.g., "degrees", "/10", "kg", "" for count)
- Target date (extract if mentioned like "in 6 weeks" or "by end of month", otherwise estimate 3 months from now in ISO format)
- Confidence (0-1, how confident you are this is a trackable goal)
- Source section (which SOAP section: plan, assessment, objective, or subjective)
- Notes (any additional context)

IMPORTANT:
- Only extract goals that have measurable targets (numbers, specific outcomes)
- Do NOT extract general treatment plans or interventions without specific targets
- Do NOT extract short-term session objectives - focus on longer-term goals
- If a target date is mentioned (e.g., "in 6 weeks", "by next month"), extract it. Otherwise, use a date 3 months from now.
- Goals should be achievable, measurable outcomes, not just treatment activities

SOAP Note:
${fullText}

Extract all treatment goals now:`;

    // Use OpenAI model for extraction
    const model = openai('gpt-4o-mini', {
      apiKey: openaiApiKey,
    });

    let result;
    try {
      console.log('[EXTRACT-GOALS] Calling OpenAI API for goal extraction');
      result = await generateObject({
        model,
        schema: goalsSchema,
        prompt: extractionPrompt,
        temperature: 0.2, // Lower temperature for more consistent extraction
        maxTokens: 2000,
      });
      console.log('[EXTRACT-GOALS] Extraction successful, found', result.object.goals.length, 'goals');
    } catch (openaiError: any) {
      console.error('[EXTRACT-GOALS] OpenAI API error:', {
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

    // Filter out low-confidence goals (optional - can be done client-side)
    const filteredGoals = result.object.goals.filter(g => g.confidence >= 0.5);

    return new Response(JSON.stringify({ 
      goals: filteredGoals,
      total_found: result.object.goals.length,
      filtered_count: filteredGoals.length
    }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[EXTRACT-GOALS] Unexpected error:', {
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

