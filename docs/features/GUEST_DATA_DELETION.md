# Guest Data Deletion Procedure (GDPR Right to Erasure)

**Date:** March 2025  
**Status:** Documented  
**Reference:** UK GDPR Article 17, DPA 2018  
**Related:** [Data_Retention_Schedule.md](../compliance/Data_Retention_Schedule.md), [DSAR_Step_by_Step_Guide.md](../compliance/DSAR_Step_by_Step_Guide.md)

---

## Overview

When a **guest** (a user who has booked without registering a full account) requests deletion of their personal data under GDPR Article 17, this procedure describes how to locate and delete or anonymize their data across the platform.

Guests have a `users` row with `user_role = 'guest'` and may have associated sessions, mobile requests, forms, notes, and messages. They are identified primarily by **email**.

---

## 1. Legal Considerations

### 1.1 Exceptions to Deletion

Deletion may be **refused or deferred** when:

- **Legal retention required** – Healthcare records (treatment notes, session data) must be retained per UK healthcare regulations (typically 7–10 years). See [Data_Retention_Schedule.md](../compliance/Data_Retention_Schedule.md).
- **Tax/accounting** – Financial records (Stripe payments, transactions) retained per HMRC (7 years).
- **Legal hold** – Active litigation or investigation.
- **Legitimate interest** – e.g. ongoing dispute resolution, complaint handling.

**Action:** If an exception applies, respond to the user explaining why data cannot be deleted and the retention period. Document in DSAR/log.

### 1.2 What Can Be Deleted vs Anonymized

| Data Type | Action | Rationale |
|-----------|--------|-----------|
| `users` (guest profile) | Delete or anonymize | Direct identifier |
| `client_sessions.client_name`, `client_email` | Anonymize | Legal retention for session records |
| `mobile_booking_requests` (client_address, client_notes) | Anonymize/redact | Legal retention for financial records |
| `pre_assessment_forms` (client_email, client_name) | Anonymize or delete | Clinical screening; retention may apply |
| `treatment_notes` | Retain, anonymize identifiers | Healthcare records; 7+ year retention |
| `messages`, `conversations` | Anonymize sender/recipient | Communication records |
| Stripe | Per Stripe policy | Stripe retains per their terms; delete customer if possible |

---

## 2. Data Location (Guest by Email)

### 2.1 Tables and Columns

| Table | Identifier | Personal Data Columns |
|-------|-------------|------------------------|
| `users` | `email`, `user_role = 'guest'` | `email`, `first_name`, `last_name`, `phone` |
| `client_sessions` | `client_email` or `client_id` (guest) | `client_name`, `client_email`, `location`, `notes` |
| `mobile_booking_requests` | `client_id` → `users` | `client_address`, `client_notes` (also in users) |
| `pre_assessment_forms` | `client_email` or `client_id` | `client_email`, `client_name`, form content |
| `treatment_notes` | `session_id` → `client_sessions` | Notes may contain names; anonymize identifiers |
| `messages` | `sender_id` or conversation participants | Message content |
| `conversations` | participant user_ids | — |

### 2.2 Identification Queries

```sql
-- Find guest user by email
SELECT id, email, first_name, last_name, phone, user_role
FROM users
WHERE LOWER(TRIM(email)) = LOWER(TRIM('<email>'))
  AND user_role = 'guest';

-- Sessions with this email (guest or client_id match)
SELECT id, client_id, client_name, client_email, session_date, is_guest_booking
FROM client_sessions
WHERE LOWER(TRIM(client_email)) = LOWER(TRIM('<email>'))
   OR client_id = (SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM('<email>')));
```

---

## 3. Step-by-Step Procedure

### Step 1: Receive and Verify Request

1. Log the request (DSAR reference, date, channel).
2. **Verify identity** – Guest must prove they control the email (e.g. magic link, reply from that address).
3. Acknowledge within 3 days; respond within 30 days.

*Template:* Use DSAR acknowledgment from [DSAR_Step_by_Step_Guide.md](../compliance/DSAR_Step_by_Step_Guide.md), adapted for erasure requests.

### Step 2: Check Exceptions

