# Treatment Notes

**Audience:** Junior developers

Treatment Notes cover practitioner clinical documentation across sessions, including SOAP-style notes, attachments, and linked treatment-plan context.

---

## What Treatment Notes Include

- Session-linked clinical notes
- SOAP note drafting/editing workflows
- Clinical file attachments linked to sessions
- Treatment-plan context where applicable
- Practitioner and client visibility rules

---

## Web and Native Surfaces

### Web routes

- `/practice/clients` (notes views inside client management)
- `/practice/sessions/:sessionId` (session detail and note entry points)
- `/practice/clinical-files`
- `/practice/treatment-plans`

### Native practitioner surfaces

In `theramate-ios-client`, treatment-note-adjacent flows live in practitioner stack routes including:

- `clinical-notes/*`
- `clinical-files/*`
- `treatment-plans/*`

For route mapping details:

- [Mobile ↔ Web full screen & surface inventory](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md)

---

## Related Feature Docs

- [Client Management – Feature Overview](./client-management-overview.md)
- [Pre-Assessment Form: Practitioner View UX Plan](./pre-assessment-practitioner-ux-plan.md)
- [Diary Overview](./diary-overview.md)

---

## Backend/AI Processing

Treatment note generation and transcription helpers are implemented as Edge Functions, including:

- `soap-notes`
- `ai-soap-transcribe`

Reference:

- [Edge Functions Reference](../architecture/edge-functions.md)

---

## Data and Product Caveats

- Clinical notes behavior may differ by role (guest vs client vs practitioner ownership context).
- Attachments and signed document viewing must follow current storage and in-app hosted WebView policy where applicable.
- If note behavior appears inconsistent across screens, check the latest mobile parity and practitioner-status docs first.

See:

- [Practitioner mobile — remaining work & status](../product/PRACTITIONER_MOBILE_REMAINING.md)
- [Mobile Native Completion Checklist](../product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md)
