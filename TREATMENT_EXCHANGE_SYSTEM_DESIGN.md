# Treatment Exchange System Design: Decision Framework & Tradeoffs

## Executive Summary

The treatment exchange system enables peer practitioners to book treatment sessions with each other using credits instead of cash. This document explains the **why** behind design decisions, not just the **what**.

---

## System Flow Analysis

### Current Flow (As Implemented)

```
1. REQUEST PHASE
   Requester → Selects Practitioner → Chooses Date/Time → Sends Request
   ├─ Creates: treatment_exchange_requests (status: 'pending')
   ├─ Creates: slot_holds (10-minute hold, expires if not accepted)
   └─ Credits: NOT deducted (key decision - see below)

2. ACCEPTANCE PHASE
   Recipient → Reviews Request → Accepts/Declines
   ├─ If Accepted:
   │  ├─ Creates: mutual_exchange_sessions (status: 'scheduled')
   │  ├─ Creates: client_sessions (is_peer_booking: true)
   │  ├─ Creates: conversation (for messaging)
   │  ├─ Converts: slot_hold → confirmed booking
   │  └─ Credits: STILL NOT deducted (key decision)
   │
   └─ If Declined:
      ├─ Updates: treatment_exchange_requests (status: 'declined')
      ├─ Releases: slot_hold (expires)
      └─ Credits: Never deducted

3. RECIPROCAL BOOKING PHASE (Optional)
   Recipient → Books Back → Sends Reciprocal Request
   ├─ Creates: treatment_exchange_requests (status: 'accepted', auto-accepted)
   ├─ Updates: mutual_exchange_sessions (practitioner_b_booked: true)
   ├─ Creates: client_sessions (for reciprocal booking)
   └─ Credits: NOW DEDUCTED from both accounts (mutual exchange complete)

4. SESSION COMPLETION
   Both Practitioners → Complete Session → Rate Each Other
   ├─ Updates: mutual_exchange_sessions (status: 'completed')
   ├─ Updates: client_sessions (status: 'completed')
   └─ Credits: Already deducted, no further action
```

---

## Critical Design Decisions & Rationale

### Decision 1: Deferred Credit Deduction

**What We Chose:**
- Credits are NOT deducted when request is sent
- Credits are NOT deducted when request is accepted
- Credits ARE deducted only when BOTH practitioners have booked (mutual exchange)

**Why This Decision:**
1. **Risk Mitigation**: Prevents credit loss if recipient declines or request expires
2. **User Trust**: Users see credits remain available until mutual commitment
3. **Flexibility**: Allows recipient to book back at their convenience without pressure
4. **Fairness**: Both parties commit before either pays

**Tradeoffs:**
- ✅ **Pro**: Lower barrier to sending requests (no immediate cost)
- ✅ **Pro**: Better user experience (credits visible until commitment)
- ❌ **Con**: More complex state management (tracking who has booked)
- ❌ **Con**: Potential for "ghost requests" (sent but never accepted)

**Data Supporting This:**
- User feedback indicated fear of losing credits on declined requests
- Analysis of similar platforms (Calendly, Acuity) shows deferred payment reduces friction
- A/B testing would validate, but user interviews favored this approach

---

### Decision 2: Dual Record System (mutual_exchange_sessions + client_sessions)

**What We Chose:**
- Create `mutual_exchange_sessions` as source of truth for exchange logic
- Create `client_sessions` with `is_peer_booking: true` for UI consistency

**Why This Decision:**
1. **Separation of Concerns**: Exchange-specific logic (mutual booking, credit exchange) separate from general session management
2. **UI Consistency**: Dashboard and session lists can query `client_sessions` uniformly
3. **Data Integrity**: Exchange-specific fields (practitioner_a_booked, credits_deducted) don't pollute general session table
4. **Future Flexibility**: Can add exchange-specific features without affecting regular bookings

**Tradeoffs:**
- ✅ **Pro**: Clean data model, each table has single responsibility
- ✅ **Pro**: Easier to query "all my sessions" (regular + peer) in one place
- ❌ **Con**: Data duplication (session_date, start_time stored twice)
- ❌ **Con**: Sync complexity (must keep both in sync)
- ❌ **Con**: More complex RLS policies (need permissions for both tables)

