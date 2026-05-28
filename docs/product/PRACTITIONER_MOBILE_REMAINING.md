# Practitioner mobile — remaining work & status

**Purpose:** Track parity gaps vs web (repo-root **`src/`** + **`supabase/`**) and what is implemented in `theramate-ios-client/app/(practitioner)/` — **tabs** under `(ptabs)/`, **stack-only** flows (clients, care plans editor, billing, etc.) as siblings of `(ptabs)/` under the same `(practitioner)` group.  
**Practitioner tab bar:** Five tabs (Home, Diary/schedule, Sessions, Messages, Profile), aligned with web primary destinations; nested billing/Connect/analytics routes must stay off the bar (see `MOBILE_WEB_FULL_SCREEN_INVENTORY.md`).

**Updated:** 2026-04-21 — Same as 2026-04-10, plus checklist alignment pass: this file is now explicitly reconciled with `MOBILE_NATIVE_COMPLETION_CHECKLIST.md` for P1 clients/projects and care-plan/clinical fallback rows. **Native-first money and documents** remain: client **Stripe Checkout** (when Payment Sheet unavailable), **Customer Portal**, **mobile checkout reopen**, **message attachments**, **notification URLs**, and practitioner **report exports** + **plan/clinical attachment** opens use **allowlisted in-app WebView** (`app/hosted-web.tsx`, `lib/openHostedWeb.ts`, `ControlledHostedWebView`) instead of Safari. OAuth may still use system browser via `lib/supabase.ts`.

---

## Legend

| Status  | Meaning                                    |
| ------- | ------------------------------------------ |
| Done    | Shipped in native app                      |
| Partial | Native entry + web deep link, or read-only |
| Web     | Browser-only for now (Stripe, complex CMS) |
| Backlog | Not started                                |

---

## 1. Care plans (`treatment_plans`)

| Item                                      | Status   | Notes                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| List / create / edit plan                 | Done     | `treatment-plans/*`, RPCs                                                                                                                                                                                                                                                                                          |
| Link session → plan (from session detail) | Done     | `link_session_to_plan`, `bookings/[id]`                                                                                                                                                                                                                                                                            |
| **Linked sessions on plan detail**        | **Done** | `fetchSessionsForTreatmentPlan`, `[planId]`                                                                                                                                                                                                                                                                        |
| Rich attachments / files on plans         | **Done** | **Native:** `expo-document-picker` → bucket `treatment-plan-attachments` → `treatment_plans.attachments` JSONB; signed URLs open in **in-app WebView** (`openHostedWebSession`). **DB:** migrations `20260329120000`–`20260329120300`. **Prod:** apply remaining `treatment_plans` migrations if not yet deployed. |
| AI / voice SOAP                           | Partial  | **Native:** “Draft from transcript” on **`clinical-notes/[sessionId]`** → edge **`soap-notes`** (same as web; **Pro/Clinic**). **Voice → transcript:** edge **`ai-soap-transcribe`** exists; not wired in mobile UI yet (would need record/upload + `audio_url`).                                                  |

---

## 2. Treatment exchange (`treatment_exchange_requests`)

| Item                                       | Status   | Notes                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pending inbox + decline RPC                | Done     | `decline_exchange_request`                                                                                                                                                                                                                                                                                                      |
| **Request detail (date, time, requester)** | **Done** | Extended select + requester name                                                                                                                                                                                                                                                                                                |
| **Accept flow**                            | **Done** | Native calls new RPC `accept_exchange_request` (migration `20260330130000_*`) which marks request accepted + creates `mutual_exchange_sessions`. Web view still available.                                                                                                                                                      |
| **Reciprocal booking (return session)**    | **Done** | **Native:** “Book your return session” lists accepted exchanges needing `practitioner_b_booked`; modal loads slots from RPC `get_exchange_reciprocal_available_slots` (requester’s `working_hours`, overlap + buffer rules, deadline cap). User taps a slot → `book_exchange_reciprocal_session`. Migration `20260330140000_*`. |
| **Discover peers + send request**          | **Done** | **Native:** `exchange` → Discover tab; `lib/api/treatmentExchangeDiscovery.ts` + RPC `create_treatment_exchange_request` (deploy migration).                                                                                                                                                                                    |
| **Outgoing / sent queue + cancel**         | **Done** | Inbox “Waiting on them” + `cancel_exchange_request_by_requester` RPC.                                                                                                                                                                                                                                                           |
| **Per-request detail screen**              | **Done** | `app/(practitioner)/exchange/[id].tsx` — status, notes, accept/decline/cancel; notification routes with request UUID.                                                                                                                                                                                                           |
| Extension / reciprocal deadline tools      | Web      | Rare; use web                                                                                                                                                                                                                                                                                                                   |

