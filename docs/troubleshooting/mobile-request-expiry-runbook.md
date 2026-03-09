# Mobile Request Expiry Runbook

This runbook covers health checks for the `expire_mobile_requests_job` cron task.

## Cron Job Health

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'expire_mobile_requests_job';
```

## Recent Cron Executions

```sql
select
  runid,
  jobid,
  status,
  return_message,
  start_time,
  end_time
from cron.job_run_details
where jobid = (
  select jobid
  from cron.job
  where jobname = 'expire_mobile_requests_job'
  limit 1
)
order by start_time desc
limit 20;
```

## Expired Mobile Requests Snapshot

```sql
select
  status,
  payment_status,
  count(*) as request_count
from public.mobile_booking_requests
group by status, payment_status
order by status, payment_status;
```

## Notification Verification

```sql
select
  n.created_at,
  n.recipient_id,
  n.type,
  n.title,
  n.payload
from public.notifications n
where n.type = 'booking_request'
  and n.title = 'Mobile Session Request Expired'
order by n.created_at desc
limit 50;
```
