/**
 * Session voice → text via edge `ai-soap-transcribe` (AssemblyAI).
 * Uploads a short-lived object to clinical storage, signs a URL, then removes the row + file
 * after transcription so the vault is not filled with raw voice memos.
 */

import { supabase } from "@/lib/supabase";
import {
  deleteClinicalSessionAttachment,
  getClinicalSessionAttachmentSignedUrl,
  uploadClinicalSessionAttachment,
} from "@/lib/api/clinicalSessionAttachments";

async function readInvokeHttpError(err: unknown): Promise<{
  message: string;
  status: number;
}> {
  const fallback =
    err instanceof Error ? err.message : String(err ?? "Request failed");
  if (
    err &&
    typeof err === "object" &&
    "context" in err &&
    (err as { context?: unknown }).context &&
    typeof (err as { context: Response }).context.json === "function"
  ) {
    const res = (err as { context: Response }).context;
    try {
      const body = (await res.clone().json()) as { error?: string };
      const msg =
        typeof body?.error === "string" ? body.error : fallback;
      return { message: msg, status: res.status };
    } catch {
      return { message: fallback, status: res.status };
    }
  }
  return { message: fallback, status: 0 };
}

export async function transcribeSessionVoiceRecording(params: {
  sessionId: string;
  practitionerId: string;
  fileUri: string;
  /** Android may emit .mp4 / .m4a; match for Storage content-type. */
  mimeType: string;
  fileName: string;
}): Promise<{ text: string | null; error: Error | null; status?: number }> {
  const upload = await uploadClinicalSessionAttachment({
    sessionId: params.sessionId,
    practitionerId: params.practitionerId,
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType,
  });

  if (!upload.ok || !upload.storagePath || !upload.id) {
    return {
      text: null,
      error: upload.error ?? new Error("Could not upload recording"),
    };
  }

  const attachmentId = upload.id;

  const cleanup = async () => {
    await deleteClinicalSessionAttachment({
      attachmentId,
      practitionerId: params.practitionerId,
    });
  };

  try {
    const { url, error: urlErr } = await getClinicalSessionAttachmentSignedUrl(
      upload.storagePath,
      3600,
    );
    if (urlErr || !url) {
      await cleanup();
      return {
        text: null,
        error: urlErr ?? new Error("Could not sign audio URL"),
      };
    }

    const { data, error: fnErr } = await supabase.functions.invoke(
      "ai-soap-transcribe",
      { body: { audio_url: url, diarization: false } },
    );

    if (fnErr) {
      await cleanup();
      const { message: fnMsg, status } = await readInvokeHttpError(fnErr);
      return { text: null, error: new Error(fnMsg), status };
    }

    const raw = data as Record<string, unknown> | null;
    if (!raw) {
      await cleanup();
      return { text: null, error: new Error("Empty transcription response") };
    }

    if (raw.error && raw.success !== true) {
      await cleanup();
      return { text: null, error: new Error(String(raw.error)) };
    }

    if (raw.success === false) {
      await cleanup();
      const detail =
        typeof raw.error === "object" && raw.error !== null
          ? JSON.stringify(raw.error)
          : String(raw.error ?? "Transcription failed");
      return { text: null, error: new Error(detail) };
    }

    const text = typeof raw.text === "string" ? raw.text.trim() : "";
    if (!text) {
      await cleanup();
      return {
        text: null,
        error: new Error("No speech detected — try again closer to the mic."),
      };
    }

    await cleanup();
    return { text, error: null };
  } catch (e) {
    await cleanup();
    return {
      text: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