1. Check for legal holds.
2. Check session dates – if within retention period (7+ years for healthcare/financial), plan **anonymization** rather than full deletion of session/notes.
3. Document any data that cannot be deleted and the legal basis.

### Step 3: Collect All Guest Data (Audit)

Run identification queries (Section 2.2) to list:

- `users.id` (guest)
- All `client_sessions` (by client_email or client_id)
- All `mobile_booking_requests` (by client_id)
- All `pre_assessment_forms` (by client_email or session)
- Related `treatment_notes` (via session_id)
- Related `messages` / `conversations`

Export for records before anonymization (if required for audit).

### Step 4: Anonymize Session-Related Data

**Client sessions** (where retention applies):

```sql
-- Anonymize PII in client_sessions (keep record for legal/financial)
UPDATE client_sessions
SET client_name = '[DELETED]',
    client_email = NULL,
    notes = NULL,
    location = NULL
WHERE LOWER(TRIM(client_email)) = LOWER(TRIM('<email>'))
   OR client_id = '<guest_user_id>';
```

**Pre-assessment forms** (anonymize or delete per counsel):

```sql
UPDATE pre_assessment_forms
SET client_email = NULL,
    client_name = '[DELETED]'
WHERE LOWER(TRIM(client_email)) = LOWER(TRIM('<email>'))
   OR client_id = '<guest_user_id>';
```

**Treatment notes** – Redact or anonymize any direct identifiers in note content if feasible. Do not delete clinical notes (retention).

**Messages** – Anonymize or redact as per policy. Consider purging if not subject to retention.

### Step 5: Mobile Booking Requests

```sql
-- Anonymize PII in mobile_booking_requests
UPDATE mobile_booking_requests
SET client_address = NULL,
    client_notes = NULL
WHERE client_id = '<guest_user_id>';
```

### Step 6: Delete or Anonymize Guest User

**Option A – Full delete** (if no legal retention ties):

```sql
-- Ensure FKs allow: mobile_booking_requests, client_sessions, etc. may reference client_id
-- May need to set client_id = NULL where permissible, or anonymize first

DELETE FROM users
WHERE id = '<guest_user_id>' AND user_role = 'guest';
```

**Option B – Anonymize** (if user row is referenced and retention applies):

```sql
UPDATE users
SET email = 'deleted-' || id::text || '@deleted.local',
    first_name = '[DELETED]',
    last_name = '[DELETED]',
    phone = NULL,
    updated_at = NOW()
WHERE id = '<guest_user_id>' AND user_role = 'guest';
```

### Step 7: Stripe

1. Look up Stripe Customer by email (if stored).
2. Delete customer via Stripe API: `stripe.customers.del(customerId)`.
3. Note: Stripe may retain transactional data per their policy; document and inform the user.

### Step 8: Auth (Supabase Auth)

If the guest has an `auth.users` row (e.g. for checkout):

```sql
-- Run as service role; identify by email
DELETE FROM auth.users WHERE email = '<email>';
```

Verify no other account uses that email before deleting.

### Step 9: Log and Notify

1. Log in `data_destruction_log` (see `supabase/migrations/20250920_retention_policies_scaffold.sql`):
   - `table_name`, `row_id`, `method`, `reason` (e.g. `gdpr_erasure`).
2. Send confirmation to the user: what was deleted/anonymized, what was retained and why.

---

## 4. Automation (Future)

A dedicated RPC or Edge Function `delete_guest_data_by_email(p_email TEXT)` could:

1. Verify email format and identity (e.g. via magic-link token).
2. Apply the anonymization/deletion steps above in a transaction.
3. Log to `data_destruction_log`.
4. Return a summary.

*Not yet implemented* – current procedure is manual.

---

## 5. Cross-References

- [GUEST_EDGE_CASES.md](./GUEST_EDGE_CASES.md) (item 23)
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
- [Data_Retention_Schedule.md](../compliance/Data_Retention_Schedule.md)
- [DSAR_Step_by_Step_Guide.md](../compliance/DSAR_Step_by_Step_Guide.md)

---

**Last Updated:** March 2025
