-- Unschedule the SQL-based expire_mobile_requests job so expiry is handled by the
-- expire-mobile-requests Edge Function (which also cancels Stripe holds).
-- Schedule the Edge Function every 15 minutes via Supabase Dashboard or external cron.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire_mobile_requests_job') THEN
      PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'expire_mobile_requests_job' LIMIT 1));
    END IF;
  END IF;
END $$;
