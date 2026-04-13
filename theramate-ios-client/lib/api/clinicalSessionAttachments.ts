/**
 * Clinical session file vault — bucket `clinical-session-attachments`.
 * Object path: `{practitioner_id}/{session_id}/{uuid}_{filename}`.
 */

import { supabase } from "@/lib/supabase";

export const CLINICAL_SESSION_ATTACHMENTS_BUCKET = "clinical-session-attachments";

export type ClinicalSessionAttachmentRow = {
  id: string;
  session_id: string;
  practitioner_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  file_hash: string | null;
  created_at: string | null;
};

function randomId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sha256Hex(blob: Blob): Promise<string> {
  const crypto = globalThis.crypto as unknown as {
    subtle?: { digest: (alg: string, data: ArrayBuffer) => Promise<ArrayBuffer> };
  };
  if (!crypto?.subtle?.digest) {
    return `sha256:${randomId()}`;
  }
  const ab = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", ab);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getClinicalSessionAttachmentSignedUrl(
  objectPath: string,
  expiresSec = 3600,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(CLINICAL_SESSION_ATTACHMENTS_BUCKET)
      .createSignedUrl(objectPath, expiresSec);
    if (error) throw error;
    return { url: data?.signedUrl ?? null, error: null };
  } catch (e) {
    return {
      url: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function fetchClinicalSessionAttachments(
  sessionId: string,
): Promise<{ data: ClinicalSessionAttachmentRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("clinical_session_attachments")
      .select(
        "id, session_id, practitioner_id, file_name, file_type, file_size, storage_path, file_hash, created_at",
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { data: (data || []) as ClinicalSessionAttachmentRow[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** Count attachments per session (batch). */
export async function fetchClinicalAttachmentCountsBySession(
  sessionIds: string[],
): Promise<{ data: Map<string, number>; error: Error | null }> {
  const ids = [...new Set(sessionIds)].filter(Boolean);
  const counts = new Map<string, number>();
  if (ids.length === 0) return { data: counts, error: null };
  try {
    const { data, error } = await supabase
      .from("clinical_session_attachments")
      .select("session_id")
      .in("session_id", ids);
    if (error) throw error;
    for (const row of (data || []) as { session_id: string }[]) {
      const sid = row.session_id;
      counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
    return { data: counts, error: null };
  } catch (e) {
    return {
      data: counts,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function uploadClinicalSessionAttachment(params: {
  sessionId: string;
  practitionerId: string;
  fileUri: string;
  fileName: string;
  mimeType: string | null;
}): Promise<{
  ok: boolean;
  error: Error | null;
  id?: string;
  /** Storage object path (for signed URLs, e.g. transcription). */
  storagePath?: string;
}> {
  let uploadedPath: string | null = null;
  try {
    const safe =
      params.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
    const objectPath = `${params.practitionerId}/${params.sessionId}/${randomId()}_${safe}`;
    uploadedPath = objectPath;

    const res = await fetch(params.fileUri);
    const blob = await res.blob();

    const { error: upErr } = await supabase.storage
      .from(CLINICAL_SESSION_ATTACHMENTS_BUCKET)
      .upload(objectPath, blob, {
        contentType: params.mimeType || "application/octet-stream",
        upsert: false,
      });
    if (upErr) throw new Error(upErr.message);

    const hash = await sha256Hex(blob);

    const { data, error: insErr } = await supabase
      .from("clinical_session_attachments")
      .insert({
        session_id: params.sessionId,
        practitioner_id: params.practitionerId,
        file_name: params.fileName,
        file_type: params.mimeType || "application/octet-stream",
        file_size: blob.size,
        storage_path: objectPath,
        file_hash: hash,
      })
      .select("id")
      .single();
    if (insErr) {
      await supabase.storage
        .from(CLINICAL_SESSION_ATTACHMENTS_BUCKET)
        .remove([objectPath]);
      throw new Error(insErr.message);
    }

    return {
      ok: true,
      error: null,
      id: (data as { id: string } | null)?.id,
      storagePath: objectPath,
    };
  } catch (e) {
    if (uploadedPath) {
      await supabase.storage
        .from(CLINICAL_SESSION_ATTACHMENTS_BUCKET)
        .remove([uploadedPath]);
    }
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function deleteClinicalSessionAttachment(params: {
  attachmentId: string;
  practitionerId: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { data: row, error: fErr } = await supabase
      .from("clinical_session_attachments")
      .select("id, storage_path, practitioner_id")
      .eq("id", params.attachmentId)
      .maybeSingle();
    if (fErr) throw fErr;
    const r = row as {
      id: string;
      storage_path: string;
      practitioner_id: string;
    } | null;
    if (!r || r.practitioner_id !== params.practitionerId) {
      return { ok: false, error: new Error("Not found") };
    }

    const { error: dErr } = await supabase
      .from("clinical_session_attachments")
      .delete()
      .eq("id", r.id);
    if (dErr) throw dErr;

    await supabase.storage
      .from(CLINICAL_SESSION_ATTACHMENTS_BUCKET)
      .remove([r.storage_path]);
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
