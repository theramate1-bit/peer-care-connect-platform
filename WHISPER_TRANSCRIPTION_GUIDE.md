# Whisper AI Transcription for SOAP Notes

## Overview

TheraMate now supports **Lemonfox.ai Whisper AI** for enhanced speech-to-text transcription in SOAP notes. This provides significantly better accuracy than browser-based speech recognition, especially for medical terminology, at a lower cost than OpenAI.

## Features

### Two Transcription Modes

1. **Browser Speech Recognition** (FREE, Real-time)
   - Live transcription during recording
   - No additional cost
   - Good for general speech
   - Immediate feedback

2. **Whisper AI** (~$0.085 per 30-min session via Lemonfox.ai)
   - Higher accuracy for medical terminology
   - Better handling of accents and dialects
   - Post-processing after recording
   - Professional-grade transcription
   - 53% cheaper than OpenAI Whisper

## How It Works

### User Flow

1. **Record Session**
   - Click "Start Recording" to begin audio capture
   - Browser transcription provides real-time feedback
   - Click "Stop Recording" when finished

2. **Enhanced Transcription** (Optional)
   - Click "Transcribe with Whisper AI" button
   - Audio is sent to Lemonfox.ai Whisper API via Supabase Edge Function
   - Processing takes 30-60 seconds depending on recording length
   - Whisper transcript replaces browser transcription

3. **Review & Save**
   - Whisper transcript is displayed in the transcription panel
   - Edit if needed
   - SOAP notes are automatically categorized and saved

## Implementation Details

### Edge Function: `voice-to-text`

Located at: `peer-care-connect/supabase/functions/voice-to-text/index.ts`

**Functionality:**
- Receives audio blob in base64 format
- Converts to binary audio file
- Sends to Lemonfox.ai Whisper API
- Returns transcribed text with timestamps

### Database Schema

Added field to `session_recordings` table:
- `transcription_method`: 'browser', 'whisper', or 'manual'
- Tracks which transcription method was used

### Component Updates

Modified: `peer-care-connect/src/components/session/LiveSOAPNotes.tsx`

**New State Variables:**
```typescript
- isWhisperTranscribing: boolean
- whisperTranscript: string
- audioBlob: Blob | null
```

**New Functions:**
- `transcribeWithWhisper()`: Handles Whisper API call

## Cost Analysis

### Browser Speech Recognition
- **Cost**: FREE
- **Limitations**: Lower accuracy for medical terms
- **Use Case**: Real-time feedback during recording

### Whisper AI (via Lemonfox.ai)
- **Cost**: ~$0.00283 per minute
- **30-minute session**: ~$0.085
- **60-minute session**: ~$0.17
- **Benefits**: Professional accuracy, 53% cheaper than OpenAI
- **Use Case**: Final transcription for clinical documentation

### Recommendation
- Use browser transcription for live sessions
- Use Whisper for final professional documentation
- Both methods can be used together for best UX

## API Endpoints

### POST /functions/v1/voice-to-text

**Request:**
```json
{
  "audio": "base64-encoded-audio-string"
}
```

**Response:**
```json
{
  "text": "Transcribed text here..."
}
```

## Migration

Run the following migration to add `transcription_method` field:

```bash
npx supabase db push
```

Or apply manually:
```sql
ALTER TABLE public.session_recordings 
ADD COLUMN transcription_method TEXT DEFAULT 'browser' 
CHECK (transcription_method IN ('browser', 'whisper', 'manual'));
```

## Configuration

### Environment Variables

Required in Supabase Edge Functions secrets:
```
LEMONFOX_API_KEY=wuKi2VWIsr4MaR4zULnifWwdgTwJXnzU
```

This is already configured in your Supabase Edge Functions environment.

## Troubleshooting

### Whisper Button Not Appearing
- Ensure recording has been stopped
- Check that `audioBlob` is available

### Transcription Errors
- Verify `LEMONFOX_API_KEY` is set in Supabase dashboard
- Check Edge Function logs in Supabase dashboard
- Ensure audio file is valid format (webm)

### Processing Time
- 5-minute recording: ~10-15 seconds
- 30-minute recording: ~30-45 seconds
- Longer recordings may take up to 2 minutes

## Future Enhancements

- Real-time Whisper streaming (planned)
- Custom medical terminology training
- Speaker diarization (identify multiple speakers)
- Language detection and auto-selection

## Related Files

- Edge Function: `supabase/functions/voice-to-text/index.ts`
- Component: `src/components/session/LiveSOAPNotes.tsx`
- Migration: `supabase/migrations/20250128000000_add_transcription_method.sql`
- Summarization: `supabase/functions/summarize-session/index.ts`

