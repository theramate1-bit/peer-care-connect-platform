/**
 * Treatment plan file attachments — private bucket `treatment-plan-attachments`.
 * Object path: `{practitioner_user_id}/{plan_id}/{uuid}_{filename}`.
 */

import { supabase } from "@/lib/supabase";
import {
  fetchTreatmentPlanById,
  updateTreatmentPlanRpc,
} from "@/lib/api/practitionerTreatmentPlans";

export const TREATMENT_PLAN_ATTACHMENTS_BUCKET = "treatment-plan-attachments";

export type TreatmentPlanAttachment = {
  path: string;
  name: string;
  uploaded_at: string;
};

function randomId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function parseTreatmentPlanAttachments(raw: unknown): TreatmentPlanAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: TreatmentPlanAttachment[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && "path" in item) {
      const o = item as Record<string, unknown>;
      const path = typeof o.path === "string" ? o.path : "";
      if (!path) continue;
      out.push({
        path,
        name: typeof o.name === "string" ? o.name : "File",
        uploaded_at:
          typeof o.uploaded_at === "string" ? o.uploaded_at : "",
      });
    }
  }
  return out;
}

export async function getTreatmentPlanAttachmentSignedUrl(
  objectPath: string,
  expiresSec = 3600,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(TREATMENT_PLAN_ATTACHMENTS_BUCKET)
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

export async function uploadTreatmentPlanAttachment(params: {
  planId: string;
  practitionerId: string;
  fileUri: string;
  fileName: string;
  mimeType: string | null;
}): Promise<{ ok: boolean; error: Error | null }> {
  let uploadedPath: string | null = null;
  try {
    const { data: plan, error: pErr } = await fetchTreatmentPlanById(params.planId);
    if (pErr) return { ok: false, error: pErr };
    if (!plan || plan.practitioner_id !== params.practitionerId) {
      return { ok: false, error: new Error("Not authorized") };
    }

    const safe =
      params.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) ||
      "file";
    const objectPath = `${params.practitionerId}/${params.planId}/${randomId()}_${safe}`;
    uploadedPath = objectPath;

    const res = await fetch(params.fileUri);
    const blob = await res.blob();

    const { error: upErr } = await supabase.storage
      .from(TREATMENT_PLAN_ATTACHMENTS_BUCKET)
      .upload(objectPath, blob, {
        contentType: params.mimeType || "application/octet-stream",
        upsert: false,
      });
    if (upErr) {
      return { ok: false, error: new Error(upErr.message) };
    }

    const current = parseTreatmentPlanAttachments(plan.attachments);
    const next: TreatmentPlanAttachment[] = [
      ...current,
      {
        path: objectPath,
        name: params.fileName,
        uploaded_at: new Date().toISOString(),
      },
    ];

    const rpc = await updateTreatmentPlanRpc({
      planId: params.planId,
      patch: { attachments: next },
    });
    if (!rpc.ok) {
      await supabase.storage
        .from(TREATMENT_PLAN_ATTACHMENTS_BUCKET)
        .remove([objectPath]);
      return { ok: false, error: rpc.error ?? new Error("Could not save plan") };
    }
    return { ok: true, error: null };
  } catch (e) {
    if (uploadedPath) {
      await supabase.storage
        .from(TREATMENT_PLAN_ATTACHMENTS_BUCKET)
        .remove([uploadedPath]);
    }
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function removeTreatmentPlanAttachment(params: {
  planId: string;
  practitionerId: string;
  objectPath: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { data: plan, error: pErr } = await fetchTreatmentPlanById(params.planId);
    if (pErr) return { ok: false, error: pErr };
    if (!plan || plan.practitioner_id !== params.practitionerId) {
      return { ok: false, error: new Error("Not authorized") };
    }

    const current = parseTreatmentPlanAttachments(plan.attachments);
    const next = current.filter((a) => a.path !== params.objectPath);
    if (next.length === current.length) {
      return { ok: false, error: new Error("Attachment not found") };
    }

    const rpc = await updateTreatmentPlanRpc({
      planId: params.planId,
      patch: { attachments: next },
    });
    if (!rpc.ok) {
      return { ok: false, error: rpc.error ?? new Error("Could not update plan") };
    }

    await supabase.storage
      .from(TREATMENT_PLAN_ATTACHMENTS_BUCKET)
      .remove([params.objectPath]);
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
