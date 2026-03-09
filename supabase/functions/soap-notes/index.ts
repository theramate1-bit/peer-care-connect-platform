import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { generateObject } from "npm:ai";
import { openai } from "npm:@ai-sdk/openai";
import { z } from "npm:zod";

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

interface SoapRequest {
  transcript: string;
  session_type?: string;
  chief_complaint?: string;
  session_id?: string;
  client_id?: string;
  save?: boolean;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  // Variables to track for error logging
  let user: any = null;
  let body: SoapRequest | null = null;

  try {
    // Auth check + Pro gate
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
    }
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

    // Validate Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    try {
      const bodyText = await req.text();
      if (bodyText.length > 10 * 1024 * 1024) { // 10MB limit
        return new Response(JSON.stringify({ error: 'Request body is too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
        });
      }
      body = JSON.parse(bodyText) as SoapRequest;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    const { transcript, session_type, chief_complaint, session_id, client_id, save } = body!;
    
    // Log request context for debugging
    console.log('[SOAP-NOTES] Request received:', {
      user_id: user.id,
      transcript_length: transcript.length,
      transcript_preview: transcript.substring(0, 100),
      session_type: session_type || 'none',
      chief_complaint: chief_complaint || 'none',
      session_id: session_id || 'none',
      client_id: client_id || 'none',
      save: save || false,
    });
    
    // Get practitioner specialty from user profile
    const { data: practitionerProfile } = await supabase
      .from('users')
      .select('user_role, services_offered')
      .eq('id', user.id)
      .single();
    
    const practitionerRole = practitionerProfile?.user_role;
    const servicesOffered = practitionerProfile?.services_offered || [];
    
    // Load agent memory: preferences, corrections, conversation history
    let practitionerPreferences: any = null;
    let recentCorrections: any[] = [];
    let conversationHistory: any[] = [];
    
    try {
      // Get practitioner preferences
      const { data: prefsData } = await supabase.rpc('get_practitioner_preferences', {
        p_user_id: user.id
      });
      if (prefsData && prefsData.length > 0) {
        practitionerPreferences = prefsData[0];
      }
      
      // Get recent corrections for learning
      const { data: correctionsData } = await supabase.rpc('get_recent_corrections', {
        p_user_id: user.id,
        p_limit: 5
      });
      if (correctionsData) {
        recentCorrections = correctionsData;
      }
      
      // Get conversation history for context
      const { data: memoryData } = await supabase.rpc('get_agent_memory', {
        p_user_id: user.id,
        p_context_id: session_id || client_id || null,
        p_limit: 10
      });
      if (memoryData) {
        conversationHistory = memoryData;
      }
      
      console.log('[SOAP-NOTES] Loaded memory:', {
        hasPreferences: !!practitionerPreferences,
        correctionsCount: recentCorrections.length,
        historyCount: conversationHistory.length
      });
    } catch (memoryError) {
      console.warn('[SOAP-NOTES] Error loading memory (continuing without):', memoryError);
      // Continue without memory - graceful degradation
    }
    
    // Fetch patient context if client_id is provided
    let patientHistory: any[] = [];
    let progressMetrics: any[] = [];
    let currentSessionNumber: number | undefined;
    
    if (client_id) {
      try {
        // Fetch current session number if session_id is provided
        if (session_id) {
          const { data: currentSession } = await supabase
            .from('client_sessions')
            .select('session_number')
            .eq('id', session_id)
            .single();
          
          if (currentSession) {
            currentSessionNumber = currentSession.session_number;
          }
        }
        
        // Fetch patient history from treatment_notes (last 5 sessions)
        // Join with client_sessions to get session_number
        const { data: historyData } = await supabase
          .from('treatment_notes')
          .select(`
            content, 
            note_type, 
            timestamp, 
            template_type,
            session_id,
            client_sessions!inner(session_number)
          `)
          .eq('client_id', client_id)
          .not('session_id', 'is', null) // Only session-linked notes
          .order('timestamp', { ascending: false })
          .limit(5);
        
        if (historyData) {
          patientHistory = historyData;
        }
        
        // Fetch progress metrics (last 10 entries)
        const { data: metricsData } = await supabase
          .from('progress_metrics')
          .select('metric_name, value, max_value, unit, session_date, notes')
          .eq('client_id', client_id)
          .order('session_date', { ascending: false })
          .limit(10);
        
        if (metricsData) {
          progressMetrics = metricsData;
        }
      } catch (contextError) {
        console.warn('[SOAP-NOTES] Error fetching patient context:', contextError);
        // Continue without context - graceful degradation
      }
    }
    
    // Validate transcript
    if (!transcript || typeof transcript !== 'string') {
      return new Response(JSON.stringify({ error: 'transcript is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate transcript length (reasonable limit for SOAP notes)
    if (transcript.length > 50000) { // 50KB limit for transcript
      return new Response(JSON.stringify({ error: 'Transcript is too long (max 50KB)' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Log transcript for debugging
    const transcriptPreview = transcript.substring(0, 200);
    console.log('[SOAP-NOTES] Transcript received:', {
      length: transcript.length,
      preview: transcriptPreview,
      isShort: transcript.length < 50
    });

    // Check if transcript appears to be test data or too short
    const isTestData = transcript.toLowerCase().includes('testing') && 
                      (transcript.toLowerCase().includes('1, 2, 3') || transcript.length < 50);
    
    if (isTestData) {
      console.log('[SOAP-NOTES] Detected test/insufficient transcript, returning minimal SOAP note');
      return new Response(JSON.stringify({
        subjective: 'Transcript contains test audio or insufficient clinical information. No patient-reported symptoms documented.',
        objective: 'No objective findings documented in transcript.',
        assessment: 'Unable to provide clinical assessment due to insufficient information in transcript.',
        plan: 'No treatment plan can be established without adequate clinical information. Please ensure proper audio recording and transcription.'
      }), {
        status: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Validate session_id format if provided
    if (session_id && typeof session_id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(session_id)) {
        return new Response(JSON.stringify({ error: 'Invalid session_id format' }), {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate OpenAI API Key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OPENAI_API_KEY environment variable is not set. Please configure this in your Supabase project settings.',
        details: 'Get an API key from https://platform.openai.com/api-keys'
      }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Define SOAP Note Schema using Zod
    const soapNoteSchema = z.object({
      subjective: z.string().describe('Patient-reported symptoms, history, chief complaint, and subjective information. Include what the patient feels, reports, or describes about their condition.'),
      objective: z.string().describe('Observable findings, measurements, test results, physical examination findings, and objective clinical data. Include vital signs, range of motion, strength, palpation findings, and any measurable assessments.'),
      assessment: z.string().describe('Clinical impression, diagnosis, analysis, and professional assessment based on the subjective and objective findings. Include differential diagnoses if applicable.'),
      plan: z.string().describe('Treatment plan, recommendations, exercises, follow-up instructions, medications, and next steps for the patient.')
    });

    // Few-shot examples for each specialty
    const getFewShotExamples = (specialty: string | null | undefined): string => {
      const sportsTherapyExample = `
Example SOAP Note (Sports Therapy):

**Subjective**: Patient reports 6/10 pain in right shoulder, worse with overhead movements and during sleep. Pain started 3 weeks ago after overhead press workout. No numbness or tingling. Previous history of rotator cuff tendinopathy 6 months ago, resolved with physiotherapy. Currently training 4x/week for powerlifting competition in 8 weeks.

**Objective**: 
- ROM: Flexion 120° (normal 180°), Abduction 90° (normal 180°), External rotation 45° (normal 90°), Internal rotation limited to L5 level
- Strength: Supraspinatus 4/5, Infraspinatus 4/5, Subscapularis 4/5
- Special Tests: Neer's test positive, Hawkins-Kennedy positive, Empty Can test positive
- Palpation: Tenderness over greater tuberosity, tightness in posterior capsule
- Posture: Forward head posture, rounded shoulders bilaterally

**Assessment**: Rotator cuff tendinopathy, likely subscapularis and supraspinatus involvement. Secondary to overhead training load and biomechanical factors (forward head posture, tight posterior capsule). Impacting training capacity and sleep quality.

**Plan**: 
- Manual therapy: Posterior capsule mobilisation, soft tissue release to supraspinatus/infraspinatus
- Exercise prescription: Scapular stabilisation exercises (3x15, daily), external rotation strengthening (3x12, 3x/week), posterior capsule stretching (3x30s, daily)
- Modifications: Reduce overhead load by 50% for 2 weeks, focus on horizontal pressing
- Return-to-sport: Progressive overhead loading protocol over 4-6 weeks, re-test strength and ROM weekly
- Follow-up: Review in 2 weeks to assess progress and adjust program
`;

      const massageTherapyExample = `
Example SOAP Note (Massage Therapy):

**Subjective**: Client presents with chronic lower back tension and stiffness, worse after prolonged sitting. Reports 7/10 discomfort, described as "deep ache" across lumbar region. Pain started gradually over past 6 months. Works desk job 8 hours/day. Previous massage 3 months ago provided temporary relief. No radicular symptoms. Sleep quality affected by discomfort.

**Objective**: 
- Palpation: Hypertonicity in erector spinae bilaterally, particularly L3-L5 region. Trigger points identified in quadratus lumborum bilaterally. Tissue quality: fibrotic, restricted mobility
- Range of motion: Forward flexion limited by 20%, extension limited by 15%
- Postural observation: Increased lumbar lordosis, forward head posture, rounded shoulders
- Treatment: Deep tissue massage applied with moderate pressure (6/10), focus on erector spinae and QL. Client reported "good pain" during treatment, significant release felt
- Client feedback: "Much looser" post-treatment, tension reduced to 3/10

**Assessment**: Chronic myofascial tension in lumbar region secondary to postural stress and prolonged sitting. Trigger points in quadratus lumborum contributing to referred pain pattern. Tissue restrictions limiting mobility.

**Plan**: 
- Treatment: Deep tissue massage to lumbar region, trigger point release to QL, myofascial release to erector spinae (60-minute session)
- Home care: Postural awareness cues, lumbar stretches (3x30s, 2x/day), heat application for 15 minutes daily
- Ergonomic: Review workstation setup, recommend lumbar support cushion
- Follow-up: Schedule next session in 1-2 weeks, consider monthly maintenance sessions
- Self-care: Daily stretching routine provided, client to practice between sessions
`;

      const osteopathyExample = `
Example SOAP Note (Osteopathy):

**Subjective**: Patient presents with recurrent headaches, 3-4x/week, described as "pressure" across frontal region and behind eyes. Headaches worse in morning and with stress. Duration: 6 months. Previous treatment: Physiotherapy for neck pain (resolved). No visual disturbances or nausea. Works at computer 6 hours/day. Sleep: 6-7 hours, reports waking with neck stiffness.

**Objective**: 
- Structural assessment: Forward head posture, increased cervical lordosis C4-C7, restricted upper cervical mobility
- Cranial rhythm: Slight restriction noted in sphenobasilar synchondrosis, temporal bone restriction bilaterally
- Palpation: Hypertonicity in suboccipital muscles, tenderness at C1-C2 junction, restricted mobility in occipito-atlantal joint
- Postural: Elevated right shoulder, slight pelvic tilt (right side high)
- Visceral: No significant restrictions noted
- Treatment: Cranial osteopathy techniques applied to temporal bones and sphenobasilar synchondrosis, suboccipital release, upper cervical mobilisation

**Assessment**: Tension-type headaches secondary to upper cervical dysfunction and cranial restrictions. Postural factors (forward head posture, computer work) contributing to chronic muscle tension and joint restrictions. Cranial rhythm disturbance may be contributing to headache pattern.

**Plan**: 
- Treatment: Cranial osteopathy to address sphenobasilar restriction, suboccipital release, upper cervical mobilisation (45-minute session)
- Postural re-education: Ergonomic assessment, cervical retraction exercises (3x10, daily)
- Self-care: Upper cervical mobility exercises, stress management techniques
- Follow-up: Review in 2 weeks to assess headache frequency and intensity
- Referral: Consider vision assessment if headaches persist
`;

      if (specialty === 'sports_therapist') {
        return sportsTherapyExample;
      } else if (specialty === 'massage_therapist') {
        return massageTherapyExample;
      } else if (specialty === 'osteopath') {
        return osteopathyExample;
      }
      return ''; // No examples for generic/unknown specialty
    };

    // Get specialty-specific instructions
    const getSpecialtyInstructions = (specialty: string | null | undefined): string => {
      if (specialty === 'sports_therapist') {
        return `
Specialty-Specific Instructions for Sports Therapy:
- Focus on biomechanics and functional movement analysis
- Include specific measurements: ROM (degrees), strength (0-5 scale), functional movement screens
- Reference return-to-sport/return-to-play criteria and timelines
- Include exercise prescription with specific sets, reps, frequency, and progression
- Note performance metrics, training load, and sport-specific considerations
- Address injury prevention strategies and risk factors
- Use sports medicine terminology (e.g., tendinopathy, impingement, functional movement patterns)
`;
      } else if (specialty === 'massage_therapist') {
        return `
Specialty-Specific Instructions for Massage Therapy:
- Focus on soft tissue assessment and palpation findings
- Describe tissue quality: hypertonicity, trigger points, restrictions, mobility
- Include treatment techniques used: pressure level (1-10 scale), stroke type, duration
- Note client feedback during treatment: "good pain", release sensations, comfort level
- Document muscle tension patterns and referred pain patterns
- Include relaxation indicators: breathing changes, muscle release, client reports
- Use massage therapy terminology (e.g., myofascial release, trigger point therapy, deep tissue)
`;
      } else if (specialty === 'osteopath') {
        return `
Specialty-Specific Instructions for Osteopathy:
- Focus on structural alignment and postural assessment
- Include cranial rhythm assessment and findings
- Note visceral restrictions if applicable
- Describe manual therapy techniques specific to osteopathy
- Address holistic body systems approach and interconnections
- Include assessment of cranial-sacral relationships
- Use osteopathic terminology (e.g., sphenobasilar synchondrosis, cranial rhythm, structural restrictions)
`;
      }
      return ''; // Generic instructions if no specialty
    };

    // Build patient context string
    const buildPatientContext = (history: any[], metrics: any[], currentSessionNumber?: number): string => {
      let context = '';
      
      if (history.length > 0 || currentSessionNumber) {
        context += '\n\n**PATIENT CONTEXT:**\n';
        
        if (currentSessionNumber) {
          context += `This is Session #${currentSessionNumber} with this patient.\n\n`;
        }
        
        if (history.length > 0) {
          context += 'Previous Sessions (most recent first):\n';
          history.forEach((note, idx) => {
            const date = new Date(note.timestamp).toLocaleDateString();
            const contentPreview = note.content.substring(0, 150).replace(/\n/g, ' ');
            const sessionNum = note.client_sessions?.session_number || '?';
            context += `Session #${sessionNum} [${date}] - ${note.note_type} (${note.template_type || 'N/A'}): ${contentPreview}${note.content.length > 150 ? '...' : ''}\n`;
          });
        }
      }
      
      if (metrics.length > 0) {
        context += '\nProgress Metrics:\n';
        // Group by metric type and show trends
        const metricGroups = new Map<string, any[]>();
        metrics.forEach(m => {
          if (!metricGroups.has(m.metric_name)) {
            metricGroups.set(m.metric_name, []);
          }
          metricGroups.get(m.metric_name)!.push(m);
        });
        
        metricGroups.forEach((values, name) => {
          const latest = values[0];
          const previous = values[1];
          const trend = previous ? (latest.value > previous.value ? '↑' : latest.value < previous.value ? '↓' : '→') : '';
          context += `- ${name}: ${latest.value}/${latest.max_value}${latest.unit ? ' ' + latest.unit : ''} (${new Date(latest.session_date).toLocaleDateString()}) ${trend}\n`;
        });
      }
      
      return context;
    };

    // Create comprehensive medical SOAP prompt with specialty awareness and learned preferences
    const buildSoapPrompt = (
      transcript: string, 
      sessionType?: string, 
      chiefComplaint?: string,
      specialty?: string | null,
      patientHistory?: any[],
      progressMetrics?: any[],
      preferences?: any,
      corrections?: any[]
    ): string => {
      const specialtyInstructions = getSpecialtyInstructions(specialty);
      const fewShotExample = getFewShotExamples(specialty);
      const patientContext = buildPatientContext(patientHistory || [], progressMetrics || [], currentSessionNumber);
      
      let prompt = `You are a medical documentation expert specializing in ${specialty === 'sports_therapist' ? 'Sports Therapy' : specialty === 'massage_therapist' ? 'Massage Therapy' : specialty === 'osteopath' ? 'Osteopathy' : 'clinical documentation'}.

🚨 CRITICAL INSTRUCTION: You MUST ONLY use information that is explicitly stated in the transcript below. DO NOT fabricate, invent, assume, or create mock/example content. If information is not present in the transcript, explicitly state "Information not provided in transcript" rather than making assumptions or generating placeholder content.

Analyze the following clinical transcript and generate a comprehensive SOAP (Subjective, Objective, Assessment, Plan) note based STRICTLY on what is actually stated in the transcript.

SOAP Note Structure:
- **Subjective (S)**: Patient-reported symptoms, history, chief complaint, and what the patient tells you. Include: pain description, duration, triggers, past medical history, medications, allergies, social history (if relevant).

- **Objective (O)**: Observable, measurable findings from physical examination and tests. MUST include: Pain score (VAS - Visual Analog Scale 0-10), Range of motion measurements with specific degrees (e.g., "knee flexion 90°", "shoulder abduction 120°"). Also include: vital signs, strength testing, palpation findings, special tests, postural observations, gait analysis, and any objective clinical data. These measurements enable tracking progress across sessions.

- **Assessment (A)**: Clinical impression and professional diagnosis. Synthesize the subjective and objective findings to form a clinical assessment. Include primary diagnosis, differential diagnoses if applicable, and clinical reasoning.

- **Plan (P)**: Treatment plan and next steps. Include: specific interventions, exercises prescribed, manual therapy techniques, patient education, home exercise program, follow-up appointments, medications (if applicable), and any referrals or recommendations.`;

      if (fewShotExample) {
        prompt += `\n\n⚠️ FORMAT EXAMPLES ONLY - DO NOT COPY CONTENT:
The following examples show the STRUCTURE and STYLE of SOAP notes. They are NOT related to the current transcript. You must analyze ONLY the actual transcript provided below, not these examples.

${fewShotExample}`;
      }

      // Add learned preferences if available
      if (preferences && preferences.learning_enabled) {
        if (preferences.soap_style && Object.keys(preferences.soap_style).length > 0) {
          prompt += `\n\n📚 PRACTITIONER STYLE PREFERENCES (learned from your previous notes):
${JSON.stringify(preferences.soap_style, null, 2)}

Please adapt your writing style to match these preferences while still being truthful to the transcript.`;
        }
        
        if (preferences.common_phrases && preferences.common_phrases.length > 0) {
          prompt += `\n\nCommon phrases this practitioner uses: ${preferences.common_phrases.join(', ')}`;
        }
        
        if (preferences.detail_level) {
          prompt += `\n\nPreferred detail level: ${preferences.detail_level}`;
        }
      }

      // Add recent corrections for learning
      if (corrections && corrections.length > 0 && preferences?.learning_enabled) {
        prompt += `\n\n🔍 RECENT CORRECTIONS (learn from these patterns):
The practitioner has corrected these sections in previous notes. Learn from these patterns:
`;
        corrections.forEach((corr, idx) => {
          if (corr.section && corr.original_content && corr.corrected_content) {
            prompt += `\n${idx + 1}. ${corr.section.toUpperCase()} Section:
   Original: "${corr.original_content.substring(0, 100)}${corr.original_content.length > 100 ? '...' : ''}"
   Corrected to: "${corr.corrected_content.substring(0, 100)}${corr.corrected_content.length > 100 ? '...' : ''}"
`;
          }
        });
        prompt += `\nAvoid making similar mistakes. Pay attention to what the practitioner prefers.`;
      }

      if (patientContext) {
        prompt += patientContext;
      }

      prompt += `\n\n═══════════════════════════════════════════════════════════
📋 ACTUAL CLINICAL TRANSCRIPT TO ANALYZE:
═══════════════════════════════════════════════════════════
${transcript}
═══════════════════════════════════════════════════════════

REMEMBER: Base your SOAP note ONLY on the information in the transcript above. Do not add information that is not present.`;

      if (sessionType) {
        prompt += `\n\nSession Type: ${sessionType}`;
      }

      if (chiefComplaint) {
        prompt += `\n\nChief Complaint: ${chiefComplaint}`;
      }

      if (specialtyInstructions) {
        prompt += `\n\n${specialtyInstructions}`;
      }

      prompt += `\n\nGeneral Instructions:
1. Extract and organize ALL relevant information from the transcript above into the appropriate SOAP sections.
2. Use proper medical terminology and clinical language appropriate for ${specialty === 'sports_therapist' ? 'sports therapy' : specialty === 'massage_therapist' ? 'massage therapy' : specialty === 'osteopath' ? 'osteopathy' : 'clinical practice'}.
3. Be specific and detailed based on what is actually stated - avoid vague statements.
4. If information is missing or unclear, explicitly state "Information not provided in transcript" rather than making assumptions or fabricating content.
5. DO NOT create mock data, example scenarios, or placeholder content.
6. DO NOT copy content from the format examples - they are only for structure reference.
7. If the transcript is minimal or contains test audio, create a minimal SOAP note that accurately reflects this.
8. Ensure the Assessment logically follows ONLY from the Subjective and Objective findings that are actually in the transcript.
9. The Plan should be actionable and specific, but only include interventions/treatments that are mentioned or can be reasonably inferred from the transcript.
10. Maintain professional medical documentation standards while being truthful to the transcript content.
11. Reference patient history and progress trends when relevant, but only if they are mentioned in the transcript or provided context.

Generate a SOAP note based STRICTLY on the transcript provided above:`;

      return prompt;
    };

    // Generate SOAP notes using AI
    const prompt = buildSoapPrompt(
      transcript, 
      session_type, 
      chief_complaint,
      practitionerRole,
      patientHistory,
      progressMetrics,
      practitionerPreferences,
      recentCorrections
    );
    
    // Use OpenAI GPT-4o-mini model for structured outputs
    // GPT-4o-mini is cost-effective and supports structured outputs via json_schema
    const model = openai('gpt-4o-mini', {
      apiKey: openaiApiKey,
    });

    let result;
    try {
      console.log('[SOAP-NOTES] Calling OpenAI API with prompt length:', prompt.length);
      result = await generateObject({
        model,
        schema: soapNoteSchema,
        prompt,
        temperature: 0.3, // Lower temperature for more consistent, clinical documentation
        maxTokens: 2000, // Sufficient for comprehensive SOAP notes
      });
      console.log('[SOAP-NOTES] OpenAI API call successful');
    } catch (openaiError: any) {
      // Log detailed OpenAI API error
      console.error('[SOAP-NOTES] OpenAI API error:', {
        message: openaiError?.message,
        name: openaiError?.name,
        cause: openaiError?.cause,
        stack: openaiError?.stack,
        statusCode: openaiError?.statusCode,
        response: openaiError?.response,
      });

      // Handle specific OpenAI API error types
      let errorMessage = 'AI service error occurred';
      let errorDetails = openaiError?.message || 'Unknown error';
      let httpStatus = 500;

      // Check for rate limit errors
      if (openaiError?.statusCode === 429 || openaiError?.message?.includes('rate limit') || openaiError?.message?.includes('429')) {
        errorMessage = 'Rate limit exceeded';
        errorDetails = 'Too many requests. Please try again in a few moments.';
        httpStatus = 429;
      }
      // Check for invalid API key errors
      else if (openaiError?.statusCode === 401 || openaiError?.message?.includes('unauthorized') || openaiError?.message?.includes('invalid api key')) {
        errorMessage = 'Invalid API key';
        errorDetails = 'The AI service API key is invalid or expired. Please contact support.';
        httpStatus = 500;
      }
      // Check for model availability errors
      else if (openaiError?.message?.includes('model') || openaiError?.message?.includes('not available')) {
        errorMessage = 'Model unavailable';
        errorDetails = 'The AI model is currently unavailable. Please try again later.';
        httpStatus = 503;
      }
      // Check for timeout errors
      else if (openaiError?.message?.includes('timeout') || openaiError?.name?.includes('Timeout')) {
        errorMessage = 'Request timeout';
        errorDetails = 'The AI service took too long to respond. Please try again.';
        httpStatus = 504;
      }
      // Check for network errors
      else if (openaiError?.message?.includes('network') || openaiError?.message?.includes('fetch')) {
        errorMessage = 'Network error';
        errorDetails = 'Failed to connect to AI service. Please check your connection and try again.';
        httpStatus = 502;
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

    let S = result.object.subjective || '';
    let O = result.object.objective || '';
    let A = result.object.assessment || '';
    let P = result.object.plan || '';

    // Store interaction in agent memory for learning
    try {
      // Get or create conversation
      const { data: convId } = await supabase.rpc('get_or_create_conversation', {
        p_user_id: user.id,
        p_interface_type: 'soap-notes',
        p_context_id: session_id || client_id || null,
        p_context_type: session_id ? 'session' : client_id ? 'client' : null,
        p_metadata: {
          session_id: session_id || null,
          client_id: client_id || null,
          session_type: session_type || null,
          chief_complaint: chief_complaint || null
        }
      });

      if (convId) {
        // Store user input (transcript)
        await supabase.from('agent_memory').insert({
          conversation_id: convId,
          user_id: user.id,
          role: 'user',
          content: transcript.substring(0, 10000), // Limit to 10KB for storage
          content_type: 'transcript',
          metadata: {
            session_id: session_id || null,
            client_id: client_id || null,
            session_type: session_type || null,
            chief_complaint: chief_complaint || null
          }
        });

        // Store AI response (SOAP note)
        await supabase.from('agent_memory').insert({
          conversation_id: convId,
          user_id: user.id,
          role: 'assistant',
          content: JSON.stringify({ subjective: S, objective: O, assessment: A, plan: P }),
          content_type: 'soap-note',
          metadata: {
            session_id: session_id || null,
            client_id: client_id || null,
            session_type: session_type || null,
            chief_complaint: chief_complaint || null
          }
        });

        console.log('[SOAP-NOTES] Interaction stored in memory');
      }
    } catch (memoryError) {
      console.warn('[SOAP-NOTES] Error storing memory (non-fatal):', memoryError);
      // Don't fail the request if memory storage fails
    }

    // Add chief complaint to subjective if provided and not already included
    if (chief_complaint && !S.toLowerCase().includes(chief_complaint.toLowerCase())) {
      S = `Chief complaint: ${chief_complaint}\n\n${S}`;
    }

    // Ensure no section is empty - provide placeholder if AI didn't generate content
    if (!S.trim()) S = 'No subjective information provided in transcript.';
    if (!O.trim()) O = 'No objective findings documented in transcript.';
    if (!A.trim()) A = 'No assessment could be determined from the available information.';
    if (!P.trim()) P = 'No treatment plan was specified in the transcript.';

    // Optional persist
    let saved: { subjective_id?: string; objective_id?: string; assessment_id?: string; plan_id?: string } | undefined;
    if (save && session_id) {
      try {
        // Insert four notes; schema may differ per project, we use common fields
        const inserts = [
          { section: 'subjective', content: S },
          { section: 'objective', content: O },
          { section: 'assessment', content: A },
          { section: 'plan', content: P },
        ];
        saved = {};
        for (const item of inserts) {
          const { data: row, error } = await supabase
            .from('treatment_notes')
            .insert({ session_id, note_type: item.section, content: item.content, created_by: user.id })
            .select('id')
            .single();
          if (!error && row?.id) {
            (saved as any)[`${item.section}_id`] = row.id;
          }
        }
      } catch (_) {
        // Ignore save errors in response
      }
    }

    return new Response(JSON.stringify({ subjective: S, objective: O, assessment: A, plan: P, session_type, saved }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    // Log comprehensive error details
    console.error('[SOAP-NOTES] Unexpected error:', {
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      cause: e?.cause,
      user_id: user?.id || 'unknown',
      transcript_length: body?.transcript?.length || 0,
    });
    
    // Determine error type and message
    let errorMessage = 'Internal error';
    let errorDetails = e?.message || 'An unexpected error occurred';
    let errorType = 'unknown_error';
    
    // Check if it's a known error type
    if (e?.name === 'TypeError' || e?.name === 'ReferenceError') {
      errorType = 'code_error';
      errorDetails = 'A code error occurred. Please check the function logs.';
    } else if (e?.message?.includes('environment') || e?.message?.includes('env')) {
      errorType = 'configuration_error';
      errorDetails = 'Server configuration error. Please contact support.';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage, 
      details: errorDetails,
      type: errorType
    }), { 
      status: 500, 
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } 
    });
  }
});

// Removed duplicate handler
