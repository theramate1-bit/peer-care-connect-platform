# Practitioner Email Guide

**Last Updated:** January 2025

This guide documents all emails that practitioners receive in Theramate, when they're sent, and what actions practitioners can take.

---

## Overview

Practitioners receive emails for:
- New bookings and payments
- Session reminders
- Cancellations and rescheduling
- Peer treatment exchanges
- Review notifications (in-app only, no email currently)

---

## 1. Booking-Related Emails

### 1.1 Booking Confirmation Email
**Email Type:** `booking_confirmation_practitioner`

**When You Receive It:**
- Immediately after a client completes booking and payment
- Triggered by Stripe webhook or BookingSuccess page (fallback)

**What It Contains:**
- Client name and contact information
- Session details (type, date, time, duration)
- Session price and payment status
- Links to view session details and message client

**What You Can Do:**
- View session details: Click "View Session" button → `/practice/sessions/{sessionId}`
- Message client: Click "Message Client" button → `/messages`
- Check your calendar: Session should appear in your dashboard

**Frequency:** One email per booking

---

### 1.2 Payment Received Email
**Email Type:** `payment_received_practitioner`

**When You Receive It:**
- Immediately after payment is processed successfully
- Sent at the same time as booking confirmation

**What It Contains:**
- Total payment amount
- Platform fee breakdown
- Your earnings amount (after platform fee)
- Payment date
- Session details

**What You Can Do:**
- Review payment breakdown
- Track earnings in your dashboard
- View payout schedule (if using Stripe Connect)

**Frequency:** One email per successful payment

**Note:** Funds are automatically transferred to your Stripe Connect account (minus platform fee).

---

## 2. Session Reminder Emails

### 2.1 24-Hour Reminder
**Email Type:** `session_reminder_24h`

**When You Receive It:**
- 24 hours before session start time
- Scheduled automatically when booking is confirmed

**What It Contains:**
- Upcoming session details
- Client information
- Preparation reminders
- Links to session details and messaging

**What You Can Do:**
- Prepare for the session
- Message client if needed
- View session details
- Get directions to location (if applicable)

**Frequency:** One email per session, 24 hours before

---

### 2.2 1-Hour Reminder
**Email Type:** `session_reminder_1h`

**When You Receive It:**
- 1 hour before session start time
- Scheduled automatically when booking is confirmed

**What It Contains:**
- Last-minute session details
- Urgent reminders
- Quick access links

**What You Can Do:**
- Final preparation check
- Quick message to client if running late
- Access session details quickly

**Frequency:** One email per session, 1 hour before

**Note:** Both client and practitioner receive reminder emails to ensure everyone is prepared.

---

## 3. Cancellation & Rescheduling Emails

### 3.1 Client Cancellation Email
**Email Type:** `cancellation`

**When You Receive It:**
- Immediately when client cancels a session
- Triggered by client cancellation action

**What It Contains:**
- Cancelled session details
- Cancellation reason (if provided)
- Refund information (if applicable)
- Original session date/time

**What You Can Do:**
- View cancellation details
- Message client if needed
- Accept the cancellation
- Check your calendar for availability

**Frequency:** One email per cancellation

**Note:** If client cancels within cancellation policy timeframe, refund may be processed automatically.

---

### 3.2 Rescheduling Email
**Email Type:** `rescheduling`

**When You Receive It:**
- Immediately when session is rescheduled
- Sent to both you and the client

**What It Contains:**
- Original session date/time
- New session date/time
- Rescheduling reason (if provided)
- Calendar links for new time

**What You Can Do:**
- Review new session time
- Add to calendar
- Confirm the reschedule
- Message client if needed

**Frequency:** One email per reschedule

---

## 4. Peer Treatment Exchange Emails

### 4.1 Peer Request Received
**Email Type:** `peer_request_received`

**When You Receive It:**
- Immediately when another practitioner sends you a peer treatment request
- Triggered when peer treatment request is created

**What It Contains:**
- Requesting practitioner's name
- Requested session details (type, date, time)
- Request expiration date
- Accept/decline links

**What You Can Do:**
- Accept the request: Credits will be earned
- Decline the request: No credits deducted
- View request details in dashboard
- Message the requesting practitioner

**Frequency:** One email per peer request received

**Note:** Credits are only deducted/earned if you accept the request.

---

### 4.2 Peer Booking Confirmed (Providing Treatment)
**Email Type:** `peer_booking_confirmed_practitioner`

**When You Receive It:**
- Immediately after peer treatment request is accepted
- Sent when you're providing treatment to another practitioner

