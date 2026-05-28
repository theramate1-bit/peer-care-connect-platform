-- Retention policy scaffold (UK Sept 2025)
-- Note: adjust periods per counsel guidance before enabling DELETEs

create or replace function log_data_destruction(p_table text, p_row_id uuid, p_method text, p_reason text)
returns void language plpgsql security definer as $$
begin
  insert into data_destruction_log(table_name, row_id, method, reason, destroyed_at)
  values (p_table, p_row_id, p_method, p_reason, now());
exception when others then
  -- best-effort logging; do not block
  null;
end; $$;

do $$ begin
  create table if not exists data_destruction_log (
    id uuid primary key default gen_random_uuid(),
    table_name text not null,
    row_id uuid,
    method text,
    reason text,
    destroyed_at timestamptz not null default now()
  );
exception when others then null; end $$;

-- Example: purge soft-deleted messages older than 24 months
create or replace function purge_old_messages()
returns void language plpgsql security definer as $$
declare r record;
begin
  for r in select id from messages where deleted_at is not null and deleted_at < now() - interval '24 months'
  loop
    perform log_data_destruction('messages', r.id, 'sql_delete', 'retention_24m');
    delete from messages where id = r.id;
  end loop;
end; $$;

-- Example: purge analytics events older than 26 months
create or replace function purge_old_analytics()
returns void language plpgsql security definer as $$
declare r record;
begin
  for r in select id from analytics_events where created_at < now() - interval '26 months'
  loop
    perform log_data_destruction('analytics_events', r.id, 'sql_delete', 'retention_26m');
    delete from analytics_events where id = r.id;
  end loop;
end; $$;

-- Example: anonymize session records older than 6 years (Limitation Act anchor)
create or replace function anonymize_old_sessions()
returns void language plpgsql security definer as $$
begin
  update client_sessions
  set client_name = null,
      client_email = null,
      notes = null
  where session_date < now() - interval '6 years';
end; $$;

-- Schedule (pg_cron or Supabase scheduler) outside of migration, e.g. daily at 02:00
-- select cron.schedule('retention_purge_daily', '0 2 * * *', $$ select purge_old_messages(); select purge_old_analytics(); select anonymize_old_sessions(); $$);


