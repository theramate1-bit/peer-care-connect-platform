# GDPR + AI data map (TheraMate)

**Date:** 2026-06-09  
**Status:** Operational reference for product, engineering, and counsel — **not legal advice**  
**Audience:** CTO, DPO, eng leads fulfilling DSARs or extending AI features

**Related:** [controller-processor-counsel-brief.md](./controller-processor-counsel-brief.md) · [notes-location-rls-audit.md](./notes-location-rls-audit.md) · [DSAR_Step_by_Step_Guide.md](../../peer-care-connect/docs/compliance/DSAR_Step_by_Step_Guide.md) · [GUEST_DATA_DELETION.md](../../peer-care-connect/docs/features/GUEST_DATA_DELETION.md)

---

## 1. Why this document exists

Generic “AI agent” GDPR advice (embeddings, knowledge bases, persistent memory) does **not** fully apply to TheraMate today. AI features are **stateless inference** over session content, with results stored in normal relational tables.

This map answers:

1. **Where** personal and special-category data lives
2. **What** crosses borders to AI sub-processors
3. **What** to delete, anonymize, or retain on erasure requests
4. **What** is missing for production-grade accountability

---

## 2. Roles (summary — counsel to confirm)

| Processing                       | Likely controller                        | Likely processor                 | Notes                                                                                              |
| -------------------------------- | ---------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Account, marketplace, billing    | Theramate                                | Supabase, Stripe, Resend         | Per in-app privacy copy                                                                            |
| Treatment notes & clinical files | **Practitioner** (client health records) | **Theramate** (platform storage) | See [privacyCopy.ts](../../theramate-ios-client/constants/legal/privacyCopy.ts)                    |
| AI draft SOAP / transcription    | TBD — counsel                            | Groq, AssemblyAI, OpenAI         | Open questions in [controller-processor-counsel-brief.md](./controller-processor-counsel-brief.md) |
| Location / visit addresses       | Mixed                                    | Supabase                         | Location consent + audit in place                                                                  |

**Do not treat this table as legal fact** until UK counsel signs off.

---

## 3. Data inventory (primary stores)

### 3.1 Identity & account

| Store      | Table / system                 | Personal data                                       | Special category? | Erasure default                             |
| ---------- | ------------------------------ | --------------------------------------------------- | ----------------- | ------------------------------------------- |
| Auth       | `auth.users` (Supabase)        | email, phone, metadata                              | No                | Delete auth user after DB cleanup           |
| Profile    | `users`                        | name, phone, bio, addresses, qualifications, photos | Sometimes (bio)   | Delete or anonymize row                     |
| Onboarding | `onboarding_progress`          | step state, form drafts                             | No                | Delete with account                         |
| DSAR       | `dsar_requests`, `dsar_events` | request metadata                                    | No                | Retain for compliance audit (define period) |

**In-app intake:** [SettingsPrivacyTools.tsx](../../peer-care-connect/src/pages/settings/SettingsPrivacyTools.tsx), [theramate-ios-client/lib/api/dsar.ts](../../theramate-ios-client/lib/api/dsar.ts)

### 3.2 Bookings & sessions

| Store           | Table                           | Personal data                                         | Special category?        | Erasure default                                                  |
| --------------- | ------------------------------- | ----------------------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Sessions        | `client_sessions`               | `client_name`, `client_email`, `visit_address`, notes | **Yes** (health context) | **Anonymize** identifiers; retain row for tax/clinical retention |
| Mobile requests | `mobile_booking_requests`       | client address, notes                                 | **Yes**                  | Anonymize/redact                                                 |
| Pre-assessment  | `pre_assessment_forms`          | name, email, form answers                             | **Yes**                  | Anonymize or delete per retention policy                         |
| Guest bookings  | `users` (`user_role = 'guest'`) | email, name, phone                                    | Sometimes                | Delete profile; see guest procedure                              |

**Reference:** [GUEST_DATA_DELETION.md](../../peer-care-connect/docs/features/GUEST_DATA_DELETION.md)

### 3.3 Clinical & health workflow

| Store       | Table / bucket                    | Personal data                                            | Special category? | Erasure default                                                          |
| ----------- | --------------------------------- | -------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| Notes       | `treatment_notes`                 | SOAP/DAP `content`, `session_id`, `client_id`            | **Yes**           | **Retain** body; anonymize `client_id` / names in content where possible |
| Recordings  | `session_recordings`              | `recording_url`, `transcript`, `ai_summary`, SOAP fields | **Yes**           | Delete row + storage object when legally allowed                         |
| Files       | `clinical_files` + Storage bucket | uploads, metadata                                        | **Yes**           | Delete files + rows when legally allowed                                 |
| Attachments | clinical session attachments API  | file blobs                                               | **Yes**           | Delete from Storage + DB                                                 |

