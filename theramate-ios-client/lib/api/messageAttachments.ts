/**
 * Message attachments — private bucket `message-attachments`.
 * Object path: `conversations/{conversation_id}/{message_id}/{uuid}_{filename}`.
 *
 * Note: DB column is named `encrypted_file_path` historically; we store the object path there.
 */

import { supabase } from "@/lib/supabase";

export const MESSAGE_ATTACHMENTS_BUCKET = "message-attachments";

export type MessageAttachmentRow = {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  encrypted_file_path: string;
  file_hash: string;
  thumbnail_url: string | null;
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

export async function getMessageAttachmentSignedUrl(
  objectPath: string,
  expiresSec = 3600,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .createSignedUrl(objectPath, expiresSec);
    if (error) throw error;
    return { url: data?.signedUrl ?? null, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function fetchMessageAttachmentsForMessages(
  messageIds: string[],
): Promise<{ data: MessageAttachmentRow[]; error: Error | null }> {
  try {
    const ids = [...new Set(messageIds)].filter(Boolean);
    if (ids.length === 0) return { data: [], error: null };
    const { data, error } = await supabase
      .from("message_attachments")
      .select(
        "id, message_id, file_name, file_type, file_size, encrypted_file_path, file_hash, thumbnail_url, created_at",
      )
      .in("message_id", ids)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { data: (data || []) as MessageAttachmentRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function uploadMessageAttachment(params: {
  conversationId: string;
  messageId: string;
  fileUri: string;
  fileName: string;
  mimeType: string | null;
}): Promise<{ ok: boolean; error: Error | null; attachmentId?: string; objectPath?: string }> {
  let uploadedPath: string | null = null;
  try {
    const safe =
      params.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
    const objectPath = `conversations/${params.conversationId}/${params.messageId}/${randomId()}_${safe}`;
    uploadedPath = objectPath;

    const res = await fetch(params.fileUri);
    const blob = await res.blob();

    const { error: upErr } = await supabase.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .upload(objectPath, blob, {
        contentType: params.mimeType || "application/octet-stream",
        upsert: false,
      });
    if (upErr) throw new Error(upErr.message);

    const hash = await sha256Hex(blob);

    const { data, error: insErr } = await supabase
      .from("message_attachments")
      .insert({
        message_id: params.messageId,
        file_name: params.fileName,
        file_type: params.mimeType || "application/octet-stream",
        file_size: blob.size,
        encrypted_file_path: objectPath,
        file_hash: hash,
      })
      .select("id")
      .single();
    if (insErr) {
      await supabase.storage.from(MESSAGE_ATTACHMENTS_BUCKET).remove([objectPath]);
      throw new Error(insErr.message);
    }

    return {
      ok: true,
      error: null,
      attachmentId: (data as { id: string } | null)?.id,
      objectPath,
    };
  } catch (e) {
    if (uploadedPath) {
      await supabase.storage.from(MESSAGE_ATTACHMENTS_BUCKET).remove([uploadedPath]);
    }
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

