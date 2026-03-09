# Implementation Plan - User Stories One by One
**Date:** 2025-01-27  
**Method:** Systematic Implementation with Supabase MCP & Edge Functions

---

## Implementation Strategy

We'll go through each user story systematically:
1. **Analyze** current state via Supabase MCP
2. **Plan** database changes, edge functions, and frontend updates
3. **Implement** using Supabase MCP migrations and edge functions
4. **Test** via Supabase MCP verification
5. **Document** changes

---

## Story 16: Fix Service Editing Edge Function Error

### Current State Analysis
- ✅ `practitioner_services` table exists (direct DB updates, no edge function)
- ✅ `practitioner_products` table exists (uses `stripe-payment` edge function)
- ⚠️ Error occurs when editing products (not services)
- Edge function: `stripe-payment` with action `update-product`

### Implementation Steps

#### Step 1: Check Edge Function Code
- [ ] Read `stripe-payment` edge function
- [ ] Identify error in `handleUpdateProduct`
- [ ] Check RLS policies
- [ ] Verify database schema matches function expectations

#### Step 2: Fix Edge Function
- [ ] Fix error handling
- [ ] Ensure proper Stripe API calls
- [ ] Add validation
- [ ] Test via Supabase MCP

#### Step 3: Update Frontend
- [ ] Improve error messages
- [ ] Add loading states
- [ ] Handle edge function errors gracefully

---

## Story 19: Improve Confirmation Email

### Implementation Steps

#### Step 1: Database Check
- [ ] Check `client_sessions` table for address field
- [ ] Verify email templates exist
- [ ] Check email sending edge function

#### Step 2: Update Email Template
- [ ] Add session address to email
- [ ] Fix button styling (readable text)
- [ ] Add account creation flow
- [ ] Test email sending

#### Step 3: Account Creation Flow
- [ ] If no account: show "Create Account" button
- [ ] If account created: link session to account
- [ ] Update session visibility logic

---

## Story 7: Session Attendance Tracking

### Implementation Steps

#### Step 1: Database Schema
- [ ] Add `client_attended` boolean to `client_sessions`
- [ ] Default to `true`
- [ ] Add migration

#### Step 2: UI Updates
- [ ] Add checkboxes in session details
- [ ] Update diary view
- [ ] Add attendance status display

#### Step 3: Backend Logic
- [ ] Update session update function
- [ ] Add RLS policies
- [ ] Test updates

---

## Story 8: Treatment Notes Navigation

### Implementation Steps

#### Step 1: Check Current Navigation
- [ ] Find treatment notes components
- [ ] Identify navigation issues
- [ ] Check note editing rules

#### Step 2: Fix Navigation
- [ ] Add clear navigation paths
- [ ] Fix routing
- [ ] Add breadcrumbs

#### Step 3: Standardize Editing
- [ ] Implement note status (draft/finalized)
- [ ] Prevent re-editing finalized notes
- [ ] Add approval workflow if needed

---

## Story 17: Mobile Service Request Flow

### Implementation Steps

#### Step 1: Database Changes
- [ ] Add `booking_request` table or extend `client_sessions`
- [ ] Add request status field
- [ ] Add request/response fields

#### Step 2: Edge Function
- [ ] Create `handle-booking-request` edge function
- [ ] Handle accept/decline/suggest alternative
- [ ] Process payment on acceptance

#### Step 3: Frontend
- [ ] Change "Book" to "Request" for mobile services
- [ ] Add request form
- [ ] Add practitioner response UI
- [ ] Add client response UI

---

## Story 13: Rating-Based Booking Restrictions

### Implementation Steps

#### Step 1: Database Check
- [ ] Check user ratings system
- [ ] Verify rating calculation
- [ ] Check real-time state management

#### Step 2: Backend Logic
- [ ] Create function to check rating compatibility
- [ ] Add booking restriction logic
- [ ] Update marketplace queries

#### Step 3: Frontend
- [ ] Disable booking button if ratings don't match
- [ ] Show clear message
- [ ] Display rating requirements

---

## Story 10: Refund Policy

### Implementation Steps

#### Step 1: Database
- [ ] Add refund tracking table
- [ ] Add cancellation timing fields
- [ ] Add refund amount calculation

#### Step 2: Edge Function
- [ ] Create `process-refund` edge function
- [ ] Calculate refund based on timing
- [ ] Process Stripe refunds
- [ ] Update session status

#### Step 3: Frontend
- [ ] Display refund policy
- [ ] Show refund amount on cancellation
- [ ] Update cancellation flow

---

## Story 12: Email Notifications for Practitioners

### Implementation Steps

#### Step 1: Check Email System
- [ ] Verify `send-email` edge function
- [ ] Check email templates
- [ ] Verify email service configuration

#### Step 2: Add Email Notifications
- [ ] New message emails
- [ ] Booking request emails
- [ ] Cancellation emails
- [ ] Treatment exchange emails

#### Step 3: Preferences
- [ ] Add email preferences table
- [ ] Add settings UI
- [ ] Implement opt-in/opt-out

---

## Story 18: SMS Reminders

### Implementation Steps

#### Step 1: SMS Service Setup
- [ ] Choose SMS provider (Twilio/AWS SNS)
- [ ] Set up edge function for SMS
- [ ] Configure API keys

#### Step 2: Reminder Logic
- [ ] Create `send-sms-reminder` edge function
- [ ] Schedule reminders (24h, 2h before)
- [ ] Add SMS content

#### Step 3: Frontend
- [ ] Add SMS preferences
- [ ] Add opt-in/opt-out
- [ ] Show SMS status

---

## Next Steps

1. Start with Story 16 (Service Editing) - highest priority
2. Then Story 19 (Confirmation Email) - high impact
3. Continue with remaining stories in priority order

**Ready to begin implementation!**
