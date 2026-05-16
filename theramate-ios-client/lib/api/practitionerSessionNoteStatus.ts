/**
 * Batch treatment-note presence + completion for practitioner session lists
 * (matches `PracticeClientManagement` `checkCompletionStatusForSessions` + any-note presence).
 */

import { supabase } from "@/lib/supabase";

export type PractitionerSessionNoteStatus = {
  /** Session has at least one `treatment_notes` row (any template). */
  withNotesIds: string[];
  /** Session finalized via completed `session_recordings` or completed SOAP/DAP notes. */
  completedIds: string[];
};

export async function fetchPractitionerSessionNoteStatuses(
  practitionerId: string,
  sessionIds: string[],
): Promise<{ data: PractitionerSessionNoteStatus; error: Error | null }> {
  if (sessionIds.length === 0) {
    return { data: { withNotesIds: [], completedIds: [] }, error: null };
  }

  try {
    const [
      { data: anyNotes, error: e1 },
      { data: recordings, error: e2 },
      { data: soapDap, error: e3 },
    ] = await Promise.all([
      supabase
        .from("treatment_notes")
        .select("session_id")
        .eq("practitioner_id", practitionerId)
        .in("session_id", sessionIds),
      supabase
        .from("session_recordings")
        .select("session_id, status")
        .eq("practitioner_id", practitionerId)
        .in("session_id", sessionIds),
      supabase
        .from("treatment_notes")
        .select("session_id, status")
        .eq("practitioner_id", practitionerId)
        .in("session_id", sessionIds)
        .in("template_type", ["SOAP", "DAP"]),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;

    const withNotes = new Set<string>();
    for (const r of anyNotes || []) {
      if (r.session_id) withNotes.add(r.session_id);
    }

    const completed = new Set<string>();
    for (const r of recordings || []) {
      if (r.session_id && r.status === "completed") completed.add(r.session_id);
    }
    for (const r of soapDap || []) {
      if (r.session_id && r.status === "completed") completed.add(r.session_id);
    }

    return {
      data: {
        withNotesIds: [...withNotes],
        completedIds: [...completed],
      },
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return {
      data: { withNotesIds: [], completedIds: [] },
      error: err,
    };
  }
}
