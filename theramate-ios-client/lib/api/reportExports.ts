import { supabase } from "@/lib/supabase";

export const REPORT_EXPORTS_BUCKET = "report-exports";

export async function getReportExportSignedUrl(
  objectPath: string,
  expiresSec = 3600,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(REPORT_EXPORTS_BUCKET)
      .createSignedUrl(objectPath, expiresSec);
    if (error) throw error;
    return { url: data?.signedUrl ?? null, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

