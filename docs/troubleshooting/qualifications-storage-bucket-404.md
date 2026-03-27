# Qualifications storage bucket "Bucket not found" (404)

## Cause

If the `qualifications` storage bucket was created only via SQL (`INSERT INTO storage.buckets`), the Storage API can still return **404 Bucket not found** when uploading. Supabase recommends creating buckets via the **Storage API** or **Dashboard** so the backend object store is registered.

## Fix (one-time)

An Edge Function **ensure-qualifications-bucket** is deployed to create the bucket via the Storage API. Run it **once**:

1. **Option A – Dashboard**
   - Supabase Dashboard → **Edge Functions** → **ensure-qualifications-bucket** → **Invoke**.

2. **Option B – cURL**  
   Use your project URL and **service role key** (Dashboard → Project Settings → API → `service_role`):

   ```bash
   curl -X POST "https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/ensure-qualifications-bucket" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

   You should get `{"ok":true,...}` or `{"ok":true,"message":"Bucket already exists; no action needed."}`.

3. Retry uploading a qualification in the app; the 404 should be gone.

## Reference

- [Creating Buckets \| Supabase Docs](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- Function source: `supabase/functions/ensure-qualifications-bucket/index.ts`