**What It Contains:**
- Confirmed session details
- Credits earned amount
- Client (practitioner) information
- Session date/time

**What You Can Do:**
- View session details
- Prepare for the session
- Track credits earned in dashboard

**Frequency:** One email per accepted peer booking

---

### 4.3 Credits Earned Email
**Email Type:** `peer_credits_earned`

**When You Receive It:**
- Immediately after peer booking is confirmed
- Sent when you're providing treatment (earning credits)

**What It Contains:**
- Credits earned amount
- Session details
- Current credit balance (if available)

**What You Can Do:**
- Track your credits
- Use credits for future peer treatments
- View credit history in dashboard

**Frequency:** One email per peer booking where you earn credits

---

### 4.4 Peer Booking Cancelled (Refunded)
**Email Type:** `peer_booking_cancelled_refunded`

**When You Receive It:**
- Immediately when peer booking is cancelled
- Sent to both practitioners involved

**What It Contains:**
- Cancelled session details
- Cancellation reason
- Credit refund information (if applicable)

**What You Can Do:**
- Review cancellation details
- Check credit balance updates
- Reschedule if needed

**Frequency:** One email per cancelled peer booking

**Note:** If you were providing treatment, you lose the credits you would have earned. If you were receiving treatment, you get credits refunded.

---

## 5. Review Notifications

### 5.1 Review Received (In-App Only)
**Status:** ⚠️ Currently NO email notification

**When It Happens:**
- Client leaves a review after completing a session
- Review is submitted via review form

**Current Implementation:**
- ✅ In-app notification received
- ❌ Email notification NOT sent

**What You Can Do:**
- View review in dashboard
- Respond to review (if platform supports)
- See review on your profile

**Recommendation:** Consider adding email notification for new reviews to improve practitioner engagement.

---

## 6. Email Frequency Summary

### Immediate Emails (Sent Right Away)
- Booking confirmation
- Payment received
- Client cancellation
- Rescheduling
- Peer request received
- Peer booking confirmed
- Peer credits earned/refunded

### Scheduled Emails (Sent at Specific Times)
- 24-hour session reminder (24h before session)
- 1-hour session reminder (1h before session)

### Not Currently Sent via Email
- Review received (in-app notification only)

---

## 7. Email Settings & Preferences

### Current Status
- ❌ No email unsubscribe functionality
- ❌ No email digest options
- ❌ No email preference settings

### Recommendations
- Add email preference center
- Allow practitioners to opt-out of non-critical emails
- Add daily/weekly digest option
- Allow customization of reminder preferences

---

## 8. Troubleshooting

### I'm Not Receiving Emails
1. Check spam/junk folder
2. Verify email address in profile
3. Check email logs in dashboard (if available)
4. Contact support@theramate.co.uk

### Email Contains Wrong Information
1. Check session details in dashboard
2. Verify session status and dates
3. Contact support if issue persists

### I Want to Disable Emails
- Currently not possible - all emails are sent automatically
- Consider adding email preferences (feature request)

---

## 9. Email Links & Actions

### Common Email Actions
- **View Session:** `/practice/sessions/{sessionId}`
- **Message Client:** `/messages?conversation={conversationId}`
- **View Dashboard:** `/dashboard`
- **Calendar:** `/practice/sessions` (calendar view)
- **Credits:** `/credits` (peer treatment)

### Email Buttons
Most emails include action buttons:
- "View Session" - Opens session details
- "Message Client" - Opens messaging interface
- "Add to Calendar" - Downloads .ics file
- "Accept Request" / "Decline Request" - For peer requests

---

## 10. Best Practices

### Managing Email Volume
- Use email filters/rules to organize emails
- Check dashboard regularly for updates
- Enable notifications in app for critical updates

### Responding to Emails
- Respond to cancellations promptly
- Confirm reschedules quickly
- Review peer requests within expiration time

### Email Security
- Never share session links publicly
- Verify email sender (noreply@theramate.co.uk)
- Report suspicious emails to support

---

## Summary

**Total Practitioner Email Types:** 11

**Booking & Payment:** 2 emails  
**Session Reminders:** 2 emails  
**Cancellations & Rescheduling:** 2 emails  
**Peer Treatment:** 5 emails  
**Reviews:** 0 emails (in-app only)

**Most Common Emails:**
1. Booking confirmation (every new booking)
2. Payment received (every payment)
3. Session reminders (every session)

**Action Required Emails:**
- Peer request received (requires accept/decline)
- Client cancellation (requires acknowledgment)

