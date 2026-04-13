/**
 * AI SOAP drafting via edge function `soap-notes` (Pro / Clinic subscription).
 */

import { supabase } from "@/lib/supabase";

export type SoapNotesResult = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export async function generateSoapNotesFromTranscript(params: {
  transcript: string;
  sessionId?: string;
  sessionType?: string;
  chiefComplaint?: string;
  save?: boolean;
}): Promise<{
  data: SoapNotesResult | null;
  error: Error | null;
  status?: number;
}> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke("soap-notes", {
      body: {
        transcript: params.transcript,
        session_id: params.sessionId,
        session_type: params.sessionType,
        chief_complaint: params.chiefComplaint,
        save: params.save ?? false,
      },
    });

    if (fnErr) {
      return {
        data: null,
        error: new Error(fnErr.message),
      };
    }

    const raw = data as Record<string, unknown> | null;
    if (!raw) {
      return { data: null, error: new Error("Empty response") };
    }
    if (raw.error) {
      const msg = String(raw.error);
      const details =
        typeof raw.details === "string" ? raw.details : msg;
      const err = new Error(details);
      return {
        data: null,
        error: err,
        status:
          msg.toLowerCase().includes("pro plan") || details.includes("Pro")
            ? 403
            : undefined,
      };
    }

    return {
      data: {
        subjective: String(raw.subjective ?? ""),
        objective: String(raw.objective ?? ""),
        assessment: String(raw.assessment ?? ""),
        plan: String(raw.plan ?? ""),
      },
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
