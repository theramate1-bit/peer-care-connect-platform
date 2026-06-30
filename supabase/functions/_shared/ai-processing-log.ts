/**
 * Best-effort GDPR accountability logging for AI inference calls.
 * Does not store transcript/audio content — only metadata + SHA-256 fingerprint.
 * Failures are swallowed so clinical AI features keep working.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

export type AiInputType = "transcript" | "audio_url" | "storage_path";

export type AiProcessingLogEntry = {
  userId: string;
  functionName: string;
  subProcessor: string;
  modelId: string;
  inputType: AiInputType;
  /** Raw string whose hash is stored (transcript, URL, or storage path). Never persisted. */
  inputForHash: string;
  sessionId?: string | null;
  recordingId?: string | null;
  outcome?: "success" | "error";
  metadata?: Record<string, unknown>;
};

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Safe structured log — no clinical content in production. */
export function logAiRequestContext(
  tag: string,
  ctx: Record<string, unknown>,
): void {
  const isProduction = Deno.env.get("ENVIRONMENT") === "production";
  if (isProduction) {
    const {
      transcript_preview: _drop,
      transcript: _t,
      text: _text,
      ...safe
    } = ctx as Record<string, unknown>;
    console.log(tag, safe);
    return;
  }
  console.log(tag, ctx);
}

/**
 * Insert accountability row. Never throws — logging must not block AI features.
 */
export async function logAiProcessing(
  supabase: SupabaseClient,
  entry: AiProcessingLogEntry,
): Promise<void> {
  try {
    const inputByteLength = new TextEncoder().encode(entry.inputForHash).length;
    const inputSha256 = await sha256Hex(entry.inputForHash);

    const { error } = await supabase.from("ai_processing_log").insert({
      user_id: entry.userId,
      session_id: entry.sessionId ?? null,
      recording_id: entry.recordingId ?? null,
      function_name: entry.functionName,
      sub_processor: entry.subProcessor,
      model_id: entry.modelId,
      input_type: entry.inputType,
      input_byte_length: inputByteLength,
      input_sha256: inputSha256,
      lawful_basis: "practitioner_instruction",
      outcome: entry.outcome ?? "success",
      metadata: entry.metadata ?? {},
    });

    if (error) {
      console.warn("[ai-processing-log] insert failed:", error.message);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[ai-processing-log] insert failed:", message);
  }
}
