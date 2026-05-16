# Treatment notes, visit addresses, and security audit

**Date:** 2026-04-18  
**Scope:** Repository analysis; **RLS policy text** for `treatment_notes` is not fully replicated in tracked migrations—**verify in Supabase** (SQL or dashboard) before compliance sign-off.

## 1. Treatment notes (SOAP / DAP)

### Storage

- Table: **`treatment_notes`** — columns include `session_id`, `practitioner_id`, `client_id`, `note_type`, `content`, `status`. See [database-complete-schema.md](../architecture/database-complete-schema.md#treatment_notes).
- **Client app API:** [`theramate-ios-client/lib/api/practitionerTreatmentNotes.ts`](../../theramate-ios-client/lib/api/practitionerTreatmentNotes.ts) — `select`/`insert`/`update` by `session_id` and practitioner.

### AI-assisted SOAP

- Edge function: [`supabase/functions/soap-notes/index.ts`](../../supabase/functions/soap-notes/index.ts).
- Uses **service role** + caller JWT; requires **Pro/Clinic** subscription.
- Optional `save` path persists generated content to `treatment_notes`.
- **Counsel:** AI path is high-risk for **special category** data and **sub-processor** disclosure—see [controller-processor-counsel-brief.md](./controller-processor-counsel-brief.md).

### RLS expectation

- Access should be limited so **clients** do not read arbitrary practitioners’ notes; **practitioners** manage notes for their sessions.
- **Action:** Run in Supabase SQL editor:  
  `SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr FROM pg_policy JOIN pg_class ON oid = polrelid WHERE relname = 'treatment_notes';`  
  Document results in your internal security register.

## 2. Visit addresses and mobile safety

### Where stored

- **`client_sessions.visit_address`** — text; required for `appointment_type = 'mobile'` via booking RPC validation (see migrations `20260313100300_create_booking_mobile_visit_address_required.sql`, `20260416100000_cash_bookings_v1.sql`).

### When visible

- **Booking record first:** Location resolution for emails/UI is documented in [session-location-rule.md](../features/session-location-rule.md).
- **Guest token:** `get_session_by_guest_token` returns `visit_address` for guest view — see `20260309_get_session_by_guest_token_location.sql`.
- **Checklist item** (“address only after booking”): Enforce in **product** (marketplace search vs confirmed session). Trace UI for **TherapistSearch** vs session detail — practitioners should not see full visit address until policy says so. **Gap analysis:** confirm in web/mobile UX review (not fully enumerated in this pass).

### Practitioner base vs client visit

- **Practitioner** `base_address` / `clinic_address` on `users` — used for radius and clinic display.
- **Client** visit address only on **session** row for mobile — aligns with storing address in **contractual booking** context.

## 3. Retention, export, deletion

| Topic                   | Repo finding                                                                                                                           | Action                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Retention policy        | Not defined in app constants for notes; internal doc `LEGAL_COVERAGE_VERIFICATION` may be outdated if present                          | **Privacy policy** + **scheduled job** or manual process per retention                          |
| Export                  | Practitioner-facing export not traced in this pass                                                                                     | **Product:** confirm CSV/PDF export for GDPR **data portability** where Theramate is controller |
| Delete on account close | `20250121_cleanup_problematic_user.sql` shows manual DELETE of `treatment_notes` for a user — **not** a general user self-service path | **Product:** documented erasure flow                                                            |

## 4. Technical security baseline (evidence)

- **HTTPS:** Production site returns **HSTS** (`Strict-Transport-Security`) in sample `curl` headers.
- **Supabase:** Encryption at rest/transit is platform-dependent; cite Supabase security docs in DPIA.
- **Auth:** Notes and SOAP function require authenticated user.
- **Audit logs:** No dedicated `treatment_notes` access log table found in migrations reviewed—**optional** enhancement for ICO accountability.

## 5. References

- [database-schema.md](../architecture/database-schema.md) — `client_sessions`, practitioner location fields
- [session-location-rule.md](../features/session-location-rule.md)
- [database-mcp-metadata.md](../architecture/database-mcp-metadata.md) — table relationships