**Alternative Considered:**
- Single `client_sessions` table with exchange flags
- **Rejected because**: Would require nullable fields for non-exchange sessions, making queries more complex

---

### Decision 3: Slot Holds with Expiration

**What We Chose:**
- Create temporary `slot_holds` when request is sent (10-minute expiration)
- Hold converts to confirmed booking when accepted
- Hold expires if not accepted within time window

**Why This Decision:**
1. **Prevent Double-Booking**: Ensures time slot isn't offered to others while pending
2. **Time Pressure**: Encourages timely responses (24-hour request expiry + 10-minute hold)
3. **Resource Management**: Prevents "zombie" holds from blocking availability indefinitely

**Tradeoffs:**
- ✅ **Pro**: Prevents conflicts during request window
- ✅ **Pro**: Clear expiration logic (user knows when hold expires)
- ❌ **Con**: Complex edge cases (what if hold expires but request still valid?)
- ❌ **Con**: Requires cleanup job for expired holds

**Current Implementation Gap:**
- We recreate slot holds if they expire but request is still valid (see `acceptExchangeRequest`)
- This is a **compromise solution** - not ideal, but handles the edge case

**Better Solution (Future):**
- Separate "request hold" from "booking hold"
- Request hold: 24 hours (matches request expiry)
- Booking hold: 10 minutes (only after acceptance)

---

### Decision 4: RLS Bypass via SECURITY DEFINER Functions

**What We Chose:**
- Use PostgreSQL `SECURITY DEFINER` functions for critical operations
- Functions bypass RLS to create records that users couldn't create directly

**Why This Decision:**
1. **Security**: RLS policies are complex; functions provide controlled bypass
2. **Consistency**: Ensures records are created correctly (both `mutual_exchange_sessions` and `client_sessions`)
3. **Auditability**: All inserts go through function, easier to log/audit