---

## 3. Account & subscription

| Item                                        | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App preferences (theme, haptics, analytics) | Done     | Reuses `(tabs)/profile/settings`                                                                                                                                                                                                                                                                                                                                                    |
| **Notifications inbox**                     | **Done** | `/notifications` uses live columns (`read`, `read_at`, `payload`, `metadata`, `recipient_id`, `source_*`, `related_entity_*`); excludes `dismissed_at`; mark-read updates match RLS. Tap routes: **sessions**, **treatment plans**, **exchange**, **mobile requests** (detail when `source_id` / payload id), **messages**, **explore**, or optional `web_path` / `url` on payload. |
| **Subscription / billing portal**           | **Done** | Profile → Account; **Stripe Customer Portal** opens in-app (`app/stripe-customer-portal.tsx`); not Safari for portal                                                                                                                                                                                                                                                                |
| Privacy & security (native screen)          | Done     | Shared `PrivacySecurityContent`; practitioner gets web privacy links                                                                                                                                                                                                                                                                                                                |
| Privacy tools (web-only extras)             | Done     | Practitioner `PrivacySecurityContent`: `/settings/privacy` + `/settings`                                                                                                                                                                                                                                                                                                            |

---

## 4. Money & marketplace

| Item                               | Status                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Products CRUD via `stripe-payment` | Done                               | `marketplace/product/*`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Stripe Connect onboarding          | **Done (core operational parity)** | **Status** (`get-connect-account-status`) + **Embedded onboarding:** `stripe-connect/embedded` (`create-account-session` + Connect.js `account-onboarding`) in-app. Billing CTAs route to Connect setup when incomplete.                                                                                                                                                                                                                                              |
| Credits, invoices, tax docs        | Partial                            | **Credits:** native. **Billing screen:** native-first (payments, payouts, Connect status). Product decision for this phase: invoices/tax document centre is deferred (not required for Stripe Connect + schedule priority scope).                                                                                                                                                                                                                                     |
| Analytics                          | Partial                            | Native: month sessions + est. revenue + **`payments` MTD live card** (gross / your share / count, excludes failed-cancelled-refunded) + reads `financial_analytics`, `engagement_analytics`, `performance_metrics` when populated. **Reports:** native list + deliveries; **Generate export** signed URLs open in **`app/hosted-web.tsx`** (not external browser). Web advanced templates may still differ. **Nav:** Analytics ↔ Billing; Billing → native Analytics. |
| Advanced scheduler / CMS           | **Done (core schedule parity)**    | **Native:** Schedule tab + Services + `calendar-sync` cover inbuilt diary/scheduler tools with no `/practice/scheduler` or `/practice/calendar` dependency. **Google Calendar sync is intentionally disabled** in mobile flow; practitioners use in-app calendar + blocked-time/availability controls.                                                                                                                                                                |

---

## 5. Projects & clinical extras

| Item                       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects list / detail     | **Done** | **Native edit:** name, description, type, status, dates (`updatePractitionerProject`). **Phases:** create/edit/delete (`project_phases`) in project detail                                                                                                                                                                                                                                                                                                  |
| Clinical file vault        | **Done** | **Native:** notes + **per-session file uploads** (`clinical_session_attachments` + bucket `clinical-session-attachments`) on `clinical-notes/[sessionId]`: pick file → Storage → DB row; list/open signed URL; delete. Vault list shows file counts. **DB:** migration `20260330150000_clinical_session_attachments.sql` (applied via Supabase MCP to `aikqnvltuwwgifuocvto`). Clients get **read** on attachments for their own sessions + Storage SELECT. |
| Secure message attachments | **Done** | Native: pick file → upload to Storage bucket `message-attachments` → insert `message_attachments` row; render + open via signed URL in chat thread (**in-app WebView** on client `messages/[id]`). Requires migration `20260330120000_message_attachments_storage_bucket.sql`.                                                                                                                                                                              |

---

## 6. QA / release

| Item                                       | Status  | Notes                                                                                                                                                                                                                |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role routing (client vs practitioner)      | Done    | Fixed: only **clients** use in-app onboarding; practitioners no longer get routed to client onboarding after OAuth.                                                                                                  |
| E2E: exchange accept on web from deep link | Backlog | **Mobile:** pending + reciprocal rows open **`/practice/exchange-requests?request=<id>`**. **Web:** implement query handler on the consumer site (repo-root **`src/`** routes or app shell that owns `/practice/*`). |

---

## References

- Full route map: `docs/product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md` (Phase 3).
- Cross-check checklist: `docs/product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md`.
- RPCs: `supabase/migrations/*exchange*`, `20251030_pro_features*.sql`.