**Recording consent:** `client_sessions.recording_consent` (migration `20250820175429_*`)

### 3.4 Location & consent

| Store     | Table                                              | Personal data                  | Erasure default                                                                                                                |
| --------- | -------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Locations | `user_locations`, `users.clinic_*`, `users.base_*` | addresses, lat/long            | Delete on withdrawal or account erasure                                                                                        |
| Consent   | `location_consents`                                | consent timestamps, method, IP | Retain proof of consent/withdrawal per schedule                                                                                |
| Audit     | `location_access_log`                              | who accessed whose location    | Anonymize after **3 years** ([Data_Retention_Schedule.md](../../peer-care-connect/docs/compliance/Data_Retention_Schedule.md)) |

**RPCs:** `has_location_consent`, `record_location_consent`, `log_location_access`

### 3.5 Communications & payments

| Store    | System                      | Personal data                  | Erasure default                                                     |
| -------- | --------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Messages | `messages`, `conversations` | content, participant IDs       | Anonymize participants                                              |
| Email    | Resend (logs at provider)   | name, email in templates       | Provider deletion request                                           |
| Payments | Stripe / Stripe Connect     | customer IDs, payment metadata | Stripe retention (HMRC **7 years**); delete customer where possible |
| SMS      | `sms_logs`                  | phone, message metadata        | Per retention schedule                                              |

### 3.6 Analytics & diagnostics (optional)

| Store     | System                                         | Personal data                                    | Erasure default                                   |
| --------- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Analytics | PostHog (if `EXPO_PUBLIC_POSTHOG_API_KEY` set) | device/user events                               | PostHog deletion API / project settings           |
| Errors    | Sentry (if DSN set)                            | stack traces, user context                       | Sentry data deletion request                      |
| Edge logs | Supabase function logs                         | **Risk:** `soap-notes` logs `transcript_preview` | Redact in code; purge logs per Supabase retention |

---

## 4. AI processing map

**Important:** There is **no** vector database, RAG knowledge base, or fine-tuned model in-repo. Erasure does **not** require embedding purge — but **does** require sub-processor and log hygiene.

### 4.1 Active AI edge functions

| Function          | Path                                                              | Trigger           | Input sent externally                                           | Output persisted                                   | Gate                               |
| ----------------- | ----------------------------------------------------------------- | ----------------- | --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| SOAP generation   | `supabase/functions/soap-notes/index.ts`                          | Practitioner POST | Full **transcript** text → **Groq** (`llama-3.1-70b-versatile`) | Optional: `treatment_notes` rows when `save: true` | Auth + **Pro/Clinic** subscription |
| Audio transcribe  | `supabase/functions/ai-soap-transcribe/index.ts`                  | Practitioner POST | **Audio URL** → **AssemblyAI**                                  | Returned to client; may be saved by app            | Auth + Pro                         |
| Session summarize | `peer-care-connect/supabase/functions/summarize-session/index.ts` | Recording flow    | Full **transcript** → **OpenAI** (`gpt-4o-mini`)                | `session_recordings` SOAP fields                   | Auth                               |
| Transcribe file   | `supabase/functions/transcribe-file/index.ts`                     | Legacy/alternate  | Audio → external STT                                            | Varies                                             | Verify if deployed                 |
| Whisper streaming | `peer-care-connect/supabase/functions/whisper-streaming/index.ts` | Streaming STT     | Audio stream                                                    | Ephemeral                                          | Verify if deployed                 |

### 4.2 Data flow (SOAP path)

```
Practitioner device
  → transcript (client app / web)
  → POST soap-notes (JWT)
  → Groq API (US) — full transcript in prompt
  → structured SOAP JSON
  → optional INSERT treatment_notes
  → optional console.log transcript_preview (⚠️ PII in logs)
```

### 4.3 What is **not** stored by AI calls

- Groq / OpenAI / AssemblyAI do **not** receive a persistent “agent memory” from our code
- No embeddings written to Postgres
- Each call is **request-scoped** unless the app saves the result

### 4.4 What **is** stored after AI

| Artifact          | Location                            | Erasure action                       |
| ----------------- | ----------------------------------- | ------------------------------------ |
| Draft/final SOAP  | `treatment_notes`                   | Tier C — retain per healthcare rules |
| Transcript        | `session_recordings.transcript`     | Delete when session retention allows |
| AI summary fields | `session_recordings.ai_*`, `soap_*` | Same as transcript                   |
| Audio file        | Storage URL in `recording_url`      | Delete object + row                  |

