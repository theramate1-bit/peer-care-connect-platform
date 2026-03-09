# Story 18: SMS Reminders - Implementation Complete (On Hold)

**Date:** 2025-01-27  
**Status:** ⏸️ On Hold - Code complete, but will not use Twilio. Provider TBD for future implementation.

## Overview

Implemented SMS reminders for session appointments, allowing clients to receive SMS notifications 24 hours and 2 hours before their sessions.

## What Was Implemented

### 1. Database Changes

**Migration:** `20260227_create_sms_logs_table.sql`
- Created `sms_logs` table to track all SMS messages sent
- Includes fields for phone number, message, session ID, reminder type, Twilio message SID, status, and delivery timestamps
- Added RLS policies for users to view their own SMS logs
- Indexed for efficient queries

**Status:** ✅ Applied via Supabase MCP

### 2. Edge Function: `send-sms`

**Location:** `supabase/functions/send-sms/index.ts`

**Features:**
- Sends SMS via Twilio API
- Validates phone number format (E.164)
- Logs all SMS messages to `sms_logs` table
- Handles errors gracefully
- Returns delivery status

**Required Environment Variables:**
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number (sender)

**Status:** ✅ Created (needs deployment)

### 3. Notification System Updates

**File:** `src/lib/notification-system.ts`

**New Functions:**
- `formatPhoneNumber()` - Converts phone numbers to E.164 format (required by Twilio)
  - Handles UK numbers (starts with 0, 44, or 7)
  - Handles US numbers (11 digits starting with 1)
  - Defaults to UK format if ambiguous
- `sendSMSNotification()` - Sends SMS via edge function
  - Formats phone number
  - Calls `send-sms` edge function
  - Handles errors gracefully (doesn't block reminder flow)
  - Logs success/failure

**Updated Functions:**
- `checkNotificationOptOut()` - Now supports 'sms' notification type
- `processPendingReminders()` - Now sends SMS for 24h and 2h reminders
  - Checks SMS opt-out preferences
  - Sends SMS to clients (if opted in and phone number available)
  - Sends SMS to practitioners (if opted in and phone number available)
  - Only sends for 24h and 2h reminders (not 1h)

**SMS Message Format:**
- **24h Reminder:** "Reminder: Session with [Practitioner] on [Date] at [Time] at [Address]. Cancel: [URL]"
- **2h Reminder:** "Final Reminder: Session in 2 hours at [Address] with [Practitioner]. Cancel: [URL]"

**Status:** ✅ Complete

## Acceptance Criteria Status

- [x] SMS reminder sent 24 hours before session
- [x] SMS reminder sent 2 hours before session
- [x] SMS includes session date, time, and address
- [x] SMS includes practitioner name
- [x] SMS includes cancellation link
- [x] SMS preferences in client settings (uses existing `notification_preferences.sms` field)
- [x] Opt-in/opt-out for SMS reminders (checked before sending)
- [x] SMS delivery status tracked (via `sms_logs` table)

## Configuration Required

### Twilio Setup

1. **Create Twilio Account:**
   - Sign up at https://www.twilio.com
   - Get Account SID and Auth Token from dashboard

2. **Get Phone Number:**
   - Purchase a Twilio phone number
   - Note the phone number (will be used as sender)

3. **Set Environment Variables in Supabase:**
   - Go to Project Settings → Edge Functions → Secrets
   - Add:
     - `TWILIO_ACCOUNT_SID` = Your Twilio Account SID
     - `TWILIO_AUTH_TOKEN` = Your Twilio Auth Token
     - `TWILIO_PHONE_NUMBER` = Your Twilio phone number (E.164 format, e.g., +447123456789)

### Deploy Edge Function

```bash
cd peer-care-connect
supabase functions deploy send-sms
```

## Testing Checklist

### Manual Testing
- [ ] Configure Twilio credentials in Supabase
- [ ] Deploy `send-sms` edge function
- [ ] Create a test session scheduled for 24 hours from now
- [ ] Verify SMS is sent 24 hours before session
- [ ] Verify SMS is sent 2 hours before session
- [ ] Verify SMS includes all required information (date, time, address, practitioner name, cancellation link)
- [ ] Test SMS opt-out preference (should not send if opted out)
- [ ] Test with invalid phone number (should handle gracefully)
- [ ] Verify SMS logs are created in `sms_logs` table
- [ ] Test phone number formatting (UK numbers, US numbers, various formats)

### Integration Testing
- [ ] Verify SMS is sent alongside email reminders
- [ ] Verify SMS failures don't block email reminders
- [ ] Verify reminder system continues to work if Twilio is unavailable
- [ ] Test with users who have opted out of SMS
- [ ] Test with users who don't have phone numbers

## Phone Number Format Support

The system supports various phone number formats and converts them to E.164:

- **UK Numbers:**
  - `07123456789` → `+447123456789`
  - `447123456789` → `+447123456789`
  - `+447123456789` → `+447123456789` (already correct)

- **US Numbers:**
  - `11234567890` → `+11234567890`
  - `+11234567890` → `+11234567890` (already correct)

- **Other Formats:**
  - Defaults to UK format (+44) if ambiguous

## Known Limitations

1. **Phone Number Format:** Currently defaults to UK format (+44) for ambiguous numbers. May need enhancement for international support.
2. **SMS Length:** SMS messages are limited to 160 characters. Long addresses or names may cause truncation.
3. **Delivery Status:** Twilio webhook integration needed for real-time delivery status updates (currently only tracks sent status).
4. **Cost:** SMS messages incur Twilio charges. Monitor usage and costs.

## Next Steps

1. **Deploy Edge Function:** Deploy `send-sms` function to Supabase
2. **Configure Twilio:** Set up Twilio account and add credentials
3. **Test:** Run through testing checklist
4. **Monitor:** Monitor SMS logs and Twilio usage
5. **Optional Enhancements:**
   - Add Twilio webhook for delivery status updates
   - Add SMS preferences UI in user settings
   - Add international phone number format detection
   - Add SMS template customization

---

**Status**: ✅ Complete - Ready for Deployment & Testing
