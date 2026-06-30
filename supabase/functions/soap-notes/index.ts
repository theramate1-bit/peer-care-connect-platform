import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { generateObject } from "npm:ai";
import { groq } from "npm:@ai-sdk/groq";
import { z } from "npm:zod";
import {
  logAiProcessing,
  logAiRequestContext,
} from "../_shared/ai-processing-log.ts";

const SOAP_NOTES_MODEL_ID = "llama-3.1-70b-versatile";

// CORS headers - restrict to allowed origins in production
const getAllowedOrigin = (): string => {
  const origin = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedOrigins = origin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    return allowedOrigins[0];
  }

  return Deno.env.get("ENVIRONMENT") === "production" ? "" : "*";
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = origin || "*";

  const corsOrigin =
    allowedOrigin === "*" || Deno.env.get("ENVIRONMENT") !== "production"
      ? "*"
      : allowedOrigin.includes(requestOrigin)
        ? requestOrigin
        : "";

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

interface SoapRequest {
  transcript: string;
  session_type?: string;
  chief_complaint?: string;
  session_id?: string;
  save?: boolean;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  // Variables to track for error logging
  let user: any = null;
  let body: SoapRequest | null = null;

  try {
    // Auth check + Pro gate
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .in("plan", ["pro", "clinic"])
      .eq("status", "active")
      .maybeSingle();
    if (!sub) {
      return new Response(JSON.stringify({ error: "Pro plan required" }), {
        status: 403,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Validate Content-Type
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Parse and validate request body
    try {
      const bodyText = await req.text();
      if (bodyText.length > 10 * 1024 * 1024) {
        // 10MB limit
        return new Response(
          JSON.stringify({ error: "Request body is too large (max 10MB)" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin),
              "Content-Type": "application/json",
            },
          },
        );
      }
      body = JSON.parse(bodyText) as SoapRequest;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { transcript, session_type, chief_complaint, session_id, save } =
      body!;

    logAiRequestContext("[SOAP-NOTES] Request received:", {
      user_id: user.id,
      transcript_length: transcript?.length ?? 0,
      session_type: session_type || "none",
      session_id: session_id || "none",
      save: save || false,
    });

    // Validate transcript
    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({
          error: "transcript is required and must be a string",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate transcript length (reasonable limit for SOAP notes)
    if (transcript.length > 50000) {
      // 50KB limit for transcript
      return new Response(
        JSON.stringify({ error: "Transcript is too long (max 50KB)" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate session_id format if provided
    if (session_id && typeof session_id === "string") {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(session_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid session_id format" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin),
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    // Validate Groq API Key
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GROQ_API_KEY environment variable is not set. Please configure this in your Supabase project settings.",
          details: "Get a free API key from https://console.groq.com/keys",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Define SOAP Note Schema using Zod
    const soapNoteSchema = z.object({
      subjective: z
        .string()
        .describe(
          "Patient-reported symptoms, history, chief complaint, and subjective information. Include what the patient feels, reports, or describes about their condition.",
        ),
      objective: z
        .string()
        .describe(
          "Observable findings, measurements, test results, physical examination findings, and objective clinical data. Include vital signs, range of motion, strength, palpation findings, and any measurable assessments.",
        ),
      assessment: z
        .string()
        .describe(
          "Clinical impression, diagnosis, analysis, and professional assessment based on the subjective and objective findings. Include differential diagnoses if applicable.",
        ),
      plan: z
        .string()
        .describe(
          "Treatment plan, recommendations, exercises, follow-up instructions, medications, and next steps for the patient.",
        ),
    });

    // Create comprehensive medical SOAP prompt
    const buildSoapPrompt = (
      transcript: string,
      sessionType?: string,
      chiefComplaint?: string,
    ): string => {
      let prompt = `You are a medical documentation expert. Analyze the following clinical transcript and generate a comprehensive SOAP (Subjective, Objective, Assessment, Plan) note.

SOAP Note Structure:
- **Subjective (S)**: Patient-reported symptoms, history, chief complaint, and what the patient tells you. Include: pain description, duration, triggers, past medical history, medications, allergies, social history (if relevant).

- **Objective (O)**: Observable, measurable findings from physical examination and tests. Include: vital signs, range of motion measurements, strength testing, palpation findings, special tests, postural observations, gait analysis, and any objective clinical data.

- **Assessment (A)**: Clinical impression and professional diagnosis. Synthesize the subjective and objective findings to form a clinical assessment. Include primary diagnosis, differential diagnoses if applicable, and clinical reasoning.

- **Plan (P)**: Treatment plan and next steps. Include: specific interventions, exercises prescribed, manual therapy techniques, patient education, home exercise program, follow-up appointments, medications (if applicable), and any referrals or recommendations.

Clinical Transcript:
${transcript}`;

      if (sessionType) {
        prompt += `\n\nSession Type: ${sessionType}`;
      }

      if (chiefComplaint) {
        prompt += `\n\nChief Complaint: ${chiefComplaint}`;
      }

      prompt += `\n\nInstructions:
1. Extract and organize all relevant information from the transcript into the appropriate SOAP sections.
2. Use proper medical terminology and clinical language.
3. Be specific and detailed - avoid vague statements.
4. If information is missing or unclear, indicate this appropriately.
5. Ensure the Assessment logically follows from the Subjective and Objective findings.
6. The Plan should be actionable and specific.
7. Maintain professional medical documentation standards.

Generate a comprehensive SOAP note now:`;

      return prompt;
    };

    // Generate SOAP notes using AI
    const prompt = buildSoapPrompt(transcript, session_type, chief_complaint);

    // Use Groq model that supports structured outputs (llama-3.1-70b-versatile)
    // Note: Not all Groq models support json_schema response format
    // See: https://console.groq.com/docs/structured-outputs#supported-models
    const model = groq(SOAP_NOTES_MODEL_ID, {
      apiKey: groqApiKey,
    });

    let result;
    try {
      console.log(
        "[SOAP-NOTES] Calling Groq API with prompt length:",
        prompt.length,
      );
      result = await generateObject({
        model,
        schema: soapNoteSchema,
        prompt,
        temperature: 0.3, // Lower temperature for more consistent, clinical documentation
        maxTokens: 2000, // Sufficient for comprehensive SOAP notes
      });
      console.log("[SOAP-NOTES] Groq API call successful");
    } catch (groqError: any) {
      // Log detailed Groq API error
      console.error("[SOAP-NOTES] Groq API error:", {
        message: groqError?.message,
        name: groqError?.name,
        cause: groqError?.cause,
        stack: groqError?.stack,
        statusCode: groqError?.statusCode,
        response: groqError?.response,
      });

      // Handle specific Groq API error types
      let errorMessage = "AI service error occurred";
      let errorDetails = groqError?.message || "Unknown error";
      let httpStatus = 500;

      // Check for rate limit errors
      if (
        groqError?.statusCode === 429 ||
        groqError?.message?.includes("rate limit") ||
        groqError?.message?.includes("429")
      ) {
        errorMessage = "Rate limit exceeded";
        errorDetails = "Too many requests. Please try again in a few moments.";
        httpStatus = 429;
      }
      // Check for invalid API key errors
      else if (
        groqError?.statusCode === 401 ||
        groqError?.message?.includes("unauthorized") ||
        groqError?.message?.includes("invalid api key")
      ) {
        errorMessage = "Invalid API key";
        errorDetails =
          "The AI service API key is invalid or expired. Please contact support.";
        httpStatus = 500;
      }
      // Check for model availability errors
      else if (
        groqError?.message?.includes("model") ||
        groqError?.message?.includes("not available")
      ) {
        errorMessage = "Model unavailable";
        errorDetails =
          "The AI model is currently unavailable. Please try again later.";
        httpStatus = 503;
      }
      // Check for timeout errors
      else if (
        groqError?.message?.includes("timeout") ||
        groqError?.name?.includes("Timeout")
      ) {
        errorMessage = "Request timeout";
        errorDetails =
          "The AI service took too long to respond. Please try again.";
        httpStatus = 504;
      }
      // Check for network errors
      else if (
        groqError?.message?.includes("network") ||
        groqError?.message?.includes("fetch")
      ) {
        errorMessage = "Network error";
        errorDetails =
          "Failed to connect to AI service. Please check your connection and try again.";
        httpStatus = 502;
      }

      await logAiProcessing(supabase, {
        userId: user.id,
        functionName: "soap-notes",
        subProcessor: "groq",
        modelId: SOAP_NOTES_MODEL_ID,
        inputType: "transcript",
        inputForHash: transcript,
        sessionId: session_id,
        outcome: "error",
        metadata: { error_type: "groq_api_error", http_status: httpStatus },
      });

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: errorDetails,
          type: "groq_api_error",
        }),
        {
          status: httpStatus,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    let S = result.object.subjective || "";
    let O = result.object.objective || "";
    let A = result.object.assessment || "";
    let P = result.object.plan || "";

    // Add chief complaint to subjective if provided and not already included
    if (
      chief_complaint &&
      !S.toLowerCase().includes(chief_complaint.toLowerCase())
    ) {
      S = `Chief complaint: ${chief_complaint}\n\n${S}`;
    }

    // Ensure no section is empty - provide placeholder if AI didn't generate content
    if (!S.trim()) S = "No subjective information provided in transcript.";
    if (!O.trim()) O = "No objective findings documented in transcript.";
    if (!A.trim())
      A = "No assessment could be determined from the available information.";
    if (!P.trim()) P = "No treatment plan was specified in the transcript.";

    // Optional persist
    let saved:
      | {
          subjective_id?: string;
          objective_id?: string;
          assessment_id?: string;
          plan_id?: string;
        }
      | undefined;
    if (save && session_id) {
      try {
        // Insert four notes; schema may differ per project, we use common fields
        const inserts = [
          { section: "subjective", content: S },
          { section: "objective", content: O },
          { section: "assessment", content: A },
          { section: "plan", content: P },
        ];
        saved = {};
        for (const item of inserts) {
          const { data: row, error } = await supabase
            .from("treatment_notes")
            .insert({
              session_id,
              note_type: item.section,
              content: item.content,
              created_by: user.id,
            })
            .select("id")
            .single();
          if (!error && row?.id) {
            (saved as any)[`${item.section}_id`] = row.id;
          }
        }
      } catch (_) {
        // Ignore save errors in response
      }
    }

    await logAiProcessing(supabase, {
      userId: user.id,
      functionName: "soap-notes",
      subProcessor: "groq",
      modelId: SOAP_NOTES_MODEL_ID,
      inputType: "transcript",
      inputForHash: transcript,
      sessionId: session_id,
      outcome: "success",
      metadata: { saved: Boolean(save && session_id) },
    });

    return new Response(
      JSON.stringify({
        subjective: S,
        objective: O,
        assessment: A,
        plan: P,
        session_type,
        saved,
      }),
      {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    // Log comprehensive error details
    console.error("[SOAP-NOTES] Unexpected error:", {
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      cause: e?.cause,
      user_id: user?.id || "unknown",
      transcript_length: body?.transcript?.length || 0,
    });

    // Determine error type and message
    let errorMessage = "Internal error";
    let errorDetails = e?.message || "An unexpected error occurred";
    let errorType = "unknown_error";

    // Check if it's a known error type
    if (e?.name === "TypeError" || e?.name === "ReferenceError") {
      errorType = "code_error";
      errorDetails = "A code error occurred. Please check the function logs.";
    } else if (
      e?.message?.includes("environment") ||
      e?.message?.includes("env")
    ) {
      errorType = "configuration_error";
      errorDetails = "Server configuration error. Please contact support.";
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
        type: errorType,
      }),
      {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  }
});

// Removed duplicate handler
