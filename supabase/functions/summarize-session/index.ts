import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId, transcript } = await req.json();
    console.log('Summarization request received for recording:', recordingId);

    if (!transcript) {
      throw new Error('No transcript provided');
    }

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    console.log('Sending transcript to OpenAI for summarization...');

    // Create the SOAP-formatted prompt for analysis
    const prompt = `Please analyze this therapy session transcript and provide a comprehensive SOAP note. SOAP stands for Subjective, Objective, Assessment, and Plan.

Please structure your response as follows:

SUBJECTIVE: What the client reported about their condition, symptoms, pain levels, concerns, and experience. Include direct quotes where relevant.

OBJECTIVE: Observable facts, measurements, behaviors, and clinical findings that were mentioned or could be inferred from the session.

ASSESSMENT: Your professional analysis combining the subjective and objective information. Include primary concerns, progress since last session, and contributing factors.

PLAN: Treatment recommendations, goals, exercises prescribed, follow-up instructions, and next steps.

SESSION TRANSCRIPT:
${transcript}

Please format your response as JSON with this exact structure:
{
  "subjective": "Detailed subjective findings...",
  "objective": "Observable facts and measurements...", 
  "assessment": "Professional analysis and clinical impression...",
  "plan": "Treatment plan and recommendations...",
  "chiefComplaint": "Primary reason for visit...",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "summary": "Brief overall session summary..."
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional clinical documentation specialist. Create accurate, professional SOAP notes that would meet clinical documentation standards for therapy practices. Focus on clinical relevance and professional terminology while maintaining client confidentiality.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    console.log('AI analysis completed');

    // Parse the JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Fallback to basic structure if JSON parsing fails
      analysisData = {
        subjective: 'Client information documented during session',
        objective: 'Clinical observations recorded',
        assessment: 'Analysis completed based on session findings',
        plan: 'Treatment plan to be reviewed',
        chiefComplaint: 'Session focus documented',
        keyPoints: ['Session completed'],
        summary: content.substring(0, 500)
      };
    }

    // Update the session recording with SOAP analysis
    console.log('Updating session recording with SOAP analysis...');
    const { error: updateError } = await supabaseClient
      .from('session_recordings')
      .update({
        // SOAP format fields
        soap_subjective: analysisData.subjective,
        soap_objective: analysisData.objective,
        soap_assessment: analysisData.assessment,
        soap_plan: analysisData.plan,
        chief_complaint: analysisData.chiefComplaint,
        // Legacy fields for backward compatibility
        ai_summary: analysisData.summary,
        ai_key_points: analysisData.keyPoints,
        ai_action_items: analysisData.plan ? [analysisData.plan] : ['Review treatment plan'],
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId)
      .eq('practitioner_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update session recording: ${updateError.message}`);
    }

    console.log('Session analysis completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        soapAnalysis: {
          subjective: analysisData.subjective,
          objective: analysisData.objective,
          assessment: analysisData.assessment,
          plan: analysisData.plan,
          chiefComplaint: analysisData.chiefComplaint,
          summary: analysisData.summary,
          keyPoints: analysisData.keyPoints
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Summarization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});