/**
 * Session treatment notes (SOAP / DAP sections in `treatment_notes`).
 */

import { supabase } from "@/lib/supabase";
import { fetchClinicalAttachmentCountsBySession } from "@/lib/api/clinicalSessionAttachments";
import { fetchPractitionerSessions, type SessionWithClient } from "./practitionerSessions";

export type TreatmentNoteType =
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "data"
  | "general";

export type TreatmentNoteRow = {
  id: string;
  session_id: string | null;
  practitioner_id: string | null;
  client_id: string | null;
  note_type: string;
  content: string;
  status: string | null;
  updated_at: string | null;
};

const SOAP_TYPES: TreatmentNoteType[] = [
  "subjective",
  "objective",
  "assessment",
  "plan",
  "data",
];

export async function fetchTreatmentNotesForSession(
  sessionId: string,
): Promise<{ data: TreatmentNoteRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("treatment_notes")
      .select(
        "id, session_id, practitioner_id, client_id, note_type, content, status, updated_at",
      )
      .eq("session_id", sessionId)
      .order("note_type");
    if (error) throw error;
    return { data: (data || []) as TreatmentNoteRow[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** Map note_type -> content for quick form binding */
export function notesByType(
  rows: TreatmentNoteRow[],
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const t of SOAP_TYPES) m[t] = "";
  for (const r of rows) {
    m[r.note_type] = r.content ?? "";
  }
  return m;
}

export async function upsertTreatmentNoteSection(params: {
  sessionId: string;
  practitionerId: string;
  clientId: string | null;
  noteType: TreatmentNoteType;
  content: string;
  status?: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { data: existing, error: findErr } = await supabase
      .from("treatment_notes")
      .select("id")
      .eq("session_id", params.sessionId)
      .eq("note_type", params.noteType)
      .maybeSingle();
    if (findErr) throw findErr;

    const row = {
      session_id: params.sessionId,
      practitioner_id: params.practitionerId,
      client_id: params.clientId,
      note_type: params.noteType,
      content: params.content,
      status: params.status ?? "final",
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("treatment_notes")
        .update(row)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("treatment_notes").insert(row);
      if (error) throw error;
    }
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function saveAllSoapNotes(params: {
  sessionId: string;
  practitionerId: string;
  clientId: string | null;
  sections: Partial<Record<TreatmentNoteType, string>>;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    for (const t of SOAP_TYPES) {
      const text = params.sections[t];
      if (text === undefined) continue;
      const res = await upsertTreatmentNoteSection({
        sessionId: params.sessionId,
        practitionerId: params.practitionerId,
        clientId: params.clientId,
        noteType: t,
        content: text,
      });
      if (!res.ok) throw res.error;
    }
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export type SessionClinicalNotesSummary = SessionWithClient & {
  has_notes: boolean;
  notes_updated_at: string | null;
  clinical_attachment_count: number;
};

export async function fetchSessionsClinicalNotesSummary(params: {
  therapistId: string;
  limit?: number;
}): Promise<{ data: SessionClinicalNotesSummary[]; error: Error | null }> {
  try {
    const { data: sessions, error } = await fetchPractitionerSessions(params.therapistId);
    if (error) throw error;

    const limited = sessions.slice(0, Math.max(1, params.limit ?? 80));
    const ids = limited.map((s) => s.id).filter(Boolean);
    if (ids.length === 0) return { data: [], error: null };

    const { data: notes, error: nErr } = await supabase
      .from("treatment_notes")
      .select("session_id, updated_at")
      .in("session_id", ids);
    if (nErr) throw nErr;

    const { data: attachCounts, error: aErr } =
      await fetchClinicalAttachmentCountsBySession(ids);
    if (aErr) throw aErr;

    const bySession = new Map<string, { has: boolean; maxUpdatedAt: string | null }>();
    for (const row of (notes || []) as { session_id: string | null; updated_at: string | null }[]) {
      if (!row.session_id) continue;
      const prev = bySession.get(row.session_id);
      if (!prev) {
        bySession.set(row.session_id, { has: true, maxUpdatedAt: row.updated_at ?? null });
        continue;
      }
      const a = prev.maxUpdatedAt;
      const b = row.updated_at ?? null;
      if (!a) {
        prev.maxUpdatedAt = b;
      } else if (b && b > a) {
        prev.maxUpdatedAt = b;
      }
    }

    const out: SessionClinicalNotesSummary[] = limited.map((s) => {
      const meta = bySession.get(s.id);
      return {
        ...s,
        has_notes: !!meta?.has,
        notes_updated_at: meta?.maxUpdatedAt ?? null,
        clinical_attachment_count: attachCounts.get(s.id) ?? 0,
      };
    });

    out.sort((a, b) => {
      const aVault = a.has_notes || a.clinical_attachment_count > 0;
      const bVault = b.has_notes || b.clinical_attachment_count > 0;
      if (aVault !== bVault) return aVault ? -1 : 1;
      const au = a.notes_updated_at ?? "";
      const bu = b.notes_updated_at ?? "";
      if (au !== bu) return bu.localeCompare(au);
      return b.session_date.localeCompare(a.session_date);
    });

    return { data: out, error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}
