# Controller / processor brief (for UK counsel)

**Date:** 2026-04-18  
**Purpose:** Frame questions for **UK-qualified** counsel on UK GDPR roles and documentation. Not legal advice.

## Facts (product)

- Theramate **stores** practitioner-authored **SOAP/treatment notes** in PostgreSQL (`treatment_notes`), accessed via Supabase with RLS and the mobile/web clients.
- **AI-assisted SOAP** runs in [`supabase/functions/soap-notes/index.ts`](../../supabase/functions/soap-notes/index.ts) (transcript → structured note content).
- **Clients** book sessions; **mobile** sessions store **`visit_address`** on `client_sessions`.
- Mobile app static copy states Theramate Limited is **data controller** for personal data in the app: [`theramate-ios-client/constants/legal/privacyCopy.ts`](../../theramate-ios-client/constants/legal/privacyCopy.ts).

## Questions for counsel

1. **Controller vs processor for `treatment_notes`**  
   Is the practitioner (or their business) the **controller** for clinical record content, with Theramate as **processor** on their instructions, or is Theramate **joint controller** / **sole controller** for some purposes? Does the answer change for **AI-generated** draft text in `soap-notes`?

2. **Client health data**  
   For pre-assessment, messages, and session metadata, who is controller for **special category** data: Theramate, practitioner, or both (Art. 26)?

3. **Lawful basis**  
   Confirm appropriate bases for: (a) booking/marketplace, (b) **health** data in notes, (c) **location** / visit address, (d) analytics (PostHog if used).

4. **Documentation**
   - Is a **Data Processing Agreement** (Art. 28) required with **each practitioner**, or is an **online acceptance** of platform terms + DPA schedule sufficient?
   - Should clients receive a **privacy notice** from the practitioner as well as Theramate?

5. **International transfers**  
   If sub-processors (e.g. US-based AI or email) process UK data, confirm **transfer mechanisms** (IDTA/SCCs + TRA as applicable).

## Sub-processors to list (from codebase)

Counsel should review and add/remove; typical candidates:

| Processor                | Role                                       | Code / config reference                |
| ------------------------ | ------------------------------------------ | -------------------------------------- |
| Supabase                 | Hosting, DB, Auth, Storage, Edge Functions | `EXPO_PUBLIC_SUPABASE_URL`, migrations |
| Stripe / Stripe Connect  | Payments, Connect onboarding               | `stripe-webhooks`, Connect in app      |
| Resend (or similar)      | Transactional email                        | `supabase/functions/send-email`        |
| Groq (or configured LLM) | SOAP note generation                       | `soap-notes` function                  |
| PostHog                  | Analytics (optional)                       | `EXPO_PUBLIC_POSTHOG_API_KEY`          |
| Sentry                   | Error tracking (optional)                  | `EXPO_PUBLIC_SENTRY_DSN`               |
| Google Calendar          | Sync if enabled                            | `google-calendar-sync`                 |

## DPA implementation checklist (product + legal)

- [ ] Published **sub-processor** list and **notification** process for changes.
- [ ] **Breach** notification flow (72-hour ICO timeline) documented with engineering on-call.
- [ ] **Deletion** on practitioner exit: notes, attachments, PII — matches privacy notice.
- [ ] **Sub-processor agreements** on file (Supabase DPA, Stripe DPA, etc.).
- [ ] **Record of processing activities** (Art. 30) updated for treatment notes and visit addresses.

## Alignment actions (after counsel sign-off)

1. Update **Privacy Policy** so controller/processor descriptions match advice.
2. Add **DPA** URL to [legal-url-inventory.md](./legal-url-inventory.md) and practitioner onboarding.
3. If AI processing is processing on behalf of controller, ensure **instructions** are documented (what the edge function may do).
