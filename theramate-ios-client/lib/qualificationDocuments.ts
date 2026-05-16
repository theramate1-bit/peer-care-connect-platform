import * as DocumentPicker from "expo-document-picker";

import { supabase } from "@/lib/supabase";

export type PickedQualificationDocument = {
  uri: string;
  name: string;
  mimeType: string | null;
  size: number | null;
};

export const QUALIFICATION_DOC_MAX_BYTES = 10 * 1024 * 1024;

export async function pickQualificationDocument(): Promise<PickedQualificationDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const file = result.assets[0];
  return {
    uri: file.uri,
    name: file.name,
    mimeType: file.mimeType ?? null,
    size: file.size ?? null,
  };
}

export function validateQualificationDocumentSize(
  size: number | null,
): string | null {
  if ((size ?? 0) > QUALIFICATION_DOC_MAX_BYTES) {
    return "Maximum file size is 10MB.";
  }
  return null;
}

export async function uploadQualificationDocumentForPractitioner(input: {
  practitionerId: string;
  document: PickedQualificationDocument;
}) {
  const fileResponse = await fetch(input.document.uri);
  const blob = await fileResponse.blob();
  const safeName = input.document.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${input.practitionerId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("qualifications")
    .upload(filePath, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType: input.document.mimeType || undefined,
    });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from("qualifications")
    .getPublicUrl(filePath);

  const ext = input.document.name.split(".").pop()?.toLowerCase() || "bin";
  const { data, error: insertError } = await supabase
    .from("practitioner_qualification_documents")
    .insert({
      practitioner_id: input.practitionerId,
      file_url: publicData.publicUrl,
      file_name: input.document.name,
      file_type: ext,
      file_size_bytes: input.document.size ?? 0,
    })
    .select("id, file_url, file_name, file_type, file_size_bytes, created_at")
    .single();
  if (insertError) throw insertError;
  return data;
}
