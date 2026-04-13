import { supabase } from "@/lib/supabase";

export async function generateReportExport(reportId: string): Promise<{
  ok: boolean;
  error: Error | null;
  delivery_id?: string;
  file_path?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("report-export", {
      body: { report_id: reportId },
    });
    if (error) {
      return { ok: false, error: new Error(error.message) };
    }
    const raw = data as Record<string, unknown> | null;
    if (!raw || raw.ok !== true) {
      return {
        ok: false,
        error: new Error(String(raw?.error ?? raw?.details ?? "Export failed")),
      };
    }
    return {
      ok: true,
      error: null,
      delivery_id: typeof raw.delivery_id === "string" ? raw.delivery_id : undefined,
      file_path: typeof raw.file_path === "string" ? raw.file_path : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

