-- Enable Realtime on subscriptions table so SubscriptionContext can detect webhook updates (e.g. lapse to past_due/cancelled)
-- Users receive events only for their own rows via RLS (auth.uid() = user_id)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
  END IF;
END
$$;
