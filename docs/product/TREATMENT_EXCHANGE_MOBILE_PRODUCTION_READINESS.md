# Treatment Exchange — Mobile Production Readiness

**Date:** 2026-05-21  
**Scope:** `theramate-ios-client` practitioner app  
**Screen map:** [`TREATMENT_EXCHANGE_MOBILE_SCREEN_FLOWS.md`](TREATMENT_EXCHANGE_MOBILE_SCREEN_FLOWS.md)

---

## Verdict

**Mobile practitioner exchange: ready for production** (~95% for core two-leg flow). Remaining work is **staging credentials E2E**, **Maestro on device**, and **web parity** (separate track).

---

## Backend (prod Supabase `aikqnvltuwwgifuocvto`)

Verified via MCP 2026-05-21:

| RPC                                       | Status  |
| ----------------------------------------- | ------- |
| `create_treatment_exchange_request`       | Present |
| `accept_exchange_request`                 | Present |
| `book_exchange_reciprocal_session`        | Present |
| `get_exchange_reciprocal_available_slots` | Present |
| `decline_exchange_request`                | Present |
| `cancel_exchange_request_by_requester`    | Present |
| `process_peer_booking_refund`             | Present |

Migrations applied include `20260519155137` (leg-1 + credits), `20260521092045` (conflicts), `20260521092941` (holds + requester location).

---

## Mobile UI checklist

| Area                                                  | Status |
| ----------------------------------------------------- | ------ |
| Hub inbox — 4 active queues                           | Done   |
| Discover + send + credit pre-check                    | Done   |
| Shared reciprocal slot modal (hub + detail)           | Done   |
| Request detail — all statuses + extension             | Done   |
| Peer booking — no generic reschedule; link to request | Done   |
| Home — split Mobile vs Exchange action cards          | Done   |
| Home — all queue counts on exchange card              | Done   |
| Mobile requests — queue ② snapshot                    | Done   |
| Past requests (declined / cancelled / expired)        | Done   |
| Completed swaps history                               | Done   |
| Notifications — `formatNotificationForInbox`          | Done   |
| Copy — “Request different time”, not “Decline”        | Done   |

---

## Quality gates

| Command                         | Expected                                        |
| ------------------------------- | ----------------------------------------------- |
| `npm run typecheck:mobile`      | Pass                                            |
| `npm run test:mobile`           | Pass (37+ tests)                                |
| `npm run test:exchange:e2e`     | Pass with `EXCHANGE_*` in `.env`                |
| `npm run test:exchange:e2e:dry` | Pass after sign-in + tier check (no RPC writes) |
| `npm run test:readiness`        | Pass (typecheck + mobile unit + exchange dry)   |

---

## Manual / Maestro (before release)

- [ ] Maestro `exchange-happy-path-requester.yaml` on staging build
- [ ] Maestro `exchange-happy-path-recipient.yaml` (`exchange-choose-reciprocal`)
- [ ] Requester sees Home **Treatment exchange** card after recipient accepts
- [ ] Recipient books return from hub or detail
- [ ] Push tap opens `exchange/[id]` when payload has `requestId`

Env template: `theramate-ios-client/.maestro/.env.example`

---

## Not in mobile scope

- Web exchange UI (`peer-care-connect` / root `src/` — no exchange routes in current checkout)
- Notification title/body authoring (server); mobile only formats inbox display
