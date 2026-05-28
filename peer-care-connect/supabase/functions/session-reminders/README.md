# Session Reminders Edge Function

Automated session reminder and follow-up system that sends notifications via the messaging system.

## Features

- **24h Reminder**: Sent 24 hours before a scheduled session
- **1h Reminder**: Sent 1 hour before a scheduled session
- **24h Follow-up**: Sent 24 hours after a completed session
- **7d Follow-up**: Sent 7 days after a completed session

## Setup

### 1. Deploy the Edge Function

```bash
supabase functions deploy session-reminders
```

### 2. Set up Cron Job

This function should be called every hour. You can set this up using:

#### Option A: Supabase Cron (Recommended)

Create a cron job in your Supabase project:

```sql
-- Create pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every hour
SELECT cron.schedule(
  'session-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/session-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

#### Option B: External Cron Service

Use services like:
- GitHub Actions (with scheduled workflows)
- Vercel Cron Jobs
- Render Cron Jobs
- EasyCron
- cron-job.org

Example GitHub Action (`.github/workflows/session-reminders.yml`):

```yaml
name: Session Reminders

on:
  schedule:
    - cron: '0 * * * *' # Every hour

jobs:
  trigger-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            https://your-project-ref.supabase.co/functions/v1/session-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

## How It Works

1. **Queries Database**: Checks for sessions that need reminders or follow-ups
2. **Creates/Gets Conversations**: Uses the messaging system to send notifications
3. **Sends System Messages**: Inserts automated messages into conversations
4. **Logs Results**: Returns counts of reminders sent

## Message Types

### 24h Reminder
> ⏰ Reminder: Your [Session Type] session with [Practitioner] is tomorrow at [Time]. Please arrive 5 minutes early.

### 1h Reminder
> ⏰ Your [Session Type] session starts in 1 hour ([Time]). See you soon!

### 24h Follow-up
> 👋 Hi! Just checking in - how are you feeling after yesterday's session? Any questions or concerns?

### 7d Follow-up
> 📊 It's been a week since your last session. How are you progressing? Would you like to schedule a follow-up?

## Testing

Test the function manually:

```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/session-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring

Check function logs:

```bash
supabase functions logs session-reminders
```

## Environment Variables Required

- `SUPABASE_URL`: Automatically provided
- `SUPABASE_SERVICE_ROLE_KEY`: Automatically provided

## Dependencies

- `client_sessions` table with proper foreign keys
- `conversations` table
- `messages` table
- `users` table with practitioner details

## Notes

- Uses service role key for database access
- Runs independently of user sessions
- Handles conversation creation automatically
- Gracefully handles errors per session

