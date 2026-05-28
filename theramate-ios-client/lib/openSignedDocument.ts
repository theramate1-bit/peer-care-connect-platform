import { openHostedWebSession } from "@/lib/openHostedWeb";

/** Open a Supabase signed URL in the allowlisted in-app WebView (not Safari). */
export function openSignedDocumentUrl(url: string | null | undefined): void {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return;
  openHostedWebSession({ kind: "signed_document", url: trimmed });
}
