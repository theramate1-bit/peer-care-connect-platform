# 📧 Email Sending Instructions

## Option 1: Run the Script (Recommended)

The script `scripts/send-missing-emails.js` is ready. To run it, you need to set the `SUPABASE_SERVICE_ROLE_KEY` environment variable:

**PowerShell:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
cd "C:\Users\rayma\Desktop\New folder\peer-care-connect"
node scripts/send-missing-emails.js
```

**Bash/CMD:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
cd peer-care-connect
node scripts/send-missing-emails.js
```

## Option 2: Manual curl Commands

You can also send emails manually using curl commands. Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key:

### 1. Client Booking Confirmation
```bash
curl -X POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "booking_confirmation_client",
    "recipientEmail": "rayman196823@gmail.com",
    "recipientName": "Ray Dhillon",
    "data": {
      "sessionId": "b25662bc-6d96-4465-b5fa-f56df10fe200",
      "sessionType": "test",
      "sessionDate": "2025-11-08",
      "sessionTime": "16:00",
      "sessionPrice": 1.00,
      "sessionDuration": 60,
      "practitionerName": "Ray",
      "bookingUrl": "https://theramate.co.uk/client/sessions",
      "messageUrl": "https://theramate.co.uk/messages"
    }
  }'
```

### 2. Practitioner Booking Confirmation
```bash
curl -X POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "booking_confirmation_practitioner",
    "recipientEmail": "theramate1@gmail.com",
    "recipientName": "Ray",
    "data": {
      "sessionId": "b25662bc-6d96-4465-b5fa-f56df10fe200",
      "sessionType": "test",
      "sessionDate": "2025-11-08",
      "sessionTime": "16:00",
      "sessionPrice": 1.00,
      "sessionDuration": 60,
      "clientName": "Ray Dhillon",
      "clientEmail": "rayman196823@gmail.com",
      "paymentStatus": "completed",
      "bookingUrl": "https://theramate.co.uk/practice/sessions/b25662bc-6d96-4465-b5fa-f56df10fe200",
      "messageUrl": "https://theramate.co.uk/messages"
    }
  }'
```

### 3. Client Payment Confirmation
```bash
curl -X POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "payment_confirmation_client",
    "recipientEmail": "rayman196823@gmail.com",
    "recipientName": "Ray Dhillon",
    "data": {
      "paymentId": "7f6ff1c3-3269-4aff-9cc0-bf26cf4843a2",
      "paymentAmount": 1.00,
      "sessionType": "test",
      "sessionDate": "2025-11-08",
      "sessionTime": "16:00",
      "receiptUrl": "https://theramate.co.uk/payments/7f6ff1c3-3269-4aff-9cc0-bf26cf4843a2"
    }
  }'
```

### 4. Practitioner Payment Notification
```bash
curl -X POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "payment_received_practitioner",
    "recipientEmail": "theramate1@gmail.com",
    "recipientName": "Ray",
    "data": {
      "paymentId": "7f6ff1c3-3269-4aff-9cc0-bf26cf4843a2",
      "totalAmount": 1.00,
      "platformFee": 0.04,
      "practitionerAmount": 0.96,
      "sessionType": "test",
      "sessionDate": "2025-11-08",
      "clientName": "Ray Dhillon",
      "payoutUrl": "https://theramate.co.uk/practice/payments"
    }
  }'
```

## What's Already Done ✅

- ✅ Session status updated to `confirmed`
- ✅ Payment record created
- ✅ Conversation created
- ✅ Notifications created
- ⚠️ Emails need to be sent (use script or curl commands above)

