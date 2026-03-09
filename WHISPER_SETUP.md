# Whisper API Setup Verification

## Quick Check

Since you already have the `summarize-session` function working (which uses OpenAI GPT-4), the `OPENAI_API_KEY` should already be configured in Supabase.

## Verify API Key is Set

### Method 1: Supabase Dashboard
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
4. Check if `OPENAI_API_KEY` is listed

### Method 2: Test the Function
The easiest way to verify is to test the transcription:

1. Record a session in the app
2. Click "Transcribe with Whisper AI" button
3. If it works → API key is configured ✓
4. If you get an error → See setup below

## Set Up API Key (If Needed)

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **Add Secret**
5. Enter:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)
6. Click **Save**

### Option 2: Using Supabase CLI

```bash
# Set the API key as a Supabase secret
supabase secrets set OPENAI_API_KEY=sk-your-key-here --project-ref your-project-ref
```

To get your project-ref:
```bash
supabase projects list
```

## Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in or create account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)

## Test the Setup

After setting the API key, test it:

```bash
# Test from your local project
cd peer-care-connect

# Or use the app directly:
# 1. Record a session
# 2. Click "Transcribe with Whisper AI"
# 3. Check if transcription appears
```

## Troubleshooting

### Error: "OpenAI API error: 401 Unauthorized"
- The API key is missing or incorrect
- Go to Supabase Dashboard → Edge Functions → Secrets
- Verify `OPENAI_API_KEY` is set correctly

### Error: "Failed to transcribe with Whisper"
- Check Supabase Edge Function logs:
  1. Go to Supabase Dashboard
  2. Navigate to **Edge Functions** → **voice-to-text**
  3. Check **Logs** tab for errors

### Error: "Function not found"
- The function needs to be deployed:
```bash
cd peer-care-connect
npx supabase functions deploy voice-to-text
```

## Cost Monitoring

Track your OpenAI usage:

1. Go to [OpenAI Platform](https://platform.openai.com/usage)
2. Check **Whisper** usage
3. Typical costs:
   - 5 minutes: ~$0.03
   - 30 minutes: ~$0.18
   - 1 hour: ~$0.36

## Security Note

⚠️ **Never** commit API keys to git. They should only be stored in:
- Supabase Dashboard Secrets (for Edge Functions)
- Local `.env.local` files (for frontend, if needed)
- Never in `.env` files committed to git

## Verification Complete

Once set up, the Whisper transcription feature will:
- ✅ Provide enhanced accuracy for SOAP notes
- ✅ Handle medical terminology better than browser transcription
- ✅ Cost ~$0.18 per 30-minute session
- ✅ Work seamlessly with your existing setup

