# Email & Booking Location Logic – Engineering Gaps

These gaps relate to **email location data, booking location logic, and UI consistency** between clinic vs mobile appointments.

The goal is to ensure the system always follows **"booking record first"**:

1. `session.visit_address`
2. `session.appointment_type`
3. practitioner `clinic_address` / `location`

---

# Priority Fixes

## 1. Mobile Sessions Without Visit Address Fall Back to Clinic

**Location**
`supabase/functions/_shared/booking-email-data.ts`
Function: `getBookingEmailLocationData`

### Current Behaviour

If:

```
appointment_type = 'mobile'
visit_address = null
```

The helper falls back to **clinic logic**, showing the practitioner clinic address and directions.

### Problem

A mobile booking **without a stored visit address** incorrectly appears as **clinic-based** in:

- booking confirmation emails
- booking views
- reminder emails (future)

### Impact

Confusing for clients. Directions may be wrong.

### Recommended Fix

Preferred behaviour:

```
if (appointment_type === 'mobile' && !visit_address)
```

Return:

```
sessionLocation: "Visit address to be confirmed"
directionsUrl: null
```

Instead of falling back to clinic.

### Severity

Low–Medium

---

## 2. Booking RPC Cannot Set Mobile Sessions

**Location**

RPC:

```
create_booking_with_validation
```

Migration:

```
20260309_set_appointment_type_mobile_and_booking.sql
```

### Current Behaviour

The RPC **does not accept parameters for:**

```
appointment_type
visit_address
```

Therefore all bookings created through it default to:

```
appointment_type = 'clinic'
visit_address = null
```

### Problem

Future hybrid bookings cannot be created through this RPC.

Mobile bookings **must go through**:

```
create_session_from_mobile_request
```

### Options

#### Option A (Simple – Recommended)

Document:

> Standard bookings are clinic-based only.
> Mobile bookings must use `create_session_from_mobile_request`.

#### Option B (Future-proof)

Add parameters:

```
p_appointment_type text
p_visit_address text
```

Update RPC insert.

**Current decision (Option A):** Standard bookings via this RPC are clinic-based only; mobile bookings must use `create_session_from_mobile_request`.

### Severity

Low (future architecture risk)

---

## 3. Practitioner Dashboard Lists Use Profile Location

**Location**

Examples:

```
src/pages/Credits.tsx
```

Session display currently uses:

```
session.client.location
session.practitioner.location
```

### Problem

This ignores booking record data.

For mobile sessions the UI may show:

```
Practitioner Location
```

Instead of:

```
Visit at Client Address
```

### Correct Behaviour

Session lists should follow:

```
visit_address
↓
appointment_type
↓
clinic_address
```

### Fix

Update queries to include:

```
appointment_type
visit_address
practitioner.clinic_address
```

Then compute display location.

### Severity

Medium

---

## 4. Booking Calendar Modal Never Shows Location

**Location**

```
src/components/BookingCalendar.tsx
```

### Current Behaviour

Calendar events map to:

```
BookingEvent
```

But `location` is **never set**, even though session query uses `*`.

Modal only shows location if:

```
selectedBookingForModal.location
```

### Result

Calendar modal **never displays session location**.

### Recommended Fix

When mapping sessions:

```
const location =
  session.visit_address ??
  (session.appointment_type === 'mobile'
    ? "Client Visit"
    : practitioner.clinic_address ?? practitioner.location)
```

Add to event object.

### Severity

Low

---

## 5. Reminder Emails Must Use Same Location Logic

**Location**

Templates exist:

```
session_reminder_24h
session_reminder_1h
```

But **no triggers exist yet**.

### Risk

If reminders are added later and do not use the helper:

Location logic could diverge from confirmations.

### Required Implementation

Reminder triggers must call:

```
getBookingEmailLocationData()
```

To ensure consistency.

### Severity

Future Risk

---

## 6. Guest Booking Side Effect Uses Practitioner Location

**Location**

```
src/components/marketplace/GuestBookingFlow.tsx
```

Example payload:

```
sessionLocation: practitioner?.location
```

### Problem

This ignores:

```
appointment_type
visit_address
```

### Impact

Only affects:

- analytics
- logging
- potential integrations

### Recommended Fix (optional)

Build location using:

```
createdSession.visit_address
createdSession.appointment_type
practitioner.clinic_address
```

### Severity

Low

---

# Engineering Priority Summary

| Priority | Issue                                              | Fix                                  |
| -------- | -------------------------------------------------- | ------------------------------------ |
| **P1**   | Dashboard lists using profile location             | Use booking record first             |
| **P2**   | Mobile sessions fallback to clinic in email helper | Show "visit address to be confirmed" |
| **P3**   | Calendar modal missing location                    | Map location in event object         |
| **P4**   | Booking RPC mobile limitations                     | Document or extend RPC               |
| **P5**   | Reminder emails location consistency               | Reuse helper                         |
| **P6**   | GuestBookingFlow analytics location                | Optional improvement                 |

---

# Architectural Rule (Important)

The platform should **always determine session location in this order**:

```
1. session.visit_address
2. session.appointment_type
3. practitioner.clinic_address
4. practitioner.location
```

This prevents:

- wrong email directions
- incorrect dashboard locations
- hybrid session confusion.

---

See also: [EMAIL_AND_BOOKING_LOCATION_GAPS.md](EMAIL_AND_BOOKING_LOCATION_GAPS.md) (original gap analysis).