### 4.5 AI-specific GDPR risks (current gaps)

| Risk                                                               | Severity   | Mitigation                                                                                         |
| ------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------- |
| US sub-processors (Groq, AssemblyAI, OpenAI) on health transcripts | **High**   | IDTA/SCCs + TRA; counsel review; consider EU STT option                                            |
| No `ai_processing_log` table                                       | **Medium** | Log: `user_id`, `session_id`, `function`, `model`, `timestamp`, `input_hash` — not full transcript |
| ~~`transcript_preview` in `soap-notes` console logs~~              | ~~Medium~~ | **Done** — `logAiRequestContext` strips content in production                                      |
| No per-feature consent check before AI call                        | **Medium** | Practitioner instruction + privacy notice; optional explicit AI toggle                             |
| Vendor training/retention terms not documented in-repo             | **High**   | Verify DPAs: no training on customer data                                                          |

---

## 5. Sub-processor matrix

| Processor           | Data categories                     | Region (typical)  | Code / config                   | DPA in repo?       |
| ------------------- | ----------------------------------- | ----------------- | ------------------------------- | ------------------ |
| **Supabase**        | All DB, Auth, Storage, Edge logs    | Project-dependent | `SUPABASE_URL`                  | Verify with vendor |
| **Stripe**          | Payments, Connect KYC               | US + global       | `stripe-webhook`, Connect flows | Stripe DPA         |
| **Resend**          | Email, names in templates           | US                | `send-email`                    | Verify             |
| **Groq**            | Clinical transcripts                | US                | `soap-notes`                    | **Verify + TRA**   |
| **AssemblyAI**      | Voice audio                         | US                | `ai-soap-transcribe`            | **Verify + TRA**   |
| **OpenAI**          | Session transcripts                 | US                | `summarize-session`             | **Verify + TRA**   |
| **PostHog**         | Usage analytics                     | US/EU option      | `EXPO_PUBLIC_POSTHOG_API_KEY`   | Optional           |
| **Sentry**          | Errors, possible PII in breadcrumbs | US                | `SENTRY_DSN`                    | Optional           |
| **Google Calendar** | Calendar events if enabled          | US                | `google-calendar-sync`          | If feature on      |

**Checklist:** [Third_Party_Processor_Verification.md](../../peer-care-connect/docs/compliance/Third_Party_Processor_Verification.md)

---

## 6. Erasure tiers (operational)

Use these tiers when fulfilling **Article 17** requests. Always document exceptions in `dsar_events`.

### Tier A — Delete immediately (when requested & no legal hold)

- Marketing preferences
- Location data after consent withdrawal (`record_location_consent(false)`)
- Draft onboarding / sessionStorage / AsyncStorage drafts on device
- Optional analytics identities (PostHog/Sentry) via provider APIs
- `users` row for pure guests with no retention blockers

### Tier B — Anonymize (retain record, remove identifiers)

- `client_sessions.client_name`, `client_email`
- `mobile_booking_requests` client address/notes
- `messages` / `conversations` participant links
- `pre_assessment_forms` identifiers
- `treatment_notes`: replace `client_id` with null + redact names in `content` where feasible

### Tier C — Retain restricted (legal / professional duty)

- `treatment_notes` clinical content (7–10 years typical for adults)
- Financial records via Stripe (7 years HMRC)
- `session_recordings` where tied to clinical record retention
- `dsar_requests` / audit logs for accountability

**User-facing copy must explain Tier C** when they tap “Request deletion” — see [PrivacyPolicy.tsx](../../peer-care-connect/src/pages/PrivacyPolicy.tsx).

### Tier D — Sub-processor purge (manual until automated)

On erasure, open runbook tickets for:

1. **Groq / AssemblyAI / OpenAI** — confirm no retention beyond API call (per vendor DPA)
2. **Resend** — delete contact/logs if applicable
3. **Stripe** — delete or anonymize Customer object where allowed
4. **Sentry** — issue deletion for user ID / email
5. **Supabase Edge logs** — request log purge if transcript logged

---

## 7. DSAR fulfillment checklist

### Access (Article 15)

