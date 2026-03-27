/**
 * One-time fix for "Bucket not found" 404 when the qualifications bucket
 * was created via SQL only. Per Supabase docs, buckets should be created
 * via the Storage API so the backend object store is registered.
 *
 * Invoke once (e.g. from Dashboard > Edge Functions > ensure-qualifications-bucket > Invoke)
 * or: curl -X POST "https://<project-ref>.supabase.co/functions/v1/ensure-qualifications-bucket" \
 *        -H "Authorization: Bearer <service_role_key>"
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";

const BUCKET_ID = "qualifications";
const FILE_SIZE_LIMIT = "10MB";
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await supabase.storage.createBucket(BUCKET_ID, {
    public: false,
    fileSizeLimit: FILE_SIZE_LIMIT,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (error) {
    // "Bucket already exists" or conflict means the bucket is there
    const alreadyExists =
      error.message?.toLowerCase().includes("already exists") ||
      error.message?.toLowerCase().includes("duplicate") ||
      error.message?.toLowerCase().includes("unique");
    if (alreadyExists) {
      return Response.json({
        ok: true,
        message: "Bucket already exists; no action needed.",
      });
    }
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, data });
});