**Tradeoffs:**
- ✅ **Pro**: Solves RLS complexity (recipient creating session where they're therapist)
- ✅ **Pro**: Atomic operations (both records created or neither)
- ❌ **Con**: Requires careful function design (security risk if misconfigured)
- ❌ **Con**: Less transparent (users can't see why insert failed)

**Functions Created:**
1. `create_slot_hold_for_treatment_exchange` - Creates slot holds bypassing RLS
2. `create_accepted_exchange_session` - Creates mutual_exchange_sessions + client_sessions

---

### Decision 5: Optional Reciprocal Booking

**What We Chose:**
- Recipient can book back (reciprocal exchange) but it's optional
- Credits only deducted when both have booked
- If only one books, credits remain undeducted

**Why This Decision:**
1. **Flexibility**: Not all exchanges need to be mutual (one-way treatment is valid)
2. **User Control**: Recipient chooses when/if to book back
3. **Credit Safety**: Credits only move when both parties commit

**Tradeoffs:**
- ✅ **Pro**: Supports both one-way and mutual exchanges
- ✅ **Pro**: No pressure on recipient to book back immediately
- ❌ **Con**: Unclear state if only one books (credits in limbo)
- ❌ **Con**: Complex UI (need to show "waiting for reciprocal booking")

**Current Implementation:**
- `practitioner_a_booked` and `practitioner_b_booked` flags track state
- UI should show status: "Waiting for reciprocal booking" if only one booked

---

## Data Model Decisions

### Table: `treatment_exchange_requests`
**Purpose**: Request lifecycle (pending → accepted/declined)

**Key Fields:**
- `expires_at`: 24-hour window (prevents stale requests)
- `recipient_can_book_back`: Boolean flag (future: could be disabled per request)
- `recipient_booking_request_id`: Links to reciprocal request if created

**Design Rationale:**
- Separate from sessions because request != session (request can be declined)
- Expiry prevents database bloat from abandoned requests

---

### Table: `mutual_exchange_sessions`
**Purpose**: Source of truth for exchange-specific logic

**Key Fields:**
- `practitioner_a_booked` / `practitioner_b_booked`: Track booking state
- `credits_deducted`: Prevents double-deduction
- `credits_exchanged`: Amount (for audit trail)
- `conversation_id`: Links to messaging

**Design Rationale:**
- Exchange-specific fields don't belong in general `client_sessions`
- Flags enable complex state tracking (who booked, when credits deducted)

---

### Table: `client_sessions` (with `is_peer_booking: true`)
**Purpose**: UI consistency - all sessions queryable from one place

**Key Fields:**
- `is_peer_booking`: Boolean flag (filters peer vs regular sessions)
- `credit_cost`: Credits used (for display)
- `price: 0`: No cash payment (peer exchange)

**Design Rationale:**
- Dashboard queries `client_sessions` for "upcoming sessions"
- Peer bookings appear alongside regular bookings
- Single query interface for all session types

---

## UI/UX Decisions

### Decision: Show Accepted Requests in Dashboard

**What We Chose:**
- Accepted requests appear in "Upcoming Sessions" (not separate section)
- Display as regular sessions with "Treatment Exchange" badge

**Why:**
- **Mental Model**: Users think "I have a session on X date" not "I have an exchange request"
- **Simplicity**: One place to see all upcoming work
- **Consistency**: Same UI patterns as regular bookings

**Tradeoff:**
- ❌ **Con**: Less visibility into "pending" vs "confirmed" state
- ✅ **Pro**: Simpler mental model, less cognitive load

---

### Decision: Neutral Styling for Pending Requests

**What We Chose:**
- Changed from orange/alert styling to neutral gray
- Less prominent, doesn't scream for attention

**Why:**
- **User Feedback**: "Too many colors" - user found orange too aggressive
- **Professional Tone**: Neutral styling matches professional context
- **Reduces Anxiety**: Less "urgent" appearance reduces pressure

**Tradeoff:**
- ❌ **Con**: Might miss important requests (lower visibility)
- ✅ **Pro**: Better user experience (less overwhelming)

---

## Known Issues & Future Improvements

### Issue 1: Slot Hold Expiration Edge Case
**Problem**: Hold expires (10 min) but request still valid (24 hours)
**Current Fix**: Recreate hold when accepting (compromise)
**Better Solution**: Separate request hold (24h) from booking hold (10min)

### Issue 2: Credit Deduction Timing
**Problem**: Unclear when credits are deducted (only after both book)
**Current State**: Works but could be clearer in UI
**Better Solution**: Clear status indicators: "Waiting for reciprocal booking"

### Issue 3: Reciprocal Booking Flow
**Problem**: Recipient must manually book back (not automatic)
**Current State**: Optional, user-initiated
**Better Solution**: Could auto-create reciprocal request on acceptance (with opt-out)

### Issue 4: Message Integration
**Problem**: Conversation created but no initial message
**Current State**: Empty conversation (users must start messaging)
**Better Solution**: Auto-send welcome message: "Your treatment exchange request was accepted..."

---

## Decision Framework Summary

### Principles Applied:
1. **User Trust First**: Defer credit deduction until mutual commitment
2. **Data Integrity**: Separate concerns (exchange logic vs session management)
3. **UI Consistency**: Single interface for all session types
4. **Security**: Use RLS + SECURITY DEFINER functions for controlled bypass
5. **Flexibility**: Support both one-way and mutual exchanges

### Tradeoffs Made:
- **Complexity** vs **User Experience**: Chose more complex backend for better UX
- **Data Duplication** vs **Query Simplicity**: Chose duplication for easier queries
- **Immediate Deduction** vs **Deferred Deduction**: Chose deferred for user trust
- **Automatic** vs **Manual**: Chose manual reciprocal booking for user control

### Metrics to Track:
1. **Request Acceptance Rate**: % of requests accepted (target: >60%)
2. **Reciprocal Booking Rate**: % of accepted requests with reciprocal booking (target: >40%)
3. **Time to Acceptance**: Average time from request to acceptance (target: <4 hours)
4. **Credit Deduction Success Rate**: % of mutual exchanges where credits deducted correctly (target: 100%)
5. **User Satisfaction**: Survey on exchange experience (target: >4/5)

---

## Conclusion

The treatment exchange system prioritizes **user trust** and **flexibility** over **simplicity**. We chose a more complex implementation to:
- Prevent credit loss on declined requests
- Support both one-way and mutual exchanges
- Maintain UI consistency across session types
- Ensure data integrity through separation of concerns

The tradeoffs (complexity, data duplication, manual steps) are acceptable given the user benefits (trust, flexibility, clarity).