| Step | Action                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Verify identity ([DSAR guide](../../peer-care-connect/docs/compliance/DSAR_Step_by_Step_Guide.md))                                          |
| 2    | Query `users`, `client_sessions`, `treatment_notes`, `messages`, `pre_assessment_forms`, `mobile_booking_requests` by `user_id` or email    |
| 3    | Include `location_consents`, `location_access_log` (subject’s rows)                                                                         |
| 4    | Include `dsar_requests` history                                                                                                             |
| 5    | Export Storage objects (profile photo, clinical files, recordings)                                                                          |
| 6    | **Disclose** AI processing: `ai_processing_log` rows (metadata only), plus `session_recordings` / AI-generated `treatment_notes` if present |
| 7    | Redact third-party PII (other users in threads)                                                                                             |
| 8    | Deliver JSON/CSV + file bundle within 30 days                                                                                               |

### Erasure (Article 17)

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | Apply Tier A → B → C per tables above                             |
| 2    | Run guest procedure if `user_role = 'guest'`                      |
| 3    | Delete Storage blobs for Tier A/B artifacts                       |
| 4    | Execute Tier D sub-processor tickets                              |
| 5    | Delete `auth.users` last (after FK cleanup)                       |
| 6    | Update `dsar_requests.status` → `completed`; log in `dsar_events` |

**Automation status:** Intake exists; **orchestrated erasure/export is Wave 2** ([APP_RELEASE_BACKLOG_CTO_PM.md](../product/APP_RELEASE_BACKLOG_CTO_PM.md) — Privacy export/delete).

---

## 8. Audit trail status

| Domain                 | Implemented?           | Location                                                                                      |
| ---------------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| Location access        | **Yes**                | `location_access_log` + `log_location_access()`                                               |
| DSAR lifecycle         | **Yes**                | `dsar_requests`, `dsar_events`                                                                |
| Location consent       | **Yes**                | `location_consents`                                                                           |
| Treatment notes access | **No dedicated table** | RLS only — verify in Supabase                                                                 |
| AI processing          | **Partial**            | `ai_processing_log` table + best-effort inserts from edge functions (metadata + SHA-256 only) |
| Payment events         | **Partial**            | Stripe webhooks, `sms_logs`                                                                   |

**Implemented (2026-06-09):** `ai_processing_log` — migration `20260609120000_ai_processing_log.sql`, shared helper `supabase/functions/_shared/ai-processing-log.ts`. Logging is **best-effort** (failures do not block AI responses). Clinical transcripts still flow to Groq/AssemblyAI unchanged; only accountability metadata is stored locally.

---

## 9. Architecture guardrails (before adding more AI)

1. **No RAG / embeddings without an erasure design** — document how to delete vectors by `user_id` / `session_id`
2. **No full transcript in production logs** — use length + SHA-256 hash
3. **One `ai_processing_log` insert** per external inference call
4. **Practitioner-triggered only** — AI runs on explicit user action, not background scraping
5. **EU routing option** — evaluate EU-hosted STT before scaling AI in regulated pitches
6. **Close counsel brief** before marketing “AI notes” heavily

---

## 10. Priority action backlog

| P   | Item                                                              | Owner                                        |
| --- | ----------------------------------------------------------------- | -------------------------------------------- |
| P0  | Counsel sign-off: controller/processor for AI + notes             | Legal                                        |
| P0  | Verify Groq / AssemblyAI / OpenAI DPAs (no training) + TRA        | Legal + Ops                                  |
| P1  | ~~Remove `transcript_preview` from production `soap-notes` logs~~ | **Done**                                     |
| P1  | Published sub-processor list on website (incl. AI vendors)        | Product + Legal                              |
| P2  | ~~`ai_processing_log` table + edge function writes~~              | **Done** — deploy migration + edge functions |
| P2  | Automated privacy export (portability)                            | Eng                                          |
| P2  | Orchestrated erasure job (Tiers A–C)                              | Eng                                          |
| P3  | `treatment_notes` access audit (optional ICO enhancement)         | Eng                                          |

---

## 11. Quick reference — “where is X?”

| User asks to delete…        | Start here                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| My account                  | `users`, `auth.users`, then related FKs                                                                                         |
| My booking history          | `client_sessions` (anonymize)                                                                                                   |
| My health notes             | `treatment_notes` — likely **retain** with anonymization                                                                        |
| My voice recording          | `session_recordings` + Storage `recording_url`                                                                                  |
| My location                 | `user_locations`, `users` address fields, `location_consents`                                                                   |
| What your AI knows about me | **No separate AI memory** — check `treatment_notes`, `session_recordings`, `ai_processing_log` (fingerprints only), vendor logs |

---

**Review cadence:** Update when adding edge functions, Storage buckets, or new third-party SDKs. Cross-link from [docs/compliance/README.md](./README.md).

**Last reviewed:** 2026-06-09
